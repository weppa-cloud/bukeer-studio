#!/usr/bin/env node
const path = require('node:path');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');

const PLAN = [
  {
    campaignName: 'CL_Search_Colombia_SanAndres_2026_05',
    negatives: [
      'falabella',
      'viajes falabella',
      'despegar',
      'despegar san andres',
      'pasajes',
      'pasaje',
      'pasaje en avion',
      'bus',
      '2x1',
      'oferta',
      'hotel',
      'hoteles',
      'resort',
      'all inclusive hotel',
      'vuelos',
      'vuelo',
      'avion',
      'vuelo mas hotel',
      'paquetes falabella',
    ],
  },
  {
    campaignName: 'MX_Multidestino_y_Caribe_2026_05',
    negatives: [
      'avion',
      'vuelos',
      'vuelo',
      'aerolineas',
      'aerolinea',
      'tour en',
      'tours en',
      'tour medellin',
      'agencia de tour',
      'agencia de tour local',
      'quimbaya',
      'excursiones',
      'excursion',
      'day tour',
      'free tour',
      'tours locales',
    ],
  },
];

function printUsage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-negative-keywords.cjs [--apply]

Default mode validates campaign negative keyword operations only.
--apply writes missing phrase-match negatives to Chile and MX campaigns.
`);
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
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
  }
  return body.access_token;
}

async function googleAdsRequest({ env, accessToken, path: requestPath, body }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const customerId = stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/${requestPath}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
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
    throw new Error(`${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  }
  return parsed;
}

async function search({ env, accessToken, query }) {
  const chunks = await googleAdsRequest({
    env,
    accessToken,
    path: 'googleAds:searchStream',
    body: { query },
  });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function mutate({ env, accessToken, operations, validateOnly }) {
  if (operations.length === 0) return { results: [] };
  return googleAdsRequest({
    env,
    accessToken,
    path: 'campaignCriteria:mutate',
    body: {
      validateOnly,
      partialFailure: false,
      operations,
    },
  });
}

function quote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const validateOnly = !process.argv.includes('--apply');
  const campaignNames = PLAN.map((entry) => entry.campaignName);
  const accessToken = await getAccessToken(process.env);

  const campaignRows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      WHERE campaign.name IN (${campaignNames.map(quote).join(',')})
        AND campaign.status != 'REMOVED'
    `,
  });

  const campaignByName = new Map(
    campaignRows.map((row) => [
      row.campaign.name,
      {
        id: row.campaign.id,
        resource: `customers/${stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)}/campaigns/${row.campaign.id}`,
        status: row.campaign.status,
      },
    ]),
  );
  const missing = campaignNames.filter((name) => !campaignByName.has(name));
  if (missing.length) {
    throw new Error(`Cannot apply negatives; missing campaigns: ${missing.join(', ')}`);
  }

  const existingRows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.name,
        campaign_criterion.keyword.text,
        campaign_criterion.keyword.match_type,
        campaign_criterion.negative,
        campaign_criterion.status
      FROM campaign_criterion
      WHERE campaign.name IN (${campaignNames.map(quote).join(',')})
        AND campaign_criterion.type = KEYWORD
        AND campaign_criterion.negative = true
        AND campaign_criterion.status != 'REMOVED'
    `,
  });

  const existing = new Set(
    existingRows.map((row) => [
      row.campaign.id,
      normalize(row.campaignCriterion.keyword.text || ''),
      row.campaignCriterion.keyword.matchType || row.campaignCriterion.keyword.match_type || 'PHRASE',
    ].join('|')),
  );

  const operations = [];
  const planned = [];
  const skippedExisting = [];

  for (const entry of PLAN) {
    const campaign = campaignByName.get(entry.campaignName);
    for (const negative of entry.negatives) {
      const key = [campaign.id, normalize(negative), 'PHRASE'].join('|');
      if (existing.has(key)) {
        skippedExisting.push({ campaign: entry.campaignName, negative });
        continue;
      }
      planned.push({ campaign: entry.campaignName, negative });
      operations.push({
        create: {
          campaign: campaign.resource,
          negative: true,
          keyword: {
            text: negative,
            matchType: 'PHRASE',
          },
        },
      });
    }
  }

  const response = await mutate({
    env: process.env,
    accessToken,
    operations,
    validateOnly,
  });

  console.log(JSON.stringify({
    ok: true,
    mode: validateOnly ? 'validateOnly' : 'apply',
    operationCount: operations.length,
    planned,
    skippedExisting,
    campaignStatuses: Object.fromEntries(
      [...campaignByName.entries()].map(([name, campaign]) => [name, campaign.status]),
    ),
    response: redact(response),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
