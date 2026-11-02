import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { MetricsService } from '../services/metrics.service.js';

export const metricsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const metricsService = new MetricsService();

  // GET /api/metrics/weekly
  fastify.get('/weekly', async (request) => {
    const query = request.query as { date?: string };
    const date = query.date ? new Date(query.date) : new Date();
    const data = metricsService.getWeeklyMetrics(isNaN(date.getTime()) ? new Date() : date);
    return { data };
  });

  // GET /api/metrics/stacks
  fastify.get('/stacks', async () => {
    const data = metricsService.getStackRanking();
    return { data };
  });

  // GET /api/metrics/summary
  fastify.get('/summary', async () => {
    const data = metricsService.getSummaryMetrics();
    return { data };
  });
};
