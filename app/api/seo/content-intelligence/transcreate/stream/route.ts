import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamObject } from 'ai';
import { apiError } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { enqueueDecisionGradeSync } from '@/lib/seo/decision-grade-sync';
import { parseLocaleParts, withNoStoreHeaders } from '@/lib/seo/content-intelligence';
import { getEditorModel } from '@/lib/ai/llm-provider';
import {
  buildLocaleAdaptationPrompt,
  LocaleAdaptationOutputSchema,
  SERP_META_DESC_MAX,
  SERP_META_TITLE_MAX,
  normalizeLocaleAdaptationOutput,
} from '@/lib/ai/prompts/locale-adaptation';
import {
  collectSourceFieldsForPage,
  prepareDraftWithTM,
} from '@/lib/seo/transcreate-workflow';
import { checkTranscreateRateLimit } from '@/lib/seo/transcreate-rate-limit';

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

const LocaleAdaptationStreamOutputSchema = LocaleAdaptationOutputSchema.extend({
  meta_title: z.string().min(1).max(SERP_META_TITLE_MAX),
  meta_desc: z.string().min(1).max(SERP_META_DESC_MAX),
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

function deriveOutputFromPayload(input: {
  payload: Record<string, unknown>;
  sourceFields: Record<string, string>;
  targetKeyword?: string;
}): z.infer<typeof LocaleAdaptationOutputSchema> {
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

  return {
    meta_title: meta_title.slice(0, 70),
    meta_desc: meta_desc.slice(0, 160),
    slug: slugify(slugSeed),
    h1: h1.slice(0, 100),
    keywords,
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
    const tmOutput = deriveOutputFromPayload({
      payload: enriched.payload,
      sourceFields,
      targetKeyword: parsed.data.targetKeyword,
    });
    const normalizedTmOutput = normalizeLocaleAdaptationOutput(
      tmOutput,
      parsed.data.targetKeyword ?? parsed.data.sourceKeyword ?? undefined,
    );
    if (normalizedTmOutput) {
      return withNoStoreHeaders(
        new Response(JSON.stringify(normalizedTmOutput), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
      );
    }
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
  });

  const result = streamObject({
    model: getEditorModel(),
    system: prompt.system,
    prompt: prompt.user,
    schema: LocaleAdaptationStreamOutputSchema,
  });

  return withNoStoreHeaders(result.toTextStreamResponse());
}
