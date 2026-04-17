import type { z } from 'zod';
import { SeoHealthSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoHealthSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/analytics/health', { method: 'GET', query: input });
}
