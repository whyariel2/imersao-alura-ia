import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SessionService } from '../services/session.service.js';
import { CreateStudySessionSchema } from '../schemas/session.schema.js';

export const sessionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const sessionService = new SessionService();

  // POST /api/sessions
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateStudySessionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const session = sessionService.createSession(parseResult.data);
      return reply.status(201).send({ data: session });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // GET /api/sessions/recent
  fastify.get('/recent', async (request, reply) => {
    const sessions = sessionService.listRecentSessions();
    return { data: sessions };
  });

  // GET /api/sessions/task/:taskId
  fastify.get<{ Params: { taskId: string } }>('/task/:taskId', async (request, reply) => {
    const taskId = Number(request.params.taskId);
    if (isNaN(taskId)) {
      return reply.status(400).send({ error: 'Invalid task ID' });
    }

    const sessions = sessionService.listSessionsByTask(taskId);
    return { data: sessions };
  });

  // DELETE /api/sessions/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid session ID' });
    }

    const deleted = sessionService.deleteSession(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return reply.status(204).send();
  });
};
