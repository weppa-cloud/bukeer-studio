import type { NextRequest } from 'next/server';
import { apiError, apiInternalError, apiSuccess, apiValidationError } from '@/lib/api/response';
import { createLogger } from '@/lib/logger';
import { SeoApiError } from '@/lib/seo/errors';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  buildPlatformGoalDryRun,
  PlatformGoalRequestSchema,
} from '@/lib/growth/platform-goals/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('growth.platform-goals.dry-run');

export async function POST(request: NextRequest): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Request body must be valid JSON', 400);
  }

  const parsed = PlatformGoalRequestSchema.safeParse(raw);
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const access = await requireWebsiteAccess(parsed.data.website_id);
    const supabase = createSupabaseServiceRoleClient();
    const { plan, runId } = await buildPlatformGoalDryRun({
      supabase,
      tenant: {
        accountId: access.accountId,
        websiteId: access.websiteId,
      },
      platforms: parsed.data.platforms,
      userId: access.userId,
      writeAudit: true,
    });

    return apiSuccess({ plan, runId });
  } catch (error) {
    if (error instanceof SeoApiError) {
      return apiError(error.code, error.message, error.status, error.details);
    }
    log.error('platform goal dry-run failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiInternalError('Unable to build platform goal dry-run');
  }
}

