import 'dotenv/config';
import Fastify from 'fastify';
import path from 'node:path';
import fs from 'node:fs';
import fastifyStatic from '@fastify/static';
import { runMigrations } from './db/migrator.js';
import { runSeed } from './db/seed.js';

import { tasksRoute } from './routes/tasks.route.js';
import { sessionsRoute } from './routes/sessions.route.js';
import { metricsRoute } from './routes/metrics.route.js';
import { metadataRoute } from './routes/metadata.route.js';

export async function buildServer() {
  // Ensure database schema and seed are ready
  try {
    runMigrations();
    runSeed();
  } catch (err) {
    console.error('Database migration/seed warning:', err);
  }

  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test'
  });

  // Health check endpoint
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register API routes
  await app.register(tasksRoute, { prefix: '/api/tasks' });
  await app.register(sessionsRoute, { prefix: '/api/sessions' });
  await app.register(metricsRoute, { prefix: '/api/metrics' });
  await app.register(metadataRoute, { prefix: '/api' });

  // Serve static Angular SPA if public directory exists
  const publicPath = path.resolve(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    await app.register(fastifyStatic, {
      root: publicPath,
      prefix: '/',
      wildcard: false
    });

    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'Endpoint not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  return app;
}

const isDirectRun = Boolean(process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js') || process.argv[1].includes('server')));

if (isDirectRun && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';

  buildServer()
    .then(async (app) => {
      try {
        await app.listen({ port, host });
        console.log(`Server listening at http://${host}:${port}`);
      } catch (err) {
        app.log.error(err);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
