import { NextRequest } from 'next/server';
import { SeoResearchRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import {
  DECISION_GRADE_ERROR_CODE,
  buildDecisionGradeBlockDetails,
  buildSeoContentIntelligenceCacheTags,
  buildSourceMeta,
  computePriorityScore,
  withNoStoreHeaders,
} from '@/lib/seo/content-intelligence';
import { enqueueDecisionGradeSync } from '@/lib/seo/decision-grade-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function inferIntent(keyword: string): 'informational' | 'navigational' | 'commercial' | 'transactional' | 'mixed' {
  const normalized = keyword.toLowerCase();
  if (/(precio|book|reserva|buy|compra|paquete)/.test(normalized)) return 'transactional';
  if (/(mejor|vs|comparar|review|top)/.test(normalized)) return 'commercial';
  if (/(oficial|login|home)/.test(normalized)) return 'navigational';
  if (/(guia|qué|que|how|tips|itinerario)/.test(normalized)) return 'informational';
  return 'mixed';
}

function recommendAction(intent: string): 'create' | 'update' | 'merge' | 'prune' {
  if (intent === 'transactional' || intent === 'commercial') return 'update';
  if (intent === 'informational') return 'create';
  return 'merge';
}

function seasonalityForKeyword(keyword: string): number[] | null {
  const normalized = keyword.toLowerCase();
  if (normalized.length < 3) return null;
  const base = [48, 45, 49, 53, 60, 71, 74, 69, 62, 57, 55, 59];
  const delta = normalized.includes('caribe') || normalized.includes('cartagena') ? 12 : 0;
  return base.map((month) => Math.min(100, month + delta));
}

function buildCompetitors(keyword: string, locale: string) {
  const safe = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'));
  const tld = locale.toLowerCase().startsWith('en') ? 'com' : 'co';
  return Array.from({ length: 5 }).map((_, index) => ({
    url: `https://competitor-${index + 1}.${tld}/${safe}`,
    rank: index + 1,
    wordCount: 900 + index * 120,
    headings: ['Overview', 'Best options', 'FAQ'],
    schemaTypes: ['Article', 'FAQPage'],
    contentFreshness: index % 2 === 0 ? 'fresh' : 'stale',
  }));
}

export async function POST(request: NextRequest) {
  const bodyRaw = await request.json().catch(() => null);
  const parsed = SeoResearchRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return withNoStoreHeaders(apiError('VALIDATION_ERROR', 'Invalid research payload', 400, parsed.error.flatten()));
  }

  await requireWebsiteAccess(parsed.data.websiteId);
  const admin = createSupabaseServiceRoleClient();

  if (parsed.data.decisionGradeOnly) {
    const { data: liveRows, error: liveError } = await admin
      .from('seo_keyword_candidates')
      .select(
        'id,keyword,intent,recommendation_action,difficulty,search_volume,serp_top_competitors,seasonality_pattern,seasonality_status,priority_score,source,fetched_at,confidence,decision_grade_ready',
      )
      .eq('website_id', parsed.data.websiteId)
      .eq('content_type', parsed.data.contentType)
      .eq('country', parsed.data.country)
      .eq('language', parsed.data.language)
      .eq('locale', parsed.data.locale)
      .eq('confidence', 'live')
      .eq('decision_grade_ready', true)
      .order('priority_score', { ascending: false })
      .limit(500);

    if (liveError) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to read authoritative candidates', 500, liveError.message));
    }

    const normalizedSeeds = parsed.data.seeds.map((seed) => seed.toLowerCase());
    const matched = (liveRows ?? []).filter((row) => {
      const keyword = String(row.keyword ?? '').toLowerCase();
      return normalizedSeeds.some((seed) => keyword.includes(seed));
    });

    if (matched.length === 0) {
      const sync = await enqueueDecisionGradeSync(parsed.data.websiteId);
      return withNoStoreHeaders(
        apiError(
          DECISION_GRADE_ERROR_CODE,
          'Decision-grade research requires authoritative market data. Sync has been queued.',
          409,
          buildDecisionGradeBlockDetails({
            route: 'research',
            websiteId: parsed.data.websiteId,
            locale: parsed.data.locale,
            contentType: parsed.data.contentType,
            missingSources: ['seo_keyword_candidates.live', 'provider:gsc_or_dataforseo'],
            syncRequestId: sync.requestId,
          }),
        ),
      );
    }

    const sourceMeta = {
      source: String(matched[0]?.source ?? 'database-live'),
      fetchedAt: String(matched[0]?.fetched_at ?? new Date().toISOString()),
      confidence: 'live' as const,
    };

    const runId = crypto.randomUUID();
    const { error: runInsertError } = await admin.from('seo_keyword_research_runs').insert({
      id: runId,
      website_id: parsed.data.websiteId,
      content_type: parsed.data.contentType,
      country: parsed.data.country,
      language: parsed.data.language,
      locale: parsed.data.locale,
      seeds: parsed.data.seeds,
      source: sourceMeta.source,
      fetched_at: sourceMeta.fetchedAt,
      confidence: sourceMeta.confidence,
      decision_grade_ready: true,
    });
    if (runInsertError) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to persist research run', 500, runInsertError.message));
    }

    const candidates = matched.map((row) => ({
      id: String(row.id),
      keyword: String(row.keyword),
      intent: row.intent,
      recommendationAction: row.recommendation_action,
      difficulty: row.difficulty,
      searchVolume: row.search_volume,
      serpTopCompetitors: Array.isArray(row.serp_top_competitors) ? row.serp_top_competitors : [],
      seasonalityPattern: Array.isArray(row.seasonality_pattern) ? row.seasonality_pattern : null,
      seasonalityStatus: row.seasonality_status,
      priorityScore: Number(row.priority_score ?? 0),
      source: String(row.source ?? sourceMeta.source),
      fetchedAt: String(row.fetched_at ?? sourceMeta.fetchedAt),
      confidence: 'live' as const,
      decisionGradeReady: true,
    }));

    return withNoStoreHeaders(
      apiSuccess({
        runId,
        websiteId: parsed.data.websiteId,
        contentType: parsed.data.contentType,
        country: parsed.data.country,
        language: parsed.data.language,
        locale: parsed.data.locale,
        candidates,
        sourceMeta,
      }),
      buildSeoContentIntelligenceCacheTags({
        route: 'research',
        websiteId: parsed.data.websiteId,
        locale: parsed.data.locale,
        contentType: parsed.data.contentType,
        country: parsed.data.country,
        language: parsed.data.language,
        mode: 'decision-grade',
      }),
    );
  }

  const sourceMeta = buildSourceMeta('seo-content-intelligence/research', 'exploratory');
  const runId = crypto.randomUUID();

  const { error: runInsertError } = await admin.from('seo_keyword_research_runs').insert({
    id: runId,
    website_id: parsed.data.websiteId,
    content_type: parsed.data.contentType,
    country: parsed.data.country,
    language: parsed.data.language,
    locale: parsed.data.locale,
    seeds: parsed.data.seeds,
    source: sourceMeta.source,
    fetched_at: sourceMeta.fetchedAt,
    confidence: sourceMeta.confidence,
    decision_grade_ready: false,
  });
  if (runInsertError) {
    return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to persist research run', 500, runInsertError.message));
  }

  const candidates = parsed.data.seeds.flatMap((seed) => {
    const family = [
      seed,
      `${seed} ${parsed.data.country}`.trim(),
      `${seed} ${parsed.data.language}`.trim(),
      `mejores ${seed}`.trim(),
      `${seed} precios`.trim(),
    ];
    return family;
  });

  const uniqueKeywords = Array.from(new Set(candidates)).slice(0, 500);
  const rowsToInsert: Array<Record<string, unknown>> = [];

  const candidateRows = uniqueKeywords.map((keyword) => {
    const intent = inferIntent(keyword);
    const searchVolume = Math.max(40, Math.round(keyword.length * 120));
    const priorityScore = computePriorityScore({
      searchVolume,
      contentType: parsed.data.contentType,
      locale: parsed.data.locale,
    });
    const seasonalityPattern = seasonalityForKeyword(keyword);
    const competitors = buildCompetitors(keyword, parsed.data.locale);

    const row = {
      id: crypto.randomUUID(),
      keyword,
      intent,
      recommendationAction: recommendAction(intent),
      difficulty: Math.min(95, 25 + Math.round(keyword.length * 2.1)),
      searchVolume,
      serpTopCompetitors: competitors,
      seasonalityPattern,
      seasonalityStatus: seasonalityPattern ? 'available' : 'unavailable',
      priorityScore,
      source: sourceMeta.source,
      fetchedAt: sourceMeta.fetchedAt,
      confidence: sourceMeta.confidence,
      decisionGradeReady: false,
    };

    rowsToInsert.push({
      id: row.id,
      research_run_id: runId,
      website_id: parsed.data.websiteId,
      content_type: parsed.data.contentType,
      country: parsed.data.country,
      language: parsed.data.language,
      locale: parsed.data.locale,
      keyword: row.keyword,
      intent: row.intent,
      difficulty: row.difficulty,
      search_volume: row.searchVolume,
      recommendation_action: row.recommendationAction,
      serp_top_competitors: row.serpTopCompetitors,
      seasonality_pattern: row.seasonalityPattern,
      seasonality_status: row.seasonalityStatus,
      priority_score: row.priorityScore,
      source: row.source,
      fetched_at: row.fetchedAt,
      confidence: row.confidence,
      decision_grade_ready: false,
    });

    return row;
  });

  if (rowsToInsert.length > 0) {
    const { error: candidateError } = await admin.from('seo_keyword_candidates').insert(rowsToInsert);
    if (candidateError) {
      return withNoStoreHeaders(apiError('INTERNAL_ERROR', 'Unable to persist keyword candidates', 500, candidateError.message));
    }
  }

  const ordered = candidateRows.sort((a, b) => b.priorityScore - a.priorityScore);
  return withNoStoreHeaders(
    apiSuccess({
      runId,
      websiteId: parsed.data.websiteId,
      contentType: parsed.data.contentType,
      country: parsed.data.country,
      language: parsed.data.language,
      locale: parsed.data.locale,
      candidates: ordered,
      sourceMeta,
    }),
    buildSeoContentIntelligenceCacheTags({
      route: 'research',
      websiteId: parsed.data.websiteId,
      locale: parsed.data.locale,
      contentType: parsed.data.contentType,
      country: parsed.data.country,
      language: parsed.data.language,
      mode: 'exploratory',
    }),
  );
}
