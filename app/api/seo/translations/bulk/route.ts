import { NextRequest } from 'next/server';
import { TranslationsBulkRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { buildSourceMeta, withNoStoreHeaders } from '@/lib/seo/content-intelligence';
import { applyTranscreateJob, reviewTranscreateJob } from '@/lib/seo/transcreate-workflow';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { isTranscreateV2EnabledForLocale, resolveTranscreateV2Flag } from '@/lib/features/transcreate-v2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = TranslationsBulkRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(
      apiError('VALIDATION_ERROR', 'Invalid translations bulk payload', 400, parsed.error.flatten()),
    );
  }

  const access = await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo/translations/bulk', 'partial');

  const rows: Array<{
    jobId: string;
    success: boolean;
    status: 'reviewed' | 'applied' | null;
    error: string | null;
  }> = [];

  const targetLocaleByJobId = new Map<string, string>();
  if (parsed.data.action === 'apply' && parsed.data.jobIds.length > 0) {
    const { data: jobRows } = await admin
      .from('seo_transcreation_jobs')
      .select('id,target_locale')
      .eq('website_id', parsed.data.websiteId)
      .in('id', parsed.data.jobIds);

    for (const row of (jobRows ?? []) as Array<{ id: string; target_locale: string | null }>) {
      if (typeof row.target_locale === 'string' && row.target_locale.trim().length > 0) {
        targetLocaleByJobId.set(row.id, row.target_locale);
      }
    }
  }

  for (const jobId of parsed.data.jobIds) {
    let fullContractEnabled: boolean | undefined;
    if (parsed.data.action === 'apply') {
      const targetLocale = targetLocaleByJobId.get(jobId);
      if (targetLocale) {
        const flag = await resolveTranscreateV2Flag(admin, parsed.data.websiteId, targetLocale);
        fullContractEnabled = isTranscreateV2EnabledForLocale(flag);
      }
    }

    const result =
      parsed.data.action === 'review'
        ? await reviewTranscreateJob({
            admin,
            sourceMeta,
            websiteId: parsed.data.websiteId,
            actorUserId: access.userId,
            jobId,
          })
        : await applyTranscreateJob({
            admin,
            sourceMeta,
            websiteId: parsed.data.websiteId,
            accountId: access.accountId,
            actorUserId: access.userId,
            jobId,
            fullContractEnabled,
            selectedFields: parsed.data.fields,
          });

    if (result.ok) {
      rows.push({
        jobId,
        success: true,
        status: result.job.status,
        error: null,
      });
      continue;
    }

    rows.push({
      jobId,
      success: false,
      status: null,
      error: result.error.message,
    });
  }

  const processed = rows.filter((row) => row.success).length;
  const failed = rows.length - processed;

  return withNoStoreHeaders(
    apiSuccess({
      websiteId: parsed.data.websiteId,
      action: parsed.data.action,
      processed,
      failed,
      rows,
      sourceMeta,
    }),
  );
}
