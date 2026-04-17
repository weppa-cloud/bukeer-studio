import { z } from 'zod';
import { SeoAuditRunSchema, SeoAuditQuerySchema } from '../schemas.js';
import { bukeerRequest } from '../client.js';

/**
 * Two modes:
 *  - op='run'  → POST /api/seo/content-intelligence/audit (re-audits)
 *  - op='read' → GET  /api/seo/content-intelligence/audit (findings)
 */
export const InputSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('run') }).merge(SeoAuditRunSchema),
  z.object({ op: z.literal('read') }).merge(SeoAuditQuerySchema),
]);

export async function handler(input: z.infer<typeof InputSchema>): Promise<unknown> {
  if (input.op === 'run') {
    const { op: _, ...body } = input;
    return bukeerRequest('/api/seo/content-intelligence/audit', { method: 'POST', body });
  }
  const { op: _, ...q } = input;
  return bukeerRequest('/api/seo/content-intelligence/audit', { method: 'GET', query: q });
}
