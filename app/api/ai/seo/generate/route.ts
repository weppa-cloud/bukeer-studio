import { NextRequest, NextResponse } from 'next/server';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import {
  seoGenerateRequestSchema,
  seoGenerateResponseSchema,
  getSeoSystemPrompt,
  buildSeoUserPrompt,
} from '@/lib/ai/seo-prompts';

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
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateCheck.resetAt.getTime() - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parsed = seoGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const systemPrompt = getSeoSystemPrompt(data.itemType, data.locale ?? 'es');
    const userPrompt = buildSeoUserPrompt(data);

    const result = await generateObject({
      model: getEditorModel(),
      schema: seoGenerateResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    await recordCost(auth.accountId, 0.003);

    return NextResponse.json({
      ...result.object,
      usage: result.usage,
    });
  } catch (err) {
    console.error('[AI] seo/generate error:', err);
    return NextResponse.json(
      { error: 'Error al generar sugerencias SEO' },
      { status: 500 }
    );
  }
}
