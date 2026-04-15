import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiUnauthorized, apiForbidden, apiError, apiValidationError, apiInternalError } from '@/lib/api';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

import {
  IMPROVEMENT_ACTIONS,
  buildImproveTextPrompt,
} from '@/lib/ai/prompts';

const log = createLogger('api.ai.improveText');

const ImproveTextRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  action: z.enum(IMPROVEMENT_ACTIONS),
  targetLocale: z.string().optional(),
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
    const raw = await request.json();
    const parsed = ImproveTextRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { text, action, targetLocale } = parsed.data;

    const systemPrompt = buildImproveTextPrompt(action, targetLocale);

    const result = await generateText({
      model: getEditorModel(),
      system: systemPrompt,
      prompt: text,
    });

    await recordCost(auth.accountId, 0.002);

    return apiSuccess({
      original: text,
      improved: result.text,
      action,
      usage: result.usage,
    });
  } catch (err) {
    log.error('Improve text failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to improve text');
  }
}
