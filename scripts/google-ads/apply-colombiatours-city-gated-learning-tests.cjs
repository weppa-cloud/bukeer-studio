#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const CUSTOMER_ID = () => stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
const SHARED_SET_NAME = 'Lista de palabras globales';
const APPROVAL_CSV = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-24m-mining/negative-approval-shortlist.csv');
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-city-gated-tests');

const TARGET_CAMPAIGNS = [
  { id: '23843668228', name: 'BR_Search_Colombia_Packages_2026_05' },
  { id: '23833803528', name: 'AR_Search_Colombia_Packages_2026_05' },
  { id: '23815528484', name: 'MX_Multidestino_y_Caribe_2026_05' },
  { id: '23819986291', name: 'ES_Cartagena_Medellin_2026_05' },
  { id: '23829507075', name: 'CL_Search_Colombia_SanAndres_2026_05' },
  { id: '23829536568', name: 'US_Florida_NY_Colombia_Packages_2026_05' },
];

const BR_PLAN = {
  campaignId: '23843668228',
  campaignName: 'BR_Search_Colombia_Packages_2026_05',
  keepBudgetCop: 50000,
  removePositiveGeoIds: ['2076'], // Brazil country
  addPositiveGeo: { id: '1001773', resource: 'geoTargetConstants/1001773', name: 'Sao Paulo', country: 'BR' },
  keepNegativeGeoIds: ['2170'], // Colombia country negative
  activateAdGroupName: 'AG1_Pacotes_Colombia',
  activateExactKeywords: ['pacotes colombia', 'pacote viagem colombia'],
  finalUrl: 'https://colombiatours.travel/pt/pacotes-colombia',
};

const AR_PLAN = {
  campaignId: '23833803528',
  campaignName: 'AR_Search_Colombia_Packages_2026_05',
  holdStatusUntil: 'BR reaches 72h or 30 clicks',
};

const APPROVED_PHRASE_NEGATIVES = [
  'vuelos',
  'vuelo',
  'boletos',
  'boleto',
  'pasajes',
  'pasaje',
  'tiquetes',
  'tiquete',
  'avianca',
];

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-city-gated-learning-tests.cjs
  node scripts/google-ads/apply-colombiatours-city-gated-learning-tests.cjs --apply-br

Default validates all planned mutations only.
--apply-br applies reusable negatives + BR Sao Paulo city gate + BR exact-first activation,
           and keeps AR paused until the BR learning trigger is met.

This script intentionally does not activate AR. AR is second phase after BR reaches 72h or 30 clicks.
`);
}

function parseArgs(argv) {
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    applyBr: argv.includes('--apply-br'),
  };
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
  if (!body.access_token) throw new Error('OAuth response missing access_token');
  return body.access_token;
}

async function googleAdsRequest({ env, accessToken, requestPath, body }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json',
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  }
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${CUSTOMER_ID()}/${requestPath}`,
    { method: 'POST', headers, body: JSON.stringify(body) },
  );
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    throw new Error(`${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  }
  return parsed;
}

async function search({ env, accessToken, query }) {
  const chunks = await googleAdsRequest({ env, accessToken, requestPath: 'googleAds:searchStream', body: { query } });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function mutate({ env, accessToken, requestPath, operations, validateOnly }) {
  if (!operations.length) return { results: [] };
  return googleAdsRequest({
    env,
    accessToken,
    requestPath,
    body: { validateOnly, partialFailure: false, operations },
  });
}

function quote(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
    else if (char !== '\r') value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...body] = rows;
  if (!headers) return [];
  return body.filter((entry) => entry.some(Boolean)).map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index] || ''])));
}

function loadApprovedNegativeCriteria() {
  const exactRows = parseCsv(fs.readFileSync(APPROVAL_CSV, 'utf8'))
    .filter((row) => row.recommendedDecision === 'APPROVE' && row.keywordText)
    .map((row) => ({ text: row.keywordText, matchType: 'EXACT', source: row.priority || 'approved_exact' }));
  const phraseRows = APPROVED_PHRASE_NEGATIVES.map((text) => ({ text, matchType: 'PHRASE', source: 'approved_phrase' }));
  const deduped = new Map();
  for (const row of [...phraseRows, ...exactRows]) {
    deduped.set(`${normalize(row.text)}|${row.matchType}`, row);
  }
  return [...deduped.values()];
}

function criterionKey(text, matchType) {
  return `${normalize(text)}|${matchType}`;
}

function hasReusableCoverage(existingRows, planned) {
  const exact = new Set(existingRows.map((row) => criterionKey(row.text, row.matchType)));
  if (exact.has(criterionKey(planned.text, planned.matchType))) return true;
  const normalized = ` ${normalize(planned.text)} `;
  for (const row of existingRows) {
    if (row.matchType === 'BROAD' && normalized.includes(` ${normalize(row.text)} `)) return true;
    if (row.matchType === 'PHRASE' && normalized.includes(` ${normalize(row.text)} `)) return true;
  }
  return false;
}

async function loadSharedNegativeSet(env, accessToken) {
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT shared_set.id, shared_set.resource_name, shared_set.name, shared_set.type, shared_set.status
      FROM shared_set
      WHERE shared_set.name = ${quote(SHARED_SET_NAME)}
        AND shared_set.type = NEGATIVE_KEYWORDS
        AND shared_set.status != 'REMOVED'
      LIMIT 1`,
  });
  if (!rows.length) throw new Error(`Shared negative list not found: ${SHARED_SET_NAME}`);
  const sharedSet = rows[0].sharedSet;
  const criteriaRows = await search({
    env,
    accessToken,
    query: `
      SELECT shared_criterion.resource_name, shared_criterion.keyword.text, shared_criterion.keyword.match_type
      FROM shared_criterion
      WHERE shared_set.id = ${sharedSet.id}
        AND shared_criterion.type = KEYWORD`,
  });
  return {
    id: String(sharedSet.id),
    name: sharedSet.name,
    resourceName: sharedSet.resourceName,
    criteria: criteriaRows.map((row) => ({
      resourceName: row.sharedCriterion.resourceName,
      text: row.sharedCriterion.keyword.text,
      matchType: row.sharedCriterion.keyword.matchType || row.sharedCriterion.keyword.match_type,
    })),
  };
}

async function loadCampaigns(env, accessToken) {
  const ids = TARGET_CAMPAIGNS.map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.resource_name,
        campaign.name,
        campaign.status,
        campaign.geo_target_type_setting.positive_geo_target_type,
        campaign.geo_target_type_setting.negative_geo_target_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.id IN (${ids})
        AND campaign.status != 'REMOVED'`,
  });
  const byId = new Map(rows.map((row) => [String(row.campaign.id), row.campaign]));
  const missing = TARGET_CAMPAIGNS.filter((campaign) => !byId.has(campaign.id));
  if (missing.length) throw new Error(`Missing target campaigns: ${missing.map((campaign) => campaign.name).join(', ')}`);
  return byId;
}

async function loadSharedSetAttachments(env, accessToken, sharedSetResource) {
  const ids = TARGET_CAMPAIGNS.map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign_shared_set.shared_set, campaign_shared_set.status
      FROM campaign_shared_set
      WHERE campaign.id IN (${ids})
        AND campaign_shared_set.shared_set = ${quote(sharedSetResource)}`,
  });
  return new Set(rows.map((row) => String(row.campaign.id)));
}

async function loadCampaignLocations(env, accessToken, campaignId) {
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign_criterion.resource_name,
        campaign_criterion.criterion_id,
        campaign_criterion.negative,
        campaign_criterion.status,
        campaign_criterion.location.geo_target_constant
      FROM campaign_criterion
      WHERE campaign.id = ${campaignId}
        AND campaign_criterion.type = LOCATION
        AND campaign_criterion.status != 'REMOVED'`,
  });
  return rows.map((row) => ({
    resourceName: row.campaignCriterion.resourceName,
    criterionId: String(row.campaignCriterion.criterionId),
    negative: Boolean(row.campaignCriterion.negative),
    status: row.campaignCriterion.status,
    geoTargetConstant: row.campaignCriterion.location.geoTargetConstant,
    geoId: String(row.campaignCriterion.location.geoTargetConstant || '').split('/').pop(),
  }));
}

async function loadBrEntities(env, accessToken) {
  const [adGroups, keywords, ads] = await Promise.all([
    search({
      env,
      accessToken,
      query: `
        SELECT ad_group.resource_name, ad_group.id, ad_group.name, ad_group.status
        FROM ad_group
        WHERE campaign.id = ${BR_PLAN.campaignId}
          AND ad_group.status != 'REMOVED'`,
    }),
    search({
      env,
      accessToken,
      query: `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group_criterion.resource_name,
          ad_group_criterion.status,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type
        FROM keyword_view
        WHERE campaign.id = ${BR_PLAN.campaignId}`,
    }),
    search({
      env,
      accessToken,
      query: `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group_ad.resource_name,
          ad_group_ad.status,
          ad_group_ad.ad.id,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls
          , ad_group_ad.ad.responsive_search_ad.headlines
          , ad_group_ad.ad.responsive_search_ad.descriptions
          , ad_group_ad.ad.responsive_search_ad.path1
          , ad_group_ad.ad.responsive_search_ad.path2
        FROM ad_group_ad
        WHERE campaign.id = ${BR_PLAN.campaignId}
          AND ad_group_ad.status != 'REMOVED'`,
    }),
  ]);
  return {
    adGroups: adGroups.map((row) => ({ resourceName: row.adGroup.resourceName, id: String(row.adGroup.id), name: row.adGroup.name, status: row.adGroup.status })),
    keywords: keywords.map((row) => ({
      adGroupId: String(row.adGroup.id),
      adGroupName: row.adGroup.name,
      resourceName: row.adGroupCriterion.resourceName,
      status: row.adGroupCriterion.status,
      text: row.adGroupCriterion.keyword.text,
      matchType: row.adGroupCriterion.keyword.matchType || row.adGroupCriterion.keyword.match_type,
    })),
    ads: ads.map((row) => ({
      adGroupId: String(row.adGroup.id),
      adGroupName: row.adGroup.name,
      resourceName: row.adGroupAd.resourceName,
      status: row.adGroupAd.status,
      adId: String(row.adGroupAd.ad.id),
      type: row.adGroupAd.ad.type,
      finalUrls: row.adGroupAd.ad.finalUrls || [],
      responsiveSearchAd: row.adGroupAd.ad.responsiveSearchAd || null,
    })),
  };
}

function buildSharedCriteriaOps(sharedSet, approvedCriteria) {
  const operations = [];
  const planned = [];
  const skippedCovered = [];
  for (const criterion of approvedCriteria) {
    if (hasReusableCoverage(sharedSet.criteria, criterion)) {
      skippedCovered.push(criterion);
      continue;
    }
    planned.push(criterion);
    operations.push({
      create: {
        sharedSet: sharedSet.resourceName,
        keyword: { text: criterion.text, matchType: criterion.matchType },
      },
    });
  }
  return { operations, planned, skippedCovered };
}

function buildAttachmentOps(campaignsById, attachedCampaignIds, sharedSetResource) {
  const operations = [];
  const planned = [];
  const skippedExisting = [];
  for (const campaign of TARGET_CAMPAIGNS) {
    const campaignRow = campaignsById.get(campaign.id);
    if (attachedCampaignIds.has(campaign.id)) {
      skippedExisting.push({ campaignId: campaign.id, campaignName: campaign.name });
      continue;
    }
    planned.push({ campaignId: campaign.id, campaignName: campaign.name, campaignStatus: campaignRow.status });
    operations.push({ create: { campaign: campaignRow.resourceName, sharedSet: sharedSetResource } });
  }
  return { operations, planned, skippedExisting };
}

function buildBrGeoOps(campaignsById, brLocations) {
  const campaign = campaignsById.get(BR_PLAN.campaignId);
  const operations = [];
  const planned = [];
  const existingPositiveGeoIds = new Set(brLocations.filter((location) => !location.negative).map((location) => location.geoId));
  for (const location of brLocations) {
    if (!location.negative && BR_PLAN.removePositiveGeoIds.includes(location.geoId)) {
      operations.push({ remove: location.resourceName });
      planned.push({ action: 'remove_positive_geo', geoId: location.geoId, resourceName: location.resourceName });
    }
  }
  if (!existingPositiveGeoIds.has(BR_PLAN.addPositiveGeo.id)) {
    operations.push({
      create: {
        campaign: campaign.resourceName,
        negative: false,
        location: { geoTargetConstant: BR_PLAN.addPositiveGeo.resource },
      },
    });
    planned.push({ action: 'add_positive_geo', ...BR_PLAN.addPositiveGeo });
  }
  const negativeGeoIds = new Set(brLocations.filter((location) => location.negative).map((location) => location.geoId));
  const hasColombiaNegative = BR_PLAN.keepNegativeGeoIds.every((geoId) => negativeGeoIds.has(geoId));
  return { operations, planned, hasColombiaNegative };
}

function buildBrCampaignGeoTypeOps(campaignsById) {
  const campaign = campaignsById.get(BR_PLAN.campaignId);
  const setting = campaign.geoTargetTypeSetting || {};
  const currentPositive = setting.positiveGeoTargetType;
  const currentNegative = setting.negativeGeoTargetType;
  if (currentPositive === 'PRESENCE' && currentNegative === 'PRESENCE') {
    return { operations: [], planned: [] };
  }
  return {
    operations: [{
      update: {
        resourceName: campaign.resourceName,
        geoTargetTypeSetting: {
          positiveGeoTargetType: 'PRESENCE',
          negativeGeoTargetType: 'PRESENCE',
        },
      },
      updateMask: 'geo_target_type_setting.positive_geo_target_type,geo_target_type_setting.negative_geo_target_type',
    }],
    planned: [{ action: 'update_geo_target_type', from: { positive: currentPositive, negative: currentNegative }, to: { positive: 'PRESENCE', negative: 'PRESENCE' } }],
  };
}

function buildArHoldOps(campaignsById) {
  const campaign = campaignsById.get(AR_PLAN.campaignId);
  if (!campaign) throw new Error(`AR campaign not found: ${AR_PLAN.campaignName}`);
  if (campaign.status === 'PAUSED') return { operations: [], planned: [] };
  return {
    operations: [{
      update: {
        resourceName: campaign.resourceName,
        status: 'PAUSED',
      },
      updateMask: 'status',
    }],
    planned: [{
      action: 'pause_until_second_phase',
      campaignId: AR_PLAN.campaignId,
      campaignName: AR_PLAN.campaignName,
      fromStatus: campaign.status,
      toStatus: 'PAUSED',
      holdStatusUntil: AR_PLAN.holdStatusUntil,
    }],
  };
}

function hasCanonicalFinalUrl(ad) {
  return ad.finalUrls.length === 1 && ad.finalUrls[0] === BR_PLAN.finalUrl;
}

function cloneAdTextAsset(asset) {
  const clone = { text: asset.text };
  const pinnedField = asset.pinnedField || asset.pinned_field;
  if (pinnedField) clone.pinnedField = pinnedField;
  return clone;
}

function buildReplacementResponsiveSearchAd(sourceAd) {
  const responsiveSearchAd = sourceAd.responsiveSearchAd || {};
  const headlines = responsiveSearchAd.headlines || [];
  const descriptions = responsiveSearchAd.descriptions || [];
  if (!headlines.length || !descriptions.length) {
    throw new Error(`Cannot clone BR ad ${sourceAd.adId}: missing responsive search ad assets.`);
  }
  return {
    finalUrls: [BR_PLAN.finalUrl],
    responsiveSearchAd: {
      headlines: headlines.map(cloneAdTextAsset),
      descriptions: descriptions.map(cloneAdTextAsset),
      ...(responsiveSearchAd.path1 ? { path1: responsiveSearchAd.path1 } : {}),
      ...(responsiveSearchAd.path2 ? { path2: responsiveSearchAd.path2 } : {}),
    },
  };
}

function buildBrActivationOps(brEntities) {
  const adGroupOperations = [];
  const keywordOperations = [];
  const adOperations = [];
  const planned = [];
  const targetAdGroup = brEntities.adGroups.find((adGroup) => adGroup.name === BR_PLAN.activateAdGroupName);
  if (!targetAdGroup) throw new Error(`BR target ad group not found: ${BR_PLAN.activateAdGroupName}`);
  if (targetAdGroup.status !== 'ENABLED') {
    adGroupOperations.push({ update: { resourceName: targetAdGroup.resourceName, status: 'ENABLED' }, updateMask: 'status' });
    planned.push({ entity: 'ad_group', action: 'enable', name: targetAdGroup.name, resourceName: targetAdGroup.resourceName });
  }

  for (const keywordText of BR_PLAN.activateExactKeywords) {
    const keyword = brEntities.keywords.find((row) => row.adGroupName === BR_PLAN.activateAdGroupName && normalize(row.text) === normalize(keywordText) && row.matchType === 'EXACT');
    if (!keyword) throw new Error(`BR target exact keyword not found: ${keywordText}`);
    if (keyword.status !== 'ENABLED') {
      keywordOperations.push({ update: { resourceName: keyword.resourceName, status: 'ENABLED' }, updateMask: 'status' });
      planned.push({ entity: 'keyword', action: 'enable', text: keyword.text, matchType: keyword.matchType, adGroupName: keyword.adGroupName, resourceName: keyword.resourceName });
    }
  }

  const ads = brEntities.ads.filter((row) => row.adGroupName === BR_PLAN.activateAdGroupName);
  if (!ads.length) throw new Error(`BR target ad not found for ad group: ${BR_PLAN.activateAdGroupName}`);
  const canonicalAds = ads.filter(hasCanonicalFinalUrl);
  if (!canonicalAds.length) {
    const sourceAd = ads.find((ad) => ad.type === 'RESPONSIVE_SEARCH_AD' && ad.responsiveSearchAd) || ads[0];
    adOperations.push({
      create: {
        adGroup: targetAdGroup.resourceName,
        status: 'ENABLED',
        ad: buildReplacementResponsiveSearchAd(sourceAd),
      },
    });
    planned.push({
      entity: 'ad',
      action: 'create_replacement_with_canonical_final_url',
      sourceAdId: sourceAd.adId,
      adGroupName: sourceAd.adGroupName,
      from: sourceAd.finalUrls,
      to: [BR_PLAN.finalUrl],
    });
  }
  for (const ad of ads) {
    if (hasCanonicalFinalUrl(ad) && ad.status !== 'ENABLED') {
      adOperations.push({ update: { resourceName: ad.resourceName, status: 'ENABLED' }, updateMask: 'status' });
      planned.push({ entity: 'ad', action: 'enable', adId: ad.adId, adGroupName: ad.adGroupName, finalUrls: ad.finalUrls.join('|'), resourceName: ad.resourceName });
    }
    if (!hasCanonicalFinalUrl(ad) && ad.status === 'ENABLED') {
      adOperations.push({ update: { resourceName: ad.resourceName, status: 'PAUSED' }, updateMask: 'status' });
      planned.push({ entity: 'ad', action: 'pause_bad_final_url', adId: ad.adId, adGroupName: ad.adGroupName, finalUrls: ad.finalUrls.join('|'), canonicalFinalUrl: BR_PLAN.finalUrl, resourceName: ad.resourceName });
    }
  }

  const guardedPaused = {
    adGroupsKeptPaused: brEntities.adGroups.filter((adGroup) => adGroup.name !== BR_PLAN.activateAdGroupName).map((adGroup) => ({ name: adGroup.name, status: adGroup.status })),
    phraseKeywordsKeptPaused: brEntities.keywords.filter((keyword) => keyword.adGroupName === BR_PLAN.activateAdGroupName && keyword.matchType !== 'EXACT').map((keyword) => ({ text: keyword.text, matchType: keyword.matchType, status: keyword.status })),
  };

  return { adGroupOperations, keywordOperations, adOperations, planned, guardedPaused };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const validateOnly = !args.applyBr;
  const accessToken = await getAccessToken(process.env);
  const approvedCriteria = loadApprovedNegativeCriteria();
  const [sharedSet, campaignsById, brLocations, brEntities] = await Promise.all([
    loadSharedNegativeSet(process.env, accessToken),
    loadCampaigns(process.env, accessToken),
    loadCampaignLocations(process.env, accessToken, BR_PLAN.campaignId),
    loadBrEntities(process.env, accessToken),
  ]);
  const attachedCampaignIds = await loadSharedSetAttachments(process.env, accessToken, sharedSet.resourceName);

  const sharedCriteriaPlan = buildSharedCriteriaOps(sharedSet, approvedCriteria);
  const attachmentPlan = buildAttachmentOps(campaignsById, attachedCampaignIds, sharedSet.resourceName);
  const brGeoPlan = buildBrGeoOps(campaignsById, brLocations);
  const brGeoTypePlan = buildBrCampaignGeoTypeOps(campaignsById);
  const brActivationPlan = buildBrActivationOps(brEntities);
  const arHoldPlan = buildArHoldOps(campaignsById);

  if (!brGeoPlan.hasColombiaNegative) {
    throw new Error('BR campaign is missing Colombia negative geo guardrail; aborting activation plan.');
  }

  const responses = {
    sharedCriteria: await mutate({ env: process.env, accessToken, requestPath: 'sharedCriteria:mutate', operations: sharedCriteriaPlan.operations, validateOnly }),
    campaignSharedSets: await mutate({ env: process.env, accessToken, requestPath: 'campaignSharedSets:mutate', operations: attachmentPlan.operations, validateOnly }),
    brCampaignCriteria: await mutate({ env: process.env, accessToken, requestPath: 'campaignCriteria:mutate', operations: brGeoPlan.operations, validateOnly }),
    brCampaignGeoType: await mutate({ env: process.env, accessToken, requestPath: 'campaigns:mutate', operations: brGeoTypePlan.operations, validateOnly }),
    arCampaignHold: await mutate({ env: process.env, accessToken, requestPath: 'campaigns:mutate', operations: arHoldPlan.operations, validateOnly }),
    brAdGroups: await mutate({ env: process.env, accessToken, requestPath: 'adGroups:mutate', operations: brActivationPlan.adGroupOperations, validateOnly }),
    brKeywords: await mutate({ env: process.env, accessToken, requestPath: 'adGroupCriteria:mutate', operations: brActivationPlan.keywordOperations, validateOnly }),
    brAds: await mutate({ env: process.env, accessToken, requestPath: 'adGroupAds:mutate', operations: brActivationPlan.adOperations, validateOnly }),
  };

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: validateOnly ? 'validateOnly' : 'applyBr',
    customerId: CUSTOMER_ID(),
    sharedNegativeSet: {
      name: sharedSet.name,
      resourceName: sharedSet.resourceName,
      existingCriteriaCount: sharedSet.criteria.length,
      approvedCriteriaCount: approvedCriteria.length,
      plannedAddCriteria: sharedCriteriaPlan.planned,
      skippedCoveredCriteria: sharedCriteriaPlan.skippedCovered.length,
    },
    sharedSetAttachments: {
      planned: attachmentPlan.planned,
      skippedExisting: attachmentPlan.skippedExisting,
    },
    brPlan: {
      campaign: campaignsById.get(BR_PLAN.campaignId),
      budgetKeptCop: BR_PLAN.keepBudgetCop,
      finalUrl: BR_PLAN.finalUrl,
      geo: brGeoPlan.planned,
      geoType: brGeoTypePlan.planned,
      activation: brActivationPlan.planned,
      guardedPaused: brActivationPlan.guardedPaused,
      hasColombiaNegative: brGeoPlan.hasColombiaNegative,
    },
    arPlan: {
      mode: 'hold_until_second_phase',
      hold: arHoldPlan.planned,
      nextGeo: { id: '1000073', name: 'Buenos Aires', resource: 'geoTargetConstants/1000073' },
      nextActivation: 'AG1_Paquetes_Colombia exact-only after BR 72h or 30 clicks',
    },
    operationCounts: {
      sharedCriteria: sharedCriteriaPlan.operations.length,
      campaignSharedSets: attachmentPlan.operations.length,
      brCampaignCriteria: brGeoPlan.operations.length,
      brCampaignGeoType: brGeoTypePlan.operations.length,
      arCampaignHold: arHoldPlan.operations.length,
      brAdGroups: brActivationPlan.adGroupOperations.length,
      brKeywords: brActivationPlan.keywordOperations.length,
      brAds: brActivationPlan.adOperations.length,
      total: sharedCriteriaPlan.operations.length + attachmentPlan.operations.length + brGeoPlan.operations.length + brGeoTypePlan.operations.length + arHoldPlan.operations.length + brActivationPlan.adGroupOperations.length + brActivationPlan.keywordOperations.length + brActivationPlan.adOperations.length,
    },
    responses: redact(responses),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `${stamp}-${validateOnly ? 'validate' : 'apply-br'}-report.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    jsonPath: path.relative(repoRoot, jsonPath),
    operationCounts: report.operationCounts,
    sharedSet: report.sharedNegativeSet.name,
    brGeo: report.brPlan.geo,
    brActivation: report.brPlan.activation,
    arPlan: report.arPlan,
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
