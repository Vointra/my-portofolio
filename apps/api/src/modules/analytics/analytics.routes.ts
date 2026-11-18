import type { FastifyPluginAsync } from 'fastify';
import { collectBody, summaryQuery } from './analytics.schema.js';
import { recordVisit, getSummary } from './analytics.service.js';

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // Publik: dipanggil frontend setiap pindah halaman
  app.post(
    '/analytics/collect',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const b = collectBody.safeParse(req.body);
      if (!b.success) return reply.code(400).send({ error: 'Input tidak valid' });
      await recordVisit({
        path: b.data.path,
        referrer: b.data.referrer,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return reply.code(204).send();
    },
  );

  // Admin: data untuk dashboard
  await app.register(
    async (admin) => {
      admin.addHook('preHandler', app.requireAdmin);
      admin.get('/analytics/summary', async (req, reply) => {
        const q = summaryQuery.safeParse(req.query);
        if (!q.success) return reply.code(400).send({ error: 'Query tidak valid' });
        return getSummary(q.data.days);
      });
    },
    { prefix: '/admin' },
  );
};

export default analyticsRoutes;
