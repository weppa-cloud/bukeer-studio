import { NextResponse } from 'next/server';

// Runtime defaults to Node — OpenNext converts to Worker runtime for Cloudflare deploy.
// Declaring 'edge' (Next.js Vercel-style) breaks the OpenNext bundle step.

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
