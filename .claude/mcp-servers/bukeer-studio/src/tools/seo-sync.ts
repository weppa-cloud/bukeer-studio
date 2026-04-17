import type { z } from 'zod';
import { SeoSyncSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoSyncSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/sync', { method: 'POST', body: input });
}
