import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateText } from 'ai';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import {
  seoGenerateRequestSchema,
  getSeoSystemPrompt,
  buildSeoUserPrompt,
} from '@/lib/ai/seo-prompts';

const log = createLogger('api.seo.generate');

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
    const userPrompt = buildSeoUserPrompt(data) +
      '\n\nResponde SOLO con un JSON valido con esta estructura exacta:\n{"seoTitle":"...","seoDescription":"...","targetKeyword":"...","reasoning":"..."}';

    const result = await generateText({
      model: getEditorModel(),
      system: systemPrompt,
      prompt: userPrompt,
    });

    await recordCost(auth.accountId, 0.003);

    // Parse JSON from LLM response
    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI did not return valid JSON' },
        { status: 502 }
      );
    }

    const parsed_response = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      seoTitle: parsed_response.seoTitle || '',
      seoDescription: parsed_response.seoDescription || '',
      targetKeyword: parsed_response.targetKeyword || '',
      reasoning: parsed_response.reasoning || '',
      usage: result.usage,
    });
  } catch (err) {
    log.error('SEO generate failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Error al generar sugerencias SEO' },
      { status: 500 }
    );
  }
}
