import { z } from 'zod';

export const TaskStatusEnum = z.enum(['todo', 'in_progress', 'done']);

export const CreateTaskSchema = z.object({
  phase_id: z.number().int().positive(),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional().nullable(),
  status: TaskStatusEnum.default('todo'),
  position: z.number().int().optional(),
  estimated_hours: z.number().nonnegative().default(0),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date must be YYYY-MM-DD').optional().nullable(),
  pinned_due_date: z.boolean().default(false),
  alura_url: z.string().url().optional().nullable(),
  stack_ids: z.array(z.number().int().positive()).default([]),
});

export const UpdateTaskSchema = z.object({
  phase_id: z.number().int().positive().optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  status: TaskStatusEnum.optional(),
  position: z.number().int().optional(),
  estimated_hours: z.number().nonnegative().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  pinned_due_date: z.boolean().optional(),
  alura_url: z.string().url().optional().nullable(),
  stack_ids: z.array(z.number().int().positive()).optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
});

export const ReorderTasksSchema = z.object({
  phase_id: z.number().int().positive(),
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      position: z.number().int().nonnegative(),
    })
  ).min(1),
});

export const TaskFilterQuerySchema = z.object({
  phase_id: z.coerce.number().int().positive().optional(),
  status: TaskStatusEnum.optional(),
  stack_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});
