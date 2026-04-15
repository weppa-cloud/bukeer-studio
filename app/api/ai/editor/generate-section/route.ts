import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/api';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { SECTION_TYPES } from '@bukeer/website-contract';
import { buildSectionGeneratorPrompt } from '@/lib/ai/prompts';

const log = createLogger('api.ai.generateSection');

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
  if (!auth) return apiUnauthorized();
  if (!hasEditorRole(auth)) return apiForbidden();

  const rateCheck = await checkRateLimit(auth.accountId, 'editor');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  try {
    const body = await request.json();
    const { sectionType, prompt, locale = 'es', websiteContext } = body;

    // Input length guard
    const promptText = prompt ?? '';
    if (typeof promptText === 'string' && promptText.length > 2000) {
      return apiError('VALIDATION_ERROR', 'Prompt too long (max 2000 chars)');
    }

    if (!sectionType || !SECTION_TYPES.includes(sectionType)) {
      return apiError('VALIDATION_ERROR', `Invalid sectionType. Valid: ${SECTION_TYPES.join(', ')}`);
    }

    const result = await generateObject({
      model: getEditorModel(),
      schema: sectionContentSchema,
      prompt: buildSectionGeneratorPrompt({
        sectionType,
        websiteContext,
        prompt,
        locale,
      }),
    });

    // Estimate cost (~$0.003 per call for Sonnet)
    await recordCost(auth.accountId, 0.003);

    return apiSuccess({
      content: result.object,
      sectionType,
      usage: result.usage,
    });
  } catch (err) {
    log.error('Generate section failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to generate section content');
  }
}
