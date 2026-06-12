#!/usr/bin/env node

const fsp = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');
const {
  loadDotEnvFile,
  stripCustomerId,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_CAMPAIGN_IDS = [
  '23843668228', // BR_Search_Colombia_Packages_2026_05
  '23833803528', // AR_Search_Colombia_Packages_2026_05
  '23833804680', // FR_Search_Colombie_Sur_Mesure_2026_05
  '23843667802', // DE_Search_Kolumbien_Rundreise_2026_05
  '23815528484', // MX_Multidestino_y_Caribe_2026_05
  '23819986291', // ES_Cartagena_Medellin_2026_05
  '23829507075', // CL_Search_Colombia_SanAndres_2026_05
  '23829536568', // US_Search_Colombia_Travel_Packages_2026_05
];

function parseArgs(argv) {
  const args = {
    days: 5,
    out: path.join(
      'artifacts',
      'google-ads',
      '2026-05-18-colombiatours-5d-search-review',
      'search-inspector.json',
    ),
    campaignIds: DEFAULT_CAMPAIGN_IDS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--days') {
      args.days = Number(next);
      i += 1;
    } else if (arg === '--out') {
      args.out = next;
      i += 1;
    } else if (arg === '--campaign-ids') {
      args.campaignIds = next.split(',').map((value) => value.trim()).filter(Boolean);
      i += 1;
    }
  }

  if (!Number.isFinite(args.days) || args.days < 1) {
    throw new Error('--days must be a positive number');
  }
  return args;
}

async function main() {
  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));

  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date();
  const fromDate = isoDate(new Date(generatedAt.getTime() - (args.days - 1) * 24 * 60 * 60 * 1000));
  const toDate = isoDate(generatedAt);
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v24';
  assertGoogleAdsEnv();
  const accessToken = await getAccessToken();
  const ids = args.campaignIds.map((id) => String(id).replace(/\D/g, '')).filter(Boolean);
  const idList = ids.join(', ');

  const [campaigns, adGroups, keywords, searchTerms, ads, conversionActions] = await Promise.all([
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.final_url_suffix,
          campaign.tracking_url_template,
          campaign_budget.amount_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions
        FROM campaign
        WHERE campaign.id IN (${idList})
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
      `,
    }),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions
        FROM ad_group
        WHERE campaign.id IN (${idList})
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY metrics.cost_micros DESC
      `,
    }),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
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
          metrics.conversions,
          metrics.all_conversions
        FROM keyword_view
        WHERE campaign.id IN (${idList})
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 500
      `,
    }),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          campaign_search_term_view.search_term,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions
        FROM campaign_search_term_view
        WHERE campaign.id IN (${idList})
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
          AND metrics.clicks > 0
        ORDER BY metrics.cost_micros DESC
        LIMIT 500
      `,
    }),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          ad_group_ad.ad.id,
          ad_group_ad.status,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.final_url_suffix,
          ad_group_ad.ad.tracking_url_template,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM ad_group_ad
        WHERE campaign.id IN (${idList})
          AND ad_group_ad.status != 'REMOVED'
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 500
      `,
    }).catch((error) => [{ error: error.message }]),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          campaign.id,
          campaign.name,
          segments.conversion_action_name,
          metrics.conversions,
          metrics.all_conversions
        FROM campaign
        WHERE campaign.id IN (${idList})
          AND segments.date BETWEEN '${fromDate}' AND '${toDate}'
      `,
    }).catch((error) => [{ error: error.message }]),
  ]);

  const landingUrls = unique(
    ads
      .flatMap((row) => row.adGroupAd?.ad?.finalUrls || [])
      .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)),
  );
  const landingChecks = await Promise.all(landingUrls.map(checkLandingUrl));

  const report = {
    generatedAt: generatedAt.toISOString(),
    mode: 'read_only_search_inspector',
    window: { days: args.days, fromDate, toDate },
    campaigns: campaigns.map(mapCampaign),
    adGroups: adGroups.map(mapAdGroup),
    keywords: keywords.map(mapKeyword),
    searchTerms: searchTerms.map(mapSearchTerm),
    ads: ads.map(mapAd),
    conversionActions: conversionActions.map(mapConversionAction),
    landingChecks,
  };

  await fsp.mkdir(path.dirname(args.out), { recursive: true });
  await fsp.writeFile(args.out, `${JSON.stringify(redact(report), null, 2)}\n`);

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    window: report.window,
    counts: {
      campaigns: report.campaigns.length,
      adGroups: report.adGroups.length,
      keywords: report.keywords.length,
      searchTerms: report.searchTerms.length,
      ads: report.ads.length,
      landingChecks: report.landingChecks.length,
    },
    spendCop: sum(report.campaigns.map((row) => row.spendCop)),
    out: args.out,
  }, null, 2));
}

function assertGoogleAdsEnv() {
  const missing = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
  ].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing Google Ads env vars: ${missing.join(', ')}`);
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
  return body.access_token;
}

async function searchGoogleAds({ apiVersion, accessToken, query }) {
  const customerId = stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': stripCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    throw new Error(`Google Ads searchStream failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  }
  return (parsed || []).flatMap((chunk) => chunk.results || []);
}

async function checkLandingUrl(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      hasTrackingInUrl: hasTracking(url),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      finalUrl: null,
      error: error.message,
      hasTrackingInUrl: hasTracking(url),
    };
  }
}

function mapCampaign(row) {
  return {
    id: row.campaign?.id ?? null,
    name: row.campaign?.name ?? null,
    status: row.campaign?.status ?? null,
    channel: row.campaign?.advertisingChannelType ?? null,
    dailyBudgetCop: microsToCop(row.campaignBudget?.amountMicros),
    spendCop: microsToCop(row.metrics?.costMicros),
    impressions: number(row.metrics?.impressions),
    clicks: number(row.metrics?.clicks),
    conversions: number(row.metrics?.conversions),
    allConversions: number(row.metrics?.allConversions),
    finalUrlSuffix: row.campaign?.finalUrlSuffix ?? null,
    trackingUrlTemplate: row.campaign?.trackingUrlTemplate ?? null,
    hasCampaignTracking: hasTracking(row.campaign?.finalUrlSuffix) || hasTracking(row.campaign?.trackingUrlTemplate),
  };
}

function mapAdGroup(row) {
  return {
    campaignId: row.campaign?.id ?? null,
    campaign: row.campaign?.name ?? null,
    adGroupId: row.adGroup?.id ?? null,
    adGroup: row.adGroup?.name ?? null,
    status: row.adGroup?.status ?? null,
    spendCop: microsToCop(row.metrics?.costMicros),
    impressions: number(row.metrics?.impressions),
    clicks: number(row.metrics?.clicks),
    conversions: number(row.metrics?.conversions),
    allConversions: number(row.metrics?.allConversions),
  };
}

function mapKeyword(row) {
  return {
    campaignId: row.campaign?.id ?? null,
    campaign: row.campaign?.name ?? null,
    adGroupId: row.adGroup?.id ?? null,
    adGroup: row.adGroup?.name ?? null,
    criterionId: row.adGroupCriterion?.criterionId ?? null,
    status: row.adGroupCriterion?.status ?? null,
    keyword: row.adGroupCriterion?.keyword?.text ?? null,
    matchType: row.adGroupCriterion?.keyword?.matchType ?? null,
    spendCop: microsToCop(row.metrics?.costMicros),
    impressions: number(row.metrics?.impressions),
    clicks: number(row.metrics?.clicks),
    conversions: number(row.metrics?.conversions),
    allConversions: number(row.metrics?.allConversions),
  };
}

function mapSearchTerm(row) {
  return {
    campaignId: row.campaign?.id ?? null,
    campaign: row.campaign?.name ?? null,
    adGroupId: row.adGroup?.id ?? null,
    adGroup: row.adGroup?.name ?? null,
    searchTerm: row.campaignSearchTermView?.searchTerm ?? null,
    spendCop: microsToCop(row.metrics?.costMicros),
    impressions: number(row.metrics?.impressions),
    clicks: number(row.metrics?.clicks),
    conversions: number(row.metrics?.conversions),
    allConversions: number(row.metrics?.allConversions),
    intent: classifySearchTerm(row.campaignSearchTermView?.searchTerm),
  };
}

function mapAd(row) {
  const finalUrls = row.adGroupAd?.ad?.finalUrls || [];
  return {
    campaignId: row.campaign?.id ?? null,
    campaign: row.campaign?.name ?? null,
    adGroupId: row.adGroup?.id ?? null,
    adGroup: row.adGroup?.name ?? null,
    adId: row.adGroupAd?.ad?.id ?? null,
    status: row.adGroupAd?.status ?? null,
    finalUrls,
    adFinalUrlSuffix: row.adGroupAd?.ad?.finalUrlSuffix ?? null,
    adTrackingUrlTemplate: row.adGroupAd?.ad?.trackingUrlTemplate ?? null,
    hasAdTracking: finalUrls.some(hasTracking) ||
      hasTracking(row.adGroupAd?.ad?.finalUrlSuffix) ||
      hasTracking(row.adGroupAd?.ad?.trackingUrlTemplate),
    spendCop: microsToCop(row.metrics?.costMicros),
    impressions: number(row.metrics?.impressions),
    clicks: number(row.metrics?.clicks),
  };
}

function mapConversionAction(row) {
  return {
    campaignId: row.campaign?.id ?? null,
    campaign: row.campaign?.name ?? null,
    conversionActionName: row.segments?.conversionActionName ?? null,
    conversions: number(row.metrics?.conversions),
    allConversions: number(row.metrics?.allConversions),
  };
}

function classifySearchTerm(value) {
  const term = String(value || '').toLowerCase();
  if (!term) return 'unknown';
  if (/(vuelo|vuelos|aerol[ií]nea|tiquete|tiquetes|boleto|boletos|pasaje|pasajes)/i.test(term)) return 'negative_transport';
  if (/(hotel|hoteles|hostal|alojamiento|resort)/i.test(term)) return 'negative_hotel_only';
  if (/(trabajo|empleo|visa|migraci[oó]n|mapa|clima|hora)/i.test(term)) return 'negative_non_travel_package';
  if (/(2x1|barat|gratis|descuento|oferta)/i.test(term)) return 'price_sensitive';
  if (/(paquete|paquetes|tour|tours|viaje|viajes|agencia|todo incluido|plan|planes)/i.test(term)) return 'commercial';
  return 'watch';
}

function hasTracking(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('utm_source=google') &&
    text.includes('utm_medium=cpc') &&
    (text.includes('gclid') || text.includes('{gclid}') || text.includes('gbraid') || text.includes('wbraid'));
}

function microsToCop(value) {
  return Math.round(Number(value || 0) / 1_000_000);
}

function number(value) {
  return Number(value || 0);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function unique(values) {
  return [...new Set(values)];
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
