#!/usr/bin/env node

const fsp = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');
const { createClient } = require('@supabase/supabase-js');
const {
  loadDotEnvFile,
  stripCustomerId,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const DEFAULT_WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const DEFAULT_WINDOWS = [7, 30, 90];
const TARGET_QUALITY_LEADS_PER_DAY = 10;
const TARGET_CPL_COP = { min: 40_000, max: 60_000 };
const SECRET_KEY_PATTERN = /(email|phone|name|token|secret|authorization|password|credential|refresh)/i;

const COMMERCIAL_INTENT_KEYWORDS = [
  'agencia',
  'paquete',
  'paquetes',
  'tour',
  'tours',
  'todo incluido',
  'vacaciones',
  'viaje',
  'viajes',
  'travel package',
  'vacation package',
  'private tour',
  'luxury travel',
];

const HARD_NEGATIVE_THEMES = [
  'vuelos',
  'aerolinea',
  'aerolínea',
  'boleto',
  'ticket',
  'empleo',
  'trabajo',
  'migracion',
  'migración',
  'visa',
  'mapa',
  'clima',
  'hora',
  'hoteles',
  'hotel',
  'hostal',
  'civitatis',
];

function parseArgs(argv) {
  const args = {
    accountId: DEFAULT_ACCOUNT_ID,
    websiteId: DEFAULT_WEBSITE_ID,
    windows: DEFAULT_WINDOWS,
    outDir: path.join('artifacts', 'google-ads', `${dateStamp()}-colombiatours-crm-growth-study`),
    docsOut: path.join('docs', 'audits', `${dateStamp()}-google-ads-crm-growth-study.md`),
    includeGoogleAds: true,
    includeClickView: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--account-id') args.accountId = next, i += 1;
    else if (arg === '--website-id') args.websiteId = next, i += 1;
    else if (arg === '--windows') args.windows = next.split(',').map((value) => Number(value.trim())).filter(Boolean), i += 1;
    else if (arg === '--out-dir') args.outDir = next, i += 1;
    else if (arg === '--docs-out') args.docsOut = next, i += 1;
    else if (arg === '--no-google-ads') args.includeGoogleAds = false;
    else if (arg === '--no-click-view') args.includeClickView = false;
  }
  return args;
}

async function main() {
  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  const args = parseArgs(process.argv.slice(2));

  assertSupabaseEnv();
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const generatedAt = new Date();
  const maxWindow = Math.max(...args.windows);
  const since = new Date(generatedAt.getTime() - maxWindow * 24 * 60 * 60 * 1000);

  const [website, requests, itineraries, funnelEvents, waflowLeads] = await Promise.all([
    single(
      sb
        .from('websites')
        .select('id, account_id, subdomain, status')
        .eq('id', args.websiteId),
      'website',
    ),
    fetchAll(
      sb
        .from('requests')
        .select('*')
        .eq('account_id', args.accountId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true }),
      'requests',
    ),
    fetchAll(
      sb
        .from('itineraries')
        .select('*')
        .eq('account_id', args.accountId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true }),
      'itineraries',
    ),
    fetchAll(
      sb
        .from('funnel_events')
        .select([
          'event_id',
          'event_name',
          'stage',
          'channel',
          'reference_code',
          'account_id',
          'website_id',
          'occurred_at',
          'created_at',
          'source_url',
          'page_path',
          'dispatch_status',
          'gclid',
          'gbraid',
          'wbraid',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'utm_term',
          'utm_content',
          'value_amount',
          'value_currency',
          'payload',
          'attribution',
        ].join(','))
        .eq('account_id', args.accountId)
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: true }),
      'funnel_events',
    ),
    fetchAll(
      sb
        .from('waflow_leads')
        .select([
          'id',
          'website_id',
          'reference_code',
          'session_key',
          'created_at',
          'submitted_at',
          'whatsapp_redirected_at',
          'chatwoot_conversation_id',
          'chatwoot_custom_attributes',
          'payload',
        ].join(','))
        .eq('website_id', args.websiteId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true }),
      'waflow_leads',
    ),
  ]);

  const googleAds = args.includeGoogleAds
    ? await fetchGoogleAdsData({
        since,
        windows: args.windows,
        gclids: collectGclids(funnelEvents, requests),
        includeClickView: args.includeClickView,
      }).catch((error) => ({
        ok: false,
        error: error.message,
        redacted: redact(error),
        campaignDaily: [],
        searchTerms: [],
        landingPages: [],
        clickMap: new Map(),
      }))
    : {
        ok: false,
        error: 'google_ads_disabled_by_flag',
        campaignDaily: [],
        searchTerms: [],
        landingPages: [],
        clickMap: new Map(),
      };

  const unifiedLeads = buildUnifiedLeads({
    requests,
    itineraries,
    funnelEvents,
    waflowLeads,
    clickMap: googleAds.clickMap ?? new Map(),
  });

  const report = buildReport({
    generatedAt,
    args,
    website,
    since,
    requests,
    itineraries,
    funnelEvents,
    waflowLeads,
    googleAds,
    unifiedLeads,
  });

  await fsp.mkdir(args.outDir, { recursive: true });
  await fsp.mkdir(path.dirname(args.docsOut), { recursive: true });

  const jsonPath = path.join(args.outDir, 'colombiatours-crm-growth-study.json');
  const leadsPath = path.join(args.outDir, 'unified-leads.redacted.json');
  await fsp.writeFile(jsonPath, `${JSON.stringify(redactReport(report), null, 2)}\n`);
  await fsp.writeFile(leadsPath, `${JSON.stringify(unifiedLeads.map(redactLead), null, 2)}\n`);
  await fsp.writeFile(args.docsOut, renderMarkdown(report));

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    website: report.website,
    windows: report.windows.map((window) => ({
      days: window.days,
      qualityLeads: window.firstParty.qualityLeads,
      confirmedItineraries: window.firstParty.confirmedItineraries,
      googleSpendCop: window.googleAds.spendCop,
      observedQualityCplCop: window.googleAds.observedQualityCplCop,
    })),
    recommendation: report.recommendation.summary,
    artifacts: {
      json: jsonPath,
      unifiedLeads: leadsPath,
      markdown: args.docsOut,
    },
  }, null, 2));
}

function assertSupabaseEnv() {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing Supabase env vars: ${missing.join(', ')}`);
}

async function fetchGoogleAdsData({ since, windows, gclids, includeClickView }) {
  const missing = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    'GOOGLE_ADS_CUSTOMER_ID',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
  ].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing Google Ads env vars: ${missing.join(', ')}`);
  }

  const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v24';
  const accessToken = await getGoogleAccessToken();
  const fromDate = isoDate(since);
  const toDate = isoDate(new Date());
  const minWindowStart = isoDate(new Date(Date.now() - Math.max(...windows) * 24 * 60 * 60 * 1000));

  const [campaignDaily, searchTerms, landingPages, clickRows] = await Promise.all([
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
          AND campaign.status != 'REMOVED'
        ORDER BY segments.date DESC
      `,
    }),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          segments.date,
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
        WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
          AND metrics.clicks > 0
        ORDER BY metrics.cost_micros DESC
        LIMIT 5000
      `,
    }).catch((error) => [{ error: error.message }]),
    searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          expanded_landing_page_view.expanded_final_url,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions
        FROM expanded_landing_page_view
        WHERE segments.date BETWEEN '${fromDate}' AND '${toDate}'
          AND metrics.clicks > 0
        ORDER BY metrics.cost_micros DESC
        LIMIT 2000
      `,
    }).catch((error) => [{ error: error.message }]),
    includeClickView && gclids.length
      ? fetchClickViewRows({ apiVersion, accessToken, gclids, minWindowStart, toDate })
      : Promise.resolve([]),
  ]);

  const clickMap = new Map();
  for (const row of clickRows) {
    const gclid = row.clickView?.gclid;
    if (!gclid) continue;
    clickMap.set(gclid, {
      campaignId: row.campaign?.id ?? null,
      campaignName: row.campaign?.name ?? null,
      adGroupId: row.adGroup?.id ?? null,
      adGroupName: row.adGroup?.name ?? null,
      date: row.segments?.date ?? null,
      device: row.segments?.device ?? null,
    });
  }

  return {
    ok: true,
    apiVersion,
    customerId: stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
    loginCustomerId: stripCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
    campaignDaily,
    searchTerms,
    landingPages,
    clickMap,
    clickViewMatchedGclids: clickMap.size,
  };
}

async function fetchClickViewRows({ apiVersion, accessToken, gclids, minWindowStart, toDate }) {
  const rows = [];
  const unique = [...new Set(gclids)].filter(Boolean);
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const quoted = batch.map((gclid) => `'${String(gclid).replaceAll("'", "\\'")}'`).join(', ');
    const batchRows = await searchGoogleAds({
      apiVersion,
      accessToken,
      query: `
        SELECT
          click_view.gclid,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name,
          segments.date,
          segments.device
        FROM click_view
        WHERE segments.date BETWEEN '${minWindowStart}' AND '${toDate}'
          AND click_view.gclid IN (${quoted})
      `,
    }).catch((error) => [{ error: error.message }]);
    rows.push(...batchRows);
  }
  return rows;
}

async function getGoogleAccessToken() {
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

async function single(query, label) {
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`${label} fetch failed: ${error.message}`);
  if (!data) throw new Error(`${label} not found`);
  return data;
}

function buildUnifiedLeads({ requests, itineraries, funnelEvents, waflowLeads, clickMap }) {
  const eventsByRef = groupBy(funnelEvents, (event) => clean(event.reference_code));
  const eventsByChatwoot = groupBy(funnelEvents, (event) => clean(extractFirst(event.payload, ['chatwoot_conversation_id', 'conversation_id'])));
  const leadsByRef = groupBy(waflowLeads, (lead) => clean(lead.reference_code));
  const leadsByChatwoot = groupBy(waflowLeads, (lead) => clean(lead.chatwoot_conversation_id));
  const itinerariesByRequest = groupBy(itineraries, (itinerary) => clean(itinerary.request_id ?? itinerary.source_request_id));
  const itinerariesByItineraryId = groupBy(itineraries, (itinerary) => clean(itinerary.id));
  const itinerariesByChatwoot = groupBy(itineraries, (itinerary) => clean(itinerary.chatwoot_conversation_id));
  const requestsById = new Map(requests.map((request) => [clean(request.id), request]));

  const rows = [];
  const seen = new Set();

  for (const request of requests) {
    const refs = extractRefs(request).filter(Boolean);
    const chatwoot = clean(request.chatwoot_conversation_id);
    const matchedEvents = uniqueBy([
      ...refs.flatMap((ref) => eventsByRef.get(ref) || []),
      ...(chatwoot ? eventsByChatwoot.get(chatwoot) || [] : []),
    ], (event) => event.event_id);
    const matchedLeads = uniqueBy([
      ...refs.flatMap((ref) => leadsByRef.get(ref) || []),
      ...(chatwoot ? leadsByChatwoot.get(chatwoot) || [] : []),
    ], (lead) => lead.id);
    const matchedItineraries = uniqueBy([
      ...(itinerariesByRequest.get(clean(request.id)) || []),
      ...(request.itinerary_id ? itinerariesByItineraryId.get(clean(request.itinerary_id)) || [] : []),
      ...(chatwoot ? itinerariesByChatwoot.get(chatwoot) || [] : []),
    ], (itinerary) => itinerary.id);

    const row = buildLeadRow({
      request,
      events: matchedEvents,
      waflowLeads: matchedLeads,
      itineraries: matchedItineraries,
      clickMap,
      attributionMethod: refs.length ? 'request_reference_code' : chatwoot ? 'chatwoot_conversation_id' : 'request_only',
    });
    rows.push(row);
    seen.add(`request:${request.id}`);
    for (const event of matchedEvents) seen.add(`event:${event.event_id}`);
    for (const lead of matchedLeads) seen.add(`waflow:${lead.id}`);
  }

  for (const lead of waflowLeads) {
    if (seen.has(`waflow:${lead.id}`)) continue;
    const ref = clean(lead.reference_code);
    const chatwoot = clean(lead.chatwoot_conversation_id);
    const matchedEvents = uniqueBy([
      ...(ref ? eventsByRef.get(ref) || [] : []),
      ...(chatwoot ? eventsByChatwoot.get(chatwoot) || [] : []),
    ], (event) => event.event_id);
    rows.push(buildLeadRow({
      request: null,
      events: matchedEvents,
      waflowLeads: [lead],
      itineraries: [],
      clickMap,
      attributionMethod: ref ? 'waflow_reference_code' : 'waflow_only',
    }));
    seen.add(`waflow:${lead.id}`);
    for (const event of matchedEvents) seen.add(`event:${event.event_id}`);
  }

  for (const event of funnelEvents) {
    if (seen.has(`event:${event.event_id}`)) continue;
    rows.push(buildLeadRow({
      request: null,
      events: [event],
      waflowLeads: [],
      itineraries: [],
      clickMap,
      attributionMethod: 'funnel_event_only',
    }));
  }

  return rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function buildLeadRow({ request, events, waflowLeads, itineraries, clickMap, attributionMethod }) {
  const firstEvent = minBy(events, (event) => event.occurred_at ?? event.created_at);
  const firstLead = minBy(waflowLeads, (lead) => lead.created_at);
  const createdAt = request?.created_at ?? firstLead?.created_at ?? firstEvent?.occurred_at ?? null;
  const refs = unique([
    ...extractRefs(request),
    ...events.map((event) => event.reference_code),
    ...waflowLeads.map((lead) => lead.reference_code),
  ].filter(Boolean));
  const eventNames = unique(events.map((event) => event.event_name).filter(Boolean));
  const gclid = firstNonEmpty([
    request?.custom_fields?.gclid,
    request?.custom_fields?.google_ads_gclid,
    ...events.map((event) => event.gclid),
    ...waflowLeads.map((lead) => extractFirst(lead.payload, ['gclid'])),
  ]);
  const click = gclid ? clickMap.get(gclid) : null;
  const attribution = resolveAttribution({ request, events, waflowLeads, click });
  const quality = isQualityLead({ request, events });
  const confirmed = itineraries.some(isConfirmedItinerary);
  const confirmedItinerary = itineraries.find(isConfirmedItinerary) ?? null;

  return {
    requestId: request?.id ?? null,
    requestShortId: request?.short_id ?? null,
    referenceCodes: refs,
    chatwootConversationId: request?.chatwoot_conversation_id ?? firstNonEmpty(waflowLeads.map((lead) => lead.chatwoot_conversation_id)) ?? null,
    createdAt,
    attributionMethod,
    attribution,
    syntheticTest: isSyntheticTest({ request, events, waflowLeads, attribution, refs }),
    eventNames,
    hasWaflowSubmit: eventNames.includes('waflow_submit') || waflowLeads.some((lead) => lead.submitted_at),
    hasWhatsappClick: eventNames.includes('whatsapp_cta_click') || waflowLeads.some((lead) => lead.whatsapp_redirected_at),
    qualityLead: quality,
    qualityReason: qualityReason({ request, events }),
    confirmedItinerary: confirmed,
    requestStage: request?.request_stage ?? null,
    pipelineStatus: request?.pipeline_status ?? null,
    leadScore: request?.lead_score ?? null,
    leadScoreLabel: request?.lead_score_label ?? null,
    firstResponseSeconds: request?.ttfr_seconds ?? null,
    destinations: normalizeList(request?.destinations ?? confirmedItinerary?.destinations),
    originCity: request?.origin_city ?? confirmedItinerary?.origin_city ?? null,
    tripType: request?.trip_type ?? confirmedItinerary?.trip_type ?? null,
    budget: toNumber(request?.budget),
    expectedValue: toNumber(request?.expected_value),
    itineraryIds: itineraries.map((itinerary) => itinerary.id),
    confirmedItineraryValue: confirmedItinerary ? toNumber(confirmedItinerary.total_amount) : null,
    confirmedItineraryMarkup: confirmedItinerary ? toNumber(confirmedItinerary.total_markup) : null,
    confirmedCurrency: confirmedItinerary?.currency_type ?? confirmedItinerary?.currency ?? null,
    gclid,
    gbraid: firstNonEmpty(events.map((event) => event.gbraid)),
    wbraid: firstNonEmpty(events.map((event) => event.wbraid)),
    landingUrl: attribution.landingUrl,
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    campaignId: attribution.campaignId,
    adGroup: attribution.adGroup,
    adGroupId: attribution.adGroupId,
  };
}

function resolveAttribution({ request, events, waflowLeads, click }) {
  const source = firstNonEmpty([
    click ? 'google' : null,
    request?.utm_source,
    ...events.map((event) => event.utm_source),
    ...waflowLeads.map((lead) => extractFirst(lead.payload, ['utm_source'])),
    request?.lead_source,
  ]);
  const medium = firstNonEmpty([
    click ? 'cpc' : null,
    request?.utm_medium,
    ...events.map((event) => event.utm_medium),
    ...waflowLeads.map((lead) => extractFirst(lead.payload, ['utm_medium'])),
  ]);
  const campaign = firstNonEmpty([
    click?.campaignName,
    request?.utm_campaign,
    ...events.map((event) => event.utm_campaign),
    ...waflowLeads.map((lead) => extractFirst(lead.payload, ['utm_campaign'])),
  ]);
  const landingUrl = firstNonEmpty([
    request?.landing_url,
    ...events.map((event) => event.source_url),
    ...waflowLeads.map((lead) => extractFirst(lead.payload, ['landing_url', 'source_url', 'page_url'])),
  ]);

  return {
    source: source ?? classifySource({ request, events, waflowLeads }),
    medium: medium ?? null,
    campaign: campaign ?? null,
    campaignId: click?.campaignId ?? null,
    adGroup: click?.adGroupName ?? null,
    adGroupId: click?.adGroupId ?? null,
    landingUrl: landingUrl ?? null,
  };
}

function buildReport({ generatedAt, args, website, since, requests, itineraries, funnelEvents, waflowLeads, googleAds, unifiedLeads }) {
  const campaignSpend = aggregateGoogleCampaignSpend(googleAds.campaignDaily || []);
  const windows = args.windows.map((days) => {
    const start = new Date(generatedAt.getTime() - days * 24 * 60 * 60 * 1000);
    const leads = unifiedLeads.filter((lead) => lead.createdAt && new Date(lead.createdAt) >= start);
    const productionLeads = leads.filter((lead) => !lead.syntheticTest);
    const events = funnelEvents.filter((event) => event.occurred_at && new Date(event.occurred_at) >= start);
    const windowCampaignSpend = filterCampaignSpendByWindow(googleAds.campaignDaily || [], start);
    const googleSpendCop = sum(windowCampaignSpend.map((row) => microsToCop(row.metrics?.costMicros)));
    const googleAttributedQuality = productionLeads.filter((lead) => isGoogleAttributed(lead) && lead.qualityLead).length;

    return {
      days,
      start: start.toISOString(),
      firstParty: summarizeFirstParty(leads, events),
      googleAds: {
        spendCop: round(googleSpendCop),
        clicks: sum(windowCampaignSpend.map((row) => Number(row.metrics?.clicks || 0))),
        impressions: sum(windowCampaignSpend.map((row) => Number(row.metrics?.impressions || 0))),
        platformConversions: sum(windowCampaignSpend.map((row) => Number(row.metrics?.conversions || 0))),
        platformAllConversions: sum(windowCampaignSpend.map((row) => Number(row.metrics?.allConversions || 0))),
        firstPartyGoogleQualityLeads: googleAttributedQuality,
        observedQualityCplCop: googleAttributedQuality ? round(googleSpendCop / googleAttributedQuality) : null,
      },
      topCampaigns: rankCampaigns(leads, windowCampaignSpend).slice(0, 12),
      topLandingPages: rankLandingPages(leads, googleAds.landingPages || [], start).slice(0, 12),
      topSearchTerms: rankSearchTerms(googleAds.searchTerms || [], start).slice(0, 25),
      gaps: detectWindowGaps(leads, events, windowCampaignSpend),
    };
  });

  const recommendation = buildRecommendation({ windows, campaignSpend, unifiedLeads, searchTerms: googleAds.searchTerms || [] });

  return {
    generatedAt: generatedAt.toISOString(),
    mode: 'read_only_growth_study',
    website: {
      id: website.id,
      accountId: website.account_id,
      subdomain: website.subdomain,
      status: website.status,
    },
    sourceWindow: { since: since.toISOString(), until: generatedAt.toISOString() },
    sourceCounts: {
      requests: requests.length,
      itineraries: itineraries.length,
      funnelEvents: funnelEvents.length,
      waflowLeads: waflowLeads.length,
      unifiedLeads: unifiedLeads.length,
      productionUnifiedLeads: unifiedLeads.filter((lead) => !lead.syntheticTest).length,
      googleCampaignDailyRows: googleAds.campaignDaily?.length ?? 0,
      googleSearchTermRows: googleAds.searchTerms?.length ?? 0,
      googleLandingPageRows: googleAds.landingPages?.length ?? 0,
      googleClickViewMatchedGclids: googleAds.clickViewMatchedGclids ?? 0,
    },
    googleAds: {
      ok: googleAds.ok,
      error: googleAds.error ?? null,
      apiVersion: googleAds.apiVersion ?? null,
      customerId: googleAds.customerId ?? null,
    },
    attributionPriority: [
      'gclid/gbraid/wbraid via Google Ads click_view when available',
      'reference_code',
      'chatwoot_conversation_id',
      'request_id/source_request_id',
      'contact/time-window fallback is intentionally not applied by this script',
    ],
    windows,
    recommendation,
  };
}

function summarizeFirstParty(leads, events) {
  const productionLeads = leads.filter((lead) => !lead.syntheticTest);
  const qualityLeads = productionLeads.filter((lead) => lead.qualityLead);
  const confirmed = productionLeads.filter((lead) => lead.confirmedItinerary);
  const googleLeads = productionLeads.filter(isGoogleAttributed);
  return {
    leads: productionLeads.length,
    syntheticExcludedLeads: leads.length - productionLeads.length,
    qualityLeads: qualityLeads.length,
    googleAttributedLeads: googleLeads.length,
    googleAttributedQualityLeads: googleLeads.filter((lead) => lead.qualityLead).length,
    confirmedItineraries: confirmed.length,
    confirmedValueCop: round(sum(confirmed.map((lead) => lead.confirmedItineraryValue))),
    confirmedMarkupCop: round(sum(confirmed.map((lead) => lead.confirmedItineraryMarkup))),
    waflowSubmits: productionLeads.filter((lead) => lead.hasWaflowSubmit).length,
    whatsappClicks: productionLeads.filter((lead) => lead.hasWhatsappClick).length,
    crmQuoteSentEvents: events.filter((event) => event.event_name === 'crm_quote_sent').length,
    uniqueGclids: unique(leads.map((lead) => lead.gclid).filter(Boolean)).length,
    attributionCompleteness: {
      withCampaign: ratio(productionLeads.filter((lead) => lead.campaign).length, productionLeads.length),
      withGclid: ratio(productionLeads.filter((lead) => lead.gclid).length, productionLeads.length),
      googleQualityWithCampaign: ratio(
        googleLeads.filter((lead) => lead.qualityLead && lead.campaign).length,
        googleLeads.filter((lead) => lead.qualityLead).length,
      ),
    },
  };
}

function rankCampaigns(leads, campaignRows) {
  const productionLeads = leads.filter((lead) => !lead.syntheticTest);
  const spendByCampaign = new Map();
  for (const row of campaignRows) {
    const key = row.campaign?.name || `campaign_${row.campaign?.id}`;
    const current = spendByCampaign.get(key) || {
      campaign: key,
      campaignId: row.campaign?.id ?? null,
      spendCop: 0,
      clicks: 0,
      impressions: 0,
      platformConversions: 0,
      channel: row.campaign?.advertisingChannelType ?? null,
      status: row.campaign?.status ?? null,
    };
    current.spendCop += microsToCop(row.metrics?.costMicros);
    current.clicks += Number(row.metrics?.clicks || 0);
    current.impressions += Number(row.metrics?.impressions || 0);
    current.platformConversions += Number(row.metrics?.conversions || 0);
    spendByCampaign.set(key, current);
  }

  const leadsByCampaign = groupBy(productionLeads, (lead) => lead.campaign || '(unattributed)');
  const names = unique([...spendByCampaign.keys(), ...leadsByCampaign.keys()]);
  return names.map((name) => {
    const spend = spendByCampaign.get(name) || { campaign: name, spendCop: 0, clicks: 0, impressions: 0, platformConversions: 0 };
    const campaignLeads = leadsByCampaign.get(name) || [];
    const qualityLeads = campaignLeads.filter((lead) => lead.qualityLead).length;
    const confirmed = campaignLeads.filter((lead) => lead.confirmedItinerary);
    return {
      campaign: name,
      campaignId: spend.campaignId ?? null,
      channel: spend.channel ?? null,
      status: spend.status ?? null,
      spendCop: round(spend.spendCop),
      clicks: spend.clicks,
      impressions: spend.impressions,
      platformConversions: spend.platformConversions,
      firstPartyLeads: campaignLeads.length,
      firstPartyQualityLeads: qualityLeads,
      firstPartyConfirmedItineraries: confirmed.length,
      confirmedMarkupCop: round(sum(confirmed.map((lead) => lead.confirmedItineraryMarkup))),
      observedQualityCplCop: qualityLeads ? round(spend.spendCop / qualityLeads) : null,
      action: classifyCampaignAction({ name, spend, qualityLeads, campaignLeads }),
    };
  }).sort((a, b) => (b.spendCop + b.firstPartyQualityLeads * 1000000) - (a.spendCop + a.firstPartyQualityLeads * 1000000));
}

function rankLandingPages(leads, landingRows, start) {
  const spendByLanding = new Map();
  for (const row of landingRows) {
    if (row.error || (row.segments?.date && new Date(row.segments.date) < start)) continue;
    const url = normalizeLanding(row.expandedLandingPageView?.expandedFinalUrl);
    if (!url) continue;
    const current = spendByLanding.get(url) || { landingUrl: url, spendCop: 0, clicks: 0, impressions: 0 };
    current.spendCop += microsToCop(row.metrics?.costMicros);
    current.clicks += Number(row.metrics?.clicks || 0);
    current.impressions += Number(row.metrics?.impressions || 0);
    spendByLanding.set(url, current);
  }
  const leadsByLanding = groupBy(leads, (lead) => normalizeLanding(lead.landingUrl) || '(unknown)');
  return unique([...spendByLanding.keys(), ...leadsByLanding.keys()]).map((url) => {
    const spend = spendByLanding.get(url) || { landingUrl: url, spendCop: 0, clicks: 0, impressions: 0 };
    const landingLeads = leadsByLanding.get(url) || [];
    const qualityLeads = landingLeads.filter((lead) => lead.qualityLead).length;
    return {
      landingUrl: url,
      spendCop: round(spend.spendCop),
      clicks: spend.clicks,
      impressions: spend.impressions,
      firstPartyLeads: landingLeads.length,
      firstPartyQualityLeads: qualityLeads,
      observedQualityCplCop: qualityLeads ? round(spend.spendCop / qualityLeads) : null,
    };
  }).sort((a, b) => (b.spendCop + b.firstPartyQualityLeads * 1000000) - (a.spendCop + a.firstPartyQualityLeads * 1000000));
}

function rankSearchTerms(rows, start) {
  const map = new Map();
  for (const row of rows) {
    if (row.error || (row.segments?.date && new Date(row.segments.date) < start)) continue;
    const term = row.campaignSearchTermView?.searchTerm;
    if (!term) continue;
    const current = map.get(term) || {
      searchTerm: term,
      campaign: row.campaign?.name ?? null,
      adGroup: row.adGroup?.name ?? null,
      spendCop: 0,
      clicks: 0,
      impressions: 0,
      platformConversions: 0,
      intent: classifySearchTermIntent(term),
    };
    current.spendCop += microsToCop(row.metrics?.costMicros);
    current.clicks += Number(row.metrics?.clicks || 0);
    current.impressions += Number(row.metrics?.impressions || 0);
    current.platformConversions += Number(row.metrics?.conversions || 0);
    map.set(term, current);
  }
  return [...map.values()]
    .map((row) => ({ ...row, spendCop: round(row.spendCop), recommendation: classifySearchTermRecommendation(row) }))
    .sort((a, b) => b.spendCop - a.spendCop);
}

function buildRecommendation({ windows, unifiedLeads, searchTerms }) {
  const window30 = windows.find((window) => window.days === 30) || windows[0];
  const window7 = windows.find((window) => window.days === 7) || windows[0];
  const qualityCpl = window30?.googleAds?.observedQualityCplCop ?? null;
  const dailyBudget = TARGET_QUALITY_LEADS_PER_DAY * TARGET_CPL_COP.max;
  const commercialTerms = rankSearchTerms(searchTerms || [], new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    .filter((term) => term.intent === 'commercial' && term.recommendation !== 'negative_candidate')
    .slice(0, 12);
  const negativeCandidates = rankSearchTerms(searchTerms || [], new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    .filter((term) => term.recommendation === 'negative_candidate')
    .slice(0, 20);

  return {
    summary: {
      targetQualityLeadsPerDay: TARGET_QUALITY_LEADS_PER_DAY,
      targetCplCop: TARGET_CPL_COP,
      recommendedInitialDailyBudgetCop: {
        min: TARGET_QUALITY_LEADS_PER_DAY * TARGET_CPL_COP.min,
        max: dailyBudget,
      },
      observed30dQualityCplCop: qualityCpl,
      currentGap: {
        last7dQualityLeads: window7?.firstParty?.qualityLeads ?? 0,
        last7dGoogleAttributedQualityLeads: window7?.firstParty?.googleAttributedQualityLeads ?? 0,
        neededDailyRunRate: TARGET_QUALITY_LEADS_PER_DAY,
      },
    },
    campaignPlan: [
      {
        campaign: 'MX | Search | Colombia paquetes alta intención',
        dailyBudgetCop: 300000,
        launchMode: 'open_or_scale',
        objective: '10-lead plan anchor; broadest commercial demand in DataForSEO sample.',
        adGroups: ['paquetes/todo incluido', 'viaje a Colombia desde México', 'agencia Colombia', 'Cartagena/San Andrés only if landing matches'],
        optimizationSignal: 'qualified/proposal_sent/crm_quote_sent first, booking_confirmed as lagging value signal',
      },
      {
        campaign: 'ES | Search | Colombia viajes personalizados',
        dailyBudgetCop: 200000,
        launchMode: 'scale_existing_with_governance',
        objective: 'higher-intent and historically stronger ticket; keep volume controlled.',
        adGroups: ['Cartagena de Indias', 'Medellín Cultural', 'Multidestino Premium', 'Eje Cafetero only if terms remain commercial'],
        optimizationSignal: 'CRM opportunity, not legacy Google conversion count',
      },
      {
        campaign: 'US | Search | Colombia Travel Packages test',
        dailyBudgetCop: 75000,
        launchMode: 'test_only_when_landing_ready',
        objective: 'premium English-language signal, high CPC, high potential ticket.',
        adGroups: ['Colombia travel packages', 'Colombia vacation packages', 'Colombia private/luxury tours'],
        optimizationSignal: 'qualified opportunity quality and seller feedback before scale',
      },
    ],
    scalingRules: [
      'Increase budget 20-30% after 3 consecutive days with CPL <= COP 60k and seller-confirmed quality.',
      'Hold budget if CPL is COP 60k-100k or attribution completeness is below 80%.',
      'Reduce or pause terms/ad groups with spend >= COP 120k and zero quality opportunities.',
      'Do not let Google optimize on legacy conversion actions until offline qualified/quote/booking imports are stable.',
    ],
    commercialSearchTermCandidates: commercialTerms,
    negativeCandidates,
    requiredInstrumentation: [
      'Every Google Ads final URL must include utm_source=google, utm_medium=cpc, utm_campaign matching campaign name.',
      'WAFlow/landing must persist gclid, gbraid/wbraid, reference_code and chatwoot_conversation_id into requests/funnel_events.',
      'Sales team must maintain request_stage/proposal_sent/closed_won status same day for daily optimization.',
      'Offline upload should send qualified/proposal_sent/booking_confirmed only from first-party canonical events.',
    ],
  };
}

function detectWindowGaps(leads, events, campaignRows) {
  const productionLeads = leads.filter((lead) => !lead.syntheticTest);
  const qualityLeads = productionLeads.filter((lead) => lead.qualityLead);
  const googleLeads = productionLeads.filter(isGoogleAttributed);
  const spend = sum(campaignRows.map((row) => microsToCop(row.metrics?.costMicros)));
  const gaps = [];
  if (spend > 0 && googleLeads.length === 0) gaps.push('google_spend_without_first_party_google_leads');
  if (googleLeads.length > 0 && googleLeads.filter((lead) => lead.campaign).length / googleLeads.length < 0.8) gaps.push('google_leads_missing_campaign_resolution');
  if (qualityLeads.length === 0 && leads.length > 0) gaps.push('crm_quality_stage_not_being_set_or_low_quality_traffic');
  if (events.some((event) => event.gclid) && googleLeads.every((lead) => !lead.campaignId)) gaps.push('gclid_present_but_click_view_not_resolved');
  if (events.filter((event) => event.event_name === 'crm_quote_sent').length === 0) gaps.push('no_crm_quote_sent_events_in_window');
  return gaps;
}

function classifyCampaignAction({ name, spend, qualityLeads, campaignLeads }) {
  const lower = String(name).toLowerCase();
  const spendCop = spend.spendCop || 0;
  if (isSyntheticText(lower)) return 'ignore_synthetic_validation_traffic';
  if (name === '(unattributed)') return 'fix_attribution_before_budget_decision';
  if (spendCop === 0) return qualityLeads > 0 ? 'crm_only_no_paid_budget_action' : 'watch';
  if (qualityLeads > 0 && spendCop / qualityLeads <= TARGET_CPL_COP.max) return 'scale_20_30_percent';
  if (qualityLeads > 0) return 'keep_learning_do_not_scale_yet';
  if (spendCop >= 120000 && campaignLeads.length === 0) return 'audit_terms_or_pause_budget_leak';
  if (lower.includes('mx') || lower.includes('mexico') || lower.includes('méxico')) return 'priority_learning';
  if (lower.includes('es') || lower.includes('españa')) return 'priority_learning';
  return 'watch';
}

function classifySearchTermIntent(term) {
  const lower = String(term || '').toLowerCase();
  if (HARD_NEGATIVE_THEMES.some((theme) => lower.includes(theme))) return 'negative';
  if (COMMERCIAL_INTENT_KEYWORDS.some((keyword) => lower.includes(keyword))) return 'commercial';
  if (/(que hacer|qué hacer|turismo|itinerario|ruta|guia|guía)/.test(lower)) return 'research';
  return 'unknown';
}

function classifySearchTermRecommendation(row) {
  if (row.intent === 'negative') return 'negative_candidate';
  if (row.intent === 'commercial' && row.spendCop > 0) return 'keep_or_expand_exact_phrase';
  if (row.intent === 'research' && row.spendCop >= 60000 && row.platformConversions === 0) return 'content_or_negative_review';
  if (row.clicks >= 10 && row.platformConversions === 0) return 'review_query_quality';
  return 'watch';
}

function isQualityLead({ request, events }) {
  const values = [
    request?.request_stage,
    request?.pipeline_status,
    request?.lead_qualification,
    request?.lead_score_label,
    request?.status,
    ...events.map((event) => event.event_name),
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  return values.some((value) =>
    [
      'qualified',
      'proposal_sent',
      'quote_sent',
      'crm_quote_sent',
      'closed_won',
      'booking_confirmed',
      'crm_booking_confirmed',
      'opportunity',
    ].some((needle) => value.includes(needle)),
  );
}

function qualityReason({ request, events }) {
  if (events.some((event) => event.event_name === 'crm_quote_sent')) return 'crm_quote_sent_event';
  if (events.some((event) => event.event_name === 'crm_booking_confirmed')) return 'crm_booking_confirmed_event';
  if (String(request?.request_stage || '').toLowerCase().includes('qualified')) return 'request_stage_qualified';
  if (String(request?.request_stage || '').toLowerCase().includes('proposal')) return 'request_stage_proposal_sent';
  if (String(request?.pipeline_status || '').toLowerCase().includes('qualified')) return 'pipeline_status_qualified';
  if (String(request?.lead_qualification || '').toLowerCase().includes('qualified')) return 'lead_qualification_qualified';
  return null;
}

function isConfirmedItinerary(itinerary) {
  const status = String(itinerary?.status || '').toLowerCase();
  return Boolean(
    itinerary?.confirmed_at ||
      itinerary?.confirmation_date ||
      status.includes('confirm') ||
      status.includes('closed_won') ||
      status.includes('reservado'),
  );
}

function isGoogleAttributed(lead) {
  const source = String(lead.source || '').toLowerCase();
  const medium = String(lead.medium || '').toLowerCase();
  return Boolean(lead.gclid || lead.gbraid || lead.wbraid || source.includes('google') || medium === 'cpc');
}

function isSyntheticTest({ request, events, waflowLeads, attribution, refs }) {
  const haystack = [
    request?.utm_campaign,
    request?.lead_source,
    request?.lead_source_detail,
    attribution?.campaign,
    ...refs,
    ...events.flatMap((event) => [event.utm_campaign, event.reference_code, event.event_id, event.source_url]),
    ...waflowLeads.flatMap((lead) => [lead.reference_code, extractFirst(lead.payload, ['utm_campaign', 'source_url', 'landing_url'])]),
  ].filter(Boolean).join(' ').toLowerCase();
  return isSyntheticText(haystack);
}

function isSyntheticText(value) {
  return /(codex|e2e|smoke|tracking-smoke|funnel_fullchain|funnel_e2e|epic310|gads_cert|validation)/i.test(String(value || ''));
}

function classifySource({ request, events, waflowLeads }) {
  const haystack = [
    request?.lead_source,
    request?.lead_source_detail,
    request?.referrer_url,
    request?.landing_url,
    ...events.flatMap((event) => [event.source_url, event.utm_source, event.utm_medium]),
    ...waflowLeads.flatMap((lead) => [
      extractFirst(lead.payload, ['source_url', 'landing_url', 'utm_source', 'utm_medium', 'referrer_url']),
      extractFirst(lead.chatwoot_custom_attributes, ['source_url', 'landing_url', 'utm_source', 'utm_medium', 'referrer_url']),
    ]),
  ].filter(Boolean).join(' ').toLowerCase();

  if (haystack.includes('google') || haystack.includes('gclid')) return 'google';
  if (haystack.includes('facebook') || haystack.includes('instagram') || haystack.includes('meta') || haystack.includes('fbclid')) return 'meta';
  if (haystack.includes('organic')) return 'organic';
  if (haystack.includes('whatsapp')) return 'whatsapp';
  return null;
}

function collectGclids(funnelEvents, requests) {
  return unique([
    ...funnelEvents.map((event) => event.gclid),
    ...requests.map((request) => request.custom_fields?.gclid || request.custom_fields?.google_ads_gclid),
  ].filter(Boolean));
}

function aggregateGoogleCampaignSpend(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (row.error) continue;
    const name = row.campaign?.name || `campaign_${row.campaign?.id}`;
    const current = map.get(name) || { campaign: name, spendCop: 0, clicks: 0, impressions: 0 };
    current.spendCop += microsToCop(row.metrics?.costMicros);
    current.clicks += Number(row.metrics?.clicks || 0);
    current.impressions += Number(row.metrics?.impressions || 0);
    map.set(name, current);
  }
  return [...map.values()];
}

function filterCampaignSpendByWindow(rows, start) {
  return (rows || []).filter((row) => !row.error && row.segments?.date && new Date(row.segments.date) >= start);
}

function renderMarkdown(report) {
  const windowRows = report.windows.map((window) =>
    `| ${window.days}d | ${formatInt(window.firstParty.leads)} | ${formatInt(window.firstParty.syntheticExcludedLeads)} | ${formatInt(window.firstParty.qualityLeads)} | ${formatInt(window.firstParty.googleAttributedQualityLeads)} | ${formatCop(window.googleAds.spendCop)} | ${formatCop(window.googleAds.observedQualityCplCop)} | ${formatInt(window.firstParty.confirmedItineraries)} | ${formatCop(window.firstParty.confirmedMarkupCop)} |`,
  ).join('\n');

  const campaignRows = report.recommendation.campaignPlan.map((campaign) =>
    `| ${mdCell(campaign.campaign)} | ${formatCop(campaign.dailyBudgetCop)} | ${campaign.launchMode} | ${mdCell(campaign.objective)} |`,
  ).join('\n');

  const topCampaignRows = (report.windows.find((window) => window.days === 30)?.topCampaigns || [])
    .slice(0, 10)
    .map((row) => `| ${mdCell(row.campaign)} | ${formatCop(row.spendCop)} | ${formatInt(row.clicks)} | ${formatInt(row.firstPartyQualityLeads)} | ${formatCop(row.observedQualityCplCop)} | ${row.action} |`)
    .join('\n');

  const negativeRows = report.recommendation.negativeCandidates
    .slice(0, 12)
    .map((row) => `| ${mdCell(row.searchTerm)} | ${mdCell(row.campaign || '')} | ${formatCop(row.spendCop)} | ${formatInt(row.clicks)} | ${row.recommendation} |`)
    .join('\n');

  const commercialRows = report.recommendation.commercialSearchTermCandidates
    .slice(0, 12)
    .map((row) => `| ${mdCell(row.searchTerm)} | ${mdCell(row.campaign || '')} | ${formatCop(row.spendCop)} | ${formatInt(row.clicks)} | ${row.recommendation} |`)
    .join('\n');

  const gaps = unique(report.windows.flatMap((window) => window.gaps)).map((gap) => `- ${gap}`).join('\n') || '- Sin gaps críticos detectados en las ventanas analizadas.';

  return `# ColombiaTours Google Ads + CRM Growth Study

**Generated**: ${report.generatedAt}  
**Mode**: ${report.mode}  
**Account**: ${report.website.accountId}  
**Website**: ${report.website.subdomain}  
**Google Ads API**: ${report.googleAds.ok ? `OK (${report.googleAds.apiVersion})` : `Unavailable: ${report.googleAds.error}`}

## Executive Readout

The optimization truth for ColombiaTours is now first-party CRM opportunity quality, not legacy Google Ads conversions. A quality lead is counted when the lead reaches \`qualified\`, \`proposal_sent\`, or emits \`crm_quote_sent\`; confirmed itineraries are the lagging revenue signal.

Initial operating target:
- **10 quality opportunities/day**.
- **CPL target COP 40k-60k**.
- **Initial budget COP 400k-600k/day**, staged across MX/ES and a small US test only when the English landing is ready.

## Source Coverage

| Source | Rows |
|---|---:|
| requests | ${formatInt(report.sourceCounts.requests)} |
| itineraries | ${formatInt(report.sourceCounts.itineraries)} |
| funnel_events | ${formatInt(report.sourceCounts.funnelEvents)} |
| waflow_leads | ${formatInt(report.sourceCounts.waflowLeads)} |
| unified leads | ${formatInt(report.sourceCounts.unifiedLeads)} |
| production unified leads | ${formatInt(report.sourceCounts.productionUnifiedLeads)} |
| Google campaign daily rows | ${formatInt(report.sourceCounts.googleCampaignDailyRows)} |
| Google search term rows | ${formatInt(report.sourceCounts.googleSearchTermRows)} |
| Google click_view matched gclids | ${formatInt(report.sourceCounts.googleClickViewMatchedGclids)} |

## 7/30/90 Day Scoreboard

| Window | Production leads | Synthetic excluded | Quality leads | Google quality leads | Google spend | Observed Google quality CPL | Confirmed itineraries | Confirmed markup |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${windowRows}

## Campaign Budget Plan

| Campaign | Daily budget | Mode | Objective |
|---|---:|---|---|
${campaignRows}

## 30 Day Campaign Read

| Campaign | Spend | Clicks | First-party quality leads | Observed quality CPL | Action |
|---|---:|---:|---:|---:|---|
${topCampaignRows || '| No campaign rows resolved | - | - | - | - | - |'}

## Commercial Search Term Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
${commercialRows || '| No commercial paid terms found in the extracted window | - | - | - | - |'}

## Negative / Waste Candidates

| Search term | Campaign | Spend | Clicks | Recommendation |
|---|---|---:|---:|---|
${negativeRows || '| No negative candidates found in the extracted window | - | - | - | - |'}

## Current Gaps

${gaps}

## Scaling Rules

${report.recommendation.scalingRules.map((rule) => `- ${rule}`).join('\n')}

## Instrumentation Requirements

${report.recommendation.requiredInstrumentation.map((item) => `- ${item}`).join('\n')}

## Next Operating Actions

1. Use this report as the weekly paid-search decision packet.
2. Keep Mexico and Spain as the first budget centers until CRM opportunity quality stabilizes.
3. Open the US English test only when an English landing and seller handling path are ready.
4. Upload only canonical offline events to Google Ads: \`qualified\`, \`crm_quote_sent\`, and \`crm_booking_confirmed\`.
5. Require seller same-day CRM stage hygiene; otherwise the algorithm will optimize toward form volume instead of opportunities.
`;
}

function redactReport(report) {
  return JSON.parse(JSON.stringify(report, (key, value) => {
    if (SECRET_KEY_PATTERN.test(key)) return '[redacted]';
    return value instanceof Map ? Object.fromEntries(value) : value;
  }));
}

function redactLead(lead) {
  const clone = { ...lead };
  if (clone.chatwootConversationId) clone.chatwootConversationId = '[redacted]';
  return clone;
}

function extractRefs(source) {
  if (!source) return [];
  const values = [
    source.reference_code,
    source.custom_fields?.reference_code,
    source.custom_fields?.waflow_reference_code,
    source.custom_fields?.lead_reference_code,
    source.custom_fields?.growth_reference_code,
  ];
  walk(source.custom_fields, (key, value) => {
    if (/reference(_|-)?code/i.test(key) && typeof value === 'string') values.push(value);
  });
  return unique(values.map(clean).filter(Boolean));
}

function extractFirst(source, keys) {
  if (!source) return null;
  for (const key of keys) {
    if (source[key]) return source[key];
  }
  let found = null;
  walk(source, (key, value) => {
    if (found) return;
    if (keys.includes(key) && value) found = value;
  });
  return found;
}

function walk(value, visitor) {
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    visitor(key, entry);
    if (entry && typeof entry === 'object') walk(entry, visitor);
  }
}

function normalizeLanding(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url.split('?')[0].replace(/\/$/, '');
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') return [value];
  return [];
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows || []) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function minBy(rows, keyFn) {
  return (rows || []).filter(Boolean).sort((a, b) => String(keyFn(a) || '').localeCompare(String(keyFn(b) || '')))[0] || null;
}

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const key = keyFn(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function firstNonEmpty(values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? null;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const string = String(value).trim();
  return string || null;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function microsToCop(value) {
  return Number(value || 0) / 1_000_000;
}

function ratio(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

function round(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Math.round(Number(value));
}

function formatCop(value) {
  if (value === null || value === undefined) return '-';
  return `COP ${formatInt(value)}`;
}

function formatInt(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
