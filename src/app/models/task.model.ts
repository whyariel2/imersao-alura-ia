export interface StackSummary {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  phase_id: number;
  phase_name: string;
  phase_position: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  estimated_hours: number;
  spent_hours: number;
  remaining_hours: number;
  due_date: string | null;
  pinned_due_date: boolean;
  alura_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  stacks: StackSummary[];
  at_risk?: boolean;
}

export interface TaskFilterParams {
  phase_id?: number;
  status?: 'todo' | 'in_progress' | 'done';
  stack_id?: number;
  search?: string;
}

export interface CreateTaskPayload {
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
}

export interface UpdateTaskPayload {
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
}
