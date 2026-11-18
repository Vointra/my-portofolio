import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../../config.js';
import { pg } from '../../db.js';
import {
  verifyCredentials,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from './auth.service.js';

const COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/auth';

const loginBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

const authRoutes: FastifyPluginAsync = async (app) => {
  const setRefreshCookie = (reply: import('fastify').FastifyReply, token: string) =>
    reply.setCookie(COOKIE, token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: config.refreshTtlMs / 1000,
    });

  app.post(
    '/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Input tidak valid' });

      const user = await verifyCredentials(parsed.data.email, parsed.data.password);
      if (!user) return reply.code(401).send({ error: 'Email atau password salah' });

      const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
      const refreshToken = await issueRefreshToken(user.id, req.headers['user-agent']);
      setRefreshCookie(reply, refreshToken);
      return { accessToken, user: { id: user.id, role: user.role } };
    },
  );

  app.post('/refresh', async (req, reply) => {
    const token = req.cookies[COOKIE];
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });

    const result = await rotateRefreshToken(token, req.headers['user-agent']);
    if (!result) {
      reply.clearCookie(COOKIE, { path: COOKIE_PATH });
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const accessToken = app.jwt.sign({ sub: result.userId, role: result.role });
    setRefreshCookie(reply, result.refreshToken);
    return { accessToken };
  });

  app.post('/logout', async (req, reply) => {
    const token = req.cookies[COOKIE];
    if (token) await revokeRefreshToken(token);
    reply.clearCookie(COOKIE, { path: COOKIE_PATH });
    return reply.code(204).send();
  });

  app.get('/me', { preHandler: app.authenticate }, async (req, reply) => {
    const { rows } = await pg.query(
      'SELECT id, email, display_name, role FROM users WHERE id = $1',
      [req.user.sub],
    );
    if (!rows[0]) return reply.code(404).send({ error: 'User tidak ditemukan' });
    return rows[0];
  });
};

export default authRoutes;
