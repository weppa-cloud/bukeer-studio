import type { z } from 'zod';
import { SeoTranscreateSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoTranscreateSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/content-intelligence/transcreate', {
    method: 'POST',
    body: input,
  });
}
