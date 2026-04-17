import type { z } from 'zod';
import { SeoScoreSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoScoreSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/score', { method: 'GET', query: input });
}
