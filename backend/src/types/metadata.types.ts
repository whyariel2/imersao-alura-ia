export interface StackDto {
  id: number;
  name: string;
  color: string;
}

export interface PhaseDto {
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
  [key: string]: any;
}
