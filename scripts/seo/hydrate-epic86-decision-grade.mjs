#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_COUNTRY = 'Colombia';
const DEFAULT_LANGUAGE = 'es';
const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_CANDIDATE_FLOOR = 500;

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    if (!raw || raw.trim().startsWith('#')) continue;
    const separator = raw.indexOf('=');
    if (separator < 0) continue;
    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    websiteId: '',
    locale: DEFAULT_LOCALE,
    country: DEFAULT_COUNTRY,
    language: DEFAULT_LANGUAGE,
    floor: DEFAULT_CANDIDATE_FLOOR,
    snapshotLimit: 240,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const next = args[index + 1];
    if (token === '--website-id' && next) {
      parsed.websiteId = next;
      index += 1;
      continue;
    }
    if (token === '--locale' && next) {
      parsed.locale = next;
      index += 1;
      continue;
    }
    if (token === '--country' && next) {
      parsed.country = next;
      index += 1;
      continue;
    }
    if (token === '--language' && next) {
      parsed.language = next;
      index += 1;
      continue;
    }
    if (token === '--floor' && next) {
      const value = Number(next);
      if (Number.isFinite(value) && value > 0) {
        parsed.floor = Math.floor(value);
      }
      index += 1;
      continue;
    }
    if (token === '--snapshot-limit' && next) {
      const value = Number(next);
      if (Number.isFinite(value) && value > 0) {
        parsed.snapshotLimit = Math.floor(value);
      }
      index += 1;
    }
  }

  if (!parsed.websiteId) {
    throw new Error('Usage: node scripts/seo/hydrate-epic86-decision-grade.mjs --website-id <uuid> [--locale es-CO] [--country Colombia] [--language es] [--floor 500]');
  }

  return parsed;
}

function normalizePath(pathname) {
  if (!pathname) return '/';
  const withoutHash = pathname.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const trimmed = withoutQuery.trim();
  if (!trimmed) return '/';
  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 ? prefixed.replace(/\/+$/, '') : prefixed;
}

function inferIntent(keyword) {
  const normalized = keyword.toLowerCase();
  if (/(precio|book|reserva|buy|compra|paquete)/.test(normalized)) return 'transactional';
  if (/(mejor|vs|comparar|review|top)/.test(normalized)) return 'commercial';
  if (/(oficial|login|home)/.test(normalized)) return 'navigational';
  if (/(guia|qué|que|how|tips|itinerario)/.test(normalized)) return 'informational';
  return 'mixed';
}

function recommendationForIntent(intent) {
  if (intent === 'transactional' || intent === 'commercial') return 'update';
  if (intent === 'informational') return 'create';
  return 'merge';
}

function scoreCandidate(searchVolume, keyword) {
  const volume = Number.isFinite(searchVolume) ? Math.max(searchVolume, 0) : 0;
  const lengthBoost = Math.min(keyword.length, 90);
  return Number((volume * 0.35 + lengthBoost).toFixed(2));
}

function chunk(list, size) {
  const groups = [];
  for (let index = 0; index < list.length; index += size) {
    groups.push(list.slice(index, index + size));
  }
  return groups;
}

async function fetchDataForSeoTopSearches({ country, language, offset, limit }) {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) {
    return [];
  }

  const body = [
    {
      location_name: country,
      language_code: language,
      limit,
      offset,
      include_clickstream_data: false,
    },
  ];

  const auth = btoa(`${login}:${password}`);
  const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/top_searches/live', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items = payload?.tasks?.[0]?.result?.[0]?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const keyword = typeof item?.keyword === 'string' ? item.keyword.trim().toLowerCase() : '';
      if (!keyword) return null;
      const searchVolume = Number(item?.keyword_info?.search_volume ?? 0);
      const difficulty = Number(item?.keyword_properties?.keyword_difficulty ?? NaN);
      const intent = typeof item?.search_intent_info?.main_intent === 'string'
        ? item.search_intent_info.main_intent
        : inferIntent(keyword);
      return {
        keyword,
        searchVolume: Number.isFinite(searchVolume) ? searchVolume : null,
        difficulty: Number.isFinite(difficulty) ? difficulty : null,
        intent,
        cpc: Number.isFinite(Number(item?.keyword_info?.cpc)) ? Number(item.keyword_info.cpc) : null,
        competition: Number.isFinite(Number(item?.keyword_info?.competition)) ? Number(item.keyword_info.competition) : null,
        source: 'dataforseo:top_searches',
      };
    })
    .filter(Boolean);
}

async function ensureLiveSnapshots({
  admin,
  websiteId,
  accountId,
  host,
  locale,
  snapshotLimit,
  fetchedAt,
}) {
  const sources = [];

  const { data: pages, error: pagesError } = await admin
    .from('website_pages')
    .select('id,slug,title,seo_title,seo_description')
    .eq('website_id', websiteId)
    .order('created_at', { ascending: true })
    .limit(Math.min(snapshotLimit, 120));
  if (pagesError) throw new Error(`Failed to load website_pages: ${pagesError.message}`);
  for (const row of pages ?? []) {
    const slug = row.slug ? String(row.slug).replace(/^\/+/, '') : String(row.id);
    sources.push({
      website_id: websiteId,
      locale,
      page_type: 'page',
      page_id: row.id,
      public_url: `https://${host}/${slug}`,
      title: row.seo_title || row.title || null,
      meta_description: row.seo_description || null,
      canonical_url: `https://${host}/${slug}`,
      hreflang: { [locale]: `https://${host}/${slug}` },
      headings: [row.title].filter(Boolean),
      visible_text: row.seo_description || row.title || null,
      internal_links: [],
      schema_types: ['WebPage'],
      source: 'studio-db:website_pages',
      fetched_at: fetchedAt,
      confidence: 'live',
      captured_at: fetchedAt,
      decision_grade_ready: true,
    });
  }

  const remaining = Math.max(snapshotLimit - sources.length, 0);
  if (remaining > 0) {
    const { data: posts, error: postsError } = await admin
      .from('website_blog_posts')
      .select('id,slug,title,excerpt,seo_title,seo_description')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: true })
      .limit(Math.min(remaining, 220));
    if (postsError) throw new Error(`Failed to load website_blog_posts: ${postsError.message}`);
    for (const row of posts ?? []) {
      const slug = row.slug ? String(row.slug).replace(/^\/+/, '') : String(row.id);
      sources.push({
        website_id: websiteId,
        locale,
        page_type: 'blog',
        page_id: row.id,
        public_url: `https://${host}/blog/${slug}`,
        title: row.seo_title || row.title || null,
        meta_description: row.seo_description || row.excerpt || null,
        canonical_url: `https://${host}/blog/${slug}`,
        hreflang: { [locale]: `https://${host}/blog/${slug}` },
        headings: [row.title].filter(Boolean),
        visible_text: row.excerpt || row.title || null,
        internal_links: [],
        schema_types: ['Article'],
        source: 'studio-db:website_blog_posts',
        fetched_at: fetchedAt,
        confidence: 'live',
        captured_at: fetchedAt,
        decision_grade_ready: true,
      });
    }
  }

  const destinationBudget = Math.max(snapshotLimit - sources.length, 0);
  if (destinationBudget > 0) {
    const { data: destinations } = await admin
      .from('destinations')
      .select('id,slug,name,seo_title,seo_description')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })
      .limit(Math.min(destinationBudget, 80));
    for (const row of destinations ?? []) {
      const slug = row.slug ? String(row.slug).replace(/^\/+/, '') : String(row.id);
      sources.push({
        website_id: websiteId,
        locale,
        page_type: 'destination',
        page_id: row.id,
        public_url: `https://${host}/destinos/${slug}`,
        title: row.seo_title || row.name || null,
        meta_description: row.seo_description || null,
        canonical_url: `https://${host}/destinos/${slug}`,
        hreflang: { [locale]: `https://${host}/destinos/${slug}` },
        headings: [row.name].filter(Boolean),
        visible_text: row.seo_description || row.name || null,
        internal_links: [],
        schema_types: ['TouristDestination'],
        source: 'studio-db:destinations',
        fetched_at: fetchedAt,
        confidence: 'live',
        captured_at: fetchedAt,
        decision_grade_ready: true,
      });
    }
  }

  if (sources.length === 0) {
    throw new Error('No content available to hydrate seo_render_snapshots');
  }

  for (const group of chunk(sources, 200)) {
    const { error } = await admin.from('seo_render_snapshots').insert(group);
    if (error) {
      throw new Error(`Failed to insert seo_render_snapshots: ${error.message}`);
    }
  }

  return sources.length;
}

async function ensureKeywordCandidates({
  admin,
  websiteId,
  locale,
  country,
  language,
  floor,
  fetchedAt,
}) {
  const { data: keywordRows, error: keywordError } = await admin
    .from('seo_keywords')
    .select('keyword')
    .eq('website_id', websiteId)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (keywordError) {
    throw new Error(`Failed to read seo_keywords: ${keywordError.message}`);
  }

  const keywordMap = new Map();
  for (const row of keywordRows ?? []) {
    const keyword = String(row.keyword ?? '').trim().toLowerCase();
    if (!keyword || keywordMap.has(keyword)) continue;
    keywordMap.set(keyword, {
      keyword,
      searchVolume: null,
      difficulty: null,
      cpc: null,
      competition: null,
      intent: inferIntent(keyword),
      source: 'google-search-console:warehouse',
    });
  }

  if (keywordMap.size < floor) {
    let offset = 0;
    const pageSize = 200;
    const maxPages = 8;
    for (let page = 0; page < maxPages && keywordMap.size < floor; page += 1) {
      const topSearches = await fetchDataForSeoTopSearches({
        country,
        language,
        offset,
        limit: pageSize,
      });
      if (topSearches.length === 0) {
        break;
      }
      for (const item of topSearches) {
        if (!keywordMap.has(item.keyword)) {
          keywordMap.set(item.keyword, item);
        }
      }
      offset += pageSize;
    }
  }

  if (keywordMap.size < floor) {
    throw new Error(
      `Unable to hydrate ${floor} live keyword candidates. Available after provider merge: ${keywordMap.size}`,
    );
  }

  const selected = Array.from(keywordMap.values()).slice(0, floor);
  const seeds = selected.slice(0, 10).map((item) => item.keyword);
  const runId = crypto.randomUUID();

  const { error: runError } = await admin.from('seo_keyword_research_runs').insert({
    id: runId,
    website_id: websiteId,
    content_type: 'destination',
    country,
    language,
    locale,
    seeds,
    status: 'completed',
    source: 'decision-grade-hydration',
    fetched_at: fetchedAt,
    confidence: 'live',
    decision_grade_ready: true,
  });
  if (runError) {
    throw new Error(`Failed to insert seo_keyword_research_runs: ${runError.message}`);
  }

  const payload = selected.map((item) => {
    const intent = item.intent || inferIntent(item.keyword);
    const recommendationAction = recommendationForIntent(intent);
    const searchVolume = Number.isFinite(item.searchVolume) ? item.searchVolume : null;
    return {
      id: crypto.randomUUID(),
      research_run_id: runId,
      website_id: websiteId,
      content_type: 'destination',
      country,
      language,
      locale,
      keyword: item.keyword,
      intent,
      difficulty: Number.isFinite(item.difficulty) ? item.difficulty : null,
      search_volume: searchVolume,
      cpc: Number.isFinite(item.cpc) ? item.cpc : null,
      competition: Number.isFinite(item.competition) ? item.competition : null,
      recommendation_action: recommendationAction,
      serp_top_competitors: [],
      seasonality_pattern: null,
      seasonality_status: 'unavailable',
      priority_score: scoreCandidate(searchVolume ?? 0, item.keyword),
      source: item.source,
      fetched_at: fetchedAt,
      confidence: 'live',
      decision_grade_ready: true,
    };
  });

  for (const group of chunk(payload, 200)) {
    const { error } = await admin.from('seo_keyword_candidates').insert(group);
    if (error) {
      throw new Error(`Failed to insert seo_keyword_candidates: ${error.message}`);
    }
  }

  return {
    runId,
    inserted: payload.length,
  };
}

async function main() {
  loadEnvFile();
  const args = parseArgs();

  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: website, error: websiteError } = await admin
    .from('websites')
    .select('id,account_id,subdomain,custom_domain')
    .eq('id', args.websiteId)
    .single();
  if (websiteError || !website) {
    throw new Error(`Website not found: ${websiteError?.message ?? args.websiteId}`);
  }

  const host = website.custom_domain || `${website.subdomain}.bukeer.com`;
  const fetchedAt = new Date().toISOString();

  const snapshotCount = await ensureLiveSnapshots({
    admin,
    websiteId: args.websiteId,
    accountId: website.account_id,
    host,
    locale: args.locale,
    snapshotLimit: args.snapshotLimit,
    fetchedAt,
  });

  const keywordResult = await ensureKeywordCandidates({
    admin,
    websiteId: args.websiteId,
    locale: args.locale,
    country: args.country,
    language: args.language,
    floor: args.floor,
    fetchedAt,
  });

  const report = {
    websiteId: args.websiteId,
    locale: args.locale,
    country: args.country,
    language: args.language,
    snapshotCount,
    keywordCandidatesInserted: keywordResult.inserted,
    keywordResearchRunId: keywordResult.runId,
    fetchedAt,
    source: {
      gscWarehouse: true,
      dataforseo: Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

