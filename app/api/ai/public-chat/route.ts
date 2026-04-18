import { NextRequest, after } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiInternalError } from '@/lib/api';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { z } from 'zod';
import { getClientIp } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { calculateCost } from '@/lib/ai/model-pricing';
import { buildPublicChatPrompt } from '@/lib/ai/prompts';

const PUBLIC_CHAT_MODEL = 'claude-haiku-4-5-20251001';

const log = createLogger('api.ai.publicChat');

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const PublicChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  subdomain: z.string().min(1),
  history: z.array(ChatMessageSchema).max(10).default([]),
  websiteInfo: z
    .object({
      siteName: z.string().optional(),
      tagline: z.string().optional(),
    })
    .optional(),
});

/**
 * Public chat endpoint for website visitors.
 * Uses scoped token (website subdomain) + IP-based rate limiting.
 * 5 req/min per IP, $1/day cost cap.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateCheck = await checkRateLimit(`ip:${ip}`, 'public');
  if (!rateCheck.allowed) {
    return apiError('RATE_LIMITED', rateCheck.reason ?? 'Rate limit exceeded', 429);
  }

  try {
    const raw = await request.json();
    const parsed = PublicChatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request');
    }

    const { message, subdomain, history: safeHistory, websiteInfo } = parsed.data;

    const result = streamText({
      model: anthropic(PUBLIC_CHAT_MODEL),
      system: buildPublicChatPrompt({
        siteName: websiteInfo?.siteName ?? subdomain,
        tagline: websiteInfo?.tagline,
        subdomain,
      }),
      messages: [
        ...safeHistory.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message.slice(0, 2000) },
      ],
      onFinish: ({ usage }) => {
        after(async () => {
          if (!usage) return;
          const cost = calculateCost(PUBLIC_CHAT_MODEL, {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          });
          await recordCost(`ip:${ip}`, cost);
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    log.error('Public chat failed', { error: err instanceof Error ? err.message : String(err) });
    return apiInternalError('Failed to process chat message');
  }
}
