#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads', `${TODAY}-colombiatours-active-landing-alignment`);
const DOCS_OUT = path.join(repoRoot, 'docs/audits', `${TODAY}-colombiatours-active-landing-alignment.md`);

const STOPWORDS = new Set([
  'a', 'ad', 'ag', 'al', 'and', 'ao', 'as', 'by', 'com', 'con', 'da', 'das', 'de', 'del', 'do', 'dos', 'e', 'el', 'en', 'for', 'la', 'las', 'los', 'of', 'para', 'por', 'the', 'to', 'un', 'una', 'y',
  'search', 'colombia', 'colombiatours', 'travel', '2026', '05', 'www', 'https', 'http', 'pt', 'es', 'en', 'mx', 'cl', 'br',
]);

const MARKET_HINTS = [
  { pattern: /\bBR\b|Pacotes|pacote|viagem/i, market: 'BR', expectedLanguage: 'pt', languageTerms: ['pacotes', 'viagem', 'roteiro', 'sob medida', 'planejar', 'portugues'] },
  { pattern: /\bMX\b|Mexico|Multidestino|Caribe/i, market: 'MX', expectedLanguage: 'es', languageTerms: ['paquetes', 'viaje', 'cotiza', 'experiencias', 'personalizado'] },
  { pattern: /\bES\b|Spain|Madrid|Barcelona|Cartagena_Medellin/i, market: 'ES', expectedLanguage: 'es', languageTerms: ['paquetes', 'viaje', 'cotiza', 'experiencias', 'personalizado'] },
  { pattern: /\bCL\b|Chile|SanAndres|San_Andres/i, market: 'CL', expectedLanguage: 'es', languageTerms: ['paquetes', 'viaje', 'cotiza', 'experiencias', 'personalizado'] },
  { pattern: /\bAR\b|Argentina|Buenos/i, market: 'AR', expectedLanguage: 'es', languageTerms: ['paquetes', 'viaje', 'cotiza', 'experiencias', 'personalizado'] },
  { pattern: /\bUS\b|Florida|New_York/i, market: 'US', expectedLanguage: 'en', languageTerms: ['packages', 'trip', 'quote', 'experiences', 'custom'] },
];

function usage() {
  console.log(`Usage: node scripts/google-ads/audit-colombiatours-active-landing-alignment.cjs [--days=30]\n\nRead-only audit. Queries Google Ads and fetches active landing pages. Writes local artifacts only.`);
}

function parseArgs(argv) {
  const args = { days: 30, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--days=')) args.days = Number(arg.split('=')[1]);
  }
  if (!Number.isFinite(args.days) || args.days < 1 || args.days > 365) throw new Error('--days must be 1..365');
  return args;
}

function gaDate(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function getAccessToken(env) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
  return body.access_token;
}

async function googleAdsRequest({ env, accessToken, requestPath, body }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json',
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const response = await fetch(`https://googleads.googleapis.com/${apiVersion}/customers/${stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID)}/${requestPath}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!response.ok) throw new Error(`${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  return parsed;
}

async function search({ env, accessToken, query }) {
  const chunks = await googleAdsRequest({ env, accessToken, requestPath: 'googleAds:searchStream', body: { query } });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensFrom(value) {
  return normalize(value).split(' ').filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function countTokens(items) {
  const counts = new Map();
  for (const item of items) {
    for (const token of tokensFrom(item)) counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([token, count]) => ({ token, count }));
}

function extractMeta(html) {
  const pick = (regex) => {
    const match = html.match(regex);
    return match ? match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim() : '';
  };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const robots = pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i) || pick(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { title, description, robots, canonical, h1 };
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchLanding(url) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 ColombiaToursLandingAudit/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    const html = await response.text();
    const elapsedMs = Math.round(performance.now() - started);
    const meta = extractMeta(html);
    const text = htmlToText(html);
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      elapsedMs,
      bytes: Buffer.byteLength(html),
      ...meta,
      tracking: {
        gtm: /googletagmanager|GTM-/.test(html),
        gtag: /gtag\(|gtag\/js|google-analytics/.test(html),
        dataLayer: /dataLayer/.test(html),
        whatsapp: /wa\.me|whatsapp|Planejar pelo WhatsApp|WhatsApp/i.test(html),
        waflow: /waflow|record_funnel_event|funnel/i.test(html),
      },
      contentSignals: {
        notFound: /P[aá]gina no encontrada|Page not found/i.test(`${meta.title} ${meta.h1}`),
        noindex: /noindex/i.test(meta.robots) || /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
        zeroPackages: /0\s*(?:de|of)\s*0\s*(?:paquetes|packages|pacotes)|Ning[uú]n paquete|Nenhum pacote/i.test(text),
        hasRnt: /RNT\s*\d+/i.test(text),
        hasReviews: /reviews?|rese[nñ]as|testimonios|testimonial|avalia[cç][oõ]es/i.test(text),
        hasPlanner: /planner|planners|asesor|experto local|equipe local|equipo local|sob medida|personalizad/i.test(text),
        hasPackageLanguage: /paquetes|pacotes|packages|itinerarios|roteiro|circuitos/i.test(text),
        hasFlightOnlyLanguage: /vuelos|vuelo|tiquetes|pasajes|boletos|avianca/i.test(text),
        ctaMentions: (text.match(/WhatsApp|cotiza|cotizar|planejar|planear|solicitar|cont[aá]ctanos|propuesta|quote|free quote/gi) || []).length,
      },
      sampleText: text.slice(0, 3500),
    };
  } catch (error) {
    return { url, ok: false, status: 0, finalUrl: url, elapsedMs: Math.round(performance.now() - started), error: error.message, tracking: {}, contentSignals: {}, sampleText: '' };
  }
}

function inferMarket(campaignNames, url) {
  const haystack = `${campaignNames.join(' ')} ${url}`;
  return MARKET_HINTS.find((hint) => hint.pattern.test(haystack)) || { market: 'unknown', expectedLanguage: 'unknown', languageTerms: [] };
}

function scoreLanding({ landing, campaignNames, keywords, searchTerms, adTexts }) {
  const market = inferMarket(campaignNames, landing.url);
  const text = normalize(`${landing.title} ${landing.description} ${landing.h1} ${landing.sampleText}`);
  const allIntentTokens = countTokens([...keywords, ...searchTerms, ...adTexts]).filter(({ token }) => token.length >= 4).slice(0, 20);
  const coveredTokens = allIntentTokens.filter(({ token }) => text.includes(token));
  const topTokens = allIntentTokens.slice(0, 12);
  const topCovered = topTokens.filter(({ token }) => text.includes(token));

  let health = 0;
  if (landing.ok && landing.status === 200) health += 7;
  if (!landing.contentSignals.notFound) health += 4;
  if (!landing.contentSignals.noindex) health += 3;
  if (landing.canonical) health += 2;
  if (landing.tracking.gtm || landing.tracking.gtag) health += 2;
  if (landing.tracking.whatsapp || landing.tracking.waflow) health += 2;

  const coverageRatio = topTokens.length ? topCovered.length / topTokens.length : 0;
  let messageMatch = Math.round(coverageRatio * 22);
  if (/paquetes|pacotes|packages|itinerarios|roteiro|circuitos/.test(text)) messageMatch += 4;
  if (/cartagena|medellin|medellin|san andres|eje cafetero|caribe|bogota|colombia/.test(text)) messageMatch += 4;
  messageMatch = Math.min(messageMatch, 30);

  let offer = 0;
  if (landing.contentSignals.hasPackageLanguage) offer += 5;
  if (landing.contentSignals.hasPlanner) offer += 6;
  if (/traslado|experiencia|guia|local|privad|sob medida|personalizad|roteiro/.test(text)) offer += 5;
  if (/no vendemos apenas hotel|no vendemos solo hotel|viaje completo|viagem completa/.test(text)) offer += 2;
  if (!landing.contentSignals.zeroPackages) offer += 2;
  else offer -= 5;
  offer = Math.max(0, Math.min(20, offer));

  let conversion = 0;
  if ((landing.contentSignals.ctaMentions || 0) >= 4) conversion += 5;
  else if ((landing.contentSignals.ctaMentions || 0) > 0) conversion += 3;
  if (landing.tracking.whatsapp || landing.tracking.waflow) conversion += 4;
  if (landing.contentSignals.hasRnt) conversion += 2;
  if (landing.contentSignals.hasReviews) conversion += 2;
  if (/planners|testimonios|faq|preguntas|RNT|ColombiaTours\.Travel/i.test(landing.sampleText)) conversion += 2;
  if (landing.contentSignals.zeroPackages) conversion -= 4;
  conversion = Math.max(0, Math.min(15, conversion));

  let localization = 0;
  const languageText = market.languageTerms.some((term) => text.includes(normalize(term)));
  if (languageText) localization += 5;
  const portugueseLandingWithoutLocalePrefix =
    market.expectedLanguage === 'pt' &&
    /pacotes|roteiro|viagem/.test(text) &&
    /pacotes|colombia/i.test(landing.url);
  if (market.expectedLanguage === 'pt' && (/\/pt\//.test(landing.url) || portugueseLandingWithoutLocalePrefix)) localization += 4;
  else if (market.expectedLanguage === 'es' && !/\/en\//.test(landing.url) && !/\/pt\//.test(landing.url)) localization += 4;
  else if (market.expectedLanguage === 'unknown') localization += 2;
  if (/COP|USD|EUR|MXN|\$/.test(landing.sampleText)) localization += 2;
  if (/Bogot[aá]|Medell[ií]n|Cartagena|San Andr[eé]s|Caribe|Eje Cafetero/i.test(landing.sampleText)) localization += 2;
  if (/S[aã]o Paulo|Ciudad de M[eé]xico|Monterrey|Madrid|Barcelona|Santiago/i.test(landing.sampleText)) localization += 2;
  localization = Math.max(0, Math.min(15, localization));

  const blockers = [];
  if (!landing.ok || landing.status !== 200) blockers.push('http_not_200');
  if (landing.contentSignals.notFound) blockers.push('renders_404_or_not_found');
  if (landing.contentSignals.noindex) blockers.push('noindex');
  if (landing.contentSignals.zeroPackages) blockers.push('zero_packages_or_empty_listing');
  if (!landing.tracking.whatsapp && !landing.tracking.waflow) blockers.push('weak_conversion_cta_detection');
  if (coverageRatio < 0.45) blockers.push('weak_keyword_message_match');

  let total = Math.max(0, Math.min(100, health + messageMatch + offer + conversion + localization));
  if (!landing.ok || landing.status !== 200 || landing.contentSignals.notFound || landing.contentSignals.noindex) {
    total = Math.min(total, 25);
  } else if (landing.contentSignals.zeroPackages) {
    total = Math.min(total, 55);
  }

  return {
    total,
    health,
    messageMatch,
    offer,
    conversion,
    localization,
    market: market.market,
    expectedLanguage: market.expectedLanguage,
    topIntentTokens: topTokens,
    coveredIntentTokens: coveredTokens.slice(0, 20),
    coverageRatio: Number(coverageRatio.toFixed(2)),
    blockers,
    grade: total >= 85 ? 'strong' : total >= 70 ? 'usable_needs_work' : total >= 55 ? 'risky' : 'do_not_scale',
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows, columns) {
  return [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n') + '\n';
}

function assetTexts(ad) {
  const rsa = ad.responsiveSearchAd || {};
  return [
    ...(rsa.headlines || []).map((item) => item.text),
    ...(rsa.descriptions || []).map((item) => item.text),
  ].filter(Boolean);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const accessToken = await getAccessToken(process.env);
  const startDate = gaDate(args.days);
  const endDate = gaDate(0);
  const dateFilter = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;

  const [campaignRows, adRows, keywordRows, searchTermRows] = await Promise.all([
    search({ env: process.env, accessToken, query: `
      SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
             campaign.geo_target_type_setting.positive_geo_target_type,
             campaign.geo_target_type_setting.negative_geo_target_type,
             campaign_budget.amount_micros,
             metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.all_conversions
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND campaign.advertising_channel_type = 'SEARCH'
        AND ${dateFilter}
      ORDER BY metrics.cost_micros DESC` }),
    search({ env: process.env, accessToken, query: `
      SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group.status,
             ad_group_ad.resource_name, ad_group_ad.status,
             ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,
             ad_group_ad.ad.responsive_search_ad.headlines,
             ad_group_ad.ad.responsive_search_ad.descriptions,
             ad_group_ad.ad.responsive_search_ad.path1,
             ad_group_ad.ad.responsive_search_ad.path2,
             ad_group_ad.policy_summary.approval_status,
             ad_group_ad.policy_summary.review_status,
             metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.all_conversions
      FROM ad_group_ad
      WHERE campaign.status = 'ENABLED'
        AND campaign.advertising_channel_type = 'SEARCH'
        AND ad_group.status = 'ENABLED'
        AND ad_group_ad.status = 'ENABLED'
        AND ${dateFilter}
      ORDER BY metrics.cost_micros DESC` }),
    search({ env: process.env, accessToken, query: `
      SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
             ad_group_criterion.resource_name, ad_group_criterion.status,
             ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
             metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.all_conversions
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND campaign.advertising_channel_type = 'SEARCH'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND ${dateFilter}
      ORDER BY metrics.cost_micros DESC` }),
    search({ env: process.env, accessToken, query: `
      SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
             search_term_view.search_term,
             metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.all_conversions
      FROM search_term_view
      WHERE campaign.status = 'ENABLED'
        AND campaign.advertising_channel_type = 'SEARCH'
        AND ${dateFilter}
        AND metrics.clicks > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT 1000` }),
  ]);

  const campaigns = campaignRows.map((row) => ({
    id: String(row.campaign.id),
    name: row.campaign.name,
    status: row.campaign.status,
    channel: row.campaign.advertisingChannelType,
    positiveGeo: row.campaign.geoTargetTypeSetting?.positiveGeoTargetType,
    negativeGeo: row.campaign.geoTargetTypeSetting?.negativeGeoTargetType,
    budgetCopDay: Number(row.campaignBudget?.amountMicros || 0) / 1e6,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0),
    averageCpcCop: Number(row.metrics?.averageCpc || 0) / 1e6,
    spendCop: Number(row.metrics?.costMicros || 0) / 1e6,
    conversions: Number(row.metrics?.conversions || 0),
    allConversions: Number(row.metrics?.allConversions || 0),
  }));

  const ads = adRows.map((row) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    adGroupId: String(row.adGroup.id),
    adGroupName: row.adGroup.name,
    resourceName: row.adGroupAd.resourceName,
    status: row.adGroupAd.status,
    adId: String(row.adGroupAd.ad.id),
    type: row.adGroupAd.ad.type,
    finalUrls: row.adGroupAd.ad.finalUrls || [],
    responsiveSearchAd: row.adGroupAd.ad.responsiveSearchAd || null,
    approvalStatus: row.adGroupAd.policySummary?.approvalStatus,
    reviewStatus: row.adGroupAd.policySummary?.reviewStatus,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0),
    averageCpcCop: Number(row.metrics?.averageCpc || 0) / 1e6,
    spendCop: Number(row.metrics?.costMicros || 0) / 1e6,
    conversions: Number(row.metrics?.conversions || 0),
    allConversions: Number(row.metrics?.allConversions || 0),
  }));

  const keywords = keywordRows.map((row) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    adGroupId: String(row.adGroup.id),
    adGroupName: row.adGroup.name,
    text: row.adGroupCriterion.keyword.text,
    matchType: row.adGroupCriterion.keyword.matchType || row.adGroupCriterion.keyword.match_type,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0),
    averageCpcCop: Number(row.metrics?.averageCpc || 0) / 1e6,
    spendCop: Number(row.metrics?.costMicros || 0) / 1e6,
    conversions: Number(row.metrics?.conversions || 0),
    allConversions: Number(row.metrics?.allConversions || 0),
  }));

  const searchTerms = searchTermRows.map((row) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    adGroupId: String(row.adGroup.id),
    adGroupName: row.adGroup.name,
    searchTerm: row.searchTermView.searchTerm,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    ctr: Number(row.metrics?.ctr || 0),
    averageCpcCop: Number(row.metrics?.averageCpc || 0) / 1e6,
    spendCop: Number(row.metrics?.costMicros || 0) / 1e6,
    conversions: Number(row.metrics?.conversions || 0),
    allConversions: Number(row.metrics?.allConversions || 0),
  }));

  const landingMap = new Map();
  for (const ad of ads) {
    for (const finalUrl of ad.finalUrls) {
      if (!finalUrl) continue;
      if (!landingMap.has(finalUrl)) landingMap.set(finalUrl, { url: finalUrl, adIds: new Set(), campaignIds: new Set(), adGroupIds: new Set() });
      const entry = landingMap.get(finalUrl);
      entry.adIds.add(ad.adId);
      entry.campaignIds.add(ad.campaignId);
      entry.adGroupIds.add(ad.adGroupId);
    }
  }

  const landingAudits = [];
  for (const entry of landingMap.values()) {
    const relatedAds = ads.filter((ad) => ad.finalUrls.includes(entry.url));
    const campaignIds = new Set(relatedAds.map((ad) => ad.campaignId));
    const adGroupIds = new Set(relatedAds.map((ad) => ad.adGroupId));
    const relatedKeywords = keywords.filter((keyword) => campaignIds.has(keyword.campaignId) && adGroupIds.has(keyword.adGroupId));
    const relatedSearchTerms = searchTerms.filter((term) => campaignIds.has(term.campaignId) && adGroupIds.has(term.adGroupId));
    const landing = await fetchLanding(entry.url);
    const adTexts = relatedAds.flatMap(assetTexts);
    const score = scoreLanding({
      landing,
      campaignNames: [...new Set(relatedAds.map((ad) => ad.campaignName))],
      keywords: relatedKeywords.map((keyword) => keyword.text),
      searchTerms: relatedSearchTerms.map((term) => term.searchTerm),
      adTexts,
    });
    landingAudits.push({
      url: entry.url,
      campaigns: [...new Set(relatedAds.map((ad) => ad.campaignName))],
      campaignIds: [...campaignIds],
      adGroups: [...new Set(relatedAds.map((ad) => ad.adGroupName))],
      adIds: relatedAds.map((ad) => ad.adId),
      spendCop: relatedAds.reduce((sum, ad) => sum + ad.spendCop, 0),
      clicks: relatedAds.reduce((sum, ad) => sum + ad.clicks, 0),
      impressions: relatedAds.reduce((sum, ad) => sum + ad.impressions, 0),
      conversions: relatedAds.reduce((sum, ad) => sum + ad.conversions, 0),
      allConversions: relatedAds.reduce((sum, ad) => sum + ad.allConversions, 0),
      landing,
      score,
      topKeywords: relatedKeywords.slice(0, 20),
      topSearchTerms: relatedSearchTerms.slice(0, 20),
      adTexts: adTexts.slice(0, 60),
    });
  }

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    customerId: stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
    scope: { days: args.days, startDate, endDate, mode: 'read_only' },
    counts: { campaigns: campaigns.length, ads: ads.length, keywords: keywords.length, searchTerms: searchTerms.length, landings: landingAudits.length },
    campaigns,
    ads,
    keywords,
    searchTerms,
    landingAudits: landingAudits.sort((a, b) => b.spendCop - a.spendCop || b.clicks - a.clicks || a.url.localeCompare(b.url)),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'active-landing-alignment-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'landing-scores.csv'), toCsv(report.landingAudits.map((audit) => ({
    url: audit.url,
    campaigns: audit.campaigns.join('|'),
    adGroups: audit.adGroups.join('|'),
    score: audit.score.total,
    grade: audit.score.grade,
    health: audit.score.health,
    messageMatch: audit.score.messageMatch,
    offer: audit.score.offer,
    conversion: audit.score.conversion,
    localization: audit.score.localization,
    clicks: audit.clicks,
    spendCop: Math.round(audit.spendCop),
    status: audit.landing.status,
    title: audit.landing.title,
    h1: audit.landing.h1,
    blockers: audit.score.blockers.join('|'),
    canonical: audit.landing.canonical,
  })), ['url', 'campaigns', 'adGroups', 'score', 'grade', 'health', 'messageMatch', 'offer', 'conversion', 'localization', 'clicks', 'spendCop', 'status', 'title', 'h1', 'blockers', 'canonical']));
  fs.writeFileSync(path.join(OUT_DIR, 'active-ads.csv'), toCsv(ads.map((ad) => ({
    campaignName: ad.campaignName,
    adGroupName: ad.adGroupName,
    adId: ad.adId,
    status: ad.status,
    approvalStatus: ad.approvalStatus,
    reviewStatus: ad.reviewStatus,
    finalUrls: ad.finalUrls.join('|'),
    impressions: ad.impressions,
    clicks: ad.clicks,
    ctr: ad.ctr,
    spendCop: Math.round(ad.spendCop),
    conversions: ad.conversions,
    headlines: assetTexts(ad).slice(0, 15).join(' | '),
  })), ['campaignName', 'adGroupName', 'adId', 'status', 'approvalStatus', 'reviewStatus', 'finalUrls', 'impressions', 'clicks', 'ctr', 'spendCop', 'conversions', 'headlines']));
  fs.writeFileSync(path.join(OUT_DIR, 'active-keywords.csv'), toCsv(keywords.map((keyword) => ({
    campaignName: keyword.campaignName,
    adGroupName: keyword.adGroupName,
    text: keyword.text,
    matchType: keyword.matchType,
    impressions: keyword.impressions,
    clicks: keyword.clicks,
    ctr: keyword.ctr,
    spendCop: Math.round(keyword.spendCop),
    conversions: keyword.conversions,
  })), ['campaignName', 'adGroupName', 'text', 'matchType', 'impressions', 'clicks', 'ctr', 'spendCop', 'conversions']));
  fs.writeFileSync(path.join(OUT_DIR, 'search-terms.csv'), toCsv(searchTerms.map((term) => ({
    campaignName: term.campaignName,
    adGroupName: term.adGroupName,
    searchTerm: term.searchTerm,
    impressions: term.impressions,
    clicks: term.clicks,
    ctr: term.ctr,
    spendCop: Math.round(term.spendCop),
    conversions: term.conversions,
  })), ['campaignName', 'adGroupName', 'searchTerm', 'impressions', 'clicks', 'ctr', 'spendCop', 'conversions']));

  const md = [`# ColombiaTours Active Landing Alignment Audit`, '', `Generated: ${report.generatedAt}`, `Scope: active Search campaigns, last ${args.days} days. Read-only; no Google Ads mutations.`, '', '## Summary', '', `- Active campaigns: ${campaigns.length}`, `- Enabled ads audited: ${ads.length}`, `- Enabled keywords audited: ${keywords.length}`, `- Landing URLs audited: ${landingAudits.length}`, '', '## Landing Scores', '', '| Score | Grade | Campaigns | URL | Main blockers |', '| --- | --- | --- | --- | --- |'];
  for (const audit of report.landingAudits) {
    md.push(`| ${audit.score.total}% | ${audit.score.grade} | ${audit.campaigns.join('<br>')} | ${audit.url} | ${audit.score.blockers.join(', ') || 'none'} |`);
  }
  md.push('', 'Detailed JSON/CSV artifacts are in `artifacts/google-ads/' + path.basename(OUT_DIR) + '/`.');
  fs.writeFileSync(DOCS_OUT, `${md.join('\n')}\n`);

  console.log(JSON.stringify({
    ok: true,
    docsOut: path.relative(repoRoot, DOCS_OUT),
    outDir: path.relative(repoRoot, OUT_DIR),
    counts: report.counts,
    landingScores: report.landingAudits.map((audit) => ({ url: audit.url, campaigns: audit.campaigns, score: audit.score.total, grade: audit.score.grade, blockers: audit.score.blockers })),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
