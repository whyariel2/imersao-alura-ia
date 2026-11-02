import { getDb } from '../db/client.js';
import { WeeklyMetricsDto, StackRankingDto, SummaryMetricsDto } from '../types/index.js';

export class MetricsService {
  getWeeklyMetrics(referenceDate: Date = new Date()): WeeklyMetricsDto {
    const db = getDb();

    // Determine Monday and Sunday of reference week
    const current = new Date(referenceDate);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    // Get weekly target from settings
    const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('weekly_capacity_hours') as any;
    const targetHours = settingRow ? Number(settingRow.value) || 10 : 10;

    // Fetch sessions in range
    const sessions = db.prepare(`
      SELECT date, hours
      FROM study_sessions
      WHERE date >= ? AND date <= ?
    `).all(mondayStr, sundayStr) as Array<{ date: string; hours: number }>;

    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const dailyMap = new Map<string, number>();

    for (const s of sessions) {
      dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + Number(s.hours));
    }

    let totalHours = 0;
    const dailyBreakdown = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayHours = dailyMap.get(dateStr) || 0;
      totalHours += dayHours;

      dailyBreakdown.push({
        date: dateStr,
        day_name: dayLabels[i],
        hours: Math.round(dayHours * 10) / 10,
      });
    }

    const percentage = targetHours > 0 ? Math.min(100, Math.round((totalHours / targetHours) * 100)) : 0;

    return {
      week_start: mondayStr,
      week_end: sundayStr,
      target_hours: targetHours,
      total_hours: Math.round(totalHours * 10) / 10,
      percentage,
      daily_breakdown: dailyBreakdown,
    };
  }

  getStackRanking(): StackRankingDto[] {
    const db = getDb();

    // Ranking of hours by stack
    const rows = db.prepare(`
      SELECT 
        s.id,
        s.name,
        s.color,
        COALESCE(SUM(sess.hours), 0) as total_hours,
        COUNT(DISTINCT ts.task_id) as tasks_count
      FROM stacks s
      LEFT JOIN task_stacks ts ON ts.stack_id = s.id
      LEFT JOIN study_sessions sess ON sess.task_id = ts.task_id
      GROUP BY s.id
      ORDER BY total_hours DESC, s.name ASC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      total_hours: Math.round((Number(r.total_hours) || 0) * 10) / 10,
      tasks_count: Number(r.tasks_count) || 0,
    }));
  }

  getSummaryMetrics(): SummaryMetricsDto {
    const db = getDb();

    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
        COALESCE(SUM(estimated_hours), 0) as total_estimated
      FROM tasks
    `).get() as any;

    const spentRow = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) as total_spent
      FROM study_sessions
    `).get() as any;

    const totalEstimated = Number(counts.total_estimated) || 0;
    const totalSpent = Number(spentRow.total_spent) || 0;
    const totalTasks = Number(counts.total) || 0;
    const doneTasks = Number(counts.done_count) || 0;

    const progressPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return {
      total_tasks: totalTasks,
      todo_tasks: Number(counts.todo_count) || 0,
      in_progress_tasks: Number(counts.in_progress_count) || 0,
      done_tasks: doneTasks,
      total_estimated_hours: totalEstimated,
      total_spent_hours: Math.round(totalSpent * 10) / 10,
      progress_percentage: progressPercentage,
    };
  }
}
