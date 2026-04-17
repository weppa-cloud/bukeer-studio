import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LeadInputSchema } from '@bukeer/website-contract';
import { checkRateLimit, extractClientIp } from '@/lib/booking/rate-limit';

export const runtime = 'edge';

const RATE_LIMIT = {
  limit: 5,
  windowSeconds: 60,
};

const RETENTION_MONTHS = 18;

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = LeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const ip = extractClientIp(req.headers);
  const rate = await checkRateLimit(
    { scope: 'leads', key: ip, limit: RATE_LIMIT.limit, windowSeconds: RATE_LIMIT.windowSeconds },
    { supabaseUrl, supabaseServiceRoleKey },
  );
  if (!rate.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: rate.resetAt.toISOString() },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + RETENTION_MONTHS);

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const insertPayload = {
    ...parsed.data,
    consent_given_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await client
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !data) {
    console.error('[leads] insert failed', { error: error?.message });
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({
    lead_id: data.id,
    rate_limit: {
      remaining: rate.remaining,
      reset_at: rate.resetAt.toISOString(),
    },
  });
}
