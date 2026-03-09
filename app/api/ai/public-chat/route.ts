import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { getClientIp } from '@/lib/ai/auth-helpers';
import { checkRateLimit } from '@/lib/ai/rate-limit';

/**
 * Public chat endpoint for website visitors.
 * Uses scoped token (website subdomain) + IP-based rate limiting.
 * 5 req/min per IP, $1/day cost cap.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rateCheck = await checkRateLimit(`ip:${ip}`, 'public');
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
    const { message, subdomain, history = [], websiteInfo } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { error: 'subdomain is required' },
        { status: 400 }
      );
    }

    // Validate history length (prevent context abuse)
    const safeHistory = (history as Array<{ role: string; content: string }>)
      .slice(-10)
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.length <= 2000
      );

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: `You are a helpful travel assistant for ${websiteInfo?.siteName ?? 'a travel agency'}.
Your job is to help website visitors with travel-related questions.
Be friendly, concise, and helpful. Answer in the same language the user writes in.

Website info:
- Name: ${websiteInfo?.siteName ?? subdomain}
- Tagline: ${websiteInfo?.tagline ?? ''}

Guidelines:
- Keep responses under 300 words
- If asked about booking, direct them to the contact form or quote request
- Don't make up specific prices or availability
- Be enthusiastic about travel destinations`,
      messages: [
        ...safeHistory.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message.slice(0, 2000) },
      ],
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('[AI] public-chat error:', err);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
