#!/usr/bin/env node
const path = require('node:path');
const process = require('node:process');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');

const APPROVED_FOR_ACTIVATION = [
  'BR_Search_Colombia_Packages_2026_05',
  'AR_Search_Colombia_Packages_2026_05',
];

const HOLD_PAUSED = [
  'FR_Search_Colombie_Sur_Mesure_2026_05',
  'DE_Search_Kolumbien_Rundreise_2026_05',
];

function printUsage() {
  console.log(`Usage:
  node scripts/google-ads/activate-global-expansion-campaigns.cjs [--apply]

Default mode validates activation changes only.
--apply enables the approved campaigns and leaves hold campaigns paused.
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
  return googleAdsRequest({
    env,
    accessToken,
    path: 'campaigns:mutate',
    body: {
      validateOnly,
      operations,
    },
  });
}

async function run() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const apply = process.argv.includes('--apply');
  const accessToken = await getAccessToken(process.env);
  const allNames = [...APPROVED_FOR_ACTIVATION, ...HOLD_PAUSED];
  const quotedNames = allNames.map((name) => `'${name}'`).join(', ');

  const rows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.name,
        campaign.resource_name,
        campaign.status,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.name IN (${quotedNames})
    `,
  });

  const campaigns = rows.map((row) => ({
    id: row.campaign.id,
    name: row.campaign.name,
    resourceName: row.campaign.resourceName,
    status: row.campaign.status,
    dailyBudgetCop: Number(row.campaignBudget?.amountMicros || 0) / 1_000_000,
  }));

  const byName = new Map(campaigns.map((campaign) => [campaign.name, campaign]));
  const missing = allNames.filter((name) => !byName.has(name));
  if (missing.length) {
    throw new Error(`Missing expected campaigns: ${missing.join(', ')}`);
  }

  const holdNotPaused = HOLD_PAUSED
    .map((name) => byName.get(name))
    .filter((campaign) => campaign.status !== 'PAUSED');
  if (holdNotPaused.length) {
    throw new Error(
      `Hold campaigns are not paused: ${holdNotPaused
        .map((campaign) => `${campaign.name}=${campaign.status}`)
        .join(', ')}`,
    );
  }

  const operations = APPROVED_FOR_ACTIVATION.map((name) => byName.get(name))
    .filter((campaign) => campaign.status !== 'ENABLED')
    .map((campaign) => ({
      update: {
        resourceName: campaign.resourceName,
        status: 'ENABLED',
      },
      updateMask: 'status',
    }));

  const response = operations.length
    ? await mutate({
        env: process.env,
        accessToken,
        operations,
        validateOnly: !apply,
      })
    : { results: [], alreadyEnabled: true };

  const latestRows = apply
    ? await search({
        env: process.env,
        accessToken,
        query: `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign_budget.amount_micros
          FROM campaign
          WHERE campaign.name IN (${quotedNames})
        `,
      })
    : rows;

  const latest = latestRows.map((row) => ({
    id: row.campaign.id,
    name: row.campaign.name,
    status: row.campaign.status,
    dailyBudgetCop: Number(row.campaignBudget?.amountMicros || 0) / 1_000_000,
  }));

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'APPLIED' : 'VALIDATE_ONLY',
        approvedForActivation: APPROVED_FOR_ACTIVATION,
        heldPaused: HOLD_PAUSED,
        operations: operations.length,
        response: redact(response),
        campaigns: latest,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
