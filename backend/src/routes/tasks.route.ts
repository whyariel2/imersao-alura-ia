import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TaskService } from '../services/task.service.js';
import { RescheduleService } from '../services/reschedule.service.js';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  ReorderTasksSchema,
  TaskFilterQuerySchema,
} from '../schemas/task.schema.js';

export const tasksRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const taskService = new TaskService();
  const rescheduleService = new RescheduleService();

  // POST /api/tasks/reschedule
  fastify.post('/reschedule', async () => {
    const results = rescheduleService.rescheduleAll();
    const tasks = taskService.listTasks();
    return { data: { results, tasks } };
  });

  // GET /api/tasks
  fastify.get('/', async (request, reply) => {
    const parseResult = TaskFilterQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.format(),
      });
    }

    const tasks = taskService.listTasks(parseResult.data);
    return { data: tasks };
  });

  // GET /api/tasks/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task ID' });
    }

    const task = taskService.getTaskById(id);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return { data: task };
  });

  // POST /api/tasks
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateTaskSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const task = taskService.createTask(parseResult.data);
      return reply.status(201).send({ data: task });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // PUT /api/tasks/:id
  fastify.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task ID' });
    }

    const parseResult = UpdateTaskSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const task = taskService.updateTask(id, parseResult.data);
      return { data: task };
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  // PATCH /api/tasks/:id/status
  fastify.patch<{ Params: { id: string } }>('/:id/status', async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task ID' });
    }

    const parseResult = UpdateTaskStatusSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const task = taskService.updateTask(id, { status: parseResult.data.status });
      return { data: task };
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  // PATCH /api/tasks/reorder
  fastify.patch('/reorder', async (request, reply) => {
    const parseResult = ReorderTasksSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    taskService.reorderTasks(parseResult.data.phase_id, parseResult.data.items);
    return { success: true };
  });

  // DELETE /api/tasks/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid task ID' });
    }

    const deleted = taskService.deleteTask(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return reply.status(204).send();
  });
};
