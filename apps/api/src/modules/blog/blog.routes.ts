import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { z } from 'zod';
import { slugify } from '../../lib/slug.js';
import {
  listQuery, adminListQuery, postCreate, postPatch,
  idParam, slugParam, categoryBody,
} from './blog.schema.js';
import * as svc from './blog.service.js';

const invalid = (reply: FastifyReply, err: z.ZodError) =>
  reply.code(400).send({
    error: 'Input tidak valid',
    details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });

function handleDbError(err: unknown, reply: FastifyReply) {
  switch ((err as { code?: string })?.code) {
    case '23505':
      return reply.code(409).send({ error: 'Slug atau nama sudah dipakai' });
    case '23503':
      return reply.code(400).send({ error: 'Referensi tidak valid (kategori tidak ditemukan)' });
    default:
      throw err;
  }
}

const blogRoutes: FastifyPluginAsync = async (app) => {
  // ---------- Publik ----------
  app.get('/posts', async (req, reply) => {
    const q = listQuery.safeParse(req.query);
    if (!q.success) return invalid(reply, q.error);
    return svc.listPosts({ ...q.data, publicOnly: true });
  });

  app.get('/posts/:slug', async (req, reply) => {
    const p = slugParam.safeParse(req.params);
    if (!p.success) return invalid(reply, p.error);
    const post = await svc.getPost({ slug: p.data.slug }, true);
    if (!post) return reply.code(404).send({ error: 'Post tidak ditemukan' });
    return post;
  });

  app.get('/categories', () => svc.listCategories());
  app.get('/tags', () => svc.listTags());

  // ---------- Admin ----------
  await app.register(
    async (admin) => {
      admin.addHook('preHandler', app.requireAdmin);

      admin.get('/posts', async (req, reply) => {
        const q = adminListQuery.safeParse(req.query);
        if (!q.success) return invalid(reply, q.error);
        return svc.listPosts({ ...q.data, publicOnly: false });
      });

      admin.get('/posts/:id', async (req, reply) => {
        const p = idParam.safeParse(req.params);
        if (!p.success) return invalid(reply, p.error);
        const post = await svc.getPost({ id: p.data.id }, false);
        if (!post) return reply.code(404).send({ error: 'Post tidak ditemukan' });
        return post;
      });

      admin.post('/posts', async (req, reply) => {
        const b = postCreate.safeParse(req.body);
        if (!b.success) return invalid(reply, b.error);
        const slug = b.data.slug ?? slugify(b.data.title);
        if (!slug) return reply.code(400).send({ error: 'Slug tidak dapat dibuat dari judul' });
        try {
          const id = await svc.createPost(req.user.sub, { ...b.data, slug });
          return reply.code(201).send(await svc.getPost({ id }, false));
        } catch (err) {
          return handleDbError(err, reply);
        }
      });

      admin.patch('/posts/:id', async (req, reply) => {
        const p = idParam.safeParse(req.params);
        if (!p.success) return invalid(reply, p.error);
        const b = postPatch.safeParse(req.body);
        if (!b.success) return invalid(reply, b.error);
        if (Object.keys(b.data).length === 0) {
          return reply.code(400).send({ error: 'Tidak ada field yang diubah' });
        }
        try {
          const ok = await svc.updatePost(p.data.id, b.data);
          if (!ok) return reply.code(404).send({ error: 'Post tidak ditemukan' });
          return svc.getPost({ id: p.data.id }, false);
        } catch (err) {
          return handleDbError(err, reply);
        }
      });

      admin.delete('/posts/:id', async (req, reply) => {
        const p = idParam.safeParse(req.params);
        if (!p.success) return invalid(reply, p.error);
        const ok = await svc.deletePost(p.data.id);
        if (!ok) return reply.code(404).send({ error: 'Post tidak ditemukan' });
        return reply.code(204).send();
      });

      admin.post('/categories', async (req, reply) => {
        const b = categoryBody.safeParse(req.body);
        if (!b.success) return invalid(reply, b.error);
        const slug = slugify(b.data.name);
        if (!slug) return reply.code(400).send({ error: 'Nama kategori tidak valid' });
        try {
          return reply.code(201).send(await svc.createCategory(b.data.name, slug));
        } catch (err) {
          return handleDbError(err, reply);
        }
      });

      admin.delete('/categories/:id', async (req, reply) => {
        const p = idParam.safeParse(req.params);
        if (!p.success) return invalid(reply, p.error);
        const ok = await svc.deleteCategory(p.data.id);
        if (!ok) return reply.code(404).send({ error: 'Kategori tidak ditemukan' });
        return reply.code(204).send();
      });
    },
    { prefix: '/admin' },
  );
};

export default blogRoutes;
