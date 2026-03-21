/**
 * Content Scoring API — POST /api/ai/editor/score-content
 *
 * Algorithmic scoring engine. No LLM calls. Cost: $0/request.
 * Auth: getEditorAuth (same as generate-blog)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { scoreContent } from '@/lib/blog/content-scorer';

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasEditorRole(auth)) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { content, title, metaDescription, keywords, faqItems, locale, featuredImage } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (content.length > 50000) {
      return NextResponse.json({ error: 'Content too long (max 50,000 chars)' }, { status: 400 });
    }

    const result = scoreContent({
      content,
      title,
      metaDescription,
      keywords,
      faqItems,
      locale: locale || 'es',
      featuredImage,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Score] score-content error:', err);
    return NextResponse.json(
      { error: 'Failed to score content' },
      { status: 500 }
    );
  }
}
