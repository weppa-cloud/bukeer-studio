import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Deprecated endpoint.
 *
 * We no longer persist website opportunities in a parallel `leads` flow.
 * Capture must go through conversation-first channels (Chatwoot/CRM path).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated endpoint',
      message: 'Use conversation-first capture flow (quote/chat channels).',
    },
    { status: 410 },
  );
}
