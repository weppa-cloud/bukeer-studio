import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiInternalError } from '@/lib/api';
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
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  try {
    const body = await request.json();
    const parsed = seoGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.message);
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
      return apiError('UPSTREAM_ERROR', 'AI did not return valid JSON', 502);
    }

    const parsed_response = JSON.parse(jsonMatch[0]);

    return apiSuccess({
      seoTitle: parsed_response.seoTitle || '',
      seoDescription: parsed_response.seoDescription || '',
      targetKeyword: parsed_response.targetKeyword || '',
      reasoning: parsed_response.reasoning || '',
      usage: result.usage,
    });
  } catch (err) {
    log.error('SEO generate failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Error al generar sugerencias SEO');
  }
}
