import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  weekly_capacity_hours: z.number().positive().max(168).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
