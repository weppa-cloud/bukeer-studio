import { createClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitDeps {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export async function checkRateLimit(
  config: RateLimitConfig,
  deps: RateLimitDeps,
): Promise<RateLimitResult> {
  const client = createClient(deps.supabaseUrl, deps.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  const { data: existing, error: countError } = await client
    .from('public_rate_limits')
    .select('id,request_count')
    .eq('scope', config.scope)
    .eq('key', config.key)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();

  if (countError) {
    console.warn('[rate-limit] lookup failed, failing open', {
      scope: config.scope,
      key: config.key,
      error: countError.message,
    });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  const currentCount = existing?.request_count ?? 0;
  if (currentCount >= config.limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  if (existing) {
    await client
      .from('public_rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('id', existing.id);
  } else {
    await client.from('public_rate_limits').insert({
      scope: config.scope,
      key: config.key,
      window_start: windowStart.toISOString(),
      request_count: 1,
    });
  }

  return {
    allowed: true,
    remaining: config.limit - currentCount - 1,
    resetAt,
  };
}

export function extractClientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
