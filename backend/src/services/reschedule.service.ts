import { getDb } from '../db/client.js';
import { RescheduleTaskInput, RescheduleTaskResult } from '../types/index.js';

/**
 * Pure function to format a Date object as YYYY-MM-DD
 */
export function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure, deterministic function to recalculate task deadlines based on sequential order and weekly capacity.
 * 
 * Rules:
 * 1. Only tasks with status != 'done' are rescheduled.
 * 2. remaining_hours = Math.max(0, estimated_hours - spent_hours).
 * 3. Hours are distributed sequentially starting from today filling weekly capacity (capacity / 7 per day).
 * 4. Tasks with pinned_due_date = true keep their existing due_date. If calculated date > pinned due_date, at_risk = true.
 * 5. Tasks 'done' are never rescheduled.
 */
export function calculateReschedule(
  tasks: RescheduleTaskInput[],
  weeklyCapacityHours: number,
  todayStr: string
): RescheduleTaskResult[] {
  const safeCapacity = weeklyCapacityHours > 0 ? weeklyCapacityHours : 10;
  const dailyCapacity = safeCapacity / 7;

  // Filter only pending/in_progress tasks
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  // Track simulation day and remaining capacity for that day
  const [year, month, day] = todayStr.split('-').map(Number);
  let simulatedDate = new Date(Date.UTC(year, month - 1, day));
  let availableToday = dailyCapacity;

  const results: RescheduleTaskResult[] = [];

  for (const task of pendingTasks) {
    const remainingHours = Math.max(0, task.estimated_hours - task.spent_hours);

    let calculatedDueDateStr: string;

    if (remainingHours <= 0) {
      // If task has 0 remaining hours, it can finish on the current simulated day
      calculatedDueDateStr = formatDate(simulatedDate);
    } else {
      let needed = remainingHours;

      while (needed > 0) {
        if (needed <= availableToday) {
          availableToday -= needed;
          calculatedDueDateStr = formatDate(simulatedDate);
          needed = 0;
        } else {
          needed -= availableToday;
          // Move to next day
          simulatedDate = new Date(simulatedDate.getTime() + 24 * 60 * 60 * 1000);
          availableToday = dailyCapacity;
          calculatedDueDateStr = formatDate(simulatedDate);
        }
      }
    }

    let finalDueDate = calculatedDueDateStr!;
    let atRisk = false;

    if (task.pinned_due_date) {
      // Pinned tasks preserve their due date
      finalDueDate = task.due_date || calculatedDueDateStr!;
      if (task.due_date && calculatedDueDateStr! > task.due_date) {
        atRisk = true;
      }
    }

    results.push({
      id: task.id,
      due_date: finalDueDate,
      calculated_due_date: calculatedDueDateStr!,
      pinned_due_date: task.pinned_due_date,
      at_risk: atRisk,
      remaining_hours: remainingHours,
    });
  }

  return results;
}

export class RescheduleService {
  /**
   * Recalculates all pending tasks against current database state and updates due_dates.
   */
  rescheduleAll(referenceDateStr?: string): RescheduleTaskResult[] {
    const db = getDb();

    const todayStr = referenceDateStr || formatDate(new Date());

    // 1. Get weekly capacity
    const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('weekly_capacity_hours') as any;
    const weeklyCapacity = settingRow ? Number(settingRow.value) || 10 : 10;

    // 2. Get pending tasks ordered by phase position, then task position
    const rows = db.prepare(`
      SELECT 
        t.id,
        t.title,
        t.status,
        t.position,
        t.estimated_hours,
        COALESCE(SUM(s.hours), 0) as spent_hours,
        t.due_date,
        t.pinned_due_date
      FROM tasks t
      JOIN phases p ON p.id = t.phase_id
      LEFT JOIN study_sessions s ON s.task_id = t.id
      WHERE t.status != 'done'
      GROUP BY t.id
      ORDER BY p.position ASC, t.position ASC
    `).all() as any[];

    const taskInputs: RescheduleTaskInput[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      position: r.position,
      estimated_hours: Number(r.estimated_hours) || 0,
      spent_hours: Number(r.spent_hours) || 0,
      due_date: r.due_date,
      pinned_due_date: Boolean(r.pinned_due_date),
    }));

    // 3. Compute pure reschedule
    const results = calculateReschedule(taskInputs, weeklyCapacity, todayStr);

    // 4. Persist newly calculated due dates for non-pinned tasks
    db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE tasks 
        SET due_date = ?, updated_at = datetime('now')
        WHERE id = ? AND pinned_due_date = 0
      `);

      for (const res of results) {
        if (!res.pinned_due_date) {
          updateStmt.run(res.due_date, res.id);
        }
      }
    })();

    return results;
  }
}
