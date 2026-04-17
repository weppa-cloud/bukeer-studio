import type { z } from 'zod';
import { SeoOptimizeSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoOptimizeSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/content-intelligence/optimize', {
    method: 'POST',
    body: input,
  });
}
