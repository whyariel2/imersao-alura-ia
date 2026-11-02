import { getDb } from '../db/client.js';
import { RescheduleService } from './reschedule.service.js';
import { StudySessionDto, CreateSessionInput } from '../types/index.js';

export class SessionService {
  createSession(data: CreateSessionInput): StudySessionDto {
    const db = getDb();

    // Verify task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(data.task_id);
    if (!task) {
      throw new Error(`Task with id ${data.task_id} does not exist`);
    }

    const stmt = db.prepare(`
      INSERT INTO study_sessions (task_id, date, hours, note)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(data.task_id, data.date, data.hours, data.note || null);
    const id = Number(result.lastInsertRowid);

    // Auto-reschedule pending tasks
    new RescheduleService().rescheduleAll();

    return this.getSessionById(id)!;
  }

  getSessionById(id: number): StudySessionDto | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT s.id, s.task_id, t.title as task_title, s.date, s.hours, s.note
      FROM study_sessions s
      JOIN tasks t ON t.id = s.task_id
      WHERE s.id = ?
    `).get(id) as any;

    if (!row) return null;
    return {
      id: row.id,
      task_id: row.task_id,
      task_title: row.task_title,
      date: row.date,
      hours: Number(row.hours),
      note: row.note,
    };
  }

  listSessionsByTask(taskId: number): StudySessionDto[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.id, s.task_id, t.title as task_title, s.date, s.hours, s.note
      FROM study_sessions s
      JOIN tasks t ON t.id = s.task_id
      WHERE s.task_id = ?
      ORDER BY s.date DESC, s.id DESC
    `).all(taskId) as any[];

    return rows.map(r => ({
      id: r.id,
      task_id: r.task_id,
      task_title: r.task_title,
      date: r.date,
      hours: Number(r.hours),
      note: r.note,
    }));
  }

  listRecentSessions(limit = 20): StudySessionDto[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.id, s.task_id, t.title as task_title, s.date, s.hours, s.note
      FROM study_sessions s
      JOIN tasks t ON t.id = s.task_id
      ORDER BY s.date DESC, s.id DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(r => ({
      id: r.id,
      task_id: r.task_id,
      task_title: r.task_title,
      date: r.date,
      hours: Number(r.hours),
      note: r.note,
    }));
  }

  deleteSession(id: number): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id);
    if (result.changes > 0) {
      new RescheduleService().rescheduleAll();
      return true;
    }
    return false;
  }
}
