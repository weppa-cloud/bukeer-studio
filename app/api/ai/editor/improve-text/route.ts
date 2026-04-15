import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
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
    const raw = await request.json();
    const parsed = ImproveTextRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { text, action, targetLocale } = parsed.data;

    const systemPrompt = buildImproveTextPrompt(action, targetLocale);

    const result = await generateText({
      model: getEditorModel(),
      system: systemPrompt,
      prompt: text,
    });

    await recordCost(auth.accountId, 0.002);

    return NextResponse.json({
      original: text,
      improved: result.text,
      action,
      usage: result.usage,
    });
  } catch (err) {
    log.error('Improve text failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: 'Failed to improve text' },
      { status: 500 }
    );
  }
}
