import type { z } from 'zod';
import { AiGenerateBlogSchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

export const InputSchema = AiGenerateBlogSchema;

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  return bukeerRequest('/api/ai/editor/generate-blog', { method: 'POST', body: input });
}
