import type { z } from 'zod';
import { SeoIntegrationsStatusSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = SeoIntegrationsStatusSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/seo/integrations/status', { method: 'GET', query: input });
}
