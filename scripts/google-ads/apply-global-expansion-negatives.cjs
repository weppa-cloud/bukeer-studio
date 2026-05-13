#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const ITERATION_DIR = path.join(
  repoRoot,
  'ops/google-ads/colombiatours/2026-05-global-expansion',
);

function printUsage() {
  console.log(`Usage:
  node scripts/google-ads/apply-global-expansion-negatives.cjs [--apply]

Default mode validates campaign negative keyword operations only.
--apply writes the planned negative keywords to existing campaigns.
`);
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
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
    path: 'campaignCriteria:mutate',
    body: {
      validateOnly,
      partialFailure: false,
      operations,
    },
  });
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
  const campaigns = parseCsv(path.join(ITERATION_DIR, '01_campaigns.csv'));
  const negatives = parseCsv(path.join(ITERATION_DIR, '03_negative_keywords.csv'));
  const campaignNames = campaigns.map((row) => row.campaign);
  const accessToken = await getAccessToken(process.env);

  const existingCampaignRows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      WHERE campaign.name IN (${campaignNames.map((name) => `'${name.replace(/'/g, "\\'")}'`).join(',')})
        AND campaign.status != 'REMOVED'
    `,
  });
  const campaignByName = new Map(
    existingCampaignRows.map((row) => [
      row.campaign.name,
      `customers/${stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)}/campaigns/${row.campaign.id}`,
    ]),
  );
  const missing = campaignNames.filter((name) => !campaignByName.has(name));
  if (missing.length) {
    throw new Error(`Cannot apply negatives; missing campaigns: ${missing.join(', ')}`);
  }

  const operations = [];
  for (const campaign of campaigns) {
    const campaignResource = campaignByName.get(campaign.campaign);
    for (const negative of negatives) {
      operations.push({
        create: {
          campaign: campaignResource,
          negative: true,
          keyword: {
            text: negative.negative_keyword,
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
    campaignCount: campaigns.length,
    negativeCount: negatives.length,
    operationCount: operations.length,
    campaigns: campaignNames,
    response: redact(response),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
