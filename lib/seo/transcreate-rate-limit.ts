import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const DAILY_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TranscreateRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkTranscreateRateLimit(
  websiteId: string,
  targetLocale: string,
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
): Promise<TranscreateRateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();

  const { data, count } = await supabase
    .from('seo_transcreation_jobs')
    .select('created_at', { count: 'exact' })
    .eq('website_id', websiteId)
    .eq('target_locale', targetLocale)
    .eq('ai_generated', true)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: true })
    .limit(DAILY_LIMIT);

  const used = Number(count ?? data?.length ?? 0);
  const remaining = Math.max(0, DAILY_LIMIT - used);

  if (used < DAILY_LIMIT) {
    return {
      allowed: true,
      remaining,
      resetAt: new Date(now.getTime() + WINDOW_MS),
    };
  }

  const first = data?.[0] as { created_at?: string } | undefined;
  const firstCreatedAt = first?.created_at ? new Date(first.created_at).getTime() : now.getTime();

  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(firstCreatedAt + WINDOW_MS),
  };
}
