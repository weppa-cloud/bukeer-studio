#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_MARKET = 'CO';
const DEFAULT_OUT_DIR = 'artifacts/seo/2026-04-29-growth-gsc-inventory-normalization';
const MIN_APPLY_ROWS = 20;

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === 'true';
const dryRun = !apply;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const limit = Number(args.limit ?? 50);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const cacheRows = await fetchGscCache();
  const cacheSets = groupCacheRows(cacheRows);
  const pageMetrics = aggregatePageMetrics(cacheSets.queryPage);
  const opportunities = buildOpportunities(cacheSets, pageMetrics);
  const rankedPages = rankPages(opportunities, pageMetrics).slice(0, limit);
  const existingRows = apply ? await fetchExistingInventory(rankedPages.map((page) => page.url)) : new Map();
  const inventoryRows = rankedPages.map((page) => buildInventoryRow(page, existingRows.get(page.url)));

  const report = {
    generated_at: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'apply',
    website_id: websiteId,
    account_id: accountId,
    cache_summary: cacheSummary(cacheSets),
    opportunity_counts: countBy(opportunities, (item) => item.type),
    inventory_rows: inventoryRows.length,
    top_rows: rankedPages.slice(0, 30).map((page) => summarizePage(page)),
  };

  if (apply) {
    if (inventoryRows.length < MIN_APPLY_ROWS) {
      throw new Error(`Refusing --apply: expected at least ${MIN_APPLY_ROWS} rows, built ${inventoryRows.length}`);
    }
    await upsertInventory(inventoryRows);
    report.applied = true;
  }

  await fs.writeFile(path.join(outDir, 'growth-gsc-inventory-normalization.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'growth-gsc-inventory-normalization.md'), toMarkdown(report));

  console.log(JSON.stringify({
    mode: report.mode,
    cacheSets: report.cache_summary,
    opportunityCounts: report.opportunity_counts,
    inventoryRows: report.inventory_rows,
    applied: Boolean(report.applied),
    outDir,
  }, null, 2));
}

async function fetchGscCache() {
  const { data, error } = await sb
    .from('growth_gsc_cache')
    .select('account_id,website_id,cache_key,cache_tag,fetched_at,expires_at,payload')
    .eq('website_id', websiteId)
    .order('fetched_at', { ascending: false });
  if (error) throw new Error(`growth_gsc_cache read failed: ${error.message}`);
  return data ?? [];
}

function groupCacheRows(cacheRows) {
  const sets = {
    queryPage: [],
    pageCountry: [],
    pageDevice: [],
    datePage: [],
  };

  for (const cache of cacheRows) {
    const meta = parseCacheKey(cache.cache_key);
    const rows = normalizePayloadRows(cache.payload);
    if (rows.length === 0) continue;
    const parsed = rows.map((row) => parseGscRow(row, meta.dimensions)).filter(Boolean);
    const entry = { ...cache, ...meta, rows: parsed };

    if (sameDimensions(meta.dimensions, ['query', 'page'])) sets.queryPage.push(entry);
    if (sameDimensions(meta.dimensions, ['page', 'country'])) sets.pageCountry.push(entry);
    if (sameDimensions(meta.dimensions, ['page', 'device'])) sets.pageDevice.push(entry);
    if (sameDimensions(meta.dimensions, ['date', 'page'])) sets.datePage.push(entry);
  }

  return {
    queryPage: latestByCacheKey(sets.queryPage),
    pageCountry: latestByCacheKey(sets.pageCountry),
    pageDevice: latestByCacheKey(sets.pageDevice),
    datePage: latestByCacheKey(sets.datePage),
  };
}

function buildOpportunities(cacheSets, pageMetrics) {
  return [
    ...queryPageCtrOpportunities(cacheSets.queryPage),
    ...queryPagePositionOpportunities(cacheSets.queryPage),
    ...pageCountryOpportunities(cacheSets.pageCountry),
    ...pageDeviceOpportunities(cacheSets.pageDevice),
    ...datePageTrendOpportunities(cacheSets.datePage, pageMetrics),
  ].sort((a, b) => b.priority - a.priority);
}

function queryPageCtrOpportunities(entries) {
  return entries.flatMap((entry) => entry.rows
    .filter((row) => row.page && row.query && row.impressions >= 40 && row.ctr <= 0.025 && row.position <= 20)
    .map((row) => ({
      type: 'query_page_low_ctr',
      url: normalizeUrl(row.page),
      label: `${row.query}: ${row.impressions} impr, ${(row.ctr * 100).toFixed(1)}% CTR, pos ${row.position.toFixed(1)}`,
      priority: Math.round(row.impressions * (0.04 - row.ctr) * 12 + Math.max(0, 12 - row.position) * 8),
      metrics: pickMetrics(row),
      source: sourceRef(entry),
      query: row.query,
    })));
}

function queryPagePositionOpportunities(entries) {
  return entries.flatMap((entry) => entry.rows
    .filter((row) => row.page && row.query && row.impressions >= 60 && row.position >= 8 && row.position <= 35)
    .map((row) => ({
      type: 'query_page_poor_position',
      url: normalizeUrl(row.page),
      label: `${row.query}: ${row.impressions} impr at avg pos ${row.position.toFixed(1)}`,
      priority: Math.round(row.impressions * Math.min(row.position, 30) / 18),
      metrics: pickMetrics(row),
      source: sourceRef(entry),
      query: row.query,
    })));
}

function pageCountryOpportunities(entries) {
  return entries.flatMap((entry) => entry.rows
    .filter((row) => row.page && row.country && row.impressions >= 25 && (row.position >= 8 || row.ctr <= 0.035))
    .map((row) => ({
      type: 'page_country_market',
      url: normalizeUrl(row.page),
      label: `${countryLabel(row.country)}: ${row.impressions} impr, ${(row.ctr * 100).toFixed(1)}% CTR, pos ${row.position.toFixed(1)}`,
      priority: Math.round(row.impressions * marketMultiplier(row.country) + Math.max(0, row.position - 8) * 10),
      metrics: pickMetrics(row),
      source: sourceRef(entry),
      country: row.country,
      market: marketFromCountry(row.country),
    })));
}

function pageDeviceOpportunities(entries) {
  return entries.flatMap((entry) => entry.rows
    .filter((row) => row.page && row.device === 'MOBILE' && row.impressions >= 40 && (row.ctr <= 0.04 || row.position >= 12))
    .map((row) => ({
      type: 'page_device_mobile',
      url: normalizeUrl(row.page),
      label: `mobile: ${row.impressions} impr, ${(row.ctr * 100).toFixed(1)}% CTR, pos ${row.position.toFixed(1)}`,
      priority: Math.round(row.impressions * 0.8 + Math.max(0, row.position - 10) * 18),
      metrics: pickMetrics(row),
      source: sourceRef(entry),
      device: row.device,
    })));
}

function datePageTrendOpportunities(entries, pageMetrics) {
  const byPage = new Map();
  for (const entry of entries) {
    for (const row of entry.rows) {
      if (!row.page || !row.date) continue;
      const page = normalizeUrl(row.page);
      const current = byPage.get(page) ?? { rows: [], source: sourceRef(entry) };
      current.rows.push(row);
      byPage.set(page, current);
    }
  }

  const out = [];
  for (const [url, item] of byPage.entries()) {
    const sorted = item.rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (sorted.length < 10) continue;
    const mid = Math.floor(sorted.length / 2);
    const early = aggregateRows(sorted.slice(0, mid));
    const late = aggregateRows(sorted.slice(mid));
    if (late.impressions < 25) continue;

    const ctrDrop = early.ctr > 0 ? (early.ctr - late.ctr) / early.ctr : 0;
    const clickDrop = early.clicks > 0 ? (early.clicks - late.clicks) / early.clicks : 0;
    const positionWorse = late.position - early.position;
    if (ctrDrop < 0.3 && clickDrop < 0.3 && positionWorse < 3) continue;

    const page = pageMetrics.get(url);
    out.push({
      type: 'date_page_trend_watch',
      url,
      label: `trend: late ${late.clicks} clicks/${late.impressions} impr vs early ${early.clicks}/${early.impressions}; pos ${early.position.toFixed(1)} -> ${late.position.toFixed(1)}`,
      priority: Math.round((page?.impressions ?? late.impressions) * 0.4 + Math.max(0, ctrDrop) * 120 + Math.max(0, positionWorse) * 25),
      metrics: page ?? late,
      source: item.source,
    });
  }
  return out;
}

function rankPages(opportunities, pageMetrics) {
  const pages = new Map();
  for (const opportunity of opportunities) {
    const current = pages.get(opportunity.url) ?? {
      url: opportunity.url,
      score: 0,
      opportunityTypes: new Set(),
      opportunities: [],
      sources: new Map(),
      metrics: pageMetrics.get(opportunity.url) ?? opportunity.metrics,
      market: opportunity.market ?? inferMarket(opportunity.url),
    };
    current.score += opportunity.priority;
    current.opportunityTypes.add(opportunity.type);
    if (opportunity.market && current.market === DEFAULT_MARKET) current.market = opportunity.market;
    if (current.opportunities.length < 8) current.opportunities.push(opportunity);
    current.sources.set(opportunity.type, opportunity.source);
    pages.set(opportunity.url, current);
  }

  return [...pages.values()]
    .map((page) => ({
      ...page,
      priority: Math.round(page.score + page.opportunityTypes.size * 75),
      opportunityTypes: [...page.opportunityTypes],
      sourceRefs: [...page.sources.entries()].map(([type, source]) => `${type}:${source.window}:${source.cache_key}`),
    }))
    .sort((a, b) => b.priority - a.priority);
}

function buildInventoryRow(page, existing = {}) {
  const url = normalizeUrl(page.url);
  const metrics = page.metrics ?? {};
  const contentStatus = page.opportunityTypes.some((type) => ['query_page_low_ctr', 'query_page_poor_position', 'page_country_market'].includes(type))
    ? 'pass_with_watch'
    : existing.content_status ?? 'unknown';
  const conversionStatus = page.opportunityTypes.includes('page_device_mobile')
    ? 'pass_with_watch'
    : existing.conversion_status ?? 'unknown';

  return {
    account_id: existing.account_id ?? accountId,
    website_id: websiteId,
    locale: existing.locale ?? inferLocale(url),
    market: page.market ?? existing.market ?? inferMarket(url),
    source_url: url,
    canonical_url: existing.canonical_url ?? url,
    template_type: existing.template_type ?? inferTemplateType(url),
    cluster: existing.cluster ?? inferCluster(url),
    intent: existing.intent ?? inferIntent(url),
    funnel_stage: existing.funnel_stage ?? 'acquisition',
    channel: existing.channel ?? 'seo',
    gsc_clicks_28d: Math.round(metrics.clicks ?? existing.gsc_clicks_28d ?? 0),
    gsc_impressions_28d: Math.round(metrics.impressions ?? existing.gsc_impressions_28d ?? 0),
    gsc_ctr: clamp(Number(metrics.ctr ?? existing.gsc_ctr ?? 0), 0, 1),
    gsc_avg_position: Number((metrics.position ?? existing.gsc_avg_position ?? 0).toFixed?.(2) ?? metrics.position ?? 0),
    ga4_sessions_28d: existing.ga4_sessions_28d ?? 0,
    ga4_engagement: existing.ga4_engagement ?? 0,
    waflow_opens: existing.waflow_opens ?? 0,
    waflow_submits: existing.waflow_submits ?? 0,
    whatsapp_clicks: existing.whatsapp_clicks ?? 0,
    qualified_leads: existing.qualified_leads ?? 0,
    quotes_sent: existing.quotes_sent ?? 0,
    bookings_confirmed: existing.bookings_confirmed ?? 0,
    booking_value: existing.booking_value ?? 0,
    gross_margin: existing.gross_margin ?? 0,
    hypothesis: existing.hypothesis ?? null,
    experiment_id: existing.experiment_id ?? null,
    ICE_score: existing.ICE_score ?? null,
    RICE_score: existing.RICE_score ?? null,
    success_metric: existing.success_metric ?? 'Improve organic CTR, clicks, or average position on the next 28d GSC window',
    baseline_start: existing.baseline_start ?? null,
    baseline_end: existing.baseline_end ?? null,
    owner: existing.owner ?? 'A5 Growth Ops',
    owner_issue: existing.owner_issue ?? '#310',
    change_shipped_at: existing.change_shipped_at ?? null,
    evaluation_date: existing.evaluation_date ?? null,
    result: existing.result ?? 'pending',
    learning: existing.learning ?? null,
    next_action: buildNextAction(page),
    technical_status: existing.technical_status ?? 'unknown',
    content_status: contentStatus,
    conversion_status: conversionStatus,
    attribution_status: existing.attribution_status ?? 'unknown',
    status: existing.status ?? 'idea',
    priority_score: page.priority,
    updated_at: new Date().toISOString(),
  };
}

async function fetchExistingInventory(urls) {
  if (urls.length === 0) return new Map();
  const out = new Map();
  for (const chunk of chunks(urls, 100)) {
    const { data, error } = await sb
      .from('growth_inventory')
      .select('*')
      .eq('website_id', websiteId)
      .in('source_url', chunk);
    if (error) throw new Error(`growth_inventory read failed: ${error.message}`);
    for (const row of data ?? []) out.set(normalizeUrl(row.source_url), row);
  }
  return out;
}

async function upsertInventory(rows) {
  for (const chunk of chunks(rows, 100)) {
    const { error } = await sb.from('growth_inventory').upsert(chunk, { onConflict: 'website_id,source_url' });
    if (error) throw new Error(`growth_inventory upsert failed: ${error.message}`);
  }
}

function aggregatePageMetrics(entries) {
  const byPage = new Map();
  for (const entry of entries) {
    for (const row of entry.rows) {
      if (!row.page) continue;
      const url = normalizeUrl(row.page);
      const current = byPage.get(url) ?? { clicks: 0, impressions: 0, positionWeight: 0 };
      current.clicks += row.clicks;
      current.impressions += row.impressions;
      current.positionWeight += row.position * row.impressions;
      byPage.set(url, current);
    }
  }
  for (const [url, item] of byPage.entries()) {
    byPage.set(url, finalizeAggregate(item));
  }
  return byPage;
}

function aggregateRows(rows) {
  const aggregate = rows.reduce((acc, row) => {
    acc.clicks += row.clicks;
    acc.impressions += row.impressions;
    acc.positionWeight += row.position * row.impressions;
    return acc;
  }, { clicks: 0, impressions: 0, positionWeight: 0 });
  return finalizeAggregate(aggregate);
}

function finalizeAggregate(item) {
  return {
    clicks: item.clicks,
    impressions: item.impressions,
    ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
    position: item.impressions > 0 ? item.positionWeight / item.impressions : 0,
  };
}

function parseGscRow(row, dimensions) {
  const keys = Array.isArray(row.keys) ? row.keys : [];
  if (keys.length < dimensions.length) return null;
  const out = {
    clicks: numberOrZero(row.clicks),
    impressions: numberOrZero(row.impressions),
    ctr: numberOrZero(row.ctr),
    position: numberOrZero(row.position),
  };
  dimensions.forEach((dimension, index) => {
    out[dimension] = keys[index];
  });
  return out;
}

function normalizePayloadRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function parseCacheKey(cacheKey) {
  const parts = String(cacheKey ?? '').split('|');
  return {
    windowStart: parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts[0] : null,
    windowEnd: parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : null,
    dimensions: parts[2]?.split(',').filter(Boolean) ?? [],
  };
}

function sourceRef(entry) {
  return {
    cache_key: entry.cache_key,
    cache_tag: entry.cache_tag,
    window: entry.windowStart && entry.windowEnd ? `${entry.windowStart}..${entry.windowEnd}` : 'unknown-window',
  };
}

function cacheSummary(cacheSets) {
  return Object.fromEntries(Object.entries(cacheSets).map(([name, entries]) => [
    name,
    entries.map((entry) => ({
      cache_key: entry.cache_key,
      cache_tag: entry.cache_tag,
      window: entry.windowStart && entry.windowEnd ? `${entry.windowStart}..${entry.windowEnd}` : null,
      rows: entry.rows.length,
      fetched_at: entry.fetched_at,
    })),
  ]));
}

function buildNextAction(page) {
  const typeList = page.opportunityTypes.join(', ');
  const detailList = page.opportunities.map((item) => item.label).join(' | ');
  const sources = page.sourceRefs.slice(0, 5).join(' ; ');
  return truncate(`GSC ${typeList}. ${detailList}. Source cache/window: ${sources}. Next: brief SEO/content owner on title/snippet, ranking gap, market/device, or trend action before next Growth Council.`, 1900);
}

function summarizePage(page) {
  return {
    source_url: page.url,
    priority_score: page.priority,
    market: page.market,
    metrics: page.metrics,
    opportunity_types: page.opportunityTypes,
    opportunities: page.opportunities.map((item) => ({
      type: item.type,
      label: item.label,
      priority: item.priority,
      source: item.source,
    })),
  };
}

function toMarkdown(report) {
  const cacheRows = Object.entries(report.cache_summary)
    .flatMap(([set, entries]) => entries.map((entry) => `| ${set} | ${entry.rows} | ${entry.window ?? ''} | \`${entry.cache_key}\` |`))
    .join('\n');
  const countRows = Object.entries(report.opportunity_counts)
    .map(([type, count]) => `| ${type} | ${count} |`)
    .join('\n');
  const topRows = report.top_rows
    .map((row) => `| ${row.priority_score} | ${row.market} | ${row.opportunity_types.join(', ')} | ${row.metrics.impressions ?? 0} | ${row.metrics.clicks ?? 0} | ${Number(row.metrics.position ?? 0).toFixed(1)} | ${row.source_url} |`)
    .join('\n');

  return `# Growth GSC Inventory Normalization

Generated: ${report.generated_at}
Mode: ${report.mode}
Website: ${report.website_id}
Applied: ${report.applied ? 'yes' : 'no'}

## Cache Sets

| Set | Rows | Window | Cache key |
|---|---:|---|---|
${cacheRows}

## Opportunity Counts

| Type | Count |
|---|---:|
${countRows}

## Inventory Rows

Rows prepared: ${report.inventory_rows}

| Priority | Market | Opportunity types | Impressions | Clicks | Avg position | URL |
|---:|---|---|---:|---:|---:|---|
${topRows}
`;
}

function inferLocale(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith('/en/') ? 'en-US' : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function inferMarket(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes('mexico') || lower.includes('mexicanos')) return 'MX';
  if (lower.includes('/en/')) return 'US';
  return DEFAULT_MARKET;
}

function inferTemplateType(url) {
  const pathName = safePath(url);
  if (pathName === '/') return 'home';
  if (pathName.includes('/blog/')) return 'blog';
  if (pathName.includes('/paquetes') || pathName.includes('/l/')) return 'package';
  if (pathName.includes('/actividades')) return 'activity';
  if (pathName.includes('/hoteles')) return 'hotel';
  if (pathName.includes('/transfer')) return 'transfer';
  if (pathName.includes('/destin')) return 'destination';
  return 'other';
}

function inferCluster(url) {
  const pathName = safePath(url);
  if (pathName === '/') return 'home';
  if (pathName.includes('/blog/')) return 'blog';
  if (pathName.includes('/paquetes') || pathName.includes('/l/')) return 'packages';
  if (pathName.includes('/actividades')) return 'activities';
  if (pathName.includes('/hoteles')) return 'hotels';
  if (pathName.includes('mexico') || pathName.includes('mexicanos')) return 'mexico';
  if (pathName.includes('/en/')) return 'en-us';
  if (pathName.includes('/destin')) return 'destinations';
  return 'organic-search';
}

function inferIntent(url) {
  const templateType = inferTemplateType(url);
  if (['package', 'activity', 'hotel', 'transfer', 'landing'].includes(templateType)) return 'commercial';
  if (templateType === 'blog') return 'informational';
  return 'mixed';
}

function marketFromCountry(country) {
  const normalized = String(country ?? '').toLowerCase();
  if (['col', 'co'].includes(normalized)) return 'CO';
  if (['mex', 'mx'].includes(normalized)) return 'MX';
  if (['usa', 'us'].includes(normalized)) return 'US';
  if (['can', 'ca'].includes(normalized)) return 'CA';
  if (['esp', 'fra', 'deu', 'ita', 'nld', 'gbr', 'irl', 'prt', 'che', 'bel', 'aut', 'swe', 'nor', 'dnk', 'fin'].includes(normalized)) return 'EU';
  return 'OTHER';
}

function marketMultiplier(country) {
  const market = marketFromCountry(country);
  if (market === 'CO') return 0.9;
  if (['US', 'MX', 'CA', 'EU'].includes(market)) return 1.2;
  return 0.7;
}

function countryLabel(country) {
  return String(country ?? 'unknown').toUpperCase();
}

function safePath(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '/';
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return String(value ?? '');
  }
}

function sameDimensions(actual, expected) {
  return expected.length === actual.length && expected.every((item, index) => actual[index] === item);
}

function latestByCacheKey(entries) {
  const out = new Map();
  for (const entry of entries) {
    const current = out.get(entry.cache_key);
    if (!current || String(entry.fetched_at).localeCompare(String(current.fetched_at)) > 0) out.set(entry.cache_key, entry);
  }
  return [...out.values()];
}

function pickMetrics(row) {
  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  };
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function chunks(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) i += 1;
  }
  return parsed;
}
