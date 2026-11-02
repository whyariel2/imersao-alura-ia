export interface StudySessionDto {
  id: number;
  task_id: number;
  task_title?: string;
  date: string;
  hours: number;
  note: string | null;
}

export interface CreateSessionInput {
  task_id: number;
  date: string;
  hours: number;
  note?: string | null;
}
