import { NextRequest } from 'next/server';
import { SeoResearchRequestSchema } from '@bukeer/website-contract';
import { apiError, apiSuccess } from '@/lib/api/response';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { buildSourceMeta, computePriorityScore, withNoStoreHeaders } from '@/lib/seo/content-intelligence';

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

  const sourceMeta = buildSourceMeta('seo-content-intelligence/research', 'partial');
  const admin = createSupabaseServiceRoleClient();
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
  );
}
