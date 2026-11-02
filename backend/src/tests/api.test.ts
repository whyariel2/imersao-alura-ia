import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';

describe('Study Flow API Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health should return ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
  });

  describe('Tasks API', () => {
    let createdTaskId: number;

    it('GET /api/tasks should return list of seeded tasks with derived spent_hours', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const first = body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('spent_hours');
      expect(first).toHaveProperty('remaining_hours');
      expect(first).toHaveProperty('stacks');
    });

    it('POST /api/tasks should validate with Zod and reject empty title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: {
          phase_id: 1,
          title: '', // Invalid empty title
          estimated_hours: 5,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('Validation failed');
    });

    it('POST /api/tasks should create a new task successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: {
          phase_id: 1,
          title: 'Curso Vitest & TDD Completo',
          description: 'Aprender testes unitários e de integração com Vitest',
          estimated_hours: 12,
          stack_ids: [1, 4],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe('Curso Vitest & TDD Completo');
      expect(body.data.estimated_hours).toBe(12);
      expect(body.data.spent_hours).toBe(0);
      expect(body.data.remaining_hours).toBe(12);
      expect(body.data.status).toBe('todo');

      createdTaskId = body.data.id;
    });

    it('PATCH /api/tasks/:id/status should update task status', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        payload: {
          status: 'in_progress',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.status).toBe('in_progress');
    });

    it('POST /api/sessions should log study hours and update derived spent_hours', async () => {
      const sessionRes = await app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: {
          task_id: createdTaskId,
          date: new Date().toISOString().slice(0, 10),
          hours: 3.5,
          note: 'Configuração do ambiente de testes e primeiros asserts',
        },
      });

      expect(sessionRes.statusCode).toBe(201);
      const sessionBody = JSON.parse(sessionRes.payload);
      expect(sessionBody.data.hours).toBe(3.5);

      // Verify task spent_hours derivation
      const taskRes = await app.inject({
        method: 'GET',
        url: `/api/tasks/${createdTaskId}`,
      });

      expect(taskRes.statusCode).toBe(200);
      const taskBody = JSON.parse(taskRes.payload);
      expect(taskBody.data.spent_hours).toBe(3.5);
      expect(taskBody.data.remaining_hours).toBe(8.5); // 12 - 3.5
    });

    it('DELETE /api/tasks/:id should delete task and cascade associated records', async () => {
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${createdTaskId}`,
      });

      expect(delRes.statusCode).toBe(204);

      // Verify task no longer exists
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/tasks/${createdTaskId}`,
      });
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('Metrics API', () => {
    it('GET /api/metrics/weekly should return weekly capacity and hours breakdown', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics/weekly',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveProperty('week_start');
      expect(body.data).toHaveProperty('week_end');
      expect(body.data).toHaveProperty('target_hours');
      expect(body.data).toHaveProperty('daily_breakdown');
      expect(body.data.daily_breakdown.length).toBe(7);
    });

    it('GET /api/metrics/stacks should return ranking of stacks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics/stacks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0]).toHaveProperty('name');
      expect(body.data[0]).toHaveProperty('total_hours');
    });

    it('GET /api/metrics/summary should return general progress counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveProperty('total_tasks');
      expect(body.data).toHaveProperty('todo_tasks');
      expect(body.data).toHaveProperty('total_estimated_hours');
      expect(body.data).toHaveProperty('total_spent_hours');
    });
  });

  describe('Settings API', () => {
    it('GET /api/settings and PUT /api/settings should read and update capacity', async () => {
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/settings',
      });
      expect(getRes.statusCode).toBe(200);
      const initialSettings = JSON.parse(getRes.payload).data;
      expect(initialSettings.weekly_capacity_hours).toBeDefined();

      const putRes = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        payload: {
          weekly_capacity_hours: 15,
        },
      });

      expect(putRes.statusCode).toBe(200);
      const updatedSettings = JSON.parse(putRes.payload).data;
      expect(updatedSettings.weekly_capacity_hours).toBe(15);

      // Revert back to 10
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        payload: { weekly_capacity_hours: 10 },
      });
    });
  });
});
