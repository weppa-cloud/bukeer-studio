import { NextRequest } from 'next/server';
import { SeoTranscreateRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { enqueueDecisionGradeSync } from '@/lib/seo/decision-grade-sync';
import {
  buildSourceMeta,
  parseLocaleParts,
  withNoStoreHeaders,
} from '@/lib/seo/content-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type KeywordReresearchPayload = {
  required: true;
  authoritative: true;
  source_locale: string;
  target_locale: string;
  country: string;
  language: string;
  source_keyword: string | null;
  target_keyword: string | null;
  candidate_id: string;
  candidate_keyword: string;
  source: string;
  fetched_at: string;
  confidence: 'live';
  decision_grade_ready: true;
  market_signals: {
    seasonality_status: string;
    competitive_status: 'available' | 'unavailable';
  };
  generated_at: string;
};

type LocaleTuple = {
  source_locale: string;
  target_locale: string;
  country: string;
  language: string;
};

function normalizeKeywordForLike(input?: string): string | null {
  const value = input?.trim();
  if (!value) return null;
  return value.replace(/[%_]/g, '').toLowerCase();
}

async function resolveTargetMarketReresearch(input: {
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  websiteId: string;
  localeTuple: LocaleTuple;
  sourceKeyword?: string;
  targetKeyword?: string;
}): Promise<KeywordReresearchPayload | null> {
  const normalizedNeedle = normalizeKeywordForLike(input.targetKeyword ?? input.sourceKeyword);
  if (!normalizedNeedle) return null;

  const query = input.admin
    .from('seo_keyword_candidates')
    .select(
      'id,keyword,seasonality_status,serp_top_competitors,source,fetched_at,confidence,decision_grade_ready,priority_score',
    )
    .eq('website_id', input.websiteId)
    .eq('country', input.localeTuple.country)
    .eq('language', input.localeTuple.language)
    .eq('locale', input.localeTuple.target_locale)
    .eq('confidence', 'live')
    .eq('decision_grade_ready', true)
    .order('priority_score', { ascending: false })
    .limit(25)
    .ilike('keyword', `%${normalizedNeedle}%`);

  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) {
    return null;
  }

  const best = rows[0];
  const competitors = Array.isArray(best.serp_top_competitors) ? best.serp_top_competitors : [];

  return {
    required: true,
    authoritative: true,
    source_locale: input.localeTuple.source_locale,
    target_locale: input.localeTuple.target_locale,
    country: input.localeTuple.country,
    language: input.localeTuple.language,
    source_keyword: input.sourceKeyword ?? null,
    target_keyword: input.targetKeyword ?? null,
    candidate_id: String(best.id),
    candidate_keyword: String(best.keyword ?? normalizedNeedle),
    source: String(best.source ?? 'seo_keyword_candidates.live'),
    fetched_at: String(best.fetched_at ?? new Date().toISOString()),
    confidence: 'live',
    decision_grade_ready: true,
    market_signals: {
      seasonality_status: String(best.seasonality_status ?? 'unavailable'),
      competitive_status: competitors.length > 0 ? 'available' : 'unavailable',
    },
    generated_at: new Date().toISOString(),
  };
}

function hasValidTargetReresearch(input: {
  payload: Record<string, unknown> | null;
  localeTuple: LocaleTuple;
}): boolean {
  const payload = input.payload;
  if (!payload) return false;

  return (
    payload.required === true &&
    payload.authoritative === true &&
    payload.decision_grade_ready === true &&
    payload.confidence === 'live' &&
    payload.target_locale === input.localeTuple.target_locale &&
    payload.country === input.localeTuple.country &&
    payload.language === input.localeTuple.language &&
    typeof payload.fetched_at === 'string' &&
    payload.fetched_at.length > 0 &&
    typeof payload.candidate_id === 'string' &&
    payload.candidate_id.length > 0
  );
}

function buildReresearchDetails(input: {
  sourceLocale: string;
  targetLocale: string;
  country: string;
  language: string;
  sourceKeyword?: string;
  targetKeyword?: string;
}) {
  return {
    source_locale: input.sourceLocale,
    target_locale: input.targetLocale,
    country: input.country,
    language: input.language,
    source_keyword: input.sourceKeyword ?? null,
    target_keyword: input.targetKeyword ?? null,
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
  const localeTupleRaw = parseLocaleParts({
    sourceLocale: parsed.data.sourceLocale,
    targetLocale: parsed.data.targetLocale,
    country: parsed.data.country,
    language: parsed.data.language,
  });
  const localeTuple: LocaleTuple = {
    source_locale: localeTupleRaw.source_locale ?? parsed.data.sourceLocale,
    target_locale: localeTupleRaw.target_locale ?? parsed.data.targetLocale,
    country: localeTupleRaw.country ?? parsed.data.country,
    language: localeTupleRaw.language ?? parsed.data.language,
  };

  if (parsed.data.action === 'create_draft') {
    const jobId = crypto.randomUUID();
    const keywordReresearch = await resolveTargetMarketReresearch({
      admin,
      websiteId: parsed.data.websiteId,
      localeTuple,
      sourceKeyword: parsed.data.sourceKeyword,
      targetKeyword: parsed.data.targetKeyword,
    });

    if (!keywordReresearch) {
      const sync = await enqueueDecisionGradeSync(parsed.data.websiteId);
      return withNoStoreHeaders(
        apiError(
          'TARGET_RERESEARCH_REQUIRED',
          'Create draft is blocked until target-market re-research has live authoritative data.',
          409,
          {
            code: 'AUTHORITATIVE_SOURCE_REQUIRED',
            route: 'transcreate',
            websiteId: parsed.data.websiteId,
            locale: localeTuple.target_locale,
            contentType: parsed.data.pageType,
            missingSources: ['seo_keyword_candidates.live', 'provider:gsc_or_dataforseo'],
            sync: sync.requestId
              ? {
                  code: 'SYNC_QUEUED',
                  requestId: sync.requestId,
                }
              : null,
            required: buildReresearchDetails({
              sourceLocale: parsed.data.sourceLocale,
              targetLocale: parsed.data.targetLocale,
              country: parsed.data.country,
              language: parsed.data.language,
              sourceKeyword: parsed.data.sourceKeyword,
              targetKeyword: parsed.data.targetKeyword,
            }),
          },
        ),
      );
    }

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
        source: keywordReresearch.source,
        fetched_at: keywordReresearch.fetched_at,
        confidence: keywordReresearch.confidence,
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
          source: keywordReresearch.source,
          fetched_at: keywordReresearch.fetched_at,
          confidence: keywordReresearch.confidence,
        },
        { onConflict: 'website_id,page_type,source_entity_id,target_locale' },
      );

    return withNoStoreHeaders(
      apiSuccess({
        job,
        keywordReresearch,
        sourceMeta: {
          source: keywordReresearch.source,
          fetchedAt: keywordReresearch.fetched_at,
          confidence: keywordReresearch.confidence,
        },
      }),
    );
  }

  let resolvedJobId = parsed.data.jobId ?? null;
  if (!resolvedJobId) {
    const { data: latestJob } = await admin
      .from('seo_transcreation_jobs')
      .select('id,status,updated_at')
      .eq('website_id', parsed.data.websiteId)
      .eq('page_type', parsed.data.pageType)
      .eq('page_id', parsed.data.sourceContentId)
      .eq('source_locale', localeTuple.source_locale)
      .eq('target_locale', localeTuple.target_locale)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    resolvedJobId = latestJob?.id ?? null;
  }
  if (!resolvedJobId) {
    return withNoStoreHeaders(apiError('NOT_FOUND', 'No transcreation draft found for source/target tuple', 404));
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
      .eq('id', resolvedJobId)
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
      .eq('target_locale', localeTuple.target_locale);

    return withNoStoreHeaders(apiSuccess({ job, sourceMeta }));
  }

  const { data: currentJob, error: jobReadError } = await admin
    .from('seo_transcreation_jobs')
    .select('id, status, payload, keyword_reresearch')
    .eq('id', resolvedJobId)
    .eq('website_id', parsed.data.websiteId)
    .single();
  if (jobReadError || !currentJob) {
    return withNoStoreHeaders(apiError('NOT_FOUND', 'Transcreation job not found', 404));
  }
  if (currentJob.status !== 'reviewed') {
    return withNoStoreHeaders(apiError('TRANSCREATE_REVIEW_REQUIRED', 'Apply is blocked unless job is reviewed', 409));
  }
  const keywordReresearch = (currentJob.keyword_reresearch ?? null) as Record<string, unknown> | null;
  if (!hasValidTargetReresearch({ payload: keywordReresearch, localeTuple })) {
    return withNoStoreHeaders(
      apiError('TARGET_RERESEARCH_REQUIRED', 'Target-market re-research is required before apply', 409, {
        required: buildReresearchDetails({
          sourceLocale: parsed.data.sourceLocale,
          targetLocale: parsed.data.targetLocale,
          country: parsed.data.country,
          language: parsed.data.language,
          sourceKeyword: parsed.data.sourceKeyword,
          targetKeyword: parsed.data.targetKeyword,
        }),
        current: keywordReresearch,
      }),
    );
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
    .eq('id', resolvedJobId)
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
        last_job_id: resolvedJobId,
        updated_at: new Date().toISOString(),
        source: sourceMeta.source,
        fetched_at: sourceMeta.fetchedAt,
      })
      .eq('website_id', parsed.data.websiteId)
      .eq('page_type', parsed.data.pageType)
      .eq('source_entity_id', parsed.data.sourceContentId)
      .eq('target_locale', localeTuple.target_locale);

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
