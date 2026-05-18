#!/usr/bin/env node
const path = require('node:path');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const TARGETS = [
  { id: '23829507075', name: 'CL_Search_Colombia_SanAndres_2026_05' },
  { id: '23829536568', name: 'US_Florida_NY_Colombia_Packages_2026_05' },
];
const FINAL_URL_SUFFIX =
  'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}&gclid={gclid}';

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
  if (!response.ok) throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
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
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
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

async function run() {
  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const apply = process.argv.includes('--apply');
  const accessToken = await getAccessToken(process.env);
  const ids = TARGETS.map((t) => t.id).join(',');
  const rows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status, campaign.final_url_suffix
      FROM campaign
      WHERE campaign.id IN (${ids})
        AND campaign.status != 'REMOVED'
    `,
  });

  const byId = new Map(rows.map((row) => [String(row.campaign.id), row]));
  const missing = TARGETS.filter((t) => !byId.has(String(t.id)));
  if (missing.length) throw new Error(`Missing campaigns: ${missing.map((m) => m.id).join(', ')}`);

  const operations = TARGETS.map((t) => ({
    update: {
      resourceName: `customers/${stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)}/campaigns/${t.id}`,
      finalUrlSuffix: FINAL_URL_SUFFIX,
    },
    updateMask: 'final_url_suffix',
  }));

  const mutateResponse = await googleAdsRequest({
    env: process.env,
    accessToken,
    path: 'campaigns:mutate',
    body: {
      validateOnly: !apply,
      partialFailure: false,
      operations,
    },
  });

  const after = apply
    ? await search({
        env: process.env,
        accessToken,
        query: `
          SELECT campaign.id, campaign.name, campaign.status, campaign.final_url_suffix
          FROM campaign
          WHERE campaign.id IN (${ids})
        `,
      })
    : rows;

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'validateOnly',
        targetIds: TARGETS.map((t) => t.id),
        finalUrlSuffix: FINAL_URL_SUFFIX,
        before: rows.map((r) => ({
          id: r.campaign.id,
          name: r.campaign.name,
          status: r.campaign.status,
          finalUrlSuffix: r.campaign.finalUrlSuffix || '',
        })),
        response: redact(mutateResponse),
        after: after.map((r) => ({
          id: r.campaign.id,
          name: r.campaign.name,
          status: r.campaign.status,
          finalUrlSuffix: r.campaign.finalUrlSuffix || '',
        })),
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error.message || String(error));
  process.exitCode = 1;
});
