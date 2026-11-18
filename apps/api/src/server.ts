import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { pg, mongo } from './db.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
});
await app.register(rateLimit, { global: false });
await app.register(authPlugin);
await app.register(authRoutes, { prefix: '/api/auth' });

app.get('/health', async () => {
  await pg.query('SELECT 1');
  await mongo.db().command({ ping: 1 });
  return { status: 'ok', postgres: 'up', mongodb: 'up' };
});

await mongo.connect();
await app.listen({ port: config.port, host: '127.0.0.1' });
