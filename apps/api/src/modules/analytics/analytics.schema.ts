import { z } from 'zod';

export const collectBody = z.object({
  path: z.string().min(1).max(200).startsWith('/'),
  referrer: z.string().max(500).optional(),
});

export const summaryQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});
