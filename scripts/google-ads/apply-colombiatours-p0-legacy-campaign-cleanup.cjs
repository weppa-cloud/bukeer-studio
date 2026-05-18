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
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-p0-legacy-cleanup');
const CUSTOMER_ID = () => stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);

const TARGET_CAMPAIGNS = [
  {
    id: '21009761945',
    name: 'Mexico Viajar a colombia  Prueba 44',
    reason: 'enabled legacy campaign has active ads pointing to /viajar-a-colombia-con-todo-incluido2, which renders a 200 noindex not-found page',
  },
  {
    id: '20047406299',
    name: 'Mexico Viajar a colombia dirigirlos al home',
    reason: 'enabled legacy shell campaign has no useful recent spend/clicks and should not compete with controlled MX learning campaign',
  },
];

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-p0-legacy-campaign-cleanup.cjs
  node scripts/google-ads/apply-colombiatours-p0-legacy-campaign-cleanup.cjs --apply

Default validates only. --apply pauses eligible ad groups and ads in the two
legacy campaigns listed in TARGET_CAMPAIGNS. These campaigns are Google Ads
trial campaigns, so campaign.status cannot be modified directly by API.
`);
}

function parseArgs(argv) {
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    apply: argv.includes('--apply'),
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
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions
      FROM campaign
      WHERE campaign.id IN (${ids})
        AND campaign.status != 'REMOVED'
        AND segments.date DURING LAST_30_DAYS`,
  });
  const byId = new Map();
  for (const row of rows) {
    byId.set(String(row.campaign.id), {
      id: String(row.campaign.id),
      resourceName: row.campaign.resourceName,
      name: row.campaign.name,
      status: row.campaign.status,
      budgetMicros: row.campaignBudget?.amountMicros || '0',
      costMicros30d: row.metrics?.costMicros || '0',
      clicks30d: Number(row.metrics?.clicks || 0),
      impressions30d: Number(row.metrics?.impressions || 0),
    });
  }
  return byId;
}

async function loadAds(env, accessToken) {
  const ids = TARGET_CAMPAIGNS.map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.resource_name,
        ad_group.name,
        ad_group.status,
        ad_group_ad.resource_name,
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls
      FROM ad_group_ad
      WHERE campaign.id IN (${ids})
        AND ad_group_ad.status != 'REMOVED'`,
  });
  return rows.map((row) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    adGroupId: String(row.adGroup.id),
    adGroupResourceName: row.adGroup.resourceName,
    adGroupName: row.adGroup.name,
    adGroupStatus: row.adGroup.status,
    adGroupAdResourceName: row.adGroupAd.resourceName,
    adId: String(row.adGroupAd.ad.id),
    status: row.adGroupAd.status,
    type: row.adGroupAd.ad.type,
    finalUrls: row.adGroupAd.ad.finalUrls || [],
  }));
}

function buildOps(campaignsById, adsBefore) {
  const adGroupOperations = [];
  const adGroupAdOperations = [];
  const planned = [];
  const skipped = [];
  const adGroupsByResource = new Map();

  for (const ad of adsBefore) {
    if (ad.adGroupStatus === 'ENABLED' && ad.adGroupResourceName) {
      adGroupsByResource.set(ad.adGroupResourceName, {
        campaignId: ad.campaignId,
        campaignName: ad.campaignName,
        adGroupId: ad.adGroupId,
        adGroupName: ad.adGroupName,
        resourceName: ad.adGroupResourceName,
      });
    }
    if (ad.status === 'ENABLED' && ad.adGroupAdResourceName) {
      adGroupAdOperations.push({
        update: { resourceName: ad.adGroupAdResourceName, status: 'PAUSED' },
        updateMask: 'status',
      });
      planned.push({
        entity: 'ad_group_ad',
        action: 'pause',
        campaignId: ad.campaignId,
        campaignName: ad.campaignName,
        adGroupId: ad.adGroupId,
        adGroupName: ad.adGroupName,
        adId: ad.adId,
        adType: ad.type,
        finalUrls: ad.finalUrls,
      });
    }
  }

  for (const adGroup of adGroupsByResource.values()) {
    adGroupOperations.push({
      update: { resourceName: adGroup.resourceName, status: 'PAUSED' },
      updateMask: 'status',
    });
    planned.push({
      entity: 'ad_group',
      action: 'pause',
      campaignId: adGroup.campaignId,
      campaignName: adGroup.campaignName,
      adGroupId: adGroup.adGroupId,
      adGroupName: adGroup.adGroupName,
    });
  }

  for (const target of TARGET_CAMPAIGNS) {
    const campaign = campaignsById.get(target.id);
    if (!campaign) throw new Error(`Target campaign not found: ${target.id} ${target.name}`);
    skipped.push({
      ...target,
      campaignStatus: campaign.status,
      campaignStatusMutation: 'skipped_trial_campaign_api_restriction',
      metrics30d: {
        costMicros: campaign.costMicros30d,
        clicks: campaign.clicks30d,
        impressions: campaign.impressions30d,
      },
    });
  }

  return { adGroupOperations, adGroupAdOperations, planned, skipped };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const validateOnly = !args.apply;
  const accessToken = await getAccessToken(process.env);
  const [campaignsById, adsBefore] = await Promise.all([
    loadCampaigns(process.env, accessToken),
    loadAds(process.env, accessToken),
  ]);
  const plan = buildOps(campaignsById, adsBefore);
  const responses = {
    adGroupAds: await mutate({
      env: process.env,
      accessToken,
      requestPath: 'adGroupAds:mutate',
      operations: plan.adGroupAdOperations,
      validateOnly,
    }),
    adGroups: await mutate({
      env: process.env,
      accessToken,
      requestPath: 'adGroups:mutate',
      operations: plan.adGroupOperations,
      validateOnly,
    }),
  };
  const campaignsAfter = args.apply ? await loadCampaigns(process.env, accessToken) : campaignsById;
  const adsAfter = args.apply ? await loadAds(process.env, accessToken) : adsBefore;

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: validateOnly ? 'validateOnly' : 'apply',
    customerId: CUSTOMER_ID(),
    targets: TARGET_CAMPAIGNS,
    planned: plan.planned,
    skipped: plan.skipped,
    adsBefore,
    adsAfter,
    operationCounts: {
      adGroupAds: plan.adGroupAdOperations.length,
      adGroups: plan.adGroupOperations.length,
      total: plan.adGroupAdOperations.length + plan.adGroupOperations.length,
    },
    responses: redact(responses),
    campaignsAfter: [...campaignsAfter.values()],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `${stamp}-${validateOnly ? 'validate' : 'apply'}-report.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    jsonPath: path.relative(repoRoot, jsonPath),
    operationCounts: report.operationCounts,
    planned: report.planned,
    skipped: report.skipped,
    campaignsAfter: report.campaignsAfter.map((campaign) => ({ id: campaign.id, name: campaign.name, status: campaign.status, clicks30d: campaign.clicks30d, costMicros30d: campaign.costMicros30d })),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
