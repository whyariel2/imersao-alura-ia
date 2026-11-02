import angular from '@analogjs/vite-plugin-angular';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { buildServer } from './backend/src/server.js';

function fastifyDevPlugin(): Plugin {
  return {
    name: 'fastify-dev-backend',
    async configureServer(server) {
      try {
        const app = await buildServer();
        await app.ready();
        console.log('[DevPath] Fastify API middleware attached to Vite dev server');

        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            try {
              const chunks: Buffer[] = [];
              req.on('data', (chunk: Buffer) => chunks.push(chunk));
              req.on('end', async () => {
                const body = chunks.length > 0 ? Buffer.concat(chunks).toString() : undefined;
                const response = await app.inject({
                  method: req.method as any,
                  url: req.url!,
                  headers: req.headers as any,
                  payload: body,
                });

                res.statusCode = response.statusCode;
                for (const [key, value] of Object.entries(response.headers)) {
                  if (value !== undefined) {
                    res.setHeader(key, value as string);
                  }
                }
                res.end(response.payload);
              });
            } catch (err) {
              next(err);
            }
          } else {
            next();
          }
        });
      } catch (err) {
        console.error('[DevPath] Failed to initialize Fastify middleware in Vite:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      angular({
        tsconfig: './tsconfig.app.json',
      }),
      fastifyDevPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: {
      port: 3000,
      host: '127.0.0.1',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
