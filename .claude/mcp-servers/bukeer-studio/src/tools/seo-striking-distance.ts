import type { z } from 'zod';
import { SeoStrikingDistanceSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoStrikingDistanceSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/analytics/striking-distance', {
    method: 'GET',
    query: input,
  });
}
