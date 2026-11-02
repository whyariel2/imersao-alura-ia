export interface Stack {
  id: number;
  name: string;
  color: string;
}

export interface Phase {
  id: number;
  name: string;
  description: string | null;
  position: number;
  tasks_count: number;
  done_count: number;
}

export interface AppSettings {
  weekly_capacity_hours: number;
  theme: 'light' | 'dark';
  start_date?: string;
}

export interface StudySession {
  id: number;
  task_id: number;
  task_title?: string;
  date: string;
  hours: number;
  note: string | null;
}

export interface CreateSessionPayload {
  task_id: number;
  date: string;
  hours: number;
  note?: string | null;
}
