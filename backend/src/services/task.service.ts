import { getDb } from '../db/client.js';
import { RescheduleService, calculateReschedule, formatDate } from './reschedule.service.js';
import { TaskDto, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types/index.js';

export class TaskService {
  listTasks(filter: TaskFilter = {}): TaskDto[] {
    const db = getDb();

    let query = `
      SELECT 
        t.id,
        t.phase_id,
        p.name as phase_name,
        p.position as phase_position,
        t.title,
        t.description,
        t.status,
        t.position,
        t.estimated_hours,
        COALESCE(SUM(s.hours), 0) as spent_hours,
        t.due_date,
        t.pinned_due_date,
        t.alura_url,
        t.completed_at,
        t.created_at,
        t.updated_at
      FROM tasks t
      JOIN phases p ON p.id = t.phase_id
      LEFT JOIN study_sessions s ON s.task_id = t.id
    `;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (filter.phase_id !== undefined) {
      whereClauses.push('t.phase_id = ?');
      params.push(filter.phase_id);
    }

    if (filter.status !== undefined) {
      whereClauses.push('t.status = ?');
      params.push(filter.status);
    }

    if (filter.stack_id !== undefined) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM task_stacks ts WHERE ts.task_id = t.id AND ts.stack_id = ?
      )`);
      params.push(filter.stack_id);
    }

    if (filter.search) {
      whereClauses.push('(t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += `
      GROUP BY t.id
      ORDER BY p.position ASC, t.position ASC
    `;

    const rows = db.prepare(query).all(...params) as any[];

    // Fetch stacks for all returned tasks
    const taskIds = rows.map(r => r.id);
    const stackMap = new Map<number, Array<{ id: number; name: string; color: string }>>();

    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      const stacksQuery = `
        SELECT ts.task_id, s.id, s.name, s.color
        FROM task_stacks ts
        JOIN stacks s ON s.id = ts.stack_id
        WHERE ts.task_id IN (${placeholders})
        ORDER BY s.name ASC
      `;
      const stackRows = db.prepare(stacksQuery).all(...taskIds) as any[];
      for (const row of stackRows) {
        if (!stackMap.has(row.task_id)) {
          stackMap.set(row.task_id, []);
        }
        stackMap.get(row.task_id)!.push({
          id: row.id,
          name: row.name,
          color: row.color,
        });
      }
    }

    // Calculate reschedule projection for pending tasks to annotate at_risk flag
    const atRiskMap = new Map<number, boolean>();
    const pendingInputs = rows
      .filter(r => r.status !== 'done')
      .map(r => ({
        id: r.id,
        status: r.status,
        position: r.position,
        estimated_hours: Number(r.estimated_hours) || 0,
        spent_hours: Number(r.spent_hours) || 0,
        due_date: r.due_date,
        pinned_due_date: Boolean(r.pinned_due_date),
      }));

    if (pendingInputs.length > 0) {
      const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('weekly_capacity_hours') as any;
      const weeklyCap = settingRow ? Number(settingRow.value) || 10 : 10;
      const reschedResults = calculateReschedule(pendingInputs, weeklyCap, formatDate(new Date()));
      for (const res of reschedResults) {
        atRiskMap.set(res.id, res.at_risk);
      }
    }

    return rows.map(row => {
      const spent = Number(row.spent_hours) || 0;
      const estimated = Number(row.estimated_hours) || 0;
      const remaining = Math.max(0, estimated - spent);

      return {
        id: row.id,
        phase_id: row.phase_id,
        phase_name: row.phase_name,
        phase_position: row.phase_position,
        title: row.title,
        description: row.description,
        status: row.status,
        position: row.position,
        estimated_hours: estimated,
        spent_hours: spent,
        remaining_hours: remaining,
        due_date: row.due_date,
        pinned_due_date: Boolean(row.pinned_due_date),
        alura_url: row.alura_url,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        stacks: stackMap.get(row.id) || [],
        at_risk: atRiskMap.get(row.id) || false,
      };
    });
  }

  getTaskById(id: number): TaskDto | null {
    const tasks = this.listTasks();
    const task = tasks.find(t => t.id === id);
    return task || null;
  }

  createTask(data: {
    phase_id: number;
    title: string;
    description?: string | null;
    status?: 'todo' | 'in_progress' | 'done';
    position?: number;
    estimated_hours?: number;
    due_date?: string | null;
    pinned_due_date?: boolean;
    alura_url?: string | null;
    stack_ids?: number[];
  }): TaskDto {
    const db = getDb();

    const createdId = db.transaction(() => {
      let pos = data.position;
      if (pos === undefined) {
        const maxPosRow = db.prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM tasks WHERE phase_id = ?').get(data.phase_id) as any;
        pos = (maxPosRow?.max_pos || 0) + 1;
      }

      const status = data.status || 'todo';
      const completedAt = status === 'done' ? new Date().toISOString() : null;

      const stmt = db.prepare(`
        INSERT INTO tasks (
          phase_id, title, description, status, position,
          estimated_hours, due_date, pinned_due_date, alura_url,
          completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const result = stmt.run(
        data.phase_id,
        data.title,
        data.description || null,
        status,
        pos,
        data.estimated_hours || 0,
        data.due_date || null,
        data.pinned_due_date ? 1 : 0,
        data.alura_url || null,
        completedAt
      );

      const taskId = Number(result.lastInsertRowid);

      if (data.stack_ids && data.stack_ids.length > 0) {
        const insertStack = db.prepare('INSERT OR IGNORE INTO task_stacks (task_id, stack_id) VALUES (?, ?)');
        for (const stackId of data.stack_ids) {
          insertStack.run(taskId, stackId);
        }
      }

      return taskId;
    })();

    // Auto-reschedule pending tasks
    new RescheduleService().rescheduleAll();

    return this.getTaskById(createdId)!;
  }

  updateTask(id: number, data: {
    phase_id?: number;
    title?: string;
    description?: string | null;
    status?: 'todo' | 'in_progress' | 'done';
    position?: number;
    estimated_hours?: number;
    due_date?: string | null;
    pinned_due_date?: boolean;
    alura_url?: string | null;
    stack_ids?: number[];
  }): TaskDto {
    const db = getDb();
    const current = this.getTaskById(id);
    if (!current) {
      throw new Error(`Task ${id} not found`);
    }

    db.transaction(() => {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.phase_id !== undefined) {
        updates.push('phase_id = ?');
        params.push(data.phase_id);
      }
      if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
      }
      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
        if (data.status === 'done' && current.status !== 'done') {
          updates.push('completed_at = datetime(\'now\')');
        } else if (data.status !== 'done' && current.status === 'done') {
          updates.push('completed_at = NULL');
        }
      }
      if (data.position !== undefined) {
        updates.push('position = ?');
        params.push(data.position);
      }
      if (data.estimated_hours !== undefined) {
        updates.push('estimated_hours = ?');
        params.push(data.estimated_hours);
      }
      if (data.due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(data.due_date);
      }
      if (data.pinned_due_date !== undefined) {
        updates.push('pinned_due_date = ?');
        params.push(data.pinned_due_date ? 1 : 0);
      }
      if (data.alura_url !== undefined) {
        updates.push('alura_url = ?');
        params.push(data.alura_url);
      }

      updates.push('updated_at = datetime(\'now\')');

      if (updates.length > 1) { // more than just updated_at
        params.push(id);
        db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      if (data.stack_ids !== undefined) {
        db.prepare('DELETE FROM task_stacks WHERE task_id = ?').run(id);
        const insertStack = db.prepare('INSERT OR IGNORE INTO task_stacks (task_id, stack_id) VALUES (?, ?)');
        for (const stackId of data.stack_ids) {
          insertStack.run(id, stackId);
        }
      }
    })();

    // Auto-reschedule pending tasks
    new RescheduleService().rescheduleAll();

    return this.getTaskById(id)!;
  }

  deleteTask(id: number): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    if (result.changes > 0) {
      new RescheduleService().rescheduleAll();
      return true;
    }
    return false;
  }

  reorderTasks(phase_id: number, items: Array<{ id: number; position: number }>): void {
    const db = getDb();
    db.transaction(() => {
      const stmt = db.prepare('UPDATE tasks SET position = ?, updated_at = datetime(\'now\') WHERE id = ? AND phase_id = ?');
      for (const item of items) {
        stmt.run(item.position, item.id, phase_id);
      }
    })();

    new RescheduleService().rescheduleAll();
  }
}
