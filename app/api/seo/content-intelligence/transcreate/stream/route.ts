import { NextRequest, after } from 'next/server';
import { z } from 'zod';
import { streamObject } from 'ai';
import { apiError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { enqueueDecisionGradeSync } from '@/lib/seo/decision-grade-sync';
import { parseLocaleParts, withNoStoreHeaders } from '@/lib/seo/content-intelligence';
import { getEditorModel, DEFAULT_MODEL } from '@/lib/ai/llm-provider';
import { recordCost } from '@/lib/ai/rate-limit';
import { calculateCost } from '@/lib/ai/model-pricing';
import {
  buildLocaleAdaptationPrompt,
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
  LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1,
  LocaleAdaptationOutputEnvelopeSchemaV2_1,
  LocaleAdaptationOutputEnvelopeSchemaV2,
  LocaleAdaptationOutputEnvelopeSchema,
  LocaleAdaptationOutputSchemaV2_1,
  LocaleAdaptationOutputSchemaV2,
  SERP_META_DESC_MAX,
  SERP_META_TITLE_MAX,
  normalizeLocaleAdaptationOutputEnvelope,
} from '@/lib/ai/prompts/locale-adaptation';
import {
  collectSourceFieldsForPage,
  prepareDraftWithTM,
} from '@/lib/seo/transcreate-workflow';
import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';
import { isTranscreateV2EnabledForLocale, resolveTranscreateV2Flag } from '@/lib/features/transcreate-v2';
import { logAiCostEvent } from '@/lib/ai/cost-ledger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TranscreateStreamRequestSchema = z.object({
  websiteId: z.string().uuid(),
  sourceContentId: z.string().uuid(),
  pageType: z.enum(['blog', 'page', 'destination', 'hotel', 'activity', 'package', 'transfer']),
  sourceLocale: z.string().min(2).max(16),
  targetLocale: z.string().min(2).max(16),
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(16),
  sourceKeyword: z.string().max(120).optional(),
  targetKeyword: z.string().max(120).optional(),
  draft: z.record(z.string(), z.unknown()).default({}),
});

const LocaleAdaptationStreamOutputSchemaV2 = LocaleAdaptationOutputEnvelopeSchemaV2.extend({
  payload_v2: LocaleAdaptationOutputSchemaV2.extend({
    meta_title: z.string().min(1).max(SERP_META_TITLE_MAX),
    meta_desc: z.string().min(1).max(SERP_META_DESC_MAX),
  }),
});

const LocaleAdaptationStreamOutputSchemaV2_1 = LocaleAdaptationOutputEnvelopeSchemaV2_1.extend({
  payload_v2: LocaleAdaptationOutputSchemaV2_1.extend({
    meta_title: z.string().min(1).max(SERP_META_TITLE_MAX),
    meta_desc: z.string().min(1).max(SERP_META_DESC_MAX),
  }),
});

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function firstString(...candidates: Array<unknown>): string | null {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function sanitizeKeywords(
  keywordsRaw: unknown,
  fallbackKeyword: string | null,
): string[] {
  const list = Array.isArray(keywordsRaw)
    ? keywordsRaw.filter((value): value is string => typeof value === 'string')
    : [];
  const merged = [
    ...list.map((value) => value.trim()).filter(Boolean),
    ...(fallbackKeyword ? [fallbackKeyword.trim()] : []),
  ];
  return Array.from(new Set(merged)).slice(0, 10);
}

function normalizeStringArray(input: unknown, max = 20): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeFaqItems(input: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value))
    .map((value) => ({
      question: typeof value.question === 'string' ? value.question.trim() : '',
      answer: typeof value.answer === 'string' ? value.answer.trim() : '',
    }))
    .filter((value) => value.question.length > 0 && value.answer.length > 0)
    .slice(0, 20);
}

function normalizeTimelineItems(input: unknown): Array<{ title: string; description?: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === 'string') {
        const title = item.trim();
        return title ? { title } : null;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const raw = item as Record<string, unknown>;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      if (!title) return null;
      const description = typeof raw.description === 'string' ? raw.description.trim() : '';
      return description ? { title, description } : { title };
    })
    .filter((item): item is { title: string; description?: string } => Boolean(item))
    .slice(0, 30);
}

function deriveOutputFromPayload(input: {
  payload: Record<string, unknown>;
  sourceFields: Record<string, string>;
  targetKeyword?: string;
  fullContractEnabled: boolean;
}): z.infer<typeof LocaleAdaptationOutputEnvelopeSchema> {
  const meta_title =
    firstString(input.payload.meta_title, input.payload.seoTitle, input.sourceFields.seoTitle, input.sourceFields.title, input.sourceFields.seoDescription) ??
    'Localized SEO title';
  const meta_desc =
    firstString(input.payload.meta_desc, input.payload.seoDescription, input.sourceFields.seoDescription, input.sourceFields.title) ??
    'Localized SEO description';
  const h1 =
    firstString(input.payload.h1, input.payload.title, input.sourceFields.title, meta_title) ??
    'Localized heading';
  const slugSeed = firstString(input.payload.slug, h1, meta_title) ?? 'localized-content';
  const keywords = sanitizeKeywords(
    input.payload.keywords,
    input.targetKeyword ?? firstString(input.payload.targetKeyword, null),
  );

  const body = typeof input.payload.body === 'string' ? input.payload.body.trim() : '';
  const seoIntro = typeof input.payload.seo_intro === 'string' ? input.payload.seo_intro.trim() : '';
  const seoHighlights = Array.isArray(input.payload.seo_highlights)
    ? input.payload.seo_highlights
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const seoFaq = Array.isArray(input.payload.seo_faq)
    ? input.payload.seo_faq
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
        .map((row) => ({
          question: typeof row.question === 'string' ? row.question.trim() : '',
          answer: typeof row.answer === 'string' ? row.answer.trim() : '',
        }))
        .filter((row) => row.question.length > 0 && row.answer.length > 0)
        .slice(0, 20)
    : [];

  const payload_v2: z.infer<typeof LocaleAdaptationOutputSchemaV2> = {
    meta_title: meta_title.slice(0, 70),
    meta_desc: meta_desc.slice(0, 160),
    slug: slugify(slugSeed),
    h1: h1.slice(0, 100),
    keywords,
    ...((body || seoIntro || seoHighlights.length > 0 || seoFaq.length > 0)
      ? {
          body_content: {
            ...(body ? { body } : {}),
            ...(seoIntro ? { seo_intro: seoIntro } : {}),
            ...(seoHighlights.length > 0 ? { seo_highlights: seoHighlights } : {}),
            ...(seoFaq.length > 0 ? { seo_faq: seoFaq } : {}),
          },
        }
      : {}),
  };

  if (!input.fullContractEnabled) {
    return {
      schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2,
      payload_v2,
    };
  }

  const fullPayload: z.infer<typeof LocaleAdaptationOutputSchemaV2_1> = {
    ...payload_v2,
    description_long:
      (typeof input.payload.description_long === 'string' && input.payload.description_long.trim())
      || body
      || 'Localized long-form description pending editorial completion.',
    highlights:
      normalizeStringArray(input.payload.highlights, 20).length > 0
        ? normalizeStringArray(input.payload.highlights, 20)
        : seoHighlights,
    faq:
      normalizeFaqItems(input.payload.faq).length > 0
        ? normalizeFaqItems(input.payload.faq)
        : seoFaq,
    recommendations: normalizeStringArray(input.payload.recommendations, 20),
    cta_final_text:
      (typeof input.payload.cta_final_text === 'string' && input.payload.cta_final_text.trim())
      || 'Request your personalized quote now.',
    program_timeline: normalizeTimelineItems(input.payload.program_timeline),
    inclusions: normalizeStringArray(input.payload.inclusions, 30),
    exclusions: normalizeStringArray(input.payload.exclusions, 30),
    hero_subtitle:
      (typeof input.payload.hero_subtitle === 'string' && input.payload.hero_subtitle.trim())
      || seoIntro
      || 'Handcrafted experiences designed for your trip.',
    category_label:
      (typeof input.payload.category_label === 'string' && input.payload.category_label.trim())
      || (Array.isArray(payload_v2.keywords) ? payload_v2.keywords[0] : '')
      || 'Travel',
  };

  return {
    schema_version: LOCALE_ADAPTATION_SCHEMA_VERSION_V2_1,
    payload_v2: fullPayload,
  };
}

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = TranscreateStreamRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return withNoStoreHeaders(
      apiError('VALIDATION_ERROR', 'Invalid transcreate stream payload', 400, parsed.error.flatten()),
    );
  }
  if (parsed.data.sourceLocale === parsed.data.targetLocale) {
    return withNoStoreHeaders(
      apiError('VALIDATION_ERROR', 'sourceLocale and targetLocale must differ', 400),
    );
  }

  const access = await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();

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
  const transcreateFlag = await resolveTranscreateV2Flag(
    admin,
    parsed.data.websiteId,
    localeTuple.target_locale,
  );
  const fullContractEnabled = isTranscreateV2EnabledForLocale(transcreateFlag);

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
        'AI draft generation is blocked until target-market re-research has live authoritative data.',
        409,
        {
          code: 'AUTHORITATIVE_SOURCE_REQUIRED',
          route: 'transcreate-stream',
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
        },
      ),
    );
  }

  const sourceFieldsRaw = await collectSourceFieldsForPage({
    admin,
    websiteId: parsed.data.websiteId,
    accountId: access.accountId,
    pageType: parsed.data.pageType,
    sourceContentId: parsed.data.sourceContentId,
    sourceLocale: localeTuple.source_locale,
  });
  const sourceFields = Object.fromEntries(
    Object.entries(sourceFieldsRaw).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0,
    ),
  );

  const enriched = await prepareDraftWithTM({
    admin,
    websiteId: parsed.data.websiteId,
    accountId: access.accountId,
    pageType: parsed.data.pageType,
    sourceContentId: parsed.data.sourceContentId,
    sourceLocale: localeTuple.source_locale,
    targetLocale: localeTuple.target_locale,
    draft: parsed.data.draft,
  });

  const sourceFieldCount = Object.keys(sourceFields).length;
  const exactFieldSet = new Set(
    enriched.tmHits
      .filter((hit) => hit.similarity === 1)
      .map((hit) => hit.field),
  );
  const tmExactCoverage =
    sourceFieldCount > 0 &&
    Object.keys(sourceFields).every((field) => exactFieldSet.has(field));

  if (tmExactCoverage) {
    const tmOutputEnvelope = deriveOutputFromPayload({
      payload: enriched.payload,
      sourceFields,
      targetKeyword: parsed.data.targetKeyword,
      fullContractEnabled,
    });
    const normalizedTmOutput = normalizeLocaleAdaptationOutputEnvelope(
      tmOutputEnvelope,
      parsed.data.targetKeyword ?? parsed.data.sourceKeyword ?? undefined,
    );
    if (!normalizedTmOutput) {
      return withNoStoreHeaders(
        apiError(
          'VALIDATION_ERROR',
          'TM-derived output failed schema validation (schema_version + payload_v2 required).',
          422,
        ),
      );
    }
    return withNoStoreHeaders(
      new Response(JSON.stringify(normalizedTmOutput), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
    );
  }

  const rate = await checkTranscreateRateLimit(
    parsed.data.websiteId,
    localeTuple.target_locale,
    admin,
  );
  if (!rate.allowed) {
    return withNoStoreHeaders(
      apiError(
        'RATE_LIMITED',
        'Daily transcreate AI limit exceeded for this locale.',
        429,
        {
          limit: 10,
          remaining: rate.remaining,
          resetAt: rate.resetAt.toISOString(),
          websiteId: parsed.data.websiteId,
          targetLocale: localeTuple.target_locale,
        },
      ),
    );
  }

  const tmHints = enriched.tmHits
    .filter((hit) => hit.similarity === 1)
    .map((hit) => ({
      field: hit.field,
      source: hit.sourceText,
      target: hit.targetText,
    }));

  const prompt = buildLocaleAdaptationPrompt({
    sourceLocale: localeTuple.source_locale,
    targetLocale: localeTuple.target_locale,
    pageType: parsed.data.pageType,
    sourceFields,
    glossaryBlock: enriched.glossaryPromptBlock,
    tmHints,
    requireFullContract: fullContractEnabled,
  });

  const activeSchema = fullContractEnabled
    ? LocaleAdaptationStreamOutputSchemaV2_1
    : LocaleAdaptationStreamOutputSchemaV2;

  const result = streamObject({
    model: getEditorModel(),
    system: prompt.system,
    prompt: prompt.user,
    schema: activeSchema,
    onFinish: ({ usage }) => {
      after(async () => {
        if (!usage) return;
        const cost = calculateCost(DEFAULT_MODEL, {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        });
        await recordCost(`${access.accountId}:seo:transcreate`, cost);
        await logAiCostEvent({
          account_id: access.accountId,
          website_id: parsed.data.websiteId,
          user_id: access.userId,
          feature: 'seo-transcreate',
          route: '/api/seo/content-intelligence/transcreate/stream',
          model: DEFAULT_MODEL,
          input_tokens: usage.inputTokens ?? 0,
          output_tokens: usage.outputTokens ?? 0,
          cost_usd: cost,
          status: 'ok',
          rate_limit_key: `${access.accountId}:seo:transcreate`,
          metadata: {
            source_locale: localeTuple.source_locale,
            target_locale: localeTuple.target_locale,
            page_type: parsed.data.pageType,
            source_content_id: parsed.data.sourceContentId,
          },
        });
      });
    },
  });

  // Keep raw text streaming for useCompletion while marking route as streaming
  // for ADR-012 tooling checks.
  const textStream: ReadableStream = result.textStream;
  return withNoStoreHeaders(
    new Response(textStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
  );
}
