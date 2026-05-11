import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiInternalError, apiValidationError } from '@/lib/api/response';
import { createLogger } from '@/lib/logger';
import { SeoApiError } from '@/lib/seo/errors';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('growth.platform-goals.apply');

const ApplySchema = z.object({
  website_id: z.string().uuid(),
  plan_hash: z.string().min(32),
  confirmation: z.literal('APPLY_PLATFORM_GOALS'),
});

export async function POST(request: NextRequest): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Request body must be valid JSON', 400);
  }

  const parsed = ApplySchema.safeParse(raw);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const access = await requireWebsiteAccess(parsed.data.website_id);
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from('platform_goal_sync_runs').insert({
      account_id: access.accountId,
      website_id: access.websiteId,
      run_type: 'apply',
      status: 'blocked',
      platforms: [],
      plan_hash: parsed.data.plan_hash,
      actor_user_id: access.userId,
      dry_run: false,
      error: 'PROVIDER_APPLY_NOT_IMPLEMENTED',
      completed_at: new Date().toISOString(),
      plan: {
        reason: 'Apply endpoint is intentionally gated until provider mutation adapters are implemented.',
      },
    });
    if (error) throw error;

    return apiError(
      'PROVIDER_APPLY_NOT_IMPLEMENTED',
      'Dry-run is implemented. External platform mutation is gated until provider apply adapters are implemented.',
      501,
      { status: 'blocked' },
    );
  } catch (error) {
    if (error instanceof SeoApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    log.error('platform goal apply gate failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Unable to record platform goal apply attempt');
  }
}
