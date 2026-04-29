#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_ORIGIN = 'https://colombiatours.travel';
const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_MARKET = 'CO';
const OUT_DIR = 'artifacts/seo/2026-04-29-growth-ga4-inventory-normalization';

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === 'true';
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const origin = stripTrailingSlash(args.origin ?? DEFAULT_ORIGIN);
const now = new Date();
const defaultTo = formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
const defaultFromDate = new Date(`${defaultTo}T00:00:00.000Z`);
defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 27);
const from = args.from ?? formatDate(defaultFromDate);
const to = args.to ?? defaultTo;

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
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [ga4Cache, funnelEvents, metaEvents] = await Promise.all([
    fetchGa4Cache(),
    fetchFunnelEvents(),
    fetchMetaConversionEvents(),
  ]);

  const ga4Reports = ga4Cache.map(parseGa4CacheRow);
  const funnelByUrl = summarizeFunnelEvents(funnelEvents);
  const metaSummary = summarizeMetaEvents(metaEvents);
  const candidates = buildCandidates(ga4Reports, funnelByUrl, metaSummary);
  const inventoryRows = mergeInventoryRows(candidates);

  const report = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    website_id: websiteId,
    account_id: accountId,
    window: { from, to },
    counts: {
      growth_ga4_cache: ga4Cache.length,
      ga4_reports: ga4Reports.length,
      ga4_rows: ga4Reports.reduce((sum, report) => sum + report.rows.length, 0),
      funnel_events: funnelEvents.length,
      meta_conversion_events: metaEvents.length,
      candidates: candidates.length,
      inventory_rows: inventoryRows.length,
    },
    candidate_buckets: countBy(candidates, (row) => row._bucket),
    cache_shapes: ga4Reports.map((report) => ({
      cache_key: report.cache_key,
      fetched_at: report.fetched_at,
      dimensions: report.dimensionHeaders,
      metrics: report.metricHeaders,
      rows: report.rows.length,
    })),
    rows: inventoryRows.map(toReportRow),
  };

  if (apply && inventoryRows.length > 0) {
    await upsertInventory(inventoryRows);
    report.applied = true;
  } else {
    report.applied = false;
  }

  await fs.writeFile(path.join(OUT_DIR, 'growth-ga4-inventory-normalization.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'growth-ga4-inventory-normalization.md'), toMarkdown(report));

  console.log(JSON.stringify({
    mode: report.mode,
    window: report.window,
    counts: report.counts,
    candidate_buckets: report.candidate_buckets,
    applied: report.applied,
    outDir: OUT_DIR,
  }, null, 2));
}

async function fetchGa4Cache() {
  const { data, error } = await sb
    .from('growth_ga4_cache')
    .select('account_id,website_id,cache_key,cache_tag,payload,fetched_at,expires_at')
    .eq('website_id', websiteId)
    .order('fetched_at', { ascending: false });
  if (error) throw new Error(`growth_ga4_cache read failed: ${error.message}`);
  return data ?? [];
}

async function fetchFunnelEvents() {
  const { data, error } = await sb
    .from('funnel_events')
    .select('event_name,stage,channel,locale,market,occurred_at,source_url,page_path')
    .eq('website_id', websiteId)
    .gte('occurred_at', `${from}T00:00:00.000Z`)
    .lte('occurred_at', `${to}T23:59:59.999Z`)
    .order('occurred_at', { ascending: false });
  if (error) throw new Error(`funnel_events read failed: ${error.message}`);
  return data ?? [];
}

async function fetchMetaConversionEvents() {
  const { data, error } = await sb
    .from('meta_conversion_events')
    .select('event_name,event_time,event_source_url,status')
    .eq('website_id', websiteId)
    .gte('event_time', `${from}T00:00:00.000Z`)
    .lte('event_time', `${to}T23:59:59.999Z`)
    .order('event_time', { ascending: false });
  if (error) throw new Error(`meta_conversion_events read failed: ${error.message}`);
  return data ?? [];
}

function parseGa4CacheRow(row) {
  const payload = row.payload ?? {};
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  return {
    cache_key: row.cache_key,
    cache_tag: row.cache_tag,
    fetched_at: row.fetched_at,
    dimensionHeaders: payload.dimensionHeaders ?? inferHeadersFromCacheKey(row.cache_key, 'dimensions'),
    metricHeaders: payload.metricHeaders ?? inferHeadersFromCacheKey(row.cache_key, 'metrics'),
    rows: rows.map((item) => ({
      dimensions: normalizeValues(item.dimensionValues),
      metrics: normalizeValues(item.metricValues).map(numberOrZero),
    })),
  };
}

function inferHeadersFromCacheKey(cacheKey, kind) {
  const parts = String(cacheKey ?? '').split('|');
  if (kind === 'metrics') return (parts[2] ?? '').split(',').filter(Boolean);
  if (kind === 'dimensions') return (parts[3] ?? '').split(',').filter(Boolean);
  return [];
}

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => {
    if (value && typeof value === 'object' && 'value' in value) return value.value ?? '';
    return value ?? '';
  });
}

function buildCandidates(reports, funnelByUrl, metaSummary) {
  const candidates = [];
  for (const report of reports) {
    const dimensions = report.dimensionHeaders.join(',');
    if (dimensions === 'landingPagePlusQueryString,sessionDefaultChannelGroup') {
      candidates.push(...landingLowActivationCandidates(report, funnelByUrl));
    } else if (dimensions === 'pagePath,sessionSourceMedium') {
      candidates.push(...sourceMediumPageCandidates(report, funnelByUrl));
    } else if (dimensions === 'eventName,pagePath') {
      candidates.push(...eventPageDropOffCandidates(report, funnelByUrl));
    } else if (dimensions === 'sessionCampaignName,sessionSource,sessionMedium') {
      candidates.push(...campaignTrafficWatchCandidates(report, metaSummary));
    }
  }
  return candidates.filter((row) => row.ga4_sessions_28d > 0 || row.priority_score >= 150);
}

function landingLowActivationCandidates(report, funnelByUrl) {
  return report.rows.flatMap((row) => {
    const page = normalizePagePath(row.dimensions[0]);
    const channelGroup = cleanText(row.dimensions[1]) || 'unknown';
    const metrics = metricsByName(report, row);
    const sessions = intMetric(metrics.sessions);
    const engagement = rateMetric(metrics.engagementRate);
    const conversions = numberOrZero(metrics.conversions);
    if (sessions < 10) return [];

    const url = toPublicUrl(page);
    const funnel = funnelByUrl.get(url) ?? emptyFunnelSummary(url);
    const activationCount = funnel.waflow_opens + funnel.waflow_submits + funnel.whatsapp_clicks;
    const activationRate = sessions > 0 ? activationCount / sessions : 0;
    const lowActivation = engagement < 0.45 || conversions === 0 || activationRate < 0.03;
    if (!lowActivation) return [];

    return [buildInventoryRow({
      bucket: 'landing_low_activation',
      url,
      canonicalUrl: url,
      channel: channelFromGa4(channelGroup),
      funnelStage: 'activation',
      ga4Sessions: sessions,
      ga4Engagement: engagement,
      funnel,
      priorityScore: scoreLanding(sessions, engagement, activationRate, conversions),
      conversionStatus: activationCount === 0 ? 'blocked' : 'pass_with_watch',
      attributionStatus: 'pass_with_watch',
      ownerIssue: '#310',
      nextAction: `GA4 landing low activation: ${sessions} sessions, ${(engagement * 100).toFixed(1)}% engagement, ${activationCount} tracked activation events. Review CTA/WAFlow path for ${page}.`,
      successMetric: 'Activation events per landing session',
    })];
  });
}

function sourceMediumPageCandidates(report, funnelByUrl) {
  return report.rows.flatMap((row) => {
    const page = normalizePagePath(row.dimensions[0]);
    const sourceMedium = cleanText(row.dimensions[1]) || 'unknown / unknown';
    const metrics = metricsByName(report, row);
    const sessions = intMetric(metrics.sessions);
    const engagement = rateMetric(metrics.engagementRate);
    const conversions = numberOrZero(metrics.conversions);
    if (sessions < 8) return [];
    if (engagement >= 0.5 && conversions > 0) return [];

    const url = toPublicUrl(page);
    const funnel = funnelByUrl.get(url) ?? emptyFunnelSummary(url);
    return [buildInventoryRow({
      bucket: 'source_medium_page_opportunity',
      url,
      canonicalUrl: url,
      channel: channelFromSourceMedium(sourceMedium),
      funnelStage: 'activation',
      ga4Sessions: sessions,
      ga4Engagement: engagement,
      funnel,
      priorityScore: scoreSourceMedium(sessions, engagement, conversions),
      conversionStatus: conversions === 0 ? 'blocked' : 'pass_with_watch',
      attributionStatus: sourceMedium === 'unknown / unknown' ? 'blocked' : 'pass_with_watch',
      ownerIssue: '#310',
      nextAction: `GA4 source/medium opportunity: ${sourceMedium} sent ${sessions} sessions to ${page} with ${(engagement * 100).toFixed(1)}% engagement and ${conversions} conversions. Tune message match and tracking.`,
      successMetric: 'Engaged sessions and tracked conversions by source/medium',
    })];
  });
}

function eventPageDropOffCandidates(report, funnelByUrl) {
  const byUrl = new Map();
  for (const row of report.rows) {
    const eventName = cleanText(row.dimensions[0]);
    const page = normalizePagePath(row.dimensions[1]);
    const metrics = metricsByName(report, row);
    const eventCount = intMetric(metrics.eventCount);
    const conversions = numberOrZero(metrics.conversions);
    if (eventCount < 3) continue;
    const url = toPublicUrl(page);
    const current = byUrl.get(url) ?? { url, events: 0, conversions: 0, eventNames: new Set() };
    current.events += eventCount;
    current.conversions += conversions;
    current.eventNames.add(eventName);
    byUrl.set(url, current);
  }

  return [...byUrl.values()].flatMap((item) => {
    if (item.events < 5 || item.conversions > 0) return [];
    const funnel = funnelByUrl.get(item.url) ?? emptyFunnelSummary(item.url);
    return [buildInventoryRow({
      bucket: 'event_page_dropoff',
      url: item.url,
      canonicalUrl: item.url,
      channel: funnel.whatsapp_clicks > 0 ? 'whatsapp' : 'waflow',
      funnelStage: 'qualified_lead',
      ga4Sessions: 0,
      ga4Engagement: 0,
      funnel,
      priorityScore: 350 + item.events * 8,
      conversionStatus: 'blocked',
      attributionStatus: 'pass_with_watch',
      ownerIssue: '#310',
      nextAction: `GA4 event/page drop-off: ${item.events} events (${[...item.eventNames].slice(0, 4).join(', ')}) with 0 GA4 conversions. Check activation-to-lead instrumentation and CTA path.`,
      successMetric: 'Tracked qualified leads after activation event',
    })];
  });
}

function campaignTrafficWatchCandidates(report, metaSummary) {
  return report.rows.flatMap((row) => {
    const campaign = cleanText(row.dimensions[0]);
    const source = cleanText(row.dimensions[1]);
    const medium = cleanText(row.dimensions[2]);
    if (!campaign || campaign === '(not set)') return [];
    const metrics = metricsByName(report, row);
    const sessions = intMetric(metrics.sessions);
    const conversions = numberOrZero(metrics.conversions);
    if (sessions < 5 || conversions > 0) return [];

    const url = `${origin}/__growth/campaign/${slugify(campaign)}?source=${encodeURIComponent(source)}&medium=${encodeURIComponent(medium)}`;
    const sentMetaEvents = metaSummary.sent + metaSummary.skipped + metaSummary.failed + metaSummary.pending;
    return [buildInventoryRow({
      bucket: 'campaign_traffic_watch',
      url,
      canonicalUrl: `${origin}/__growth/campaign/${slugify(campaign)}`,
      channel: channelFromSourceMedium(`${source} / ${medium}`),
      funnelStage: 'acquisition',
      ga4Sessions: sessions,
      ga4Engagement: 0,
      funnel: emptyFunnelSummary(url),
      priorityScore: 150 + sessions * 4 + (sentMetaEvents === 0 ? 100 : 0),
      conversionStatus: 'pass_with_watch',
      attributionStatus: sentMetaEvents === 0 ? 'blocked' : 'pass_with_watch',
      ownerIssue: '#310',
      nextAction: `GA4 campaign watch: ${campaign} (${source} / ${medium}) has ${sessions} sessions and 0 conversions. Verify campaign UTMs, Meta CAPI coverage, and landing continuity.`,
      successMetric: 'Campaign sessions with attributed activation or qualified lead',
    })];
  });
}

function buildInventoryRow(input) {
  const url = normalizeUrl(input.url);
  const canonicalUrl = normalizeUrl(input.canonicalUrl ?? input.url);
  const pageType = inferPageType(canonicalUrl);
  const nowIso = new Date().toISOString();
  return {
    account_id: accountId,
    website_id: websiteId,
    locale: inferLocale(canonicalUrl),
    market: inferMarket(canonicalUrl),
    source_url: url,
    canonical_url: canonicalUrl,
    template_type: inferTemplateType(canonicalUrl),
    cluster: input.bucket,
    intent: inferIntent(canonicalUrl),
    funnel_stage: input.funnelStage,
    channel: input.channel,
    gsc_clicks_28d: 0,
    gsc_impressions_28d: 0,
    gsc_ctr: 0,
    gsc_avg_position: 0,
    ga4_sessions_28d: input.ga4Sessions,
    ga4_engagement: clamp01(input.ga4Engagement),
    waflow_opens: input.funnel.waflow_opens,
    waflow_submits: input.funnel.waflow_submits,
    whatsapp_clicks: input.funnel.whatsapp_clicks,
    qualified_leads: input.funnel.qualified_leads,
    quotes_sent: input.funnel.quotes_sent,
    bookings_confirmed: input.funnel.bookings_confirmed,
    booking_value: 0,
    gross_margin: 0,
    hypothesis: null,
    experiment_id: null,
    ICE_score: null,
    RICE_score: null,
    success_metric: input.successMetric,
    baseline_start: `${from}T00:00:00.000Z`,
    baseline_end: `${to}T23:59:59.999Z`,
    owner: pageType === 'blog' ? 'A4 SEO' : 'A5 Growth Ops',
    owner_issue: input.ownerIssue,
    change_shipped_at: null,
    evaluation_date: null,
    result: 'pending',
    learning: null,
    next_action: input.nextAction,
    technical_status: 'unknown',
    content_status: pageType === 'blog' ? 'pass_with_watch' : 'unknown',
    conversion_status: input.conversionStatus,
    attribution_status: input.attributionStatus,
    status: input.priorityScore >= 500 ? 'queued' : 'idea',
    priority_score: Math.round(input.priorityScore),
    updated_at: nowIso,
    _bucket: input.bucket,
  };
}

function mergeInventoryRows(rows) {
  const byUrl = new Map();
  for (const row of rows) {
    const existing = byUrl.get(row.source_url);
    if (!existing || row.priority_score > existing.priority_score) {
      byUrl.set(row.source_url, row);
    } else {
      existing.ga4_sessions_28d = Math.max(existing.ga4_sessions_28d, row.ga4_sessions_28d);
      existing.ga4_engagement = Math.min(existing.ga4_engagement || 1, row.ga4_engagement || 1);
      existing.priority_score = Math.max(existing.priority_score, row.priority_score);
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, Number(args.limit ?? 75))
    .map(stripPrivateFields);
}

async function upsertInventory(rows) {
  for (const chunk of chunks(rows, 100)) {
    const { error } = await sb.from('growth_inventory').upsert(chunk, { onConflict: 'website_id,source_url' });
    if (error) throw new Error(`growth_inventory upsert failed: ${error.message}`);
  }
}

function summarizeFunnelEvents(events) {
  const out = new Map();
  for (const event of events) {
    const url = normalizeEventUrl(event);
    const summary = out.get(url) ?? emptyFunnelSummary(url);
    if (event.event_name === 'waflow_open') summary.waflow_opens += 1;
    if (event.event_name === 'waflow_submit') summary.waflow_submits += 1;
    if (event.event_name === 'whatsapp_cta_click') summary.whatsapp_clicks += 1;
    if (event.event_name === 'qualified_lead') summary.qualified_leads += 1;
    if (event.event_name === 'quote_sent') summary.quotes_sent += 1;
    if (event.event_name === 'booking_confirmed') summary.bookings_confirmed += 1;
    out.set(url, summary);
  }
  return out;
}

function summarizeMetaEvents(events) {
  return {
    pending: events.filter((row) => row.status === 'pending').length,
    sent: events.filter((row) => row.status === 'sent').length,
    failed: events.filter((row) => row.status === 'failed').length,
    skipped: events.filter((row) => row.status === 'skipped').length,
  };
}

function normalizeEventUrl(event) {
  if (event.source_url) return normalizeUrl(event.source_url);
  if (event.page_path) return toPublicUrl(event.page_path);
  return `${origin}/__growth/funnel/${event.stage ?? 'unknown'}`;
}

function emptyFunnelSummary(url) {
  return {
    url,
    waflow_opens: 0,
    waflow_submits: 0,
    whatsapp_clicks: 0,
    qualified_leads: 0,
    quotes_sent: 0,
    bookings_confirmed: 0,
  };
}

function metricsByName(report, row) {
  const out = {};
  for (let i = 0; i < report.metricHeaders.length; i += 1) {
    out[report.metricHeaders[i]] = row.metrics[i] ?? 0;
  }
  return out;
}

function scoreLanding(sessions, engagement, activationRate, conversions) {
  const volume = Math.min(sessions, 250) * 3;
  const engagementGap = Math.max(0, 0.5 - engagement) * 600;
  const activationGap = Math.max(0, 0.05 - activationRate) * 2000;
  const conversionGap = conversions === 0 ? 150 : 0;
  return 250 + volume + engagementGap + activationGap + conversionGap;
}

function scoreSourceMedium(sessions, engagement, conversions) {
  return 220 + Math.min(sessions, 200) * 3 + Math.max(0, 0.55 - engagement) * 500 + (conversions === 0 ? 125 : 0);
}

function toReportRow(row) {
  return {
    source_url: row.source_url,
    cluster: row.cluster,
    funnel_stage: row.funnel_stage,
    channel: row.channel,
    ga4_sessions_28d: row.ga4_sessions_28d,
    ga4_engagement: row.ga4_engagement,
    waflow_opens: row.waflow_opens,
    waflow_submits: row.waflow_submits,
    whatsapp_clicks: row.whatsapp_clicks,
    qualified_leads: row.qualified_leads,
    conversion_status: row.conversion_status,
    attribution_status: row.attribution_status,
    priority_score: row.priority_score,
    next_action: row.next_action,
  };
}

function toMarkdown(report) {
  const countRows = Object.entries(report.counts).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  const bucketRows = Object.entries(report.candidate_buckets).map(([key, value]) => `| ${key} | ${value} |`).join('\n') || '| none | 0 |';
  const rowLines = report.rows
    .map((row) => `| ${row.priority_score} | ${row.cluster} | ${row.channel} | ${row.ga4_sessions_28d} | ${(row.ga4_engagement * 100).toFixed(1)}% | ${row.conversion_status} | ${row.attribution_status} | ${row.source_url} |`)
    .join('\n') || '|  |  |  |  |  |  |  |  |';
  return `# Growth GA4 Inventory Normalization

Generated: ${report.generated_at}
Mode: ${report.mode}
Window: ${report.window.from} to ${report.window.to}
Website: ${report.website_id}

## Counts

| Signal | Rows |
|---|---:|
${countRows}

## Candidate Buckets

| Bucket | Rows |
|---|---:|
${bucketRows}

## Inventory Rows

| Priority | Bucket | Channel | Sessions | Engagement | Conversion | Attribution | Source URL |
|---:|---|---|---:|---:|---|---|---|
${rowLines}
`;
}

function inferPageType(url) {
  const pathName = safePath(url);
  if (pathName === '/') return 'home';
  if (pathName.includes('/blog/')) return 'blog';
  if (pathName.includes('/paquetes') || pathName.includes('/l/')) return 'package';
  if (pathName.includes('/actividades')) return 'activity';
  if (pathName.includes('/hoteles')) return 'hotel';
  if (pathName.includes('/destin')) return 'destination';
  if (pathName.includes('/__growth/campaign/')) return 'landing';
  return 'page';
}

function inferTemplateType(url) {
  const pageType = inferPageType(url);
  return ['home', 'destination', 'package', 'activity', 'hotel', 'blog', 'landing'].includes(pageType) ? pageType : 'other';
}

function inferIntent(url) {
  const pageType = inferPageType(url);
  if (pageType === 'package' || pageType === 'activity' || pageType === 'landing') return 'commercial';
  if (pageType === 'blog') return 'informational';
  if (pageType === 'home') return 'navigational';
  return 'mixed';
}

function inferLocale(url) {
  const pathName = safePath(url);
  if (pathName.startsWith('/en/')) return 'en-US';
  return DEFAULT_LOCALE;
}

function inferMarket(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes('mexico') || lower.includes('mexicanos')) return 'MX';
  if (safePath(url).startsWith('/en/')) return 'US';
  return DEFAULT_MARKET;
}

function channelFromGa4(value) {
  const lower = String(value).toLowerCase();
  if (lower.includes('organic')) return 'seo';
  if (lower.includes('paid search') || lower.includes('google')) return 'google_ads';
  if (lower.includes('paid social') || lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'meta';
  if (lower.includes('direct')) return 'direct';
  if (lower.includes('referral')) return 'referral';
  if (lower.includes('email')) return 'email';
  return 'unknown';
}

function channelFromSourceMedium(value) {
  const lower = String(value).toLowerCase();
  if (lower.includes('google') && (lower.includes('cpc') || lower.includes('paid'))) return 'google_ads';
  if (lower.includes('facebook') || lower.includes('instagram') || lower.includes('meta')) return 'meta';
  if (lower.includes('tiktok')) return 'tiktok';
  if (lower.includes('whatsapp')) return 'whatsapp';
  if (lower.includes('organic')) return 'seo';
  if (lower.includes('email')) return 'email';
  if (lower.includes('referral')) return 'referral';
  if (lower.includes('(direct)') || lower.includes('direct')) return 'direct';
  return 'unknown';
}

function normalizePagePath(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '(not set)' || raw === '/') return '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      return new URL(raw).pathname || '/';
    } catch {
      return '/';
    }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function toPublicUrl(pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  return normalizeUrl(`${origin}${normalizedPath}`);
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value), origin);
    url.hash = '';
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return `${origin}/`;
  }
}

function safePath(url) {
  try {
    return new URL(String(url), origin).pathname.toLowerCase();
  } catch {
    return '/';
  }
}

function stripPrivateFields(row) {
  const { _bucket, ...publicRow } = row;
  return publicRow;
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/$/, '');
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function intMetric(value) {
  return Math.max(0, Math.round(numberOrZero(value)));
}

function rateMetric(value) {
  const n = numberOrZero(value);
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

function clamp01(value) {
  const n = numberOrZero(value);
  return Math.max(0, Math.min(1, n));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown';
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

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const raw = arg.slice(2);
    if (raw.includes('=')) {
      const [key, ...rest] = raw.split('=');
      parsed[key] = rest.join('=');
      continue;
    }
    const next = argv[i + 1];
    parsed[raw] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) i += 1;
  }
  return parsed;
}
