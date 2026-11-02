export interface RescheduleTaskInput {
  id: number;
  title?: string;
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  estimated_hours: number;
  spent_hours: number;
  due_date: string | null;
  pinned_due_date: boolean;
}

export interface RescheduleTaskResult {
  id: number;
  due_date: string | null;
  calculated_due_date: string;
  pinned_due_date: boolean;
  at_risk: boolean;
  remaining_hours: number;
}
