#!/usr/bin/env node
'use strict';

/**
 * Read-only historical audit for ColombiaTours Meta/Facebook Ads.
 *
 * It extracts Meta Ads account/campaign/ad-set/ad inventory, 24m insights,
 * platform/device/country breakdowns, and first-party attribution aggregates.
 * It never mutates Meta Ads or Supabase.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const {
  loadDotEnvFile,
  redact,
} = require('../google-ads/validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_AD_ACCOUNT_ID = 'act_1249829212995679';
const DEFAULT_MONTHS = 24;
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function parseArgs(argv) {
  const args = {
    months: DEFAULT_MONTHS,
    date: DEFAULT_DATE,
    accountId: process.env.COLOMBIATOURS_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
    websiteId: process.env.COLOMBIATOURS_WEBSITE_ID || DEFAULT_WEBSITE_ID,
    adAccountId: process.env.META_AD_ACCOUNT_ID || DEFAULT_AD_ACCOUNT_ID,
    applyAnalysis: false,
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--apply-analysis') args.applyAnalysis = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--months=')) args.months = Number(arg.slice('--months='.length));
    else if (arg.startsWith('--date=')) args.date = arg.slice('--date='.length);
    else if (arg.startsWith('--account-id=')) args.accountId = arg.slice('--account-id='.length);
    else if (arg.startsWith('--website-id=')) args.websiteId = arg.slice('--website-id='.length);
    else if (arg.startsWith('--ad-account-id=')) args.adAccountId = arg.slice('--ad-account-id='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(args.months) || args.months <= 0) throw new Error('--months must be positive');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be YYYY-MM-DD');
  return args;
}

function usage() {
  return `Usage:
  node scripts/meta-ads/audit-colombiatours-meta-historical-ads.cjs --months=24 --apply-analysis
  node scripts/meta-ads/audit-colombiatours-meta-historical-ads.cjs --months=6 --dry-run

Read-only. Does not mutate Meta Ads or Supabase.
`;
}

function assertEnv() {
  const missing = [];
  for (const key of ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
}

function dateMonthsAgo(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function toCsv(rows, columns) {
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')).join('\n')}\n`;
}

function table(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? '').replace(/\|/g, '/')).join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(number(value) * factor) / factor;
}

function pct(numerator, denominator) {
  return denominator > 0 ? round((numerator / denominator) * 100, 2) : 0;
}

function money(value) {
  return MONEY.format(Math.round(number(value)));
}

function clean(value) {
  return String(value || '').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function actionValue(row, names) {
  const wanted = new Set(names);
  return (row.actions || [])
    .filter((action) => wanted.has(action.action_type))
    .reduce((total, action) => total + number(action.value), 0);
}

function actionMax(row, names) {
  return Math.max(0, ...names.map((name) => actionValue(row, [name])));
}

function extractMetrics(row) {
  const spend = number(row.spend);
  const impressions = number(row.impressions);
  const clicks = number(row.clicks);
  const reach = number(row.reach);
  const linkClicks = actionValue(row, ['link_click']);
  const landingPageViews = actionMax(row, ['landing_page_view', 'omni_landing_page_view']);
  const uniqueLeads = Math.max(
    actionValue(row, ['lead']),
    actionValue(row, ['onsite_web_lead']),
    actionValue(row, ['offsite_conversion.fb_pixel_lead']),
  );
  const messagingStarted = actionMax(row, [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
  ]);
  const messagingReplies = actionMax(row, [
    'onsite_conversion.messaging_conversation_replied_7d',
    'onsite_conversion.messaging_first_reply',
  ]);
  const customEvents = actionValue(row, ['offsite_conversion.fb_pixel_custom']);
  const videoViews = actionValue(row, ['video_view']);
  return {
    spend,
    impressions,
    reach,
    clicks,
    linkClicks,
    landingPageViews,
    leads: uniqueLeads,
    uniqueLeads,
    messagingStarted,
    messagingReplies,
    customEvents,
    videoViews,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : number(row.ctr),
    cpc: clicks > 0 ? spend / clicks : number(row.cpc),
    cpl: uniqueLeads > 0 ? spend / uniqueLeads : null,
    costPerLandingPageView: landingPageViews > 0 ? spend / landingPageViews : null,
    landingPageViewRateFromClicks: clicks > 0 ? (landingPageViews / clicks) * 100 : 0,
    leadRateFromLandingPageViews: landingPageViews > 0 ? (uniqueLeads / landingPageViews) * 100 : 0,
  };
}

function addMetrics(target, metrics) {
  for (const key of [
    'spend',
    'impressions',
    'reach',
    'clicks',
    'linkClicks',
    'landingPageViews',
    'leads',
    'uniqueLeads',
    'messagingStarted',
    'messagingReplies',
    'customEvents',
    'videoViews',
  ]) {
    target[key] = number(target[key]) + number(metrics[key]);
  }
}

function finalizeMetrics(row) {
  row.ctr = row.impressions > 0 ? round((row.clicks / row.impressions) * 100, 2) : 0;
  row.cpc = row.clicks > 0 ? round(row.spend / row.clicks, 2) : null;
  row.cpl = row.uniqueLeads > 0 ? round(row.spend / row.uniqueLeads, 2) : null;
  row.costPerLandingPageView = row.landingPageViews > 0 ? round(row.spend / row.landingPageViews, 2) : null;
  row.landingPageViewRateFromClicks = row.clicks > 0 ? round((row.landingPageViews / row.clicks) * 100, 2) : 0;
  row.leadRateFromLandingPageViews = row.landingPageViews > 0 ? round((row.uniqueLeads / row.landingPageViews) * 100, 2) : 0;
  return row;
}

function classifyCampaignName(name) {
  const value = lower(name);
  if (/(rrhh|reclutar|travel planner|desarrollador|convocatoria)/.test(value)) return 'recruiting_not_customer_acquisition';
  if (/(afiliado|afiliados|affiliate)/.test(value)) return 'affiliate_partner';
  if (/(reconocimiento|awareness|brand)/.test(value)) return 'awareness';
  if (/(tr[aá]fico|traffic)/.test(value)) return 'traffic';
  if (/(whatsapp|mensaje|messaging)/.test(value)) return 'messaging_leads';
  if (/(lead|clientes potenciales|form|submit|web)/.test(value)) return 'lead_generation';
  if (/(venta|sales|conversi[oó]n|conversion|purchase)/.test(value)) return 'sales_or_conversion';
  return 'uncategorized';
}

function classifyRecommendation(row) {
  if (row.spend <= 0) return 'ignore_no_spend';
  if (row.category === 'recruiting_not_customer_acquisition') return 'exclude_from_travel_lead_learning';
  if (row.uniqueLeads > 0 && row.cpl && row.cpl < 400000) return 'mine_creative_and_landing_for_rebuild';
  if (row.landingPageViews > 200 && row.uniqueLeads === 0) return 'tracking_or_offer_gap';
  if (row.clicks > 500 && row.landingPageViews / Math.max(row.clicks, 1) < 0.45) return 'landing_load_or_click_quality_gap';
  if (row.ctr < 0.8 && row.spend > 100000) return 'creative_refresh_required';
  if (row.spend > 500000 && row.uniqueLeads === 0) return 'do_not_relaunch_as_is';
  return 'observe_or_archive';
}

async function graphGet(pathname, params = {}) {
  const apiVersion = process.env.META_API_VERSION || 'v21.0';
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${pathname.replace(/^\//, '')}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN);

  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Meta Graph API failed ${response.status}: ${JSON.stringify(redact(body))}`);
  }
  return body;
}

async function graphGetAll(pathname, params = {}) {
  const rows = [];
  let response = await graphGet(pathname, params);
  rows.push(...(response.data || []));
  while (response.paging?.next) {
    const nextResponse = await fetch(response.paging.next);
    const body = await nextResponse.json().catch(() => ({}));
    if (!nextResponse.ok) throw new Error(`Meta Graph paging failed ${nextResponse.status}: ${JSON.stringify(redact(body))}`);
    response = body;
    rows.push(...(response.data || []));
  }
  return rows;
}

async function fetchMetaInventory(adAccountId) {
  const account = await graphGet(adAccountId, {
    fields: 'id,name,account_status,currency,timezone_name,amount_spent,business',
  });
  const [campaigns, adsets, ads] = await Promise.all([
    graphGetAll(`${adAccountId}/campaigns`, {
      fields: 'id,name,status,effective_status,objective,created_time,updated_time,buying_type,configured_status,start_time,stop_time',
      limit: 500,
    }),
    graphGetAll(`${adAccountId}/adsets`, {
      fields: 'id,name,campaign_id,campaign{name},status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,targeting,created_time,updated_time,start_time,end_time',
      limit: 500,
    }),
    graphGetAll(`${adAccountId}/ads`, {
      fields: 'id,name,campaign_id,campaign{name},adset_id,adset{name},status,effective_status,created_time,updated_time,creative{id,name,object_story_spec,effective_object_story_id,thumbnail_url}',
      limit: 500,
    }),
  ]);
  return { account, campaigns, adsets, ads };
}

async function fetchInsights(adAccountId, since, until) {
  const fields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name',
    'ad_id',
    'ad_name',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'actions',
    'cost_per_action_type',
    'date_start',
    'date_stop',
  ].join(',');
  const timeRange = JSON.stringify({ since, until });
  const common = { fields, time_range: timeRange, limit: 500 };

  const [
    accountMonthly,
    campaignMonthly,
    campaignAllTime,
    adsetAllTime,
    adAllTime,
    countryBreakdown,
    publisherBreakdown,
    deviceBreakdown,
    ageGenderBreakdown,
  ] = await Promise.all([
    graphGetAll(`${adAccountId}/insights`, { ...common, time_increment: 'monthly' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, level: 'campaign', time_increment: 'monthly' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, level: 'campaign', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, level: 'adset', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, level: 'ad', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, breakdowns: 'country', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, breakdowns: 'publisher_platform', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, breakdowns: 'device_platform', time_increment: 'all_days' }),
    graphGetAll(`${adAccountId}/insights`, { ...common, breakdowns: 'age,gender', time_increment: 'all_days' }),
  ]);
  return {
    accountMonthly,
    campaignMonthly,
    campaignAllTime,
    adsetAllTime,
    adAllTime,
    countryBreakdown,
    publisherBreakdown,
    deviceBreakdown,
    ageGenderBreakdown,
  };
}

async function fetchFirstParty({ accountId, websiteId, since }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const funnelEventNames = [
    'whatsapp_cta_click',
    'waflow_submit',
    'crm_quote_sent',
    'quote_sent',
    'crm_lead_stage_qualified',
    'chatwoot_label_qualified',
    'qualified_lead',
    'crm_booking_confirmed',
    'booking_confirmed',
  ];

  const [funnelEvents, waflowLeads, requests] = await Promise.all([
    fetchAll(
      supabase
        .from('funnel_events')
        .select([
          'event_id',
          'event_name',
          'stage',
          'channel',
          'account_id',
          'website_id',
          'reference_code',
          'occurred_at',
          'created_at',
          'source',
          'source_url',
          'page_path',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_content',
          'utm_term',
          'fbp',
          'fbc',
          'ctwa_clid',
          'gclid',
          'dispatch_status',
        ].join(','))
        .eq('account_id', accountId)
        .eq('website_id', websiteId)
        .in('event_name', funnelEventNames)
        .gte('occurred_at', `${since}T00:00:00.000Z`)
        .order('occurred_at', { ascending: true }),
      'funnel_events',
    ),
    fetchAll(
      supabase
        .from('waflow_leads')
        .select([
          'id',
          'website_id',
          'reference_code',
          'created_at',
          'submitted_at',
          'whatsapp_redirected_at',
          'chatwoot_conversation_id',
          'chatwoot_custom_attributes',
          'payload',
        ].join(','))
        .eq('website_id', websiteId)
        .gte('created_at', `${since}T00:00:00.000Z`)
        .order('created_at', { ascending: true }),
      'waflow_leads',
    ),
    fetchAll(
      supabase
        .from('requests')
        .select('id,account_id,created_at,lead_source,status,custom_fields')
        .eq('account_id', accountId)
        .gte('created_at', `${since}T00:00:00.000Z`)
        .order('created_at', { ascending: true }),
      'requests',
    ),
  ]);

  return { funnelEvents, waflowLeads, requests };
}

async function fetchAll(query, label) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(`${label} fetch failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function isMetaAttributedEvent(event) {
  const channelHaystack = [
    event.source,
    event.channel,
    event.utm_source,
    event.utm_medium,
  ].join(' ').toLowerCase();
  const campaignHaystack = [
    event.utm_campaign,
    event.utm_content,
    event.utm_term,
  ].join(' ').toLowerCase();
  const urlHaystack = [
    event.source_url,
    event.ctwa_clid,
  ].join(' ').toLowerCase();

  return /(^|[^a-z0-9])(facebook|meta|instagram|fb|ig)([^a-z0-9]|$)/.test(channelHaystack)
    || /(^|[^a-z0-9])(facebook|meta|instagram|fb|ig)([^a-z0-9]|$)/.test(campaignHaystack)
    || /(facebook|meta|instagram|fbclid|ctwa)/.test(urlHaystack)
    || Boolean(event.ctwa_clid);
}

function isMetaAttributedRequest(request) {
  const haystack = [
    request.lead_source,
    request.status,
    request.custom_fields ? JSON.stringify(request.custom_fields) : '',
  ].join(' ').toLowerCase();
  return /(facebook|meta|instagram|fbclid|_fbp|_fbc|ctwa)/.test(haystack);
}

function summarizeFirstParty(firstParty) {
  const metaEvents = firstParty.funnelEvents.filter(isMetaAttributedEvent);
  const metaRequests = firstParty.requests.filter(isMetaAttributedRequest);
  const byEvent = aggregate(metaEvents, (event) => event.event_name || '(unknown)');
  const byUtmCampaign = aggregate(metaEvents.filter((event) => event.utm_campaign), (event) => event.utm_campaign);
  const withReference = metaEvents.filter((event) => event.reference_code).length;
  const withFbp = metaEvents.filter((event) => event.fbp).length;
  const withFbc = metaEvents.filter((event) => event.fbc).length;
  const withCtwa = metaEvents.filter((event) => event.ctwa_clid).length;
  const dispatchedToMeta = metaEvents.filter((event) => {
    const payload = JSON.stringify(event.provider_status || event.payload || {}).toLowerCase();
    return payload.includes('meta') || payload.includes('facebook') || event.dispatch_status === 'sent';
  }).length;

  return {
    totalFunnelEvents: firstParty.funnelEvents.length,
    metaAttributedEvents: metaEvents.length,
    metaAttributedRequests: metaRequests.length,
    waflowLeads: firstParty.waflowLeads.length,
    waflowSubmitted: firstParty.waflowLeads.filter((lead) => lead.submitted_at).length,
    waflowWithChatwoot: firstParty.waflowLeads.filter((lead) => lead.chatwoot_conversation_id).length,
    metaEventsWithReference: withReference,
    metaEventsWithFbp: withFbp,
    metaEventsWithFbc: withFbc,
    metaEventsWithCtwa: withCtwa,
    metaEventsDispatchSignal: dispatchedToMeta,
    metaReferenceCoverage: pct(withReference, metaEvents.length),
    metaFbpCoverage: pct(withFbp, metaEvents.length),
    metaFbcCoverage: pct(withFbc, metaEvents.length),
    metaCtwaCoverage: pct(withCtwa, metaEvents.length),
    byEventName: byEvent,
    byUtmCampaign: byUtmCampaign.slice(0, 25),
  };
}

function aggregate(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '(unknown)';
    const current = map.get(key) || { key, count: 0 };
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function summarizeCampaigns(campaignRows, inventoryCampaigns) {
  const inventoryById = new Map(inventoryCampaigns.map((campaign) => [campaign.id, campaign]));
  return campaignRows.map((row) => {
    const metrics = extractMetrics(row);
    const inventory = inventoryById.get(row.campaign_id) || {};
    const category = classifyCampaignName(row.campaign_name || inventory.name);
    return finalizeMetrics({
      campaignId: row.campaign_id,
      campaignName: row.campaign_name || inventory.name || row.campaign_id,
      status: inventory.status || '',
      effectiveStatus: inventory.effective_status || '',
      objective: inventory.objective || '',
      category,
      ...metrics,
    });
  })
    .map((row) => ({ ...row, recommendation: classifyRecommendation(row) }))
    .sort((a, b) => b.spend - a.spend);
}

function summarizeLevel(rows, idKey, nameKey) {
  return rows.map((row) => finalizeMetrics({
    id: row[idKey],
    name: row[nameKey],
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    category: classifyCampaignName(row.campaign_name),
    ...extractMetrics(row),
  })).sort((a, b) => b.spend - a.spend);
}

function summarizeMonthly(accountMonthly) {
  return accountMonthly.map((row) => finalizeMetrics({
    month: row.date_start?.slice(0, 7),
    dateStart: row.date_start,
    dateStop: row.date_stop,
    ...extractMetrics(row),
  })).sort((a, b) => a.dateStart.localeCompare(b.dateStart));
}

function summarizeBreakdown(rows, dimension) {
  return rows.map((row) => finalizeMetrics({
    dimension,
    value: row[dimension] || '(unknown)',
    ...extractMetrics(row),
  })).sort((a, b) => b.spend - a.spend);
}

function buildMarketInsights(countryRows) {
  const marketMap = {
    MX: 'Mexico',
    ES: 'Spain',
    CL: 'Chile',
    BR: 'Brazil',
    AR: 'Argentina',
    US: 'United States',
    CO: 'Colombia',
  };
  return Object.entries(marketMap).map(([code, name]) => {
    const row = countryRows.find((entry) => entry.value === code) || {};
    return {
      countryCode: code,
      countryName: name,
      spend: number(row.spend),
      clicks: number(row.clicks),
      landingPageViews: number(row.landingPageViews),
      uniqueLeads: number(row.uniqueLeads),
      cpl: row.cpl ?? null,
      recommendation: code === 'CO'
        ? 'exclude_or_separate_local_traffic_for_international_lead_strategy'
        : (number(row.spend) > 0 ? 'evaluate_for_city_gated_meta_test' : 'no_historical_meta_signal'),
    };
  });
}

function buildWasteAndOpportunityRows(campaignSummary, adsetSummary, adSummary) {
  const wasteCandidates = [...campaignSummary, ...adsetSummary, ...adSummary]
    .filter((row) => row.spend > 100000 && (row.uniqueLeads === 0 || row.category === 'recruiting_not_customer_acquisition'))
    .map((row) => ({
      level: row.campaignId && row.id ? (row.adId ? 'ad' : 'adset') : 'campaign',
      id: row.id || row.campaignId,
      name: row.name || row.campaignName,
      campaignName: row.campaignName || row.name,
      spend: row.spend,
      uniqueLeads: row.uniqueLeads,
      cpl: row.cpl,
      reason: row.category === 'recruiting_not_customer_acquisition'
        ? 'recruiting spend should not train travel lead campaigns'
        : 'high spend without platform lead signal',
      recommendation: row.category === 'recruiting_not_customer_acquisition' ? 'exclude_from_growth_dataset' : 'do_not_relaunch_as_is',
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 50);

  const excludedOpportunityCategories = new Set(['recruiting_not_customer_acquisition', 'affiliate_partner']);
  const opportunities = [...campaignSummary, ...adsetSummary, ...adSummary]
    .filter((row) => !excludedOpportunityCategories.has(row.category))
    .filter((row) => row.spend > 0 && (row.uniqueLeads > 0 || row.landingPageViews > 100 || row.ctr > 2.5))
    .map((row) => ({
      level: row.campaignId && row.id ? (row.adId ? 'ad' : 'adset') : 'campaign',
      id: row.id || row.campaignId,
      name: row.name || row.campaignName,
      campaignName: row.campaignName || row.name,
      spend: row.spend,
      ctr: row.ctr,
      landingPageViews: row.landingPageViews,
      uniqueLeads: row.uniqueLeads,
      cpl: row.cpl,
      reason: row.uniqueLeads > 0 ? 'has lead signal' : (row.ctr > 2.5 ? 'high engagement signal' : 'landing volume signal'),
      recommendation: row.uniqueLeads > 0 ? 'mine_creative_offer_audience_for_next_test' : 'use_as_creative_learning_not_bidding_truth',
    }))
    .sort((a, b) => (b.uniqueLeads - a.uniqueLeads) || (b.landingPageViews - a.landingPageViews) || (b.ctr - a.ctr))
    .slice(0, 50);

  return { wasteCandidates, opportunities };
}

function buildExecutiveSummary({ account, monthly, campaignSummary, firstPartySummary }) {
  const totals = finalizeMetrics(monthly.reduce((acc, row) => {
    addMetrics(acc, row);
    return acc;
  }, {}));
  const customerAcquisitionSpend = campaignSummary
    .filter((row) => row.category !== 'recruiting_not_customer_acquisition')
    .reduce((total, row) => total + row.spend, 0);
  const recruitingSpend = campaignSummary
    .filter((row) => row.category === 'recruiting_not_customer_acquisition')
    .reduce((total, row) => total + row.spend, 0);
  return {
    accountName: account.name,
    accountStatus: account.account_status,
    currency: account.currency,
    timezone: account.timezone_name,
    lifetimeAmountSpent: number(account.amount_spent),
    auditedSpend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    landingPageViews: totals.landingPageViews,
    uniquePlatformLeads: totals.uniqueLeads,
    messagingStarted: totals.messagingStarted,
    ctr: totals.ctr,
    cpc: totals.cpc,
    cpl: totals.cpl,
    customerAcquisitionSpend,
    recruitingSpend,
    recruitingSpendShare: pct(recruitingSpend, totals.spend),
    metaAttributedFirstPartyEvents: firstPartySummary.metaAttributedEvents,
    metaAttributedRequests: firstPartySummary.metaAttributedRequests,
    metaFbcCoverage: firstPartySummary.metaFbcCoverage,
    metaFbpCoverage: firstPartySummary.metaFbpCoverage,
  };
}

function renderMarkdown({ generatedAt, since, until, report, paths }) {
  const summary = report.executiveSummary;
  const topCampaigns = report.campaignSummary.slice(0, 10).map((row) => ({
    campaignName: row.campaignName,
    category: row.category,
    spend: money(row.spend),
    clicks: row.clicks,
    lpv: row.landingPageViews,
    leads: row.uniqueLeads,
    cpl: row.cpl ? money(row.cpl) : '',
    recommendation: row.recommendation,
  }));
  const monthly = report.monthly.map((row) => ({
    month: row.month,
    spend: money(row.spend),
    clicks: row.clicks,
    lpv: row.landingPageViews,
    leads: row.uniqueLeads,
    cpl: row.cpl ? money(row.cpl) : '',
  }));
  const markets = report.marketInsights.map((row) => ({
    countryCode: row.countryCode,
    countryName: row.countryName,
    spend: money(row.spend),
    clicks: row.clicks,
    lpv: row.landingPageViews,
    leads: row.uniqueLeads,
    cpl: row.cpl ? money(row.cpl) : '',
    recommendation: row.recommendation,
  }));
  return [
    '# ColombiaTours Meta Ads Historical Data Audit',
    '',
    `Generated: ${generatedAt}`,
    `Window: ${since} to ${until}`,
    'Mode: read-only. Meta Ads mutations: 0. Supabase writes: 0.',
    '',
    '## Executive Summary',
    '',
    `- Account: ${summary.accountName} (${summary.currency}, ${summary.timezone}).`,
    `- Lifetime account spend reported by Meta: ${money(summary.lifetimeAmountSpent)}.`,
    `- Audited-window spend: ${money(summary.auditedSpend)}.`,
    `- Clicks: ${summary.clicks}; landing page views: ${summary.landingPageViews}; platform leads: ${summary.uniquePlatformLeads}.`,
    `- CTR: ${summary.ctr}%; CPC: ${summary.cpc ? money(summary.cpc) : 'n/a'}; platform CPL: ${summary.cpl ? money(summary.cpl) : 'n/a'}.`,
    `- Recruiting/non-customer-acquisition spend detected: ${money(summary.recruitingSpend)} (${summary.recruitingSpendShare}%). Keep this separated from travel lead learning.`,
    `- First-party Meta-attributed funnel events: ${summary.metaAttributedFirstPartyEvents}; Meta-attributed CRM requests: ${summary.metaAttributedRequests}.`,
    `- Meta click/browser coverage in first-party events: fbc ${summary.metaFbcCoverage}%, fbp ${summary.metaFbpCoverage}%.`,
    '',
    '## Key Findings',
    '',
    '- Meta spend has usable creative/audience signal, but platform leads should be treated as weak until CRM quality is fed back through CAPI.',
    '- Recruitment campaigns exist in the same ad account history; their spend must be excluded from ColombiaTours travel-lead optimization datasets.',
    '- The account has custom pixel events and lead events, but the decision truth should be `waflow_submit`, useful conversation, `crm_quote_sent`, opportunity, and itinerary confirmation.',
    '- Country-level learnings should be converted into city-gated tests only where direct Colombia flight connectivity and landing readiness exist.',
    '',
    '## Monthly Spend And Lead Signals',
    '',
    table(monthly, [
      { key: 'month', label: 'Month' },
      { key: 'spend', label: 'Spend' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'lpv', label: 'LPV' },
      { key: 'leads', label: 'Platform Leads' },
      { key: 'cpl', label: 'CPL' },
    ]),
    '',
    '## Top Campaigns By Spend',
    '',
    table(topCampaigns, [
      { key: 'campaignName', label: 'Campaign' },
      { key: 'category', label: 'Category' },
      { key: 'spend', label: 'Spend' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'lpv', label: 'LPV' },
      { key: 'leads', label: 'Leads' },
      { key: 'cpl', label: 'CPL' },
      { key: 'recommendation', label: 'Recommendation' },
    ]),
    '',
    '## Market Readout',
    '',
    table(markets, [
      { key: 'countryCode', label: 'Code' },
      { key: 'countryName', label: 'Market' },
      { key: 'spend', label: 'Spend' },
      { key: 'clicks', label: 'Clicks' },
      { key: 'lpv', label: 'LPV' },
      { key: 'leads', label: 'Leads' },
      { key: 'cpl', label: 'CPL' },
      { key: 'recommendation', label: 'Recommendation' },
    ]),
    '',
    '## Recommended Actions',
    '',
    '1. Build the first Meta test as website/WAFlow leads, not low-friction forms, unless CRM/CAPI feedback is confirmed.',
    '2. Exclude recruiting campaigns and local/non-travel campaigns from any lookalike or learning dataset for travel leads.',
    '3. Use historical winners for creative angles and landing offers, not as conversion truth.',
    '4. Rebuild by city-gated markets aligned with Google Ads: Sao Paulo, Mexico City/Monterrey, Madrid/Barcelona, Santiago, then Buenos Aires.',
    '5. Before launch, close Meta CAPI quality loop for `waflow_submit`, `crm_qualified_lead`, `crm_quote_sent`, opportunity, and confirmed itinerary.',
    '',
    '## Files',
    '',
    `- \`${paths.json}\``,
    `- \`${paths.monthlyCsv}\``,
    `- \`${paths.campaignCsv}\``,
    `- \`${paths.adsetCsv}\``,
    `- \`${paths.adCsv}\``,
    `- \`${paths.marketCsv}\``,
    `- \`${paths.publisherCsv}\``,
    `- \`${paths.deviceCsv}\``,
    `- \`${paths.ageGenderCsv}\``,
    `- \`${paths.firstPartyEventsCsv}\``,
    `- \`${paths.wasteCsv}\``,
    `- \`${paths.opportunityCsv}\``,
    '',
  ].join('\n');
}

async function main() {
  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));

  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  assertEnv();

  const until = args.date;
  const since = dateMonthsAgo(until, args.months);
  const generatedAt = new Date().toISOString();
  const outDir = path.join(repoRoot, 'artifacts', 'meta-ads', `${args.date}-colombiatours-meta-ads-${args.months}m-audit`);
  const docsOut = path.join(repoRoot, 'docs', 'audits', `${args.date}-colombiatours-meta-ads-${args.months}m-audit.md`);

  const [inventory, insights, firstParty] = await Promise.all([
    fetchMetaInventory(args.adAccountId),
    fetchInsights(args.adAccountId, since, until),
    fetchFirstParty({ accountId: args.accountId, websiteId: args.websiteId, since }),
  ]);

  const monthly = summarizeMonthly(insights.accountMonthly);
  const campaignSummary = summarizeCampaigns(insights.campaignAllTime, inventory.campaigns);
  const adsetSummary = summarizeLevel(insights.adsetAllTime, 'adset_id', 'adset_name');
  const adSummary = summarizeLevel(insights.adAllTime, 'ad_id', 'ad_name').map((row) => ({ ...row, adId: row.id }));
  const countryBreakdown = summarizeBreakdown(insights.countryBreakdown, 'country');
  const publisherBreakdown = summarizeBreakdown(insights.publisherBreakdown, 'publisher_platform');
  const deviceBreakdown = summarizeBreakdown(insights.deviceBreakdown, 'device_platform');
  const ageGenderBreakdown = insights.ageGenderBreakdown.map((row) => finalizeMetrics({
    age: row.age || '',
    gender: row.gender || '',
    ...extractMetrics(row),
  })).sort((a, b) => b.spend - a.spend);
  const firstPartySummary = summarizeFirstParty(firstParty);
  const marketInsights = buildMarketInsights(countryBreakdown);
  const { wasteCandidates, opportunities } = buildWasteAndOpportunityRows(campaignSummary, adsetSummary, adSummary);
  const executiveSummary = buildExecutiveSummary({
    account: inventory.account,
    monthly,
    campaignSummary,
    firstPartySummary,
  });

  const report = {
    meta: {
      generatedAt,
      mode: 'read_only_historical_audit',
      months: args.months,
      since,
      until,
      adAccountId: args.adAccountId,
      accountId: args.accountId,
      websiteId: args.websiteId,
      metaAdsMutationsApplied: 0,
      supabaseWritesApplied: 0,
    },
    executiveSummary,
    inventoryCounts: {
      campaigns: inventory.campaigns.length,
      adsets: inventory.adsets.length,
      ads: inventory.ads.length,
    },
    monthly,
    campaignSummary,
    adsetSummary,
    adSummary,
    countryBreakdown,
    publisherBreakdown,
    deviceBreakdown,
    ageGenderBreakdown,
    marketInsights,
    firstPartySummary,
    wasteCandidates,
    opportunities,
    rawInventory: {
      account: inventory.account,
      campaigns: inventory.campaigns,
      adsets: inventory.adsets,
      ads: inventory.ads.map((ad) => ({
        id: ad.id,
        name: ad.name,
        campaign_id: ad.campaign_id,
        campaign_name: ad.campaign?.name,
        adset_id: ad.adset_id,
        adset_name: ad.adset?.name,
        status: ad.status,
        effective_status: ad.effective_status,
        created_time: ad.created_time,
        updated_time: ad.updated_time,
        creative_id: ad.creative?.id,
        creative_name: ad.creative?.name,
      })),
    },
  };

  if (args.dryRun && !args.applyAnalysis) {
    console.log(JSON.stringify({
      ok: true,
      mode: report.meta.mode,
      writeFiles: false,
      summary: executiveSummary,
      inventoryCounts: report.inventoryCounts,
    }, null, 2));
    return;
  }

  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));
  const paths = {
    json: path.relative(repoRoot, path.join(outDir, 'meta-ads-historical-audit.json')),
    monthlyCsv: path.relative(repoRoot, path.join(outDir, 'monthly-performance.csv')),
    campaignCsv: path.relative(repoRoot, path.join(outDir, 'campaign-performance.csv')),
    adsetCsv: path.relative(repoRoot, path.join(outDir, 'adset-performance.csv')),
    adCsv: path.relative(repoRoot, path.join(outDir, 'ad-performance.csv')),
    marketCsv: path.relative(repoRoot, path.join(outDir, 'market-insights.csv')),
    publisherCsv: path.relative(repoRoot, path.join(outDir, 'publisher-platform.csv')),
    deviceCsv: path.relative(repoRoot, path.join(outDir, 'device-platform.csv')),
    ageGenderCsv: path.relative(repoRoot, path.join(outDir, 'age-gender.csv')),
    firstPartyEventsCsv: path.relative(repoRoot, path.join(outDir, 'first-party-event-summary.csv')),
    wasteCsv: path.relative(repoRoot, path.join(outDir, 'waste-candidates.csv')),
    opportunityCsv: path.relative(repoRoot, path.join(outDir, 'opportunities.csv')),
  };

  await fsp.writeFile(path.join(repoRoot, paths.json), `${JSON.stringify(report, null, 2)}\n`);
  await fsp.writeFile(path.join(repoRoot, paths.monthlyCsv), toCsv(monthly, [
    'month', 'dateStart', 'dateStop', 'spend', 'impressions', 'reach', 'clicks', 'linkClicks',
    'landingPageViews', 'uniqueLeads', 'messagingStarted', 'messagingReplies', 'customEvents',
    'ctr', 'cpc', 'cpl', 'costPerLandingPageView', 'landingPageViewRateFromClicks', 'leadRateFromLandingPageViews',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.campaignCsv), toCsv(campaignSummary, [
    'campaignId', 'campaignName', 'status', 'effectiveStatus', 'objective', 'category', 'spend',
    'impressions', 'reach', 'clicks', 'landingPageViews', 'uniqueLeads', 'messagingStarted',
    'messagingReplies', 'customEvents', 'ctr', 'cpc', 'cpl', 'recommendation',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.adsetCsv), toCsv(adsetSummary, [
    'id', 'name', 'campaignId', 'campaignName', 'category', 'spend', 'impressions', 'reach',
    'clicks', 'landingPageViews', 'uniqueLeads', 'messagingStarted', 'messagingReplies',
    'customEvents', 'ctr', 'cpc', 'cpl',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.adCsv), toCsv(adSummary, [
    'id', 'name', 'campaignId', 'campaignName', 'category', 'spend', 'impressions', 'reach',
    'clicks', 'landingPageViews', 'uniqueLeads', 'messagingStarted', 'messagingReplies',
    'customEvents', 'ctr', 'cpc', 'cpl',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.marketCsv), toCsv(marketInsights, [
    'countryCode', 'countryName', 'spend', 'clicks', 'landingPageViews', 'uniqueLeads', 'cpl', 'recommendation',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.publisherCsv), toCsv(publisherBreakdown, [
    'dimension', 'value', 'spend', 'impressions', 'clicks', 'linkClicks', 'landingPageViews',
    'uniqueLeads', 'messagingStarted', 'messagingReplies', 'customEvents', 'ctr', 'cpc', 'cpl',
    'costPerLandingPageView', 'landingPageViewRateFromClicks', 'leadRateFromLandingPageViews',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.deviceCsv), toCsv(deviceBreakdown, [
    'dimension', 'value', 'spend', 'impressions', 'clicks', 'linkClicks', 'landingPageViews',
    'uniqueLeads', 'messagingStarted', 'messagingReplies', 'customEvents', 'ctr', 'cpc', 'cpl',
    'costPerLandingPageView', 'landingPageViewRateFromClicks', 'leadRateFromLandingPageViews',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.ageGenderCsv), toCsv(ageGenderBreakdown, [
    'age', 'gender', 'spend', 'impressions', 'clicks', 'linkClicks', 'landingPageViews',
    'uniqueLeads', 'messagingStarted', 'messagingReplies', 'customEvents', 'ctr', 'cpc', 'cpl',
    'costPerLandingPageView', 'landingPageViewRateFromClicks', 'leadRateFromLandingPageViews',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.firstPartyEventsCsv), toCsv(firstPartySummary.byEventName, [
    'key', 'count',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.wasteCsv), toCsv(wasteCandidates, [
    'level', 'id', 'name', 'campaignName', 'spend', 'uniqueLeads', 'cpl', 'reason', 'recommendation',
  ]));
  await fsp.writeFile(path.join(repoRoot, paths.opportunityCsv), toCsv(opportunities, [
    'level', 'id', 'name', 'campaignName', 'spend', 'ctr', 'landingPageViews', 'uniqueLeads', 'cpl', 'reason', 'recommendation',
  ]));
  await fsp.writeFile(docsOut, renderMarkdown({
    generatedAt,
    since,
    until,
    report,
    paths,
  }));

  console.log(JSON.stringify({
    ok: true,
    mode: report.meta.mode,
    metaAdsMutationsApplied: 0,
    supabaseWritesApplied: 0,
    docsOut: path.relative(repoRoot, docsOut),
    outDir: path.relative(repoRoot, outDir),
    summary: executiveSummary,
    inventoryCounts: report.inventoryCounts,
    rows: {
      monthly: monthly.length,
      campaigns: campaignSummary.length,
      adsets: adsetSummary.length,
      ads: adSummary.length,
      wasteCandidates: wasteCandidates.length,
      opportunities: opportunities.length,
    },
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
