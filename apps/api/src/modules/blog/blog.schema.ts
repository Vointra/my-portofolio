import { z } from 'zod';

const slugField = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung');

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().max(100).optional(),
  tag: z.string().max(100).optional(),
});

export const adminListQuery = listQuery.extend({
  status: z.enum(['draft', 'published']).optional(),
});

const base = z.object({
  title: z.string().trim().min(1).max(200),
  slug: slugField.optional(),
  excerpt: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(200_000),
  status: z.enum(['draft', 'published']).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
});

export const postCreate = base;
export const postPatch = base.partial();

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const slugParam = z.object({ slug: slugField });
export const categoryBody = z.object({ name: z.string().trim().min(1).max(60) });

export type PostCreate = z.infer<typeof postCreate>;
export type PostPatch = z.infer<typeof postPatch>;
