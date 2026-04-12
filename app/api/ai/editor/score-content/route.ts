/**
 * Content Scoring API — POST /api/ai/editor/score-content
 *
 * Algorithmic scoring engine. No LLM calls. Cost: $0/request.
 * Auth: getEditorAuth (same as generate-blog)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { scoreContent } from '@/lib/blog/content-scorer';

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
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasEditorRole(auth)) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  try {
    const raw = await request.json();
    const parsed = ScoreContentRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = scoreContent(parsed.data);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Score] score-content error:', err);
    return NextResponse.json(
      { error: 'Failed to score content' },
      { status: 500 }
    );
  }
}
