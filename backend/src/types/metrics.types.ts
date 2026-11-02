export interface DailyBreakdownItem {
  date: string;
  day_name: string;
  hours: number;
}

export interface WeeklyMetricsDto {
  week_start: string;
  week_end: string;
  target_hours: number;
  total_hours: number;
  percentage: number;
  daily_breakdown: DailyBreakdownItem[];
}

export interface StackRankingDto {
  id: number;
  name: string;
  color: string;
  total_hours: number;
  tasks_count: number;
}

export interface SummaryMetricsDto {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  total_estimated_hours: number;
  total_spent_hours: number;
  progress_percentage: number;
}
