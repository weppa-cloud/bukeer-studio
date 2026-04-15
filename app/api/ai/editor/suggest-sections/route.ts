import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { SECTION_TYPES } from '@bukeer/website-contract';

const log = createLogger('api.ai.suggestSections');

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      sectionType: z.string(),
      reason: z.string(),
      position: z.enum(['before', 'after']),
      relativeTo: z.string().optional().describe('Section ID to position relative to'),
      priority: z.enum(['high', 'medium', 'low']),
    })
  ),
});

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasEditorRole(auth)) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason },
      { status: 429, headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  try {
    const body = await request.json();
    const { currentSections, websiteContext, goal } = body;

    if (!currentSections || !Array.isArray(currentSections)) {
      return NextResponse.json(
        { error: 'currentSections array is required' },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: getEditorModel(),
      schema: suggestionsSchema,
      prompt: `Analyze a travel agency website and suggest sections to add or improve.

Current sections (in order):
${currentSections.map((s: { sectionType: string; id: string }) => `- ${s.sectionType} (id: ${s.id})`).join('\n')}

Available section types: ${SECTION_TYPES.join(', ')}

Website context: ${JSON.stringify(websiteContext ?? {})}
Goal: ${goal ?? 'Increase conversions and engagement for a travel agency website'}

Suggest 3-5 sections that would improve the website. Consider:
- Missing key sections (hero, testimonials, CTA)
- Section ordering best practices
- Conversion optimization
- User engagement patterns for travel websites
- Don't suggest types already present unless they should be duplicated`,
    });

    await recordCost(auth.accountId, 0.003);

    return NextResponse.json({
      suggestions: result.object.suggestions,
      usage: result.usage,
    });
  } catch (err) {
    log.error('Suggest sections failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
