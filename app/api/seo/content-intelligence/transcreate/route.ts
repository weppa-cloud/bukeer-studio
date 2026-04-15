import { NextRequest } from 'next/server';
import { SeoTranscreateRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, parseLocaleParts, withNoStoreHeaders } from '@/lib/seo/content-intelligence';

function buildReresearchPayload(input: {
  sourceLocale: string;
  targetLocale: string;
  country: string;
  language: string;
  sourceKeyword?: string;
  targetKeyword?: string;
}) {
  return {
    required: true,
    source_locale: input.sourceLocale,
    target_locale: input.targetLocale,
    country: input.country,
    language: input.language,
    source_keyword: input.sourceKeyword ?? null,
    target_keyword: input.targetKeyword ?? null,
    market_signals: {
      seasonality_status: 'available',
      competitive_status: 'available',
    },
    generated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = SeoTranscreateRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid transcreate payload', 400, parsed.error.flatten()));
  }
  if (parsed.data.sourceLocale === parsed.data.targetLocale) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'sourceLocale and targetLocale must differ', 400));
  }

  const access = await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();
  const sourceMeta = buildSourceMeta('seo-content-intelligence/transcreate', 'partial');
  const localeTuple = parseLocaleParts({
    sourceLocale: parsed.data.sourceLocale,
    targetLocale: parsed.data.targetLocale,
    country: parsed.data.country,
    language: parsed.data.language,
  });

  if (parsed.data.action === 'create_draft') {
    const jobId = crypto.randomUUID();
    const keywordReresearch = buildReresearchPayload({
      sourceLocale: parsed.data.sourceLocale,
      targetLocale: parsed.data.targetLocale,
      country: parsed.data.country,
      language: parsed.data.language,
      sourceKeyword: parsed.data.sourceKeyword,
      targetKeyword: parsed.data.targetKeyword,
    });

    const { data: job, error } = await admin
      .from('seo_transcreation_jobs')
      .insert({
        id: jobId,
        website_id: parsed.data.websiteId,
        page_type: parsed.data.pageType,
        page_id: parsed.data.sourceContentId,
        source_locale: localeTuple.source_locale,
        target_locale: localeTuple.target_locale,
        country: localeTuple.country,
        language: localeTuple.language,
        source_keyword: parsed.data.sourceKeyword ?? null,
        target_keyword: parsed.data.targetKeyword ?? null,
        keyword_reresearch: keywordReresearch,
        status: 'draft',
        payload: parsed.data.draft,
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
        confidence: sourceMeta.confidence,
        created_by: access.userId,
      })
      .select('id, status, source_locale, target_locale, created_at')
      .single();

    if (error || !job) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to create transcreation draft', 500, error?.message));
    }

    await admin
      .from('seo_localized_variants')
      .upsert(
        {
          website_id: parsed.data.websiteId,
          page_type: parsed.data.pageType,
          source_entity_id: parsed.data.sourceContentId,
          target_entity_id: parsed.data.targetContentId ?? null,
          source_locale: localeTuple.source_locale,
          target_locale: localeTuple.target_locale,
          country: localeTuple.country,
          language: localeTuple.language,
          status: 'draft',
          last_job_id: job.id,
          source: sourceMeta.source,
          fetched_at: sourceMeta.fetchedAt,
          confidence: sourceMeta.confidence,
        },
        { onConflict: 'website_id,page_type,source_entity_id,target_locale' },
      );

    return withNoStoreHeaders(apiSuccess({ job, keywordReresearch, sourceMeta }));
  }

  if (!parsed.data.jobId) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'jobId is required for review/apply actions', 400));
  }

  if (parsed.data.action === 'review') {
    const { data: job, error } = await admin
      .from('seo_transcreation_jobs')
      .update({
        status: 'reviewed',
        reviewed_by: access.userId,
        updated_at: new Date().toISOString(),
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
      })
      .eq('id', parsed.data.jobId)
      .eq('website_id', parsed.data.websiteId)
      .select('id, status, source_locale, target_locale, updated_at')
      .single();
    if (error || !job) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to transition transcreation job to reviewed', 500, error?.message));
    }
    await admin
      .from('seo_localized_variants')
      .update({
        status: 'reviewed',
        last_job_id: job.id,
        updated_at: new Date().toISOString(),
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
      })
      .eq('website_id', parsed.data.websiteId)
      .eq('page_type', parsed.data.pageType)
      .eq('source_entity_id', parsed.data.sourceContentId)
      .eq('target_locale', parsed.data.targetLocale);

    return withNoStoreHeaders(apiSuccess({ job, sourceMeta }));
  }

  const { data: currentJob, error: jobReadError } = await admin
    .from('seo_transcreation_jobs')
    .select('id, status, payload, keyword_reresearch')
    .eq('id', parsed.data.jobId)
    .eq('website_id', parsed.data.websiteId)
    .single();
  if (jobReadError || !currentJob) {
    return withNoStoreHeaders(apiError('NOT_FOUND', 'Transcreation job not found', 404));
  }
  if (currentJob.status !== 'reviewed') {
    return withNoStoreHeaders(apiError('TRANSCREATE_REVIEW_REQUIRED', 'Apply is blocked unless job is reviewed', 409));
  }
  if (!currentJob.keyword_reresearch || Object.keys(currentJob.keyword_reresearch as Record<string, unknown>).length === 0) {
    return withNoStoreHeaders(apiError('TARGET_RERESEARCH_REQUIRED', 'Target-market re-research is required before apply', 409));
  }

  const { data: jobApplied, error: applyError } = await admin
    .from('seo_transcreation_jobs')
    .update({
      status: 'applied',
      applied_by: access.userId,
      updated_at: new Date().toISOString(),
      source: sourceMeta.source,
      fetched_at: sourceMeta.fetchedAt,
    })
    .eq('id', parsed.data.jobId)
    .eq('website_id', parsed.data.websiteId)
    .select('id, status, updated_at')
    .single();
  if (applyError || !jobApplied) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to apply transcreation job', 500, applyError?.message));
  }

  await admin
    .from('seo_localized_variants')
    .update({
      status: 'applied',
      last_job_id: parsed.data.jobId,
      updated_at: new Date().toISOString(),
      source: sourceMeta.source,
      fetched_at: sourceMeta.fetchedAt,
    })
    .eq('website_id', parsed.data.websiteId)
    .eq('page_type', parsed.data.pageType)
    .eq('source_entity_id', parsed.data.sourceContentId)
    .eq('target_locale', parsed.data.targetLocale);

  if (parsed.data.pageType === 'blog' && parsed.data.targetContentId) {
    const payload = (currentJob.payload ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof payload.title === 'string') updates.title = payload.title;
    if (typeof payload.seoTitle === 'string') updates.seo_title = payload.seoTitle;
    if (typeof payload.seoDescription === 'string') updates.seo_description = payload.seoDescription;
    if (Object.keys(updates).length > 0) {
      await admin
        .from('website_blog_posts')
        .update(updates)
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.targetContentId);
    }
  } else if (parsed.data.pageType === 'page' && parsed.data.targetContentId) {
    const payload = (currentJob.payload ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof payload.title === 'string') updates.title = payload.title;
    if (typeof payload.seoTitle === 'string') updates.seo_title = payload.seoTitle;
    if (typeof payload.seoDescription === 'string') updates.seo_description = payload.seoDescription;
    if (Object.keys(updates).length > 0) {
      await admin
        .from('website_pages')
        .update(updates)
        .eq('website_id', parsed.data.websiteId)
        .eq('id', parsed.data.targetContentId);
    }
  } else if (parsed.data.pageType === 'destination' && parsed.data.targetContentId) {
    const payload = (currentJob.payload ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof payload.title === 'string') updates.name = payload.title;
    if (typeof payload.seoTitle === 'string') updates.seo_title = payload.seoTitle;
    if (typeof payload.seoDescription === 'string') updates.seo_description = payload.seoDescription;
    if (Object.keys(updates).length > 0) {
      await admin
        .from('destinations')
        .update(updates)
        .eq('id', parsed.data.targetContentId);
    }
  }

  return withNoStoreHeaders(
    apiSuccess({
      job: jobApplied,
      source_locale: parsed.data.sourceLocale,
      target_locale: parsed.data.targetLocale,
      country: parsed.data.country,
      language: parsed.data.language,
      sourceMeta,
    }),
  );
}
