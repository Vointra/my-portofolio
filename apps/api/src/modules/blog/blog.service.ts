import type { PoolClient } from 'pg';
import { pg } from '../../db.js';
import { slugify } from '../../lib/slug.js';
import type { PostCreate, PostPatch } from './blog.schema.js';

const POST_SELECT = `
  p.id, p.title, p.slug, p.excerpt, p.status, p.published_at, p.created_at, p.updated_at,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  COALESCE(
    (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug) ORDER BY t.name)
       FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id),
    '[]'::json) AS tags`;

type ListOpts = {
  page: number;
  limit: number;
  category?: string;
  tag?: string;
  status?: 'draft' | 'published';
  publicOnly: boolean;
};

export async function listPosts(opts: ListOpts) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (opts.publicOnly) where.push(`p.status = 'published'`);
  else if (opts.status) add('p.status = ?', opts.status);
  if (opts.category) add('c.slug = ?', opts.category);
  if (opts.tag) {
    add(
      `EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id AND t.slug = ?)`,
      opts.tag,
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from = `FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;
  const order = opts.publicOnly ? 'p.published_at DESC, p.id DESC' : 'p.created_at DESC, p.id DESC';

  const total = Number((await pg.query(`SELECT count(*) ${from}`, params)).rows[0].count);

  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await pg.query(
    `SELECT ${POST_SELECT} ${from} ORDER BY ${order}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { items: rows, page: opts.page, limit: opts.limit, total };
}

export async function getPost(by: { slug: string } | { id: number }, publicOnly: boolean) {
  const col = 'slug' in by ? 'p.slug' : 'p.id';
  const val = 'slug' in by ? by.slug : by.id;
  const { rows } = await pg.query(
    `SELECT ${POST_SELECT}, p.content
       FROM posts p LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${col} = $1 ${publicOnly ? `AND p.status = 'published'` : ''}`,
    [val],
  );
  return rows[0] ?? null;
}

async function setTags(client: PoolClient, postId: number, names: string[]) {
  await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
  const unique = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    if (slug && !unique.has(slug)) unique.set(slug, name);
  }
  for (const [slug, name] of unique) {
    const { rows } = await client.query(
      `INSERT INTO tags (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id`,
      [name, slug],
    );
    await client.query(
      'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, rows[0].id],
    );
  }
}

export async function createPost(
  authorId: string,
  input: PostCreate & { slug: string },
): Promise<number> {
  const status = input.status ?? 'draft';
  const publishedAt = status === 'published' ? new Date() : null;
  const client = await pg.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO posts (author_id, category_id, title, slug, excerpt, content, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [authorId, input.categoryId ?? null, input.title, input.slug,
       input.excerpt ?? null, input.content, status, publishedAt],
    );
    const id = Number(rows[0].id);
    await setTags(client, id, input.tags ?? []);
    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePost(id: number, patch: PostPatch): Promise<boolean> {
  const client = await pg.connect();
  try {
    await client.query('BEGIN');
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };

    if (patch.title !== undefined) set('title', patch.title);
    if (patch.slug !== undefined) set('slug', patch.slug);
    if (patch.excerpt !== undefined) set('excerpt', patch.excerpt);
    if (patch.content !== undefined) set('content', patch.content);
    if (patch.categoryId !== undefined) set('category_id', patch.categoryId);
    if (patch.status !== undefined) {
      set('status', patch.status);
      if (patch.status === 'published') sets.push('published_at = COALESCE(published_at, now())');
    }
    sets.push('updated_at = now()');

    params.push(id);
    const res = await client.query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    );
    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    if (patch.tags !== undefined) await setTags(client, id, patch.tags);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function deletePost(id: number): Promise<boolean> {
  const res = await pg.query('DELETE FROM posts WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function listCategories() {
  const { rows } = await pg.query(
    `SELECT c.id, c.name, c.slug,
            count(p.id) FILTER (WHERE p.status = 'published')::int AS post_count
       FROM categories c LEFT JOIN posts p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.name`,
  );
  return rows;
}

export async function listTags() {
  const { rows } = await pg.query(
    `SELECT t.id, t.name, t.slug,
            count(p.id) FILTER (WHERE p.status = 'published')::int AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       LEFT JOIN posts p ON p.id = pt.post_id
      GROUP BY t.id ORDER BY t.name`,
  );
  return rows;
}

export async function createCategory(name: string, slug: string) {
  const { rows } = await pg.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
    [name, slug],
  );
  return rows[0];
}

export async function deleteCategory(id: number): Promise<boolean> {
  const res = await pg.query('DELETE FROM categories WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}
