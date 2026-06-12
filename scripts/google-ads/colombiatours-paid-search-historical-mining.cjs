#!/usr/bin/env node
'use strict';

/**
 * Read-only historical mining for ColombiaTours Google Ads.
 *
 * This runner intentionally does not call Google Ads mutate endpoints and does
 * not write to Supabase. `--apply-analysis` only writes local report artifacts.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');
const { createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const {
  loadDotEnvFile,
  stripCustomerId,
  redact,
} = require('./validate-conversion-governance.cjs');

loadDotEnvFile(path.resolve(process.cwd(), '.env.local'));
loadDotEnvFile(path.resolve(process.cwd(), '.env.mcp'));

const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || '1780802244';
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v21';

const TAXONOMY = Object.freeze([
  'high_commercial',
  'commercial_research',
  'destination_specific',
  'luxury/private',
  'family/group',
  'cheap/bargain',
  'flight_only',
  'hotel_only',
  'shipping',
  'employment',
  'visa/docs',
  'competitor',
  'informational',
  'junk',
]);

const TERM_ACTIONS = Object.freeze([
  'negative_exact',
  'negative_phrase',
  'keep_observe',
  'promote_exact',
  'new_ad_group',
  'new_landing',
  'seo_content',
  'sales_review',
]);

const CAMPAIGN_ACTIONS = Object.freeze([
  'scale',
  'keep',
  'rebuild',
  'pause_candidate',
  'tracking_fix',
  'landing_mismatch',
  'budget_leak',
]);

const INTENT_BASE_SCORE = Object.freeze({
  high_commercial: 92,
  commercial_research: 68,
  destination_specific: 78,
  'luxury/private': 86,
  'family/group': 76,
  'cheap/bargain': 38,
  flight_only: 20,
  hotel_only: 24,
  shipping: 4,
  employment: 3,
  'visa/docs': 14,
  competitor: 32,
  informational: 28,
  junk: 1,
});

const NEGATIVE_INTENTS = new Set([
  'flight_only',
  'hotel_only',
  'shipping',
  'employment',
  'visa/docs',
  'competitor',
  'informational',
  'junk',
  'cheap/bargain',
]);

const HARD_NEGATIVE_INTENTS = new Set([
  'shipping',
  'employment',
  'visa/docs',
  'flight_only',
  'hotel_only',
  'junk',
]);

const MARKET_HINTS = Object.freeze([
  { market: 'BR', regex: /\b(brasil|brazil|rio de janeiro|sao paulo|s\u00e3o paulo|portugu[e\u00ea]s|pacotes?)\b/i },
  { market: 'AR', regex: /\b(argentina|buenos aires|cordoba|c\u00f3rdoba|rosario|paquetes?)\b/i },
  { market: 'MX', regex: /\b(mexico|m[e\u00e9]xico|cdmx|guadalajara|monterrey|paquetes?)\b/i },
  { market: 'CL', regex: /\b(chile|santiago|valparaiso|valpara\u00edso|paquetes?)\b/i },
  { market: 'US', regex: /\b(usa|united states|miami|new york|los angeles|custom tour|colombia tours?)\b/i },
  { market: 'ES', regex: /\b(espa[n\u00f1]a|madrid|barcelona|viajes?|colombia a medida)\b/i },
  { market: 'FR', regex: /\b(france|paris|fran[c\u00e7]ais|colombie|sur mesure)\b/i },
  { market: 'DE', regex: /\b(deutschland|germany|berlin|kolumbien|rundreise)\b/i },
]);

const DESTINATION_HINTS = Object.freeze([
  'amazonas',
  'amazon',
  'bogota',
  'bogot\u00e1',
  'cartagena',
  'medellin',
  'medell\u00edn',
  'cali',
  'eje cafetero',
  'coffee region',
  'salento',
  'cocora',
  'guatape',
  'guatap\u00e9',
  'tayrona',
  'santa marta',
  'san andres',
  'san andr\u00e9s',
  'providencia',
  'leticia',
  'ca\u00f1o cristales',
  'cano cristales',
  'villa de leyva',
  'barichara',
  'mompox',
  'tatacoa',
  'nuqui',
  'nuqu\u00ed',
  'pacifico',
  'pac\u00edfico',
  'llanos',
]);

const STOPWORDS = new Set([
  'a', 'al', 'and', 'as', 'at', 'by', 'con', 'de', 'del', 'do', 'el', 'en', 'for', 'from', 'in',
  'la', 'las', 'le', 'los', 'of', 'para', 'por', 'the', 'to', 'un', 'una', 'viaje', 'viajes',
  'tour', 'tours', 'travel', 'trip', 'colombia', 'colombie', 'kolumbien', 'paquete', 'paquetes',
  'package', 'packages', 'rundreise', 'sur', 'mesure', 'custom', 'private', 'vacation', 'holidays',
]);

function parseArgs(argv) {
  const today = isoDate(new Date());
  const opts = {
    months: 24,
    customerId: DEFAULT_CUSTOMER_ID,
    accountId: process.env.COLOMBIATOURS_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
    websiteId: process.env.COLOMBIATOURS_WEBSITE_ID || DEFAULT_WEBSITE_ID,
    dryRun: true,
    applyAnalysis: false,
    skipLlm: false,
    llmLimit: 300,
    llmBatchSize: 25,
    maxSearchTerms: 15000,
    maxKeywords: 25000,
    maxAds: 8000,
    maxLandings: 8000,
    maxRowsPerFirstPartyTable: 50000,
    includeGoogleAds: true,
    includeSupabase: true,
    outputDate: today,
    outDir: path.join('artifacts', 'google-ads', `${today}-colombiatours-24m-mining`),
    docsOut: path.join('docs', 'audits', `${today}-colombiatours-paid-search-24m-mining.md`),
    cachePath: path.join('artifacts', 'google-ads', 'colombiatours-paid-search-llm-cache.json'),
    landingCheckLimit: 50,
    landingCheckConcurrency: 6,
    clickLookbackDays: 2,
    minWasteCop: 50000,
    minPositiveClicks: 2,
    minPositiveSpendCop: 25000,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=', 2);
    const takeValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        index += 1;
        return next;
      }
      return 'true';
    };

    switch (key) {
      case 'help':
      case 'h':
        opts.help = true;
        break;
      case 'months':
        opts.months = parsePositiveInt(takeValue(), opts.months);
        break;
      case 'customer-id':
      case 'customerId':
        opts.customerId = takeValue();
        break;
      case 'account-id':
      case 'accountId':
        opts.accountId = takeValue();
        break;
      case 'website-id':
      case 'websiteId':
        opts.websiteId = takeValue();
        break;
      case 'dry-run':
      case 'dryRun':
        opts.dryRun = true;
        opts.applyAnalysis = false;
        break;
      case 'apply-analysis':
      case 'applyAnalysis':
        opts.applyAnalysis = true;
        opts.dryRun = false;
        break;
      case 'skip-llm':
      case 'no-llm':
        opts.skipLlm = true;
        break;
      case 'llm-limit':
      case 'llmLimit':
        opts.llmLimit = parseNonNegativeInt(takeValue(), opts.llmLimit);
        break;
      case 'llm-batch-size':
      case 'llmBatchSize':
        opts.llmBatchSize = parsePositiveInt(takeValue(), opts.llmBatchSize);
        break;
      case 'max-search-terms':
      case 'maxSearchTerms':
        opts.maxSearchTerms = parsePositiveInt(takeValue(), opts.maxSearchTerms);
        break;
      case 'max-keywords':
      case 'maxKeywords':
        opts.maxKeywords = parsePositiveInt(takeValue(), opts.maxKeywords);
        break;
      case 'max-ads':
      case 'maxAds':
        opts.maxAds = parsePositiveInt(takeValue(), opts.maxAds);
        break;
      case 'max-landings':
      case 'maxLandings':
        opts.maxLandings = parsePositiveInt(takeValue(), opts.maxLandings);
        break;
      case 'max-first-party-rows':
      case 'maxRowsPerFirstPartyTable':
        opts.maxRowsPerFirstPartyTable = parsePositiveInt(takeValue(), opts.maxRowsPerFirstPartyTable);
        break;
      case 'out-dir':
      case 'outDir':
        opts.outDir = takeValue();
        break;
      case 'docs-out':
      case 'docsOut':
        opts.docsOut = takeValue();
        break;
      case 'cache-path':
      case 'cachePath':
        opts.cachePath = takeValue();
        break;
      case 'no-google-ads':
        opts.includeGoogleAds = false;
        break;
      case 'no-supabase':
        opts.includeSupabase = false;
        break;
      case 'landing-check-limit':
      case 'landingCheckLimit':
        opts.landingCheckLimit = parseNonNegativeInt(takeValue(), opts.landingCheckLimit);
        break;
      case 'click-lookback-days':
      case 'clickLookbackDays':
        opts.clickLookbackDays = parseNonNegativeInt(takeValue(), opts.clickLookbackDays);
        break;
      case 'min-waste-cop':
      case 'minWasteCop':
        opts.minWasteCop = parseNonNegativeInt(takeValue(), opts.minWasteCop);
        break;
      case 'min-positive-clicks':
      case 'minPositiveClicks':
        opts.minPositiveClicks = parseNonNegativeInt(takeValue(), opts.minPositiveClicks);
        break;
      case 'min-positive-spend-cop':
      case 'minPositiveSpendCop':
        opts.minPositiveSpendCop = parseNonNegativeInt(takeValue(), opts.minPositiveSpendCop);
        break;
      default:
        throw new Error(`Unknown option --${key}. Run with --help for usage.`);
    }
  }

  if (opts.months < 1 || opts.months > 36) {
    throw new Error('--months must be between 1 and 36. Use 24 for the approved historical mining scope.');
  }

  return opts;
}

function usage() {
  return `Usage: node scripts/google-ads/colombiatours-paid-search-historical-mining.cjs [options]\n\nRead-only mining of ColombiaTours paid search history.\n\nOptions:\n  --months=24                 Lookback window. Approved scope is 24 months.\n  --dry-run                   Query and print summary only. No local report files. Default.\n  --apply-analysis            Write local artifacts and audit report. No external mutations.\n  --skip-llm                  Use deterministic classifier only.\n  --llm-limit=300             Max high-spend terms to send to LLM.\n  --max-search-terms=15000    Google Ads search term row limit.\n  --account-id=<uuid>         Supabase ColombiaTours account id.\n  --website-id=<uuid>         Supabase ColombiaTours website id.\n  --customer-id=<id>          Google Ads customer id.\n  --out-dir=<path>            Local artifacts directory.\n  --docs-out=<path>           Local markdown report path.\n  --no-google-ads             Skip Google Ads extraction.\n  --no-supabase               Skip first-party extraction.\n\nValidation example:\n  node scripts/google-ads/colombiatours-paid-search-historical-mining.cjs --months=3 --dry-run --skip-llm --max-search-terms=200\n\nFull local artifact generation:\n  node scripts/google-ads/colombiatours-paid-search-historical-mining.cjs --months=24 --apply-analysis\n`;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startDateForMonths(months) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

function microsToCurrency(micros) {
  return Number(micros || 0) / 1_000_000;
}

function number(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value) {
  if (!Number.isFinite(value)) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
}

function currency(value) {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

function safeLower(value) {
  return String(value || '').toLowerCase();
}

function normalizeTerm(term) {
  return safeLower(term)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value, max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sum(values) {
  return values.reduce((acc, value) => acc + number(value), 0);
}

function hashKey(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function readNested(record, paths) {
  for (const candidate of paths) {
    const parts = candidate.split('.');
    let current = record;
    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        current = undefined;
        break;
      }
      current = current[part];
    }
    if (current !== undefined && current !== null && current !== '') return current;
  }
  return undefined;
}

function parseJsonMaybe(value) {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function rowValue(row, pathExpression) {
  return readNested(row, [pathExpression]);
}

function customerResource(customerId) {
  return stripCustomerId(customerId);
}

function ensureEnv(name, hint) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}${hint ? ` (${hint})` : ''}`);
  }
  return process.env[name];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }

  const fromDate = startDateForMonths(opts.months);
  const toDate = new Date();
  const context = {
    generatedAt: new Date().toISOString(),
    fromDate: isoDate(fromDate),
    toDate: isoDate(toDate),
    months: opts.months,
    mode: opts.applyAnalysis ? 'apply_analysis_local_files_only' : 'dry_run_no_files',
    readOnly: true,
  };

  console.error(`[historical-mining] read-only run ${context.fromDate}..${context.toDate} (${opts.months}m)`);

  const firstParty = opts.includeSupabase
    ? await fetchFirstPartyData(opts, context)
    : emptyFirstPartyData('Supabase extraction disabled by --no-supabase.');

  const gclidContexts = collectGclidContexts(firstParty, opts);
  const googleAds = opts.includeGoogleAds
    ? await fetchGoogleAdsData(opts, context, gclidContexts)
    : emptyGoogleAdsData('Google Ads extraction disabled by --no-google-ads.');

  const clickAttribution = buildClickAttribution(googleAds.clickRows);
  const unifiedLeads = buildUnifiedLeads(firstParty, clickAttribution);
  const landingChecks = await checkLandingUrls(googleAds.landingRows, opts);
  const llmClassifier = await classifySearchTermsWithLlm(googleAds.searchTermRows, opts, context);

  const analysis = buildAnalysis({
    opts,
    context,
    googleAds,
    firstParty,
    unifiedLeads,
    landingChecks,
    llmClassifier,
  });

  const report = {
    meta: {
      ...context,
      googleAdsCustomerId: redact(customerResource(opts.customerId)),
      supabaseAccountId: opts.accountId,
      supabaseWebsiteId: opts.websiteId,
      applyAnalysisWritesLocalFilesOnly: opts.applyAnalysis,
      llm: llmClassifier.meta,
      rowLimits: {
        maxSearchTerms: opts.maxSearchTerms,
        maxKeywords: opts.maxKeywords,
        maxAds: opts.maxAds,
        maxLandings: opts.maxLandings,
        maxRowsPerFirstPartyTable: opts.maxRowsPerFirstPartyTable,
      },
    },
    extraction: {
      googleAds: summarizeGoogleAdsExtraction(googleAds),
      firstParty: summarizeFirstPartyExtraction(firstParty),
      queryErrors: [...googleAds.errors, ...firstParty.errors],
    },
    validation: validateCoverage(googleAds, firstParty, unifiedLeads, landingChecks),
    analysis,
  };

  if (opts.applyAnalysis) {
    await writeOutputs(report, opts);
  } else {
    printDryRunSummary(report);
  }
}

async function getAccessToken() {
  const clientId = ensureEnv('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = ensureEnv('GOOGLE_ADS_CLIENT_SECRET');
  const refreshToken = ensureEnv('GOOGLE_ADS_REFRESH_TOKEN');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OAuth token request failed (${response.status}): ${redact(JSON.stringify(payload))}`);
  }
  if (!payload.access_token) throw new Error('OAuth token response did not include access_token.');
  return payload.access_token;
}

async function googleAdsSearchStream({ accessToken, customerId, query }) {
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const developerToken = ensureEnv('GOOGLE_ADS_DEVELOPER_TOKEN');
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerResource(customerId)}/googleAds:searchStream`;
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'content-type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = customerResource(loginCustomerId);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google Ads query failed (${response.status}): ${redact(text.slice(0, 3000))}`);
  }
  const chunks = text ? JSON.parse(text) : [];
  const rows = [];
  for (const chunk of chunks) {
    if (Array.isArray(chunk.results)) rows.push(...chunk.results);
  }
  return rows;
}

async function safeGoogleQuery(accessToken, opts, name, query) {
  try {
    const rows = await googleAdsSearchStream({ accessToken, customerId: opts.customerId, query });
    console.error(`[historical-mining] google_ads.${name}: ${rows.length} rows`);
    return { rows, error: null };
  } catch (error) {
    const message = `${name}: ${redact(error.message || String(error))}`;
    console.error(`[historical-mining] google_ads.${message}`);
    return { rows: [], error: message };
  }
}

async function fetchGoogleAdsData(opts, context, gclidContexts) {
  const accessToken = await getAccessToken();
  const from = context.fromDate;
  const to = context.toDate;
  const activeCampaignFilter = "campaign.advertising_channel_type = 'SEARCH'";

  const queries = {
    campaignDaily: `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY segments.date ASC, metrics.cost_micros DESC`,
    adGroupDaily: `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        campaign.status,
        ad_group.id,
        ad_group.name,
        ad_group.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM ad_group
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT ${opts.maxKeywords}`,
    keywords: `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.criterion_id,
        ad_group_criterion.status,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM keyword_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT ${opts.maxKeywords}`,
    searchTerms: `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        campaign.status,
        ad_group.id,
        ad_group.name,
        ad_group.status,
        campaign_search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign_search_term_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
        AND metrics.clicks > 0
      ORDER BY metrics.cost_micros DESC
      LIMIT ${opts.maxSearchTerms}`,
    landings: `
      SELECT
        expanded_landing_page_view.expanded_final_url,
        campaign.id,
        campaign.name,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM expanded_landing_page_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT ${opts.maxLandings}`,
    ads: `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT ${opts.maxAds}`,
    conversionActions: `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        segments.conversion_action,
        segments.conversion_action_name,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
        AND metrics.all_conversions > 0
      ORDER BY segments.date ASC, metrics.all_conversions DESC`,
    device: `
      SELECT
        segments.device,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC`,
    hourDay: `
      SELECT
        segments.day_of_week,
        segments.hour,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC`,
    geo: `
      SELECT
        geographic_view.country_criterion_id,
        campaign.id,
        campaign.name,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM geographic_view
      WHERE segments.date BETWEEN '${from}' AND '${to}'
        AND ${activeCampaignFilter}
      ORDER BY metrics.cost_micros DESC`,
  };

  const specs = Object.entries(queries);
  const settled = await Promise.all(specs.map(([name, query]) => safeGoogleQuery(accessToken, opts, name, query)));
  const byName = Object.fromEntries(specs.map(([name], index) => [name, settled[index]]));

  const clickResult = await fetchClickRows(accessToken, opts, context, gclidContexts);

  return {
    campaignRows: normalizeCampaignRows(byName.campaignDaily.rows),
    adGroupRows: normalizeAdGroupRows(byName.adGroupDaily.rows),
    keywordRows: normalizeKeywordRows(byName.keywords.rows),
    searchTermRows: normalizeSearchTermRows(byName.searchTerms.rows),
    landingRows: normalizeLandingRows(byName.landings.rows),
    adRows: normalizeAdRows(byName.ads.rows),
    conversionActionRows: normalizeConversionActionRows(byName.conversionActions.rows),
    deviceRows: normalizeDeviceRows(byName.device.rows),
    hourDayRows: normalizeHourDayRows(byName.hourDay.rows),
    geoRows: normalizeGeoRows(byName.geo.rows),
    clickRows: clickResult.rows,
    errors: [
      ...Object.values(byName).map((entry) => entry.error).filter(Boolean),
      ...clickResult.errors,
    ],
  };
}

async function fetchClickRows(accessToken, opts, context, gclidContexts) {
  const dayToGclids = new Map();
  for (const item of gclidContexts || []) {
    const gclid = String(item.gclid || item).trim();
    if (!gclid) continue;
    const dates = Array.isArray(item.dates) ? item.dates : [];
    for (const date of dates) {
      if (!dayToGclids.has(date)) dayToGclids.set(date, new Set());
      dayToGclids.get(date).add(gclid);
    }
  }
  const clean = unique((gclidContexts || []).map((item) => String(item.gclid || item).trim()).filter(Boolean));
  if (!clean.length || !dayToGclids.size) {
    console.error('[historical-mining] google_ads.click_view: skipped, no first-party click ids');
    return { rows: [], errors: [] };
  }

  const rows = [];
  const errors = [];
  for (const [date, gclidSet] of [...dayToGclids.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dayGclids = [...gclidSet];
    for (let index = 0; index < dayGclids.length; index += 200) {
      const chunk = dayGclids.slice(index, index + 200);
      const literals = chunk.map((value) => `'${value.replace(/'/g, "\\'")}'`).join(', ');
      const query = `
        SELECT
          click_view.gclid,
          segments.date,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          customer.id
        FROM click_view
        WHERE segments.date = '${date}'
          AND click_view.gclid IN (${literals})`;
      const result = await safeGoogleQuery(accessToken, opts, `click_view.${date}`, query);
      rows.push(...normalizeClickRows(result.rows));
      if (result.error) errors.push(result.error);
    }
  }
  console.error(`[historical-mining] google_ads.click_view matched rows: ${rows.length}/${clean.length} gclids`);
  return { rows, errors };
}

function normalizeCampaignRows(rows) {
  return rows.map((row) => ({
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    campaignStatus: rowValue(row, 'campaign.status') || '',
    channelType: rowValue(row, 'campaign.advertisingChannelType') || rowValue(row, 'campaign.advertising_channel_type') || '',
    biddingStrategyType: rowValue(row, 'campaign.biddingStrategyType') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeAdGroupRows(rows) {
  return rows.map((row) => ({
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    campaignStatus: rowValue(row, 'campaign.status') || '',
    adGroupId: String(rowValue(row, 'adGroup.id') || ''),
    adGroupName: rowValue(row, 'adGroup.name') || '',
    adGroupStatus: rowValue(row, 'adGroup.status') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeKeywordRows(rows) {
  return rows.map((row) => ({
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    adGroupId: String(rowValue(row, 'adGroup.id') || ''),
    adGroupName: rowValue(row, 'adGroup.name') || '',
    criterionId: String(rowValue(row, 'adGroupCriterion.criterionId') || ''),
    status: rowValue(row, 'adGroupCriterion.status') || '',
    keywordText: rowValue(row, 'adGroupCriterion.keyword.text') || '',
    matchType: rowValue(row, 'adGroupCriterion.keyword.matchType') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeSearchTermRows(rows) {
  return rows.map((row) => ({
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    campaignStatus: rowValue(row, 'campaign.status') || '',
    adGroupId: String(rowValue(row, 'adGroup.id') || ''),
    adGroupName: rowValue(row, 'adGroup.name') || '',
    adGroupStatus: rowValue(row, 'adGroup.status') || '',
    searchTerm: rowValue(row, 'campaignSearchTermView.searchTerm') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  })).filter((row) => row.searchTerm);
}

function normalizeLandingRows(rows) {
  return rows.map((row) => ({
    landingUrl: rowValue(row, 'expandedLandingPageView.expandedFinalUrl') || '',
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  })).filter((row) => row.landingUrl);
}

function assetTexts(assets) {
  if (!Array.isArray(assets)) return [];
  return assets.map((asset) => asset && (asset.text || asset.pinnedField || JSON.stringify(asset))).filter(Boolean);
}

function normalizeAdRows(rows) {
  return rows.map((row) => ({
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    adGroupId: String(rowValue(row, 'adGroup.id') || ''),
    adGroupName: rowValue(row, 'adGroup.name') || '',
    adId: String(rowValue(row, 'adGroupAd.ad.id') || ''),
    status: rowValue(row, 'adGroupAd.status') || '',
    type: rowValue(row, 'adGroupAd.ad.type') || '',
    finalUrls: rowValue(row, 'adGroupAd.ad.finalUrls') || [],
    headlines: assetTexts(rowValue(row, 'adGroupAd.ad.responsiveSearchAd.headlines')),
    descriptions: assetTexts(rowValue(row, 'adGroupAd.ad.responsiveSearchAd.descriptions')),
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeConversionActionRows(rows) {
  return rows.map((row) => ({
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    conversionAction: rowValue(row, 'segments.conversionAction') || '',
    conversionActionName: rowValue(row, 'segments.conversionActionName') || '',
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeDeviceRows(rows) {
  return rows.map((row) => ({
    device: rowValue(row, 'segments.device') || '',
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeHourDayRows(rows) {
  return rows.map((row) => ({
    dayOfWeek: rowValue(row, 'segments.dayOfWeek') || '',
    hour: int(rowValue(row, 'segments.hour')),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeGeoRows(rows) {
  return rows.map((row) => ({
    countryCriterionId: String(rowValue(row, 'geographicView.countryCriterionId') || ''),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    impressions: int(rowValue(row, 'metrics.impressions')),
    clicks: int(rowValue(row, 'metrics.clicks')),
    cost: microsToCurrency(rowValue(row, 'metrics.costMicros')),
    ctr: number(rowValue(row, 'metrics.ctr')),
    averageCpc: microsToCurrency(rowValue(row, 'metrics.averageCpc')),
    conversions: number(rowValue(row, 'metrics.conversions')),
    allConversions: number(rowValue(row, 'metrics.allConversions')),
    conversionValue: number(rowValue(row, 'metrics.conversionsValue')),
  }));
}

function normalizeClickRows(rows) {
  return rows.map((row) => ({
    gclid: rowValue(row, 'clickView.gclid') || '',
    date: rowValue(row, 'segments.date'),
    campaignId: String(rowValue(row, 'campaign.id') || ''),
    campaignName: rowValue(row, 'campaign.name') || '',
    adGroupId: String(rowValue(row, 'adGroup.id') || ''),
    adGroupName: rowValue(row, 'adGroup.name') || '',
  })).filter((row) => row.gclid);
}

function emptyGoogleAdsData(reason) {
  return {
    campaignRows: [],
    adGroupRows: [],
    keywordRows: [],
    searchTermRows: [],
    landingRows: [],
    adRows: [],
    conversionActionRows: [],
    deviceRows: [],
    hourDayRows: [],
    geoRows: [],
    clickRows: [],
    errors: reason ? [reason] : [],
  };
}

async function fetchFirstPartyData(opts, context) {
  const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = ensureEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const errors = [];
  const [requests, itineraries, funnelEvents, waflowLeads] = await Promise.all([
    fetchAllSupabaseRows(supabase, 'requests', '*', (query) => query.eq('account_id', opts.accountId).gte('created_at', context.fromDate), opts.maxRowsPerFirstPartyTable)
      .catch((error) => collectSupabaseError(errors, 'requests', error)),
    fetchAllSupabaseRows(supabase, 'itineraries', '*', (query) => query.eq('account_id', opts.accountId).gte('created_at', context.fromDate), opts.maxRowsPerFirstPartyTable)
      .catch((error) => collectSupabaseError(errors, 'itineraries', error)),
    fetchAllSupabaseRows(supabase, 'funnel_events', '*', (query) => query.eq('account_id', opts.accountId).gte('created_at', context.fromDate), opts.maxRowsPerFirstPartyTable)
      .catch((error) => collectSupabaseError(errors, 'funnel_events', error)),
    fetchAllSupabaseRows(supabase, 'waflow_leads', '*', (query) => query.eq('website_id', opts.websiteId).gte('created_at', context.fromDate), opts.maxRowsPerFirstPartyTable)
      .catch((error) => collectSupabaseError(errors, 'waflow_leads', error)),
  ]);

  console.error(`[historical-mining] supabase.requests: ${requests.length} rows`);
  console.error(`[historical-mining] supabase.itineraries: ${itineraries.length} rows`);
  console.error(`[historical-mining] supabase.funnel_events: ${funnelEvents.length} rows`);
  console.error(`[historical-mining] supabase.waflow_leads: ${waflowLeads.length} rows`);

  return { requests, itineraries, funnelEvents, waflowLeads, errors };
}

async function fetchAllSupabaseRows(supabase, table, select, decorate, maxRows) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    let query = supabase.from(table).select(select).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    query = decorate(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function collectSupabaseError(errors, table, error) {
  const message = `supabase.${table}: ${redact(error.message || String(error))}`;
  errors.push(message);
  console.error(`[historical-mining] ${message}`);
  return [];
}

function emptyFirstPartyData(reason) {
  return { requests: [], itineraries: [], funnelEvents: [], waflowLeads: [], errors: reason ? [reason] : [] };
}

function collectGclidContexts(firstParty, opts) {
  const byGclid = new Map();
  for (const collection of [firstParty.requests, firstParty.itineraries, firstParty.funnelEvents, firstParty.waflowLeads]) {
    for (const row of collection || []) {
      const hydrated = hydrateRow(row);
      const gclid = extractGclid(hydrated);
      if (!gclid) continue;
      const createdAt = readNested(hydrated, ['created_at', 'inserted_at', 'updated_at', 'payload.created_at', 'metadata.created_at']);
      const dates = candidateClickDates(createdAt, opts.clickLookbackDays);
      if (!dates.length) continue;
      if (!byGclid.has(gclid)) byGclid.set(gclid, new Set());
      for (const date of dates) byGclid.get(gclid).add(date);
    }
  }
  return [...byGclid.entries()].map(([gclid, dates]) => ({ gclid, dates: [...dates].sort() }));
}

function hydrateRow(row) {
  const hydrated = { ...row };
  for (const key of ['payload', 'metadata', 'custom_fields', 'event_payload', 'raw_payload', 'data']) {
    if (hydrated[key]) hydrated[key] = parseJsonMaybe(hydrated[key]);
  }
  return hydrated;
}

function extractClickIds(row) {
  const ids = [];
  for (const key of ['gclid', 'gbraid', 'wbraid']) {
    const value = readNested(row, [key, `payload.${key}`, `metadata.${key}`, `custom_fields.${key}`, `data.${key}`]);
    if (value) ids.push(String(value));
  }
  return ids;
}

function extractGclid(row) {
  const value = readNested(row, ['gclid', 'payload.gclid', 'metadata.gclid', 'custom_fields.gclid', 'data.gclid']);
  return value ? String(value) : '';
}

function candidateClickDates(createdAt, lookbackDays) {
  if (!createdAt) return [];
  const datePart = String(createdAt).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return [];
  const dates = [];
  for (let offset = 0; offset <= lookbackDays; offset += 1) {
    const candidate = new Date(date);
    candidate.setUTCDate(candidate.getUTCDate() - offset);
    dates.push(isoDate(candidate));
  }
  return dates;
}

function buildClickAttribution(clickRows) {
  const byGclid = new Map();
  for (const row of clickRows || []) {
    if (row.gclid) byGclid.set(row.gclid, row);
  }
  return { byGclid };
}

function buildUnifiedLeads(firstParty, clickAttribution) {
  const funnelByRef = indexMany(firstParty.funnelEvents.map(hydrateRow), extractReferenceCode);
  const funnelByChatwoot = indexMany(firstParty.funnelEvents.map(hydrateRow), extractChatwootId);
  const waflowByRef = indexMany(firstParty.waflowLeads.map(hydrateRow), extractReferenceCode);
  const waflowByChatwoot = indexMany(firstParty.waflowLeads.map(hydrateRow), extractChatwootId);
  const itinerariesByRequest = indexMany(firstParty.itineraries.map(hydrateRow), (row) => readNested(row, ['request_id', 'id_request']));
  const itinerariesByRef = indexMany(firstParty.itineraries.map(hydrateRow), extractReferenceCode);

  const leads = [];
  const seenKeys = new Set();

  for (const request of firstParty.requests.map(hydrateRow)) {
    const referenceCode = extractReferenceCode(request);
    const chatwootId = extractChatwootId(request);
    const relatedEvents = uniqueObjects([
      ...(referenceCode ? (funnelByRef.get(referenceCode) || []) : []),
      ...(chatwootId ? (funnelByChatwoot.get(chatwootId) || []) : []),
    ]);
    const relatedWaflow = uniqueObjects([
      ...(referenceCode ? (waflowByRef.get(referenceCode) || []) : []),
      ...(chatwootId ? (waflowByChatwoot.get(chatwootId) || []) : []),
    ]);
    const relatedItineraries = uniqueObjects([
      ...(itinerariesByRequest.get(String(request.id || '')) || []),
      ...(referenceCode ? (itinerariesByRef.get(referenceCode) || []) : []),
    ]);

    const lead = normalizeFirstPartyLead({
      source: 'request',
      row: request,
      relatedEvents,
      relatedWaflow,
      relatedItineraries,
      clickAttribution,
    });
    leads.push(lead);
    seenKeys.add(lead.dedupeKey);
  }

  for (const waflow of firstParty.waflowLeads.map(hydrateRow)) {
    const lead = normalizeFirstPartyLead({
      source: 'waflow_orphan',
      row: waflow,
      relatedEvents: [],
      relatedWaflow: [waflow],
      relatedItineraries: [],
      clickAttribution,
    });
    if (!seenKeys.has(lead.dedupeKey)) {
      leads.push(lead);
      seenKeys.add(lead.dedupeKey);
    }
  }

  for (const event of firstParty.funnelEvents.map(hydrateRow)) {
    const eventName = extractEventName(event);
    if (!['waflow_submit', 'crm_opportunity_created', 'crm_quote_sent', 'crm_booking_confirmed'].includes(eventName)) continue;
    const lead = normalizeFirstPartyLead({
      source: 'funnel_event_orphan',
      row: event,
      relatedEvents: [event],
      relatedWaflow: [],
      relatedItineraries: [],
      clickAttribution,
    });
    if (!seenKeys.has(lead.dedupeKey)) {
      leads.push(lead);
      seenKeys.add(lead.dedupeKey);
    }
  }

  return leads.filter((lead) => !lead.isTestOrSynthetic);
}

function indexMany(rows, keyFn) {
  const index = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const normalized = String(key);
    if (!index.has(normalized)) index.set(normalized, []);
    index.get(normalized).push(row);
  }
  return index;
}

function uniqueObjects(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row.id || row.uuid || JSON.stringify(row).slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function extractReferenceCode(row) {
  const value = readNested(row, [
    'reference_code',
    'referral_code',
    'referenceCode',
    'payload.reference_code',
    'payload.referenceCode',
    'metadata.reference_code',
    'custom_fields.reference_code',
    'custom_fields.referral_code',
    'data.reference_code',
  ]);
  return value ? String(value) : '';
}

function extractChatwootId(row) {
  const value = readNested(row, [
    'chatwoot_conversation_id',
    'conversation_id',
    'payload.chatwoot_conversation_id',
    'payload.conversation_id',
    'metadata.chatwoot_conversation_id',
    'custom_fields.chatwoot_conversation_id',
    'data.chatwoot_conversation_id',
  ]);
  return value ? String(value) : '';
}

function extractEventName(row) {
  const value = readNested(row, ['event_name', 'event', 'name', 'type', 'payload.event_name', 'payload.event']);
  return value ? String(value) : '';
}

function extractAttribution(row, relatedEvents = [], relatedWaflow = [], clickAttribution) {
  const candidates = [row, ...relatedWaflow, ...relatedEvents].map(hydrateRow);
  const gclid = firstValue(candidates, ['gclid', 'payload.gclid', 'metadata.gclid', 'custom_fields.gclid', 'data.gclid']);
  const gbraid = firstValue(candidates, ['gbraid', 'payload.gbraid', 'metadata.gbraid', 'custom_fields.gbraid', 'data.gbraid']);
  const wbraid = firstValue(candidates, ['wbraid', 'payload.wbraid', 'metadata.wbraid', 'custom_fields.wbraid', 'data.wbraid']);
  const utmSource = firstValue(candidates, ['utm_source', 'payload.utm_source', 'metadata.utm_source', 'custom_fields.utm_source', 'data.utm_source']);
  const utmMedium = firstValue(candidates, ['utm_medium', 'payload.utm_medium', 'metadata.utm_medium', 'custom_fields.utm_medium', 'data.utm_medium']);
  const utmCampaign = firstValue(candidates, ['utm_campaign', 'payload.utm_campaign', 'metadata.utm_campaign', 'custom_fields.utm_campaign', 'data.utm_campaign']);
  const utmTerm = firstValue(candidates, ['utm_term', 'payload.utm_term', 'metadata.utm_term', 'custom_fields.utm_term', 'data.utm_term']);
  const utmContent = firstValue(candidates, ['utm_content', 'payload.utm_content', 'metadata.utm_content', 'custom_fields.utm_content', 'data.utm_content']);
  const gadCampaignId = firstValue(candidates, ['gad_campaignid', 'gad_campaign_id', 'payload.gad_campaignid', 'payload.gad_campaign_id', 'custom_fields.gad_campaignid']);
  const landingUrl = firstValue(candidates, ['landing_url', 'source_url', 'page_url', 'payload.landing_url', 'payload.source_url', 'metadata.landing_url', 'custom_fields.landing_url', 'data.source_url']);
  const clickRow = gclid ? clickAttribution.byGclid.get(String(gclid)) : null;

  return {
    gclid: gclid ? String(gclid) : '',
    gbraid: gbraid ? String(gbraid) : '',
    wbraid: wbraid ? String(wbraid) : '',
    utmSource: utmSource ? String(utmSource) : '',
    utmMedium: utmMedium ? String(utmMedium) : '',
    utmCampaign: utmCampaign ? String(utmCampaign) : '',
    utmTerm: utmTerm ? String(utmTerm) : '',
    utmContent: utmContent ? String(utmContent) : '',
    gadCampaignId: gadCampaignId ? String(gadCampaignId) : '',
    landingUrl: landingUrl ? String(landingUrl) : '',
    campaignId: clickRow?.campaignId || (gadCampaignId ? String(gadCampaignId) : ''),
    campaignName: clickRow?.campaignName || (utmCampaign ? String(utmCampaign) : ''),
    adGroupId: clickRow?.adGroupId || '',
    adGroupName: clickRow?.adGroupName || '',
  };
}

function firstValue(rows, paths) {
  for (const row of rows) {
    const value = readNested(row, paths);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function normalizeFirstPartyLead({ source, row, relatedEvents, relatedWaflow, relatedItineraries, clickAttribution }) {
  const eventNames = relatedEvents.map(extractEventName).filter(Boolean);
  const referenceCode = extractReferenceCode(row) || firstValue([...relatedWaflow, ...relatedEvents, ...relatedItineraries], ['reference_code', 'referral_code', 'payload.reference_code']);
  const chatwootId = extractChatwootId(row) || firstValue([...relatedWaflow, ...relatedEvents], ['chatwoot_conversation_id', 'conversation_id', 'payload.chatwoot_conversation_id']);
  const attribution = extractAttribution(row, relatedEvents, relatedWaflow, clickAttribution);
  const stageText = safeLower([
    readNested(row, ['status', 'stage', 'request_stage', 'opportunity_stage', 'state']),
    ...relatedItineraries.map((itinerary) => readNested(itinerary, ['status', 'stage', 'state'])),
    ...eventNames,
  ].filter(Boolean).join(' '));
  const hasWaflowSubmit = source === 'waflow_orphan' || relatedWaflow.length > 0 || eventNames.includes('waflow_submit');
  const hasCrmOpportunity = eventNames.some((name) => /crm|opportun|request|lead/.test(safeLower(name))) || source === 'request';
  const hasQuoteSent = /quote|cotiz|proposal|propuesta|sent|enviad/.test(stageText) || eventNames.includes('crm_quote_sent');
  const hasConfirmedItinerary = relatedItineraries.length > 0 || /confirm|won|booking|booked|paid|sale|venta/.test(stageText) || eventNames.includes('crm_booking_confirmed');
  const qualityLead = hasQuoteSent || hasConfirmedItinerary || /qualified|calific|hot|warm|opportunity/.test(stageText);
  const isLowQuality = /spam|test|low|lost|junk|fake|duplicad/.test(stageText);
  const syntheticText = safeLower([referenceCode, chatwootId, attribution.utmCampaign, attribution.utmTerm, row.email, row.name].filter(Boolean).join(' '));
  const isTestOrSynthetic = /codex|test|qa|automation|dummy|example/.test(syntheticText);
  const createdAt = readNested(row, ['created_at', 'inserted_at', 'updated_at']) || relatedEvents[0]?.created_at || relatedWaflow[0]?.created_at || '';
  const dedupeKey = referenceCode
    ? `ref:${referenceCode}`
    : chatwootId
      ? `cw:${chatwootId}`
      : attribution.gclid
        ? `gclid:${attribution.gclid}`
        : `${source}:${row.id || hashKey(JSON.stringify(row))}`;

  return {
    source,
    dedupeKey,
    id: row.id || '',
    createdAt,
    referenceCode: referenceCode ? String(referenceCode) : '',
    chatwootConversationId: chatwootId ? String(chatwootId) : '',
    ...attribution,
    hasWaflowSubmit,
    hasCrmOpportunity,
    hasQuoteSent,
    hasConfirmedItinerary,
    qualityLead,
    isLowQuality,
    isTestOrSynthetic,
    eventNames: unique(eventNames),
  };
}

async function checkLandingUrls(landingRows, opts) {
  const urls = unique(landingRows.map((row) => row.landingUrl)).slice(0, opts.landingCheckLimit);
  const checks = [];
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      checks.push(await checkLandingUrl(url));
    }
  }

  const workers = Array.from({ length: Math.min(opts.landingCheckConcurrency, urls.length || 1) }, worker);
  await Promise.all(workers);
  return checks.sort((a, b) => a.url.localeCompare(b.url));
}

async function checkLandingUrl(url) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    const text = await response.text().catch(() => '');
    return {
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      finalUrl: response.url || url,
      elapsedMs: Date.now() - started,
      trackingPresent: hasTrackingHooks(url, text),
      trackingSignals: detectTrackingSignals(url, text),
      error: '',
    };
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      finalUrl: url,
      elapsedMs: Date.now() - started,
      trackingPresent: false,
      trackingSignals: [],
      error: compactText(error.message || String(error), 300),
    };
  }
}

function detectTrackingSignals(url, body) {
  const signals = [];
  const haystack = `${url}\n${body || ''}`.toLowerCase();
  if (/gclid|gbraid|wbraid/.test(haystack)) signals.push('google_click_id');
  if (/utm_source|utm_campaign|utm_medium/.test(haystack)) signals.push('utm');
  if (/reference_code|referencecode|referral_code/.test(haystack)) signals.push('reference_code');
  if (/gtag\(|googletagmanager|google-analytics|gtm-/.test(haystack)) signals.push('google_tag');
  if (/waflow|whatsapp|wa\.me|api\.whatsapp/.test(haystack)) signals.push('wa_flow');
  return unique(signals);
}

function hasTrackingHooks(url, body) {
  return detectTrackingSignals(url, body).length >= 2;
}

async function classifySearchTermsWithLlm(searchTermRows, opts, context) {
  const cache = await readJsonIfExists(opts.cachePath, {});
  const meta = {
    enabled: !opts.skipLlm,
    model: process.env.OPENROUTER_MODEL || '',
    cachePath: opts.cachePath,
    fromCache: 0,
    requested: 0,
    classified: 0,
    errors: [],
  };

  const aggregates = aggregateSearchTerms(searchTermRows);
  const topTerms = aggregates
    .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks)
    .slice(0, opts.llmLimit)
    .map((row) => ({
      searchTerm: row.searchTerm,
      campaigns: unique([...row.campaignNames]).slice(0, 3),
      adGroups: unique([...row.adGroupNames]).slice(0, 3),
      clicks: row.clicks,
      cost: Math.round(row.cost),
      conversions: row.allConversions,
    }));

  const results = new Map();
  for (const term of topTerms) {
    const key = classificationCacheKey(term.searchTerm);
    if (cache[key]) {
      results.set(term.searchTerm, cache[key]);
      meta.fromCache += 1;
    }
  }

  if (opts.skipLlm || !topTerms.length) {
    meta.enabled = false;
    return { byTerm: results, cache, meta };
  }

  if (!process.env.OPENROUTER_AUTH_TOKEN || !process.env.OPENROUTER_BASE_URL || !process.env.OPENROUTER_MODEL) {
    meta.enabled = false;
    meta.errors.push('LLM skipped: OPENROUTER_AUTH_TOKEN, OPENROUTER_BASE_URL, or OPENROUTER_MODEL is missing.');
    return { byTerm: results, cache, meta };
  }

  const pending = topTerms.filter((term) => !results.has(term.searchTerm));
  meta.requested = pending.length;

  for (let index = 0; index < pending.length; index += opts.llmBatchSize) {
    const batch = pending.slice(index, index + opts.llmBatchSize);
    try {
      const classified = await classifyBatchWithOpenRouter(batch, context);
      for (const item of classified) {
        if (!item || !item.searchTerm) continue;
        const normalized = normalizeLlmClassification(item);
        results.set(item.searchTerm, normalized);
        cache[classificationCacheKey(item.searchTerm)] = normalized;
        meta.classified += 1;
      }
      console.error(`[historical-mining] llm classified ${Math.min(index + opts.llmBatchSize, pending.length)}/${pending.length}`);
    } catch (error) {
      const message = redact(error.message || String(error));
      meta.errors.push(message);
      console.error(`[historical-mining] llm batch failed: ${message}`);
    }
  }

  if (opts.applyAnalysis && meta.classified > 0) {
    await fsp.mkdir(path.dirname(opts.cachePath), { recursive: true });
    await fsp.writeFile(opts.cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  }

  return { byTerm: results, cache, meta };
}

function classificationCacheKey(term) {
  return `v1:${hashKey(normalizeTerm(term))}`;
}

async function classifyBatchWithOpenRouter(batch, context) {
  const url = `${process.env.OPENROUTER_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const prompt = [
    'You are a senior Google Search Ads strategist for a premium Colombia travel agency.',
    'Classify each paid-search query. Historical Google Ads conversions are weak signals; prioritize commercial travel intent and first-party CRM usefulness.',
    `Taxonomy: ${TAXONOMY.join(', ')}`,
    `Allowed actions: ${TERM_ACTIONS.join(', ')}`,
    'Return strict JSON only: {"classifications":[...]} where each item has searchTerm, intent, action, confidence (0-1), destinationHints (array), rationale (short).',
    'Prefer negative_exact for unambiguous junk/employment/shipping/visa/docs/flight-only/hotel-only.',
    'Prefer promote_exact/new_ad_group/new_landing for custom Colombia package intent, private/luxury/family/group and destination-specific package queries.',
    `Date window: ${context.fromDate} to ${context.toDate}`,
    `Terms: ${JSON.stringify(batch)}`,
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_AUTH_TOKEN}`,
      'content-type': 'application/json',
      'http-referer': 'https://bukeer.com',
      'x-title': 'ColombiaTours Google Ads Historical Mining',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return machine-readable JSON only. No prose.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenRouter failed (${response.status}): ${redact(JSON.stringify(payload).slice(0, 2000))}`);
  }
  const content = payload?.choices?.[0]?.message?.content || '';
  const parsed = parseLlmJson(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.classifications)) return parsed.classifications;
  throw new Error(`OpenRouter JSON did not include an array: ${compactText(content, 500)}`);
}

function parseLlmJson(content) {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content);
  } catch {
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error('Could not parse LLM JSON response.');
  }
}

function normalizeLlmClassification(item) {
  const intent = TAXONOMY.includes(item.intent) ? item.intent : 'informational';
  const action = TERM_ACTIONS.includes(item.action) ? item.action : 'keep_observe';
  return {
    intent,
    action,
    confidence: Math.max(0, Math.min(1, number(item.confidence, 0.65))),
    destinationHints: Array.isArray(item.destinationHints) ? item.destinationHints.map(String).slice(0, 5) : [],
    rationale: compactText(item.rationale || '', 260),
    source: 'llm',
  };
}

async function readJsonIfExists(filePath, fallback) {
  try {
    const text = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function buildAnalysis({ opts, context, googleAds, firstParty, unifiedLeads, landingChecks, llmClassifier }) {
  const campaignSummary = summarizeByCampaign(googleAds, unifiedLeads);
  const adGroupSummary = summarizeByAdGroup(googleAds, unifiedLeads);
  const keywordSummary = summarizeKeywords(googleAds.keywordRows);
  const searchTerms = analyzeSearchTerms(googleAds.searchTermRows, googleAds.keywordRows, googleAds.landingRows, campaignSummary, llmClassifier, opts);
  const negatives = buildNegativeKeywordRecommendations(searchTerms, opts);
  const positives = buildPositiveSearchTermRecommendations(searchTerms, opts);
  const campaignActions = buildCampaignActions(campaignSummary, searchTerms, unifiedLeads);
  const landingOpportunities = buildLandingOpportunities(googleAds.landingRows, searchTerms, unifiedLeads, landingChecks);
  const marketInsights = buildMarketInsights(campaignSummary, searchTerms, unifiedLeads);
  const budgetRules = buildBudgetRules(campaignActions, marketInsights);
  const trackingChecklist = buildTrackingChecklist(firstParty, unifiedLeads, landingChecks, googleAds);
  const qaSample = buildQaSample(searchTerms, negatives);

  return {
    campaignSummary,
    adGroupSummary,
    keywordSummary,
    searchTerms,
    negativeKeywords: negatives,
    positiveSearchTerms: positives,
    campaignActions,
    landingOpportunities,
    marketInsights,
    budgetRules,
    trackingChecklist,
    qaSample,
    notes: [
      'Google Ads historical conversions are context only; optimization priority is first-party funnel and CRM quality.',
      'Recommendations are local analysis only. No negatives, campaigns, budgets, or Supabase records were mutated.',
      `Window analyzed: ${context.fromDate} to ${context.toDate}.`,
    ],
  };
}

function aggregateSearchTerms(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeTerm(row.searchTerm) || row.searchTerm;
    if (!map.has(key)) {
      map.set(key, {
        key,
        searchTerm: row.searchTerm,
        campaignIds: new Set(),
        campaignNames: new Set(),
        adGroupIds: new Set(),
        adGroupNames: new Set(),
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        allConversions: 0,
        conversionValue: 0,
        firstSeen: row.date,
        lastSeen: row.date,
        rows: [],
      });
    }
    const current = map.get(key);
    current.campaignIds.add(row.campaignId);
    current.campaignNames.add(row.campaignName);
    current.adGroupIds.add(row.adGroupId);
    current.adGroupNames.add(row.adGroupName);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversions += row.conversions;
    current.allConversions += row.allConversions;
    current.conversionValue += row.conversionValue;
    current.firstSeen = minDate(current.firstSeen, row.date);
    current.lastSeen = maxDate(current.lastSeen, row.date);
    current.rows.push(row);
  }
  return [...map.values()];
}

function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function analyzeSearchTerms(searchTermRows, keywordRows, landingRows, campaignSummary, llmClassifier, opts) {
  const keywordIndex = buildKeywordIndex(keywordRows);
  const landingByCampaign = topLandingByCampaign(landingRows);
  const aggregates = aggregateSearchTerms(searchTermRows);
  return aggregates.map((term) => {
    const deterministic = deterministicClassifyTerm(term.searchTerm);
    const llm = llmClassifier.byTerm.get(term.searchTerm) || llmClassifier.byTerm.get(normalizeTerm(term.searchTerm));
    const classification = llm ? mergeClassification(deterministic, llm) : deterministic;
    const campaignIds = [...term.campaignIds].filter(Boolean);
    const primaryCampaignId = campaignIds[0] || '';
    const campaign = primaryCampaignId ? campaignSummary.find((row) => row.campaignId === primaryCampaignId) : null;
    const landing = primaryCampaignId ? landingByCampaign.get(primaryCampaignId) : null;
    const exactKeywordExists = keywordIndex.has(normalizeTerm(term.searchTerm));
    const landingGap = scoreLandingGap(term.searchTerm, landing?.landingUrl || '', classification.destinationHints);
    const crmQualityScore = campaign ? campaign.crmQualityScore : 0;
    const intentScore = computeIntentScore(classification.intent, term, crmQualityScore);
    const wasteScore = computeWasteScore(classification.intent, term, crmQualityScore);
    const expansionScore = computeExpansionScore(classification.intent, term, exactKeywordExists, crmQualityScore);
    const action = chooseTermAction({ term, classification, exactKeywordExists, landingGap, intentScore, wasteScore, expansionScore, opts });
    return {
      searchTerm: term.searchTerm,
      normalizedSearchTerm: term.key,
      campaigns: [...term.campaignNames].filter(Boolean),
      campaignIds,
      adGroups: [...term.adGroupNames].filter(Boolean),
      adGroupIds: [...term.adGroupIds].filter(Boolean),
      impressions: term.impressions,
      clicks: term.clicks,
      cost: round(term.cost),
      ctr: term.impressions ? term.clicks / term.impressions : 0,
      averageCpc: term.clicks ? term.cost / term.clicks : 0,
      adsConversionsContextOnly: round(term.allConversions),
      firstSeen: term.firstSeen,
      lastSeen: term.lastSeen,
      intent: classification.intent,
      confidence: classification.confidence,
      classifierSource: classification.source,
      rationale: classification.rationale,
      destinationHints: classification.destinationHints,
      exactKeywordExists,
      suggestedLandingUrl: landing?.landingUrl || '',
      landingGapScore: landingGap,
      intentScore,
      wasteScore,
      expansionScore,
      crmQualityScore,
      recommendedAction: action.action,
      actionReason: action.reason,
      estimatedWasteCop: action.action.startsWith('negative') ? round(term.cost * Math.max(0.25, wasteScore / 100)) : 0,
      suggestedAdGroup: suggestAdGroupName(term.searchTerm, classification.destinationHints),
      suggestedLandingTheme: suggestLandingTheme(term.searchTerm, classification.destinationHints),
    };
  }).sort((a, b) => b.cost - a.cost || b.wasteScore - a.wasteScore);
}

function buildKeywordIndex(keywordRows) {
  const index = new Set();
  for (const keyword of keywordRows) {
    if (keyword.keywordText) index.add(normalizeTerm(keyword.keywordText.replace(/[\[\]"]/g, '')));
  }
  return index;
}

function topLandingByCampaign(landingRows) {
  const map = new Map();
  for (const landing of landingRows) {
    const current = map.get(landing.campaignId);
    if (!current || landing.cost > current.cost) map.set(landing.campaignId, landing);
  }
  return map;
}

function deterministicClassifyTerm(searchTerm) {
  const normalized = normalizeTerm(searchTerm);
  const destinationHints = DESTINATION_HINTS.filter((destination) => normalized.includes(normalizeTerm(destination))).map((destination) => destination.replace(/\\u00e1/g, 'a'));

  const patterns = [
    { intent: 'employment', action: 'negative_exact', confidence: 0.94, regex: /\b(job|jobs|empleo|trabajo|vacante|vacantes|salary|salario|hiring|career|carrera)\b/i, rationale: 'employment intent, not a travel package buyer' },
    { intent: 'shipping', action: 'negative_exact', confidence: 0.94, regex: /\b(ship|shipping|cargo|courier|freight|envio|envios|enviar|paqueteria|dhl|fedex)\b/i, rationale: 'shipping/logistics intent' },
    { intent: 'visa/docs', action: 'negative_exact', confidence: 0.9, regex: /\b(visa|visado|passport|pasaporte|cedula|documento|embassy|embajada|consulado|migracion|migration)\b/i, rationale: 'documents/visa intent' },
    { intent: 'flight_only', action: 'negative_phrase', confidence: 0.88, regex: /\b(flight|flights|vuelo|vuelos|aereo|aereos|airline|airlines|tiquetes|boletos|pasajes)\b/i, rationale: 'flight-only intent' },
    { intent: 'hotel_only', action: 'negative_phrase', confidence: 0.84, regex: /\b(hotel|hotels|hostel|airbnb|booking\.com|hospedaje|alojamiento)\b/i, rationale: 'hotel-only intent' },
    { intent: 'cheap/bargain', action: 'keep_observe', confidence: 0.72, regex: /\b(cheap|barato|barata|economico|econ[o\u00f3]mico|low cost|gratis|free|budget)\b/i, rationale: 'price-shopping intent; review before phrase negative' },
    { intent: 'competitor', action: 'sales_review', confidence: 0.65, regex: /\b(g adventures|intrepid|kimkim|viator|getyourguide|tripadvisor|expedia|despegar|kayak|avianca|latam)\b/i, rationale: 'competitor or OTA intent' },
    { intent: 'luxury/private', action: 'promote_exact', confidence: 0.82, regex: /\b(luxury|premium|private|privado|privada|tailor made|custom|bespoke|a medida|sur mesure|honeymoon|luna de miel)\b/i, rationale: 'premium/custom package intent' },
    { intent: 'family/group', action: 'new_ad_group', confidence: 0.78, regex: /\b(family|familia|familias|group|grupo|grupos|kids|ni[n\u00f1]os|friends|amigos)\b/i, rationale: 'family/group trip intent' },
    { intent: 'high_commercial', action: 'promote_exact', confidence: 0.82, regex: /\b(package|packages|paquete|paquetes|tour package|travel agency|agencia|itinerary|itinerario|quote|cotizar|cotizacion|cotizaci[o\u00f3]n|plan|plans|vacation|holidays|rundreise)\b/i, rationale: 'commercial travel package intent' },
    { intent: 'informational', action: 'seo_content', confidence: 0.62, regex: /\b(what|when|where|how|que|cu[a\u00e1]ndo|donde|c[o\u00f3]mo|map|mapa|weather|clima|safety|seguridad|blog|guide|guia|gu[i\u00ed]a)\b/i, rationale: 'informational research intent' },
  ];

  const matched = patterns.find((pattern) => pattern.regex.test(searchTerm));
  if (matched) {
    return {
      intent: destinationHints.length && matched.intent === 'informational' ? 'destination_specific' : matched.intent,
      action: matched.action,
      confidence: matched.confidence,
      destinationHints,
      rationale: matched.rationale,
      source: 'rules',
    };
  }

  if (destinationHints.length) {
    return {
      intent: 'destination_specific',
      action: 'new_ad_group',
      confidence: 0.68,
      destinationHints,
      rationale: 'destination-specific Colombia query',
      source: 'rules',
    };
  }

  if (/\b(colombia|colombie|kolumbien)\b/i.test(searchTerm)) {
    return {
      intent: 'commercial_research',
      action: 'keep_observe',
      confidence: 0.58,
      destinationHints,
      rationale: 'generic Colombia travel research',
      source: 'rules',
    };
  }

  return {
    intent: 'junk',
    action: 'sales_review',
    confidence: 0.42,
    destinationHints,
    rationale: 'unclear or off-topic query; review before action',
    source: 'rules',
  };
}

function mergeClassification(rules, llm) {
  if (!llm || llm.confidence < 0.55) return rules;
  const destinationHints = unique([...(rules.destinationHints || []), ...(llm.destinationHints || [])]);
  return {
    ...rules,
    ...llm,
    destinationHints,
    source: 'llm',
    rationale: llm.rationale || rules.rationale,
  };
}

function computeIntentScore(intent, term, crmQualityScore) {
  const base = INTENT_BASE_SCORE[intent] ?? 40;
  const clickBoost = Math.min(8, Math.log10(term.clicks + 1) * 4);
  const qualityBoost = Math.min(10, crmQualityScore / 10);
  return clamp(round(base + clickBoost + qualityBoost), 0, 100);
}

function computeWasteScore(intent, term, crmQualityScore) {
  const negativeIntentBoost = NEGATIVE_INTENTS.has(intent) ? 45 : 0;
  const hardBoost = HARD_NEGATIVE_INTENTS.has(intent) ? 25 : 0;
  const spendBoost = Math.min(25, Math.log10(term.cost + 1) * 4);
  const clickNoQualityBoost = term.clicks >= 3 && crmQualityScore < 20 ? 15 : 0;
  const qualityPenalty = Math.min(35, crmQualityScore * 0.6);
  return clamp(round(negativeIntentBoost + hardBoost + spendBoost + clickNoQualityBoost - qualityPenalty), 0, 100);
}

function computeExpansionScore(intent, term, exactKeywordExists, crmQualityScore) {
  if (NEGATIVE_INTENTS.has(intent) && !['cheap/bargain', 'competitor'].includes(intent)) return 0;
  const base = ['high_commercial', 'luxury/private', 'family/group', 'destination_specific'].includes(intent) ? 55 : 30;
  const clickBoost = Math.min(18, Math.log10(term.clicks + 1) * 7);
  const spendBoost = Math.min(12, Math.log10(term.cost + 1) * 2);
  const qualityBoost = Math.min(15, crmQualityScore / 6);
  const exactPenalty = exactKeywordExists ? 18 : 0;
  return clamp(round(base + clickBoost + spendBoost + qualityBoost - exactPenalty), 0, 100);
}

function scoreLandingGap(searchTerm, landingUrl, destinationHints) {
  if (!landingUrl) return destinationHints.length ? 70 : 30;
  const normalizedUrl = normalizeTerm(landingUrl.replace(/https?:\/\//, ' '));
  const normalizedTerm = normalizeTerm(searchTerm);
  const destinationMismatch = destinationHints.filter((hint) => !normalizedUrl.includes(normalizeTerm(hint))).length;
  const importantWords = normalizedTerm.split(' ').filter((word) => word.length > 3 && !STOPWORDS.has(word));
  const missingWords = importantWords.filter((word) => !normalizedUrl.includes(word)).length;
  return clamp(round((destinationMismatch * 28) + Math.min(45, missingWords * 7)), 0, 100);
}

function chooseTermAction({ term, classification, exactKeywordExists, landingGap, intentScore, wasteScore, expansionScore, opts }) {
  if (classification.action === 'negative_exact' && wasteScore >= 55) {
    return { action: 'negative_exact', reason: `${classification.intent} with high waste score` };
  }
  if (classification.action === 'negative_phrase' && wasteScore >= 65 && term.cost >= opts.minWasteCop) {
    return { action: 'negative_phrase', reason: `${classification.intent} spending without first-party quality signal` };
  }
  if (HARD_NEGATIVE_INTENTS.has(classification.intent) && term.clicks >= 1) {
    return { action: 'negative_exact', reason: `hard negative intent: ${classification.intent}` };
  }
  if (classification.intent === 'cheap/bargain' && term.cost >= opts.minWasteCop && wasteScore >= 60) {
    return { action: 'negative_phrase', reason: 'bargain-seeking traffic above waste threshold' };
  }
  if (landingGap >= 70 && intentScore >= 70) {
    return { action: 'new_landing', reason: 'high-intent term with landing mismatch' };
  }
  if (expansionScore >= 70 && !exactKeywordExists && term.clicks >= opts.minPositiveClicks) {
    return { action: 'promote_exact', reason: 'high-intent search term without exact keyword coverage' };
  }
  if (expansionScore >= 62 && ['destination_specific', 'family/group', 'luxury/private'].includes(classification.intent)) {
    return { action: 'new_ad_group', reason: `structured coverage gap for ${classification.intent}` };
  }
  if (classification.intent === 'informational') {
    return { action: 'seo_content', reason: 'capture organically or nurture outside paid search' };
  }
  if (term.cost >= opts.minWasteCop && wasteScore >= 50) {
    return { action: 'sales_review', reason: 'meaningful spend but ambiguous quality' };
  }
  return { action: 'keep_observe', reason: 'insufficient evidence for structural change' };
}

function suggestAdGroupName(searchTerm, destinationHints) {
  if (destinationHints.length) return `ST_${titleToken(destinationHints[0])}_Packages`;
  const words = normalizeTerm(searchTerm).split(' ').filter((word) => word.length > 3 && !STOPWORDS.has(word)).slice(0, 3);
  return words.length ? `ST_${words.map(titleToken).join('_')}` : 'ST_Colombia_Custom_Packages';
}

function suggestLandingTheme(searchTerm, destinationHints) {
  if (destinationHints.length) return `${titleToken(destinationHints[0])} custom Colombia itinerary`;
  const normalized = normalizeTerm(searchTerm);
  if (/family|familia|grupo|group/.test(normalized)) return 'Family and group Colombia packages';
  if (/luxury|private|privad|premium|honeymoon|luna/.test(normalized)) return 'Private premium Colombia tours';
  return 'Custom Colombia travel packages';
}

function titleToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function summarizeByCampaign(googleAds, unifiedLeads) {
  const map = new Map();
  for (const row of googleAds.campaignRows) {
    const key = row.campaignId;
    if (!map.has(key)) {
      map.set(key, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        status: row.campaignStatus,
        market: inferMarket(row.campaignName),
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversionsContextOnly: 0,
        conversionValueContextOnly: 0,
        days: new Set(),
        firstPartyLeads: 0,
        waflowSubmits: 0,
        crmOpportunities: 0,
        qualityLeads: 0,
        confirmedItineraries: 0,
        lowQualityLeads: 0,
        clickIdsPresent: 0,
        utmPresent: 0,
        referenceCodePresent: 0,
        crmQualityScore: 0,
      });
    }
    const current = map.get(key);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversionsContextOnly += row.allConversions;
    current.conversionValueContextOnly += row.conversionValue;
    if (row.date) current.days.add(row.date);
  }

  for (const lead of unifiedLeads) {
    const candidates = unique([lead.campaignId, campaignIdFromUtm(lead.utmCampaign)]).filter(Boolean);
    for (const campaignId of candidates) {
      if (!map.has(campaignId)) continue;
      const current = map.get(campaignId);
      current.firstPartyLeads += 1;
      if (lead.hasWaflowSubmit) current.waflowSubmits += 1;
      if (lead.hasCrmOpportunity) current.crmOpportunities += 1;
      if (lead.qualityLead) current.qualityLeads += 1;
      if (lead.hasConfirmedItinerary) current.confirmedItineraries += 1;
      if (lead.isLowQuality) current.lowQualityLeads += 1;
      if (lead.gclid || lead.gbraid || lead.wbraid) current.clickIdsPresent += 1;
      if (lead.utmSource || lead.utmCampaign || lead.utmMedium) current.utmPresent += 1;
      if (lead.referenceCode) current.referenceCodePresent += 1;
    }
  }

  return [...map.values()].map((row) => finalizeCampaignSummary(row)).sort((a, b) => b.cost - a.cost);
}

function finalizeCampaignSummary(row) {
  const qualityRate = row.firstPartyLeads ? row.qualityLeads / row.firstPartyLeads : 0;
  const traceabilityRate = row.firstPartyLeads ? (row.clickIdsPresent + row.utmPresent + row.referenceCodePresent) / (row.firstPartyLeads * 3) : 0;
  const crmQualityScore = clamp(round((qualityRate * 65) + (traceabilityRate * 25) + Math.min(10, row.confirmedItineraries * 3)), 0, 100);
  return {
    ...row,
    days: row.days.size,
    ctr: row.impressions ? row.clicks / row.impressions : 0,
    averageCpc: row.clicks ? row.cost / row.clicks : 0,
    cplFirstParty: row.firstPartyLeads ? row.cost / row.firstPartyLeads : null,
    cplQuality: row.qualityLeads ? row.cost / row.qualityLeads : null,
    qualityRate,
    traceabilityRate,
    crmQualityScore,
  };
}

function campaignIdFromUtm(value) {
  const text = String(value || '');
  const match = text.match(/\b(\d{8,})\b/);
  return match ? match[1] : '';
}

function summarizeByAdGroup(googleAds, unifiedLeads) {
  const map = new Map();
  for (const row of googleAds.adGroupRows) {
    const key = `${row.campaignId}:${row.adGroupId}`;
    if (!map.has(key)) {
      map.set(key, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        adGroupId: row.adGroupId,
        adGroupName: row.adGroupName,
        status: row.adGroupStatus,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversionsContextOnly: 0,
        firstPartyLeads: 0,
        qualityLeads: 0,
      });
    }
    const current = map.get(key);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversionsContextOnly += row.allConversions;
  }

  for (const lead of unifiedLeads) {
    if (!lead.adGroupId) continue;
    const key = `${lead.campaignId}:${lead.adGroupId}`;
    const current = map.get(key);
    if (!current) continue;
    current.firstPartyLeads += 1;
    if (lead.qualityLead) current.qualityLeads += 1;
  }

  return [...map.values()].map((row) => ({
    ...row,
    ctr: row.impressions ? row.clicks / row.impressions : 0,
    averageCpc: row.clicks ? row.cost / row.clicks : 0,
    cplQuality: row.qualityLeads ? row.cost / row.qualityLeads : null,
  })).sort((a, b) => b.cost - a.cost);
}

function summarizeKeywords(keywordRows) {
  const map = new Map();
  for (const row of keywordRows) {
    const key = `${row.campaignId}:${row.adGroupId}:${row.criterionId}`;
    if (!map.has(key)) {
      map.set(key, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        adGroupId: row.adGroupId,
        adGroupName: row.adGroupName,
        criterionId: row.criterionId,
        keywordText: row.keywordText,
        matchType: row.matchType,
        status: row.status,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversionsContextOnly: 0,
      });
    }
    const current = map.get(key);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversionsContextOnly += row.allConversions;
  }
  return [...map.values()].map((row) => ({
    ...row,
    ctr: row.impressions ? row.clicks / row.impressions : 0,
    averageCpc: row.clicks ? row.cost / row.clicks : 0,
  })).sort((a, b) => b.cost - a.cost);
}

function buildNegativeKeywordRecommendations(searchTerms, opts) {
  return searchTerms
    .filter((row) => ['negative_exact', 'negative_phrase'].includes(row.recommendedAction))
    .filter((row) => row.estimatedWasteCop >= opts.minWasteCop || HARD_NEGATIVE_INTENTS.has(row.intent))
    .map((row) => ({
      keywordText: row.searchTerm,
      matchType: row.recommendedAction === 'negative_exact' ? 'EXACT' : 'PHRASE',
      action: row.recommendedAction,
      intent: row.intent,
      confidence: row.confidence,
      reason: row.actionReason,
      estimatedWasteCop: row.estimatedWasteCop,
      spendCop: row.cost,
      clicks: row.clicks,
      campaigns: row.campaigns.join(' | '),
      adGroups: row.adGroups.join(' | '),
      reviewerNote: row.confidence < 0.7 ? 'Manual review before applying.' : '',
    }))
    .sort((a, b) => b.estimatedWasteCop - a.estimatedWasteCop || b.spendCop - a.spendCop);
}

function buildPositiveSearchTermRecommendations(searchTerms, opts) {
  return searchTerms
    .filter((row) => ['promote_exact', 'new_ad_group', 'new_landing', 'sales_review'].includes(row.recommendedAction))
    .filter((row) => row.clicks >= opts.minPositiveClicks || row.cost >= opts.minPositiveSpendCop)
    .filter((row) => row.intentScore >= 55 || row.expansionScore >= 55)
    .map((row) => ({
      searchTerm: row.searchTerm,
      action: row.recommendedAction,
      intent: row.intent,
      confidence: row.confidence,
      intentScore: row.intentScore,
      expansionScore: row.expansionScore,
      landingGapScore: row.landingGapScore,
      spendCop: row.cost,
      clicks: row.clicks,
      ctr: row.ctr,
      campaigns: row.campaigns.join(' | '),
      adGroups: row.adGroups.join(' | '),
      exactKeywordExists: row.exactKeywordExists,
      suggestedAdGroup: row.suggestedAdGroup,
      suggestedLandingTheme: row.suggestedLandingTheme,
      reason: row.actionReason,
    }))
    .sort((a, b) => b.expansionScore - a.expansionScore || b.spendCop - a.spendCop);
}

function buildCampaignActions(campaignSummary, searchTerms, unifiedLeads) {
  const termsByCampaign = new Map();
  for (const term of searchTerms) {
    for (const campaignId of term.campaignIds) {
      if (!termsByCampaign.has(campaignId)) termsByCampaign.set(campaignId, []);
      termsByCampaign.get(campaignId).push(term);
    }
  }

  return campaignSummary.map((campaign) => {
    const terms = termsByCampaign.get(campaign.campaignId) || [];
    const negativeWaste = sum(terms.filter((term) => term.recommendedAction.startsWith('negative')).map((term) => term.estimatedWasteCop));
    const positiveCount = terms.filter((term) => ['promote_exact', 'new_ad_group', 'new_landing'].includes(term.recommendedAction)).length;
    const landingGapCost = sum(terms.filter((term) => term.landingGapScore >= 70 && term.intentScore >= 65).map((term) => term.cost));
    const trackingCoverage = campaign.firstPartyLeads ? (campaign.clickIdsPresent + campaign.utmPresent + campaign.referenceCodePresent) / (campaign.firstPartyLeads * 3) : 0;
    const action = chooseCampaignAction(campaign, { negativeWaste, positiveCount, landingGapCost, trackingCoverage });
    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      market: campaign.market,
      status: campaign.status,
      spendCop: round(campaign.cost),
      clicks: campaign.clicks,
      ctr: campaign.ctr,
      averageCpc: round(campaign.averageCpc),
      adsConversionsContextOnly: round(campaign.conversionsContextOnly),
      firstPartyLeads: campaign.firstPartyLeads,
      waflowSubmits: campaign.waflowSubmits,
      crmOpportunities: campaign.crmOpportunities,
      qualityLeads: campaign.qualityLeads,
      confirmedItineraries: campaign.confirmedItineraries,
      cplFirstParty: campaign.cplFirstParty ? round(campaign.cplFirstParty) : null,
      cplQuality: campaign.cplQuality ? round(campaign.cplQuality) : null,
      traceabilityRate: campaign.traceabilityRate,
      crmQualityScore: campaign.crmQualityScore,
      negativeWasteCop: round(negativeWaste),
      positiveTermCount: positiveCount,
      landingGapCostCop: round(landingGapCost),
      recommendedAction: action.action,
      reason: action.reason,
      allowedActions: CAMPAIGN_ACTIONS.join('|'),
    };
  }).sort((a, b) => b.spendCop - a.spendCop);
}

function chooseCampaignAction(campaign, facts) {
  if (campaign.firstPartyLeads > 0 && facts.trackingCoverage < 0.45) {
    return { action: 'tracking_fix', reason: 'first-party leads exist but click/UTM/reference coverage is weak' };
  }
  if (facts.landingGapCost > campaign.cost * 0.25 && facts.positiveCount >= 3) {
    return { action: 'landing_mismatch', reason: 'high-intent spend is not aligned to landing themes' };
  }
  if (facts.negativeWaste > campaign.cost * 0.18 && campaign.qualityLeads === 0) {
    return { action: 'budget_leak', reason: 'material waste terms and no first-party quality signal' };
  }
  if (campaign.cost > 0 && campaign.qualityLeads === 0 && facts.negativeWaste > campaign.cost * 0.3) {
    return { action: 'pause_candidate', reason: 'spend with high waste and no qualified first-party outcomes' };
  }
  if (campaign.crmQualityScore >= 60 && facts.positiveCount >= 3 && facts.negativeWaste < campaign.cost * 0.15) {
    return { action: 'scale', reason: 'quality signal plus expansion terms with controlled waste' };
  }
  if (facts.positiveCount >= 5 || facts.negativeWaste > campaign.cost * 0.2) {
    return { action: 'rebuild', reason: 'structure should be rebuilt around winners and negatives' };
  }
  return { action: 'keep', reason: 'no strong pause/scale signal; keep under observation' };
}

function buildLandingOpportunities(landingRows, searchTerms, unifiedLeads, landingChecks) {
  const checksByUrl = new Map(landingChecks.map((check) => [check.url, check]));
  const map = new Map();
  for (const row of landingRows) {
    const key = row.landingUrl;
    if (!map.has(key)) {
      map.set(key, {
        landingUrl: row.landingUrl,
        campaigns: new Set(),
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversionsContextOnly: 0,
        highIntentMismatchTerms: [],
      });
    }
    const current = map.get(key);
    current.campaigns.add(row.campaignName);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversionsContextOnly += row.allConversions;
  }

  for (const term of searchTerms) {
    if (!term.suggestedLandingUrl) continue;
    const current = map.get(term.suggestedLandingUrl);
    if (!current) continue;
    if (term.landingGapScore >= 70 && term.intentScore >= 65) current.highIntentMismatchTerms.push(term.searchTerm);
  }

  return [...map.values()].map((row) => {
    const check = checksByUrl.get(row.landingUrl);
    const trackingPresent = check ? check.trackingPresent : null;
    let action = 'keep_observe';
    let reason = 'no urgent landing issue detected';
    if (check && !check.ok) {
      action = 'fix_url';
      reason = `landing returned ${check.status || check.error}`;
    } else if (trackingPresent === false) {
      action = 'tracking_fix';
      reason = 'landing reachable but tracking hooks were not detected';
    } else if (row.highIntentMismatchTerms.length >= 3) {
      action = 'new_landing';
      reason = 'multiple high-intent terms need tighter landing alignment';
    }
    return {
      landingUrl: row.landingUrl,
      campaigns: [...row.campaigns].join(' | '),
      spendCop: round(row.cost),
      clicks: row.clicks,
      ctr: row.impressions ? row.clicks / row.impressions : 0,
      adsConversionsContextOnly: round(row.conversionsContextOnly),
      status: check ? check.status : null,
      ok200: check ? check.ok : null,
      trackingPresent,
      trackingSignals: check ? check.trackingSignals.join('|') : '',
      highIntentMismatchTerms: unique(row.highIntentMismatchTerms).slice(0, 10).join(' | '),
      recommendedAction: action,
      reason,
    };
  }).sort((a, b) => {
    const urgencyA = a.recommendedAction === 'fix_url' ? 3 : a.recommendedAction === 'tracking_fix' ? 2 : a.recommendedAction === 'new_landing' ? 1 : 0;
    const urgencyB = b.recommendedAction === 'fix_url' ? 3 : b.recommendedAction === 'tracking_fix' ? 2 : b.recommendedAction === 'new_landing' ? 1 : 0;
    return urgencyB - urgencyA || b.spendCop - a.spendCop;
  });
}

function buildMarketInsights(campaignSummary, searchTerms, unifiedLeads) {
  const map = new Map();
  for (const campaign of campaignSummary) {
    const market = campaign.market || inferMarket(campaign.campaignName) || 'UNKNOWN';
    if (!map.has(market)) {
      map.set(market, {
        market,
        campaigns: new Set(),
        spendCop: 0,
        clicks: 0,
        firstPartyLeads: 0,
        qualityLeads: 0,
        confirmedItineraries: 0,
        negativeWasteCop: 0,
        positiveTermCount: 0,
        topThemes: new Map(),
      });
    }
    const current = map.get(market);
    current.campaigns.add(campaign.campaignName);
    current.spendCop += campaign.cost;
    current.clicks += campaign.clicks;
    current.firstPartyLeads += campaign.firstPartyLeads;
    current.qualityLeads += campaign.qualityLeads;
    current.confirmedItineraries += campaign.confirmedItineraries;
  }

  for (const term of searchTerms) {
    const markets = unique(term.campaigns.map(inferMarket).filter(Boolean));
    for (const market of markets.length ? markets : ['UNKNOWN']) {
      if (!map.has(market)) continue;
      const current = map.get(market);
      if (term.recommendedAction.startsWith('negative')) current.negativeWasteCop += term.estimatedWasteCop;
      if (['promote_exact', 'new_ad_group', 'new_landing'].includes(term.recommendedAction)) current.positiveTermCount += 1;
      const theme = term.destinationHints[0] || term.intent;
      current.topThemes.set(theme, (current.topThemes.get(theme) || 0) + term.cost);
    }
  }

  return [...map.values()].map((row) => {
    const themes = [...row.topThemes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([theme]) => theme).join(' | ');
    const action = chooseMarketAction(row);
    return {
      market: row.market,
      campaigns: [...row.campaigns].join(' | '),
      spendCop: round(row.spendCop),
      clicks: row.clicks,
      firstPartyLeads: row.firstPartyLeads,
      qualityLeads: row.qualityLeads,
      confirmedItineraries: row.confirmedItineraries,
      cplQuality: row.qualityLeads ? round(row.spendCop / row.qualityLeads) : null,
      negativeWasteCop: round(row.negativeWasteCop),
      positiveTermCount: row.positiveTermCount,
      topThemes: themes,
      recommendedAction: action.action,
      reason: action.reason,
    };
  }).sort((a, b) => b.spendCop - a.spendCop);
}

function chooseMarketAction(row) {
  if (row.qualityLeads > 0 && row.positiveTermCount >= 3 && row.negativeWasteCop < row.spendCop * 0.18) {
    return { action: 'scale', reason: 'market has quality leads and positive expansion themes' };
  }
  if (row.negativeWasteCop > row.spendCop * 0.25 && row.qualityLeads === 0) {
    return { action: 'tighten', reason: 'market spend is dominated by likely waste without quality leads' };
  }
  if (row.positiveTermCount >= 5) {
    return { action: 'rebuild_structure', reason: 'market has enough positive terms to split ad groups/landings' };
  }
  return { action: 'observe', reason: 'insufficient evidence for budget shift' };
}

function buildBudgetRules(campaignActions, marketInsights) {
  const scale = campaignActions.filter((row) => row.recommendedAction === 'scale');
  const leaks = campaignActions.filter((row) => ['budget_leak', 'pause_candidate'].includes(row.recommendedAction));
  return [
    {
      rule: 'No scaling without first-party quality',
      threshold: 'crmQualityScore >= 60 and traceabilityRate >= 0.45',
      action: 'increase budget gradually after negatives/landing fixes are queued',
      candidates: scale.map((row) => row.campaignName).slice(0, 10).join(' | '),
    },
    {
      rule: 'Contain waste before broadening match',
      threshold: 'negativeWasteCop > 18% of spend or campaignAction in budget_leak/pause_candidate',
      action: 'hold or reduce spend until negatives are reviewed and applied in a future change window',
      candidates: leaks.map((row) => row.campaignName).slice(0, 10).join(' | '),
    },
    {
      rule: 'Landing first for destination clusters',
      threshold: 'positiveTermCount >= 5 and landingGapCostCop material',
      action: 'build landing/ad group pair before increasing campaign daily budget',
      candidates: campaignActions.filter((row) => row.recommendedAction === 'landing_mismatch').map((row) => row.campaignName).slice(0, 10).join(' | '),
    },
    {
      rule: 'Market reallocation guardrail',
      threshold: 'qualityLeads > 0 and negativeWasteCop < 18% of spend at market level',
      action: 'prioritize incremental tests in these markets',
      candidates: marketInsights.filter((row) => row.recommendedAction === 'scale').map((row) => row.market).join(' | '),
    },
  ];
}

function buildTrackingChecklist(firstParty, unifiedLeads, landingChecks, googleAds) {
  const firstPartyCount = unifiedLeads.length;
  const clickIdCoverage = firstPartyCount ? unifiedLeads.filter((lead) => lead.gclid || lead.gbraid || lead.wbraid).length / firstPartyCount : 0;
  const utmCoverage = firstPartyCount ? unifiedLeads.filter((lead) => lead.utmSource || lead.utmMedium || lead.utmCampaign).length / firstPartyCount : 0;
  const referenceCoverage = firstPartyCount ? unifiedLeads.filter((lead) => lead.referenceCode).length / firstPartyCount : 0;
  const landingOk = landingChecks.length ? landingChecks.filter((check) => check.ok).length / landingChecks.length : 0;
  const landingTracking = landingChecks.length ? landingChecks.filter((check) => check.trackingPresent).length / landingChecks.length : 0;
  const adsConversionNames = unique(googleAds.conversionActionRows.map((row) => row.conversionActionName)).slice(0, 30);

  return [
    { item: 'gclid/gbraid/wbraid presence in first-party rows', status: clickIdCoverage >= 0.55 ? 'ok' : 'gap', coverage: clickIdCoverage, detail: `${Math.round(clickIdCoverage * 100)}% of unified first-party leads` },
    { item: 'UTM presence in first-party rows', status: utmCoverage >= 0.75 ? 'ok' : 'gap', coverage: utmCoverage, detail: `${Math.round(utmCoverage * 100)}% of unified first-party leads` },
    { item: 'reference_code presence', status: referenceCoverage >= 0.75 ? 'ok' : 'gap', coverage: referenceCoverage, detail: `${Math.round(referenceCoverage * 100)}% of unified first-party leads` },
    { item: 'landing URLs return 200/2xx', status: landingOk >= 0.98 ? 'ok' : 'gap', coverage: landingOk, detail: `${landingChecks.filter((check) => check.ok).length}/${landingChecks.length} sampled landings OK` },
    { item: 'landing tracking hooks detected', status: landingTracking >= 0.9 ? 'ok' : 'gap', coverage: landingTracking, detail: `${landingChecks.filter((check) => check.trackingPresent).length}/${landingChecks.length} sampled landings with hooks` },
    { item: 'Google Ads historical conversion actions', status: adsConversionNames.length ? 'context_only' : 'missing', coverage: adsConversionNames.length ? 1 : 0, detail: adsConversionNames.join(' | ') || 'No historical conversion actions returned in query.' },
    { item: 'WAFlow submit and CRM opportunity coverage', status: firstParty.waflowLeads.length || firstParty.requests.length ? 'ok' : 'gap', coverage: firstPartyCount ? 1 : 0, detail: `${firstParty.waflowLeads.length} waflow rows, ${firstParty.requests.length} requests, ${firstParty.funnelEvents.length} funnel events` },
  ];
}

function buildQaSample(searchTerms, negatives) {
  return {
    highSpendTermsForManualReview: searchTerms.slice(0, 100).map((row) => ({
      searchTerm: row.searchTerm,
      spendCop: row.cost,
      clicks: row.clicks,
      intent: row.intent,
      recommendedAction: row.recommendedAction,
      confidence: row.confidence,
    })),
    negativeTermsForManualReview: negatives.slice(0, 50).map((row) => ({
      keywordText: row.keywordText,
      matchType: row.matchType,
      estimatedWasteCop: row.estimatedWasteCop,
      intent: row.intent,
      confidence: row.confidence,
      reason: row.reason,
    })),
  };
}

function inferMarket(campaignName) {
  const text = campaignName || '';
  const prefix = text.match(/^([A-Z]{2})[_-]/);
  if (prefix) return prefix[1];
  const match = MARKET_HINTS.find((hint) => hint.regex.test(text));
  return match ? match.market : '';
}

function summarizeGoogleAdsExtraction(googleAds) {
  return {
    campaignRows: googleAds.campaignRows.length,
    campaigns: unique(googleAds.campaignRows.map((row) => row.campaignId)).length,
    adGroupRows: googleAds.adGroupRows.length,
    keywordRows: googleAds.keywordRows.length,
    searchTermRows: googleAds.searchTermRows.length,
    uniqueSearchTerms: aggregateSearchTerms(googleAds.searchTermRows).length,
    landingRows: googleAds.landingRows.length,
    adRows: googleAds.adRows.length,
    conversionActionRows: googleAds.conversionActionRows.length,
    deviceRows: googleAds.deviceRows.length,
    hourDayRows: googleAds.hourDayRows.length,
    geoRows: googleAds.geoRows.length,
    clickRows: googleAds.clickRows.length,
    spendCop: round(sum(googleAds.campaignRows.map((row) => row.cost))),
    clicks: sum(googleAds.campaignRows.map((row) => row.clicks)),
  };
}

function summarizeFirstPartyExtraction(firstParty) {
  return {
    requests: firstParty.requests.length,
    itineraries: firstParty.itineraries.length,
    funnelEvents: firstParty.funnelEvents.length,
    waflowLeads: firstParty.waflowLeads.length,
  };
}

function validateCoverage(googleAds, firstParty, unifiedLeads, landingChecks) {
  const monthlySpend = groupMonthlySpend(googleAds.campaignRows);
  const checks = [
    {
      check: 'Google Ads monthly spend/clicks',
      ok: monthlySpend.length > 0 && monthlySpend.some((row) => row.spendCop > 0 || row.clicks > 0),
      detail: `${monthlySpend.length} months with campaign rows`,
    },
    {
      check: 'Search terms with spend',
      ok: googleAds.searchTermRows.some((row) => row.cost > 0),
      detail: `${googleAds.searchTermRows.length} search term rows`,
    },
    {
      check: 'Campaign/ad group/keyword coverage',
      ok: googleAds.campaignRows.length > 0 && googleAds.adGroupRows.length > 0 && googleAds.keywordRows.length > 0,
      detail: `${googleAds.campaignRows.length}/${googleAds.adGroupRows.length}/${googleAds.keywordRows.length} campaign/adGroup/keyword rows`,
    },
    {
      check: 'Landing coverage and 200 validation sample',
      ok: googleAds.landingRows.length > 0 && landingChecks.every((check) => check.ok),
      detail: `${googleAds.landingRows.length} landing rows, ${landingChecks.filter((check) => check.ok).length}/${landingChecks.length} sampled OK`,
    },
    {
      check: 'First-party rows',
      ok: firstParty.requests.length > 0 || firstParty.funnelEvents.length > 0 || firstParty.waflowLeads.length > 0,
      detail: `${unifiedLeads.length} unified first-party leads`,
    },
    {
      check: 'Attribution bridge by click id/UTM/reference',
      ok: unifiedLeads.some((lead) => lead.gclid || lead.gbraid || lead.wbraid || lead.utmCampaign || lead.referenceCode),
      detail: `${unifiedLeads.filter((lead) => lead.gclid || lead.gbraid || lead.wbraid).length} with click id; ${unifiedLeads.filter((lead) => lead.utmCampaign).length} with UTM campaign; ${unifiedLeads.filter((lead) => lead.referenceCode).length} with reference_code`,
    },
  ];
  return { checks, monthlySpend };
}

function groupMonthlySpend(campaignRows) {
  const map = new Map();
  for (const row of campaignRows) {
    const month = String(row.date || '').slice(0, 7);
    if (!month) continue;
    if (!map.has(month)) map.set(month, { month, spendCop: 0, clicks: 0, campaigns: new Set() });
    const current = map.get(month);
    current.spendCop += row.cost;
    current.clicks += row.clicks;
    current.campaigns.add(row.campaignId);
  }
  return [...map.values()].map((row) => ({
    month: row.month,
    spendCop: round(row.spendCop),
    clicks: row.clicks,
    campaigns: row.campaigns.size,
  })).sort((a, b) => a.month.localeCompare(b.month));
}

async function writeOutputs(report, opts) {
  await fsp.mkdir(opts.outDir, { recursive: true });
  await fsp.mkdir(path.dirname(opts.docsOut), { recursive: true });

  const files = {
    json: path.join(opts.outDir, 'mining-report.json'),
    negatives: path.join(opts.outDir, 'negative-keywords.csv'),
    positives: path.join(opts.outDir, 'positive-search-terms.csv'),
    campaigns: path.join(opts.outDir, 'campaign-actions.csv'),
    landings: path.join(opts.outDir, 'landing-opportunities.csv'),
    markets: path.join(opts.outDir, 'market-insights.csv'),
  };

  await fsp.writeFile(files.json, `${JSON.stringify(report, null, 2)}\n`);
  await fsp.writeFile(files.negatives, toCsv(report.analysis.negativeKeywords));
  await fsp.writeFile(files.positives, toCsv(report.analysis.positiveSearchTerms));
  await fsp.writeFile(files.campaigns, toCsv(report.analysis.campaignActions));
  await fsp.writeFile(files.landings, toCsv(report.analysis.landingOpportunities));
  await fsp.writeFile(files.markets, toCsv(report.analysis.marketInsights));
  await fsp.writeFile(opts.docsOut, renderMarkdownReport(report, files));

  console.log(JSON.stringify({
    status: 'ok',
    readOnly: true,
    mode: report.meta.mode,
    artifacts: files,
    docsOut: opts.docsOut,
    summary: {
      spendCop: report.extraction.googleAds.spendCop,
      searchTerms: report.extraction.googleAds.uniqueSearchTerms,
      negativeRecommendations: report.analysis.negativeKeywords.length,
      positiveRecommendations: report.analysis.positiveSearchTerms.length,
      campaignActions: report.analysis.campaignActions.length,
      landingOpportunities: report.analysis.landingOpportunities.length,
    },
  }, null, 2));
}

function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')).join('\n')}\n`;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function renderMarkdownReport(report, files) {
  const checks = report.validation.checks.map((check) => `- ${check.ok ? '[ok]' : '[gap]'} ${check.check}: ${check.detail}`).join('\n');
  const topNegatives = renderMarkdownTable(report.analysis.negativeKeywords.slice(0, 20), ['keywordText', 'matchType', 'estimatedWasteCop', 'intent', 'confidence', 'campaigns']);
  const topPositives = renderMarkdownTable(report.analysis.positiveSearchTerms.slice(0, 20), ['searchTerm', 'action', 'spendCop', 'intent', 'intentScore', 'expansionScore', 'suggestedAdGroup']);
  const campaignActions = renderMarkdownTable(report.analysis.campaignActions.slice(0, 20), ['campaignName', 'market', 'spendCop', 'qualityLeads', 'negativeWasteCop', 'recommendedAction', 'reason']);
  const landingActions = renderMarkdownTable(report.analysis.landingOpportunities.slice(0, 20), ['landingUrl', 'spendCop', 'status', 'trackingPresent', 'recommendedAction', 'reason']);
  const marketInsights = renderMarkdownTable(report.analysis.marketInsights, ['market', 'spendCop', 'qualityLeads', 'negativeWasteCop', 'positiveTermCount', 'recommendedAction']);
  const tracking = renderMarkdownTable(report.analysis.trackingChecklist, ['item', 'status', 'coverage', 'detail']);

  return `# ColombiaTours Paid Search 24m Historical Mining\n\nGenerated: ${report.meta.generatedAt}\nWindow: ${report.meta.fromDate} to ${report.meta.toDate} (${report.meta.months} months)\nMode: ${report.meta.mode}\nRead-only: ${report.meta.readOnly}\n\n## Executive Summary\n\n- Google Ads spend reviewed: COP ${currency(report.extraction.googleAds.spendCop)} across ${report.extraction.googleAds.campaigns} campaigns and ${report.extraction.googleAds.uniqueSearchTerms} unique search terms.\n- First-party rows reviewed: ${report.extraction.firstParty.requests} requests, ${report.extraction.firstParty.itineraries} itineraries, ${report.extraction.firstParty.funnelEvents} funnel events, ${report.extraction.firstParty.waflowLeads} WAFlow leads.\n- Recommended negatives: ${report.analysis.negativeKeywords.length}. Estimated waste in recommended negatives: COP ${currency(sum(report.analysis.negativeKeywords.map((row) => row.estimatedWasteCop)))}.\n- Positive structural opportunities: ${report.analysis.positiveSearchTerms.length}. Campaign action rows: ${report.analysis.campaignActions.length}. Landing rows: ${report.analysis.landingOpportunities.length}.\n- Historical Google Ads conversions were treated as context only; first-party WAFlow, CRM and itinerary signals drive quality scoring.\n\n## Validation\n\n${checks}\n\n## Tracking Checklist\n\n${tracking}\n\n## Campaign Actions\n\n${campaignActions}\n\n## Negative Keywords - Review Queue\n\n${topNegatives}\n\n## Positive Search Terms - Build Queue\n\n${topPositives}\n\n## Landing Opportunities\n\n${landingActions}\n\n## Market Insights\n\n${marketInsights}\n\n## Budget Rules\n\n${report.analysis.budgetRules.map((rule) => `- ${rule.rule}: ${rule.threshold}. Action: ${rule.action}. Candidates: ${rule.candidates || 'none'}`).join('\n')}\n\n## QA Required Before Any Future Mutations\n\n- Review the first 100 high-spend terms in \`mining-report.json.analysis.qaSample.highSpendTermsForManualReview\`.\n- Review the first 50 negative recommendations in \`mining-report.json.analysis.qaSample.negativeTermsForManualReview\`.\n- Confirm negatives manually before any future Google Ads mutation script is considered.\n- Confirm landing URLs and tracking hooks for every \`fix_url\` or \`tracking_fix\` row.\n\n## Local Artifacts\n\n- JSON: \`${files.json}\`\n- Negatives CSV: \`${files.negatives}\`\n- Positives CSV: \`${files.positives}\`\n- Campaign actions CSV: \`${files.campaigns}\`\n- Landing opportunities CSV: \`${files.landings}\`\n- Market insights CSV: \`${files.markets}\`\n\n## Query / Classification Notes\n\n- LLM enabled: ${report.meta.llm.enabled}. Model: ${report.meta.llm.model || 'n/a'}. Classified: ${report.meta.llm.classified}. From cache: ${report.meta.llm.fromCache}.\n- Query errors: ${report.extraction.queryErrors.length ? report.extraction.queryErrors.join(' | ') : 'none'}\n`;
}

function renderMarkdownTable(rows, columns) {
  if (!rows.length) return '_No rows._';
  const header = `| ${columns.join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => markdownCell(row[column])).join(' | ')} |`).join('\n');
  return `${header}\n${divider}\n${body}`;
}

function markdownCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  return compactText(String(value).replace(/\|/g, '/'), 140);
}

function printDryRunSummary(report) {
  const summary = {
    status: 'dry_run_ok',
    readOnly: true,
    filesWritten: false,
    window: `${report.meta.fromDate}..${report.meta.toDate}`,
    googleAds: report.extraction.googleAds,
    firstParty: report.extraction.firstParty,
    validation: report.validation.checks,
    topCampaignActions: report.analysis.campaignActions.slice(0, 10),
    topNegatives: report.analysis.negativeKeywords.slice(0, 10),
    topPositives: report.analysis.positiveSearchTerms.slice(0, 10),
    queryErrors: report.extraction.queryErrors,
    llm: report.meta.llm,
  };
  console.log(JSON.stringify(summary, null, 2));
}

function round(value) {
  return Math.round(number(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

main().catch((error) => {
  console.error(`[historical-mining] failed: ${redact(error.stack || error.message || String(error))}`);
  process.exit(1);
});
