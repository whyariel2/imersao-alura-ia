import { z } from 'zod';

export const CreateStudySessionSchema = z.object({
  task_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  hours: z.number().positive('Hours must be greater than 0'),
  note: z.string().trim().optional().nullable(),
});
