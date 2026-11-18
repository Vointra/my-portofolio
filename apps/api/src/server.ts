import Fastify from 'fastify';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

const app = Fastify({ logger: true });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const mongo = new MongoClient(process.env.MONGODB_URI!);

app.get('/health', async () => {
  await pg.query('SELECT 1');
  await mongo.db().command({ ping: 1 });
  return { status: 'ok', postgres: 'up', mongodb: 'up' };
});

await mongo.connect();
await app.listen({ port: 4000, host: '127.0.0.1' });
