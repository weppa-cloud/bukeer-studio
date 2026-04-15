/**
 * Content Scoring API — POST /api/ai/editor/score-content
 *
 * Algorithmic scoring engine. No LLM calls. Cost: $0/request.
 * Auth: getEditorAuth (same as generate-blog)
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiValidationError, apiInternalError } from '@/lib/api';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { scoreContent } from '@/lib/blog/content-scorer';

const log = createLogger('api.ai.scoreContent');

const ScoreContentRequestSchema = z.object({
  content: z.string().min(1).max(50000),
  title: z.string().min(1),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  locale: z.string().default('es'),
  featuredImage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  try {
    const raw = await request.json();
    const parsed = ScoreContentRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = scoreContent(parsed.data);

    return apiSuccess(result);
  } catch (err) {
    log.error('Score content failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to score content');
  }
}
