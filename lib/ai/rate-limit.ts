import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Rate limiter using Supabase table.
 * No Redis dependency — keeps infrastructure simple.
 *
 * Table: ai_rate_limits (auto-created via migration)
 *   - id: uuid
 *   - key: text (account_id or IP)
 *   - window_start: timestamptz
 *   - request_count: int
 *   - cost_usd: numeric
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

const LIMITS = {
  editor: { requestsPerMinute: 20, costPerDayUsd: 5.0 },
  public: { requestsPerMinute: 5, costPerDayUsd: 1.0 },
  copilot: { requestsPerMinute: 10, costPerDayUsd: 10.0 },
} as const;

type LimitTier = keyof typeof LIMITS;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Check and increment rate limit for a given key.
 * Uses upsert with a 1-minute sliding window.
 */
export async function checkRateLimit(
  key: string,
  tier: LimitTier
): Promise<RateLimitResult> {
  const limit = LIMITS[tier];
  const supabase = getServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000); // 1 minute ago

  // Get current count in window
  const { data: existing } = await supabase
    .from('ai_rate_limits')
    .select('id, request_count, window_start')
    .eq('key', key)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.request_count >= limit.requestsPerMinute) {
    const resetAt = new Date(
      new Date(existing.window_start).getTime() + 60_000
    );
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      reason: `Rate limit exceeded: ${limit.requestsPerMinute} req/min`,
    };
  }

  // Check daily cost cap
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const { data: dailyCost } = await supabase
    .from('ai_rate_limits')
    .select('cost_usd')
    .eq('key', key)
    .gte('window_start', dayStart.toISOString())
    .then((res) => ({
      data: {
        total: (res.data ?? []).reduce(
          (sum, r) => sum + ((r.cost_usd as number) ?? 0),
          0
        ),
      },
    }));

  if (dailyCost && dailyCost.total >= limit.costPerDayUsd) {
    const tomorrow = new Date(dayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow,
      reason: `Daily cost cap exceeded: $${limit.costPerDayUsd}/day`,
    };
  }

  // Increment or create
  if (existing) {
    await supabase
      .from('ai_rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_rate_limits').insert({
      key,
      window_start: now.toISOString(),
      request_count: 1,
      cost_usd: 0,
    });
  }

  const remaining = limit.requestsPerMinute - (existing?.request_count ?? 0) - 1;
  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    resetAt: new Date(now.getTime() + 60_000),
  };
}

/**
 * Cleanup old rate limit entries (older than 48h).
 * Call periodically or before heavy operations.
 */
export async function cleanupStaleEntries(): Promise<number> {
  const supabase = getServiceClient();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago

  const { data } = await supabase
    .from('ai_rate_limits')
    .delete()
    .lt('window_start', cutoff.toISOString())
    .select('id');

  return data?.length ?? 0;
}

/**
 * Record cost for a completed AI request.
 */
export async function recordCost(key: string, costUsd: number): Promise<void> {
  const supabase = getServiceClient();
  const now = new Date();

  // Find the most recent rate limit entry for this key
  const { data: entry } = await supabase
    .from('ai_rate_limits')
    .select('id, cost_usd')
    .eq('key', key)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (entry) {
    await supabase
      .from('ai_rate_limits')
      .update({ cost_usd: ((entry.cost_usd as number) ?? 0) + costUsd })
      .eq('id', entry.id);
  }
}
