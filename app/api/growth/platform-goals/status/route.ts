import type { NextRequest } from 'next/server';
import { apiError, apiInternalError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { createLogger } from '@/lib/logger';
import { SeoApiError } from '@/lib/seo/errors';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { PlatformGoalRequestSchema } from '@/lib/growth/platform-goals/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('growth.platform-goals.status');

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? '';
  return candidate.code === '42P01' || message.toLowerCase().includes('does not exist');
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const raw = {
    website_id: url.searchParams.get('website_id') ?? '',
    platforms: url.searchParams.getAll('platforms').length
      ? url.searchParams.getAll('platforms')
      : url.searchParams.get('platform')
        ? [url.searchParams.get('platform')]
        : undefined,
  };
  const parsed = PlatformGoalRequestSchema.safeParse(raw);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const access = await requireWebsiteAccess(parsed.data.website_id);
    const supabase = createSupabaseServiceRoleClient();
    const [bindingsResult, runsResult] = await Promise.all([
      supabase
        .from('platform_goal_bindings')
        .select('*')
        .eq('account_id', access.accountId)
        .or(`website_id.eq.${access.websiteId},website_id.is.null`)
        .in('destination', parsed.data.platforms)
        .order('destination', { ascending: true })
        .order('canonical_event_name', { ascending: true }),
      supabase
        .from('platform_goal_sync_runs')
        .select('id,run_type,status,platforms,plan_hash,dry_run,desired_count,create_count,update_count,keep_count,warning_count,blocked_count,error,created_at,completed_at')
        .eq('account_id', access.accountId)
        .or(`website_id.eq.${access.websiteId},website_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (bindingsResult.error && !isMissingTableError(bindingsResult.error)) {
      throw bindingsResult.error;
    }
    if (runsResult.error && !isMissingTableError(runsResult.error)) {
      throw runsResult.error;
    }

    const bindings = bindingsResult.error ? [] : (bindingsResult.data ?? []);
    const blocked = bindings.filter((row) => row.sync_status === 'blocked').length;
    const watch = bindings.filter((row) => row.sync_status === 'watch').length;
    const health = blocked > 0 ? 'blocked' : watch > 0 ? 'watch' : bindings.length > 0 ? 'healthy' : 'unknown';

    return apiSuccess({
      health,
      bindings,
      recentRuns: runsResult.error ? [] : (runsResult.data ?? []),
      meta: {
        accountId: access.accountId,
        websiteId: access.websiteId,
        platforms: parsed.data.platforms,
        source: bindingsResult.error || runsResult.error ? 'migration_pending' : 'live',
      },
    });
  } catch (error) {
    if (error instanceof SeoApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    log.error('platform goal status failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Unable to read platform goal status');
  }
}
