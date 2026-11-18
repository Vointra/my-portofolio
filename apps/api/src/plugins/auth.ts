import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';

type Role = 'admin' | 'user';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}

export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.jwtAccessSecret,
    sign: { expiresIn: config.accessTtl },
  });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.decorate('requireAdmin', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    if (req.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  });
});
