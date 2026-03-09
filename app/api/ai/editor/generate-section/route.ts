import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { SECTION_TYPES } from '@bukeer/website-contract';

const sectionContentSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .optional(),
  cta: z
    .object({
      text: z.string(),
      url: z.string().optional(),
    })
    .optional(),
  backgroundImage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000).toString() },
      }
    );
  }

  try {
    const body = await request.json();
    const { sectionType, prompt, locale = 'es', websiteContext } = body;

    if (!sectionType || !SECTION_TYPES.includes(sectionType)) {
      return NextResponse.json(
        { error: `Invalid sectionType. Valid: ${SECTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250514'),
      schema: sectionContentSchema,
      prompt: `Generate content for a "${sectionType}" website section.
Website context: ${JSON.stringify(websiteContext ?? {})}
User instructions: ${prompt ?? 'Generate engaging content for a travel agency website.'}
Language: ${locale}

Generate professional, engaging content appropriate for the section type.
For items arrays, generate 3-6 items with descriptive titles and descriptions.
Keep text concise and action-oriented.`,
    });

    // Estimate cost (~$0.003 per call for Sonnet)
    await recordCost(auth.accountId, 0.003);

    return NextResponse.json({
      content: result.object,
      sectionType,
      usage: result.usage,
    });
  } catch (err) {
    console.error('[AI] generate-section error:', err);
    return NextResponse.json(
      { error: 'Failed to generate section content' },
      { status: 500 }
    );
  }
}
