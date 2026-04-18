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
import {
  type LocaleAdaptationOutputEnvelopeV2,
  normalizeLocaleAdaptationOutputEnvelope,
} from '@/lib/ai/prompts/locale-adaptation';
import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';
import {
  applyTranscreateJob,
  prepareDraftWithTM,
  reviewTranscreateJob,
} from '@/lib/seo/transcreate-workflow';

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

function mapAiOutputToDraft(aiOutput: LocaleAdaptationOutputEnvelopeV2): Record<string, unknown> {
  const payload = aiOutput.payload_v2;
  return {
    schema_version: aiOutput.schema_version,
    payload_v2: payload,
    // New schema fields.
    meta_title: payload.meta_title,
    meta_desc: payload.meta_desc,
    slug: payload.slug,
    h1: payload.h1,
    keywords: payload.keywords,
    body_content: payload.body_content,
    ...(payload.body_content?.body ? { body: payload.body_content.body } : {}),
    ...(payload.body_content?.seo_intro ? { seo_intro: payload.body_content.seo_intro } : {}),
    ...(payload.body_content?.seo_highlights ? { seo_highlights: payload.body_content.seo_highlights } : {}),
    ...(payload.body_content?.seo_faq ? { seo_faq: payload.body_content.seo_faq } : {}),
    // Legacy-compatible fields used by apply/review workflow.
    seoTitle: payload.meta_title,
    seoDescription: payload.meta_desc,
    title: payload.h1,
    targetKeyword: payload.keywords[0] ?? null,
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
    const draftSource = parsed.data.draftSource ?? 'manual';
    let draftPayload: Record<string, unknown> = { ...parsed.data.draft };
    let normalizedEnvelope: LocaleAdaptationOutputEnvelopeV2 | null = null;
    let aiGenerated = false;
    let aiModel: string | null = null;

    if (draftSource === 'ai') {
      const aiEnvelopeCandidate = parsed.data.aiOutput
        ?? (
          parsed.data.schemaVersion === '2.0' && parsed.data.payloadV2
            ? {
                schema_version: parsed.data.schemaVersion,
                payload_v2: parsed.data.payloadV2,
              }
            : null
        );
      normalizedEnvelope = normalizeLocaleAdaptationOutputEnvelope(
        aiEnvelopeCandidate,
        parsed.data.targetKeyword ?? parsed.data.sourceKeyword ?? undefined,
      );
      if (!normalizedEnvelope) {
        return withNoStoreHeaders(
          apiError(
            'VALIDATION_ERROR',
            'aiOutput failed schema validation (expected schema_version + payload_v2)',
            400,
          ),
        );
      }

      const aiRateLimit = await checkTranscreateRateLimit(
        parsed.data.websiteId,
        localeTuple.target_locale,
        admin,
      );
      if (!aiRateLimit.allowed) {
        return withNoStoreHeaders(
          apiError('RATE_LIMITED', 'Daily transcreate AI limit exceeded for this locale.', 429, {
            limit: 10,
            remaining: aiRateLimit.remaining,
            resetAt: aiRateLimit.resetAt.toISOString(),
            websiteId: parsed.data.websiteId,
            targetLocale: localeTuple.target_locale,
          }),
        );
      }

      draftPayload = {
        ...draftPayload,
        ...mapAiOutputToDraft(normalizedEnvelope),
      };
      aiGenerated = true;
      aiModel = parsed.data.aiModel ?? process.env.OPENROUTER_MODEL ?? null;
    }

    if (!normalizedEnvelope && parsed.data.schemaVersion === '2.0' && parsed.data.payloadV2) {
      normalizedEnvelope = normalizeLocaleAdaptationOutputEnvelope(
        {
          schema_version: parsed.data.schemaVersion,
          payload_v2: parsed.data.payloadV2,
        },
        parsed.data.targetKeyword ?? parsed.data.sourceKeyword ?? undefined,
      );
      if (!normalizedEnvelope) {
        return withNoStoreHeaders(
          apiError(
            'VALIDATION_ERROR',
            'payloadV2 failed schema validation',
            400,
          ),
        );
      }
      draftPayload = {
        ...draftPayload,
        ...mapAiOutputToDraft(normalizedEnvelope),
      };
    }

    const jobId = crypto.randomUUID();
    const targetKeywordForJob =
      parsed.data.targetKeyword ??
      (typeof draftPayload.targetKeyword === 'string' ? draftPayload.targetKeyword : undefined);

    const keywordReresearch = await resolveTargetMarketReresearch({
      admin,
      websiteId: parsed.data.websiteId,
      localeTuple,
      sourceKeyword: parsed.data.sourceKeyword,
      targetKeyword: targetKeywordForJob,
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
              targetKeyword: targetKeywordForJob,
            }),
          },
        ),
      );
    }

    // TM fuzzy match + glossary prompt injection (Issue #135).
    // Reads source-side text per segment, queries TM for exact/fuzzy hits,
    // pre-fills exact hits into the draft, loads glossary rules for both
    // locales, and persists hits + glossary prompt in payload.metadata.
    const enriched = await prepareDraftWithTM({
      admin,
      websiteId: parsed.data.websiteId,
      accountId: access.accountId,
      pageType: parsed.data.pageType,
      sourceContentId: parsed.data.sourceContentId,
      sourceLocale: localeTuple.source_locale,
      targetLocale: localeTuple.target_locale,
      draft: draftPayload,
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
        target_keyword: targetKeywordForJob ?? null,
        keyword_reresearch: keywordReresearch,
        status: 'draft',
        payload: enriched.payload,
        ai_generated: aiGenerated,
        ai_model: aiModel,
        source: keywordReresearch.source,
        fetched_at: keywordReresearch.fetched_at,
        confidence: keywordReresearch.confidence,
        schema_version: normalizedEnvelope?.schema_version ?? null,
        payload_v2: normalizedEnvelope?.payload_v2 ?? null,
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
    const reviewed = await reviewTranscreateJob({
      admin,
      sourceMeta,
      websiteId: parsed.data.websiteId,
      actorUserId: access.userId,
      jobId: resolvedJobId,
    });
    if (!reviewed.ok) {
      return withNoStoreHeaders(
        apiError(reviewed.error.code, reviewed.error.message, reviewed.error.status, reviewed.error.details),
      );
    }
    return withNoStoreHeaders(apiSuccess({ job: reviewed.job, sourceMeta }));
  }

  const applied = await applyTranscreateJob({
    admin,
    sourceMeta,
    websiteId: parsed.data.websiteId,
    accountId: access.accountId,
    actorUserId: access.userId,
    jobId: resolvedJobId,
    preferredTargetContentId: parsed.data.targetContentId ?? null,
  });
  if (!applied.ok) {
    const details =
      applied.error.code === 'TARGET_RERESEARCH_REQUIRED'
        ? {
            ...(applied.error.details as Record<string, unknown> | null),
            required: buildReresearchDetails({
              sourceLocale: parsed.data.sourceLocale,
              targetLocale: parsed.data.targetLocale,
              country: parsed.data.country,
              language: parsed.data.language,
              sourceKeyword: parsed.data.sourceKeyword,
              targetKeyword: parsed.data.targetKeyword,
            }),
          }
        : applied.error.details;
    return withNoStoreHeaders(apiError(applied.error.code, applied.error.message, applied.error.status, details));
  }

  return withNoStoreHeaders(
    apiSuccess({
      job: applied.job,
      source_locale: applied.sourceLocale,
      target_locale: applied.targetLocale,
      country: applied.country,
      language: applied.language,
      target_content_id: applied.targetContentId,
      sourceMeta,
    }),
  );
}
