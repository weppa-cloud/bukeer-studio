import type { z } from 'zod';
import { SeoResearchSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoResearchSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/content-intelligence/research', {
    method: 'POST',
    body: input,
  });
}
