import { NextRequest, NextResponse } from 'next/server';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { generateText } from 'ai';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';

type ImprovementAction = 'rewrite' | 'shorten' | 'expand' | 'formal' | 'casual' | 'translate';

const VALID_ACTIONS: ImprovementAction[] = [
  'rewrite',
  'shorten',
  'expand',
  'formal',
  'casual',
  'translate',
];

const ACTION_PROMPTS: Record<ImprovementAction, string> = {
  rewrite: 'Rewrite this text to be more engaging and professional, keeping the same meaning.',
  shorten: 'Shorten this text significantly while preserving the key message. Be concise.',
  expand: 'Expand this text with more detail and engaging language. Add supporting points.',
  formal: 'Rewrite this text in a more formal, professional tone.',
  casual: 'Rewrite this text in a friendly, conversational tone.',
  translate: 'Translate this text to the target language while preserving tone and meaning.',
};

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
    const { text, action, targetLocale } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 10000) {
      return NextResponse.json({ error: 'Text too long (max 10000 chars)' }, { status: 400 });
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    let systemPrompt = ACTION_PROMPTS[action as ImprovementAction];
    if (action === 'translate' && targetLocale) {
      systemPrompt += ` Target language: ${targetLocale}`;
    }

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
    console.error('[AI] improve-text error:', err);
    return NextResponse.json(
      { error: 'Failed to improve text' },
      { status: 500 }
    );
  }
}
