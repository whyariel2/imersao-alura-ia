import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/client.js';
import { UpdateSettingsSchema } from '../schemas/settings.schema.js';
import { RescheduleService } from '../services/reschedule.service.js';

export const metadataRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/phases
  fastify.get('/phases', async () => {
    const db = getDb();
    const phases = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.position,
        COUNT(t.id) as tasks_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
      FROM phases p
      LEFT JOIN tasks t ON t.phase_id = p.id
      GROUP BY p.id
      ORDER BY p.position ASC
    `).all() as any[];

    return {
      data: phases.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        position: p.position,
        tasks_count: Number(p.tasks_count) || 0,
        done_count: Number(p.done_count) || 0,
      }))
    };
  });

  // GET /api/stacks
  fastify.get('/stacks', async () => {
    const db = getDb();
    const stacks = db.prepare(`
      SELECT id, name, color
      FROM stacks
      ORDER BY name ASC
    `).all();

    return { data: stacks };
  });

  // GET /api/settings
  fastify.get('/settings', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, any> = {};
    for (const r of rows) {
      if (r.key === 'weekly_capacity_hours') {
        settings[r.key] = Number(r.value) || 10;
      } else {
        settings[r.key] = r.value;
      }
    }
    return { data: settings };
  });

  // PUT /api/settings
  fastify.put('/settings', async (request, reply) => {
    const parseResult = UpdateSettingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const db = getDb();
    const updates = parseResult.data;

    db.transaction(() => {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (updates.weekly_capacity_hours !== undefined) {
        stmt.run('weekly_capacity_hours', String(updates.weekly_capacity_hours));
      }
      if (updates.theme !== undefined) {
        stmt.run('theme', updates.theme);
      }
      if (updates.start_date !== undefined) {
        stmt.run('start_date', updates.start_date);
      }
    })();

    if (updates.weekly_capacity_hours !== undefined) {
      new RescheduleService().rescheduleAll();
    }

    // Return updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, any> = {};
    for (const r of rows) {
      if (r.key === 'weekly_capacity_hours') {
        settings[r.key] = Number(r.value) || 10;
      } else {
        settings[r.key] = r.value;
      }
    }

    return { data: settings };
  });
};
