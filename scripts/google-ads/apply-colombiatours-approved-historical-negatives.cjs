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
const APPROVAL_CSV = path.join(
  repoRoot,
  'artifacts/google-ads/2026-05-18-colombiatours-24m-mining/negative-approval-shortlist.csv',
);
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-approved-negatives-apply');

const TARGET_CAMPAIGNS = [
  'BR_Search_Colombia_Packages_2026_05',
  'AR_Search_Colombia_Packages_2026_05',
  'MX_Multidestino_y_Caribe_2026_05',
  'ES_Cartagena_Medellin_2026_05',
  'CL_Search_Colombia_SanAndres_2026_05',
  'US_Florida_NY_Colombia_Packages_2026_05',
];

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

function printUsage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-approved-historical-negatives.cjs [--apply]

Default mode validates approved historical negative keyword operations only.
--apply mutates Google Ads campaign negative keywords.

Behavior:
- Reads approved exact negatives from negative-approval-shortlist.csv.
- Applies approved phrase blockers for flight/ticket airline leakage.
- Skips duplicates.
- Skips exact negatives already covered by existing or planned phrase negatives.
- Targets current controlled/current comparator campaigns only: BR, AR, MX, ES, CL, US.
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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OAuth refresh failed: ${JSON.stringify(redact(body))}`);
  if (!body.access_token) throw new Error('OAuth response missing access_token');
  return body.access_token;
}

async function googleAdsRequest({ env, accessToken, requestPath, body }) {
  const apiVersion = env.GOOGLE_ADS_API_VERSION || 'v24';
  const customerId = stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID);
  const headers = {
    authorization: `Bearer ${accessToken}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'content-type': 'application/json',
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  }

  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/${requestPath}`,
    {
      method: 'POST',
      headers,
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
    requestPath: 'googleAds:searchStream',
    body: { query },
  });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function mutateCampaignCriteria({ env, accessToken, operations, validateOnly }) {
  if (!operations.length) return { results: [] };
  return googleAdsRequest({
    env,
    accessToken,
    requestPath: 'campaignCriteria:mutate',
    body: {
      validateOnly,
      partialFailure: false,
      operations,
    },
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
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  if (!headers) return [];
  return body
    .filter((entry) => entry.some((cell) => cell !== ''))
    .map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index] || ''])));
}

function readApprovedExactNegatives() {
  const rows = parseCsv(fs.readFileSync(APPROVAL_CSV, 'utf8'));
  return rows
    .filter((row) => row.recommendedDecision === 'APPROVE')
    .map((row) => ({
      text: row.keywordText,
      matchType: row.matchType || 'EXACT',
      priority: row.priority,
      bucket: row.bucket,
      intent: row.intent,
      estimatedWasteCop: Number(row.estimatedWasteCop || 0),
    }))
    .filter((row) => row.text && row.matchType === 'EXACT');
}

function isCoveredByPhrase(text, phraseTexts) {
  const normalizedText = ` ${normalize(text)} `;
  return phraseTexts.some((phrase) => normalizedText.includes(` ${normalize(phrase)} `));
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')).join('\n')}\n`;
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
  const approvedExact = readApprovedExactNegatives();
  const accessToken = await getAccessToken(process.env);

  const campaignRows = await search({
    env: process.env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      WHERE campaign.name IN (${TARGET_CAMPAIGNS.map(quote).join(',')})
        AND campaign.status != 'REMOVED'
    `,
  });

  const campaignByName = new Map(campaignRows.map((row) => [row.campaign.name, {
    id: String(row.campaign.id),
    name: row.campaign.name,
    status: row.campaign.status,
    resource: `customers/${stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID)}/campaigns/${row.campaign.id}`,
  }]));
  const missingCampaigns = TARGET_CAMPAIGNS.filter((name) => !campaignByName.has(name));
  if (missingCampaigns.length) {
    throw new Error(`Missing target campaigns: ${missingCampaigns.join(', ')}`);
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
      WHERE campaign.name IN (${TARGET_CAMPAIGNS.map(quote).join(',')})
        AND campaign_criterion.type = KEYWORD
        AND campaign_criterion.negative = true
        AND campaign_criterion.status != 'REMOVED'
    `,
  });

  const existingByCampaign = groupBy(existingRows, (row) => String(row.campaign.id));
  const existingKeys = new Set(existingRows.map((row) => [
    String(row.campaign.id),
    normalize(row.campaignCriterion.keyword.text),
    row.campaignCriterion.keyword.matchType || row.campaignCriterion.keyword.match_type || 'PHRASE',
  ].join('|')));

  const operations = [];
  const planned = [];
  const skippedExisting = [];
  const skippedCoveredByPhrase = [];

  for (const campaignName of TARGET_CAMPAIGNS) {
    const campaign = campaignByName.get(campaignName);
    const existingPhraseTexts = (existingByCampaign.get(campaign.id) || [])
      .filter((row) => (row.campaignCriterion.keyword.matchType || row.campaignCriterion.keyword.match_type) === 'PHRASE')
      .map((row) => row.campaignCriterion.keyword.text);
    const plannedPhraseTexts = [...APPROVED_PHRASE_NEGATIVES];
    const coveragePhraseTexts = [...existingPhraseTexts, ...plannedPhraseTexts];

    for (const negative of APPROVED_PHRASE_NEGATIVES) {
      const key = [campaign.id, normalize(negative), 'PHRASE'].join('|');
      if (existingKeys.has(key)) {
        skippedExisting.push({ campaignName, keywordText: negative, matchType: 'PHRASE' });
        continue;
      }
      planned.push({ campaignName, campaignStatus: campaign.status, keywordText: negative, matchType: 'PHRASE', source: 'approved_phrase_option' });
      operations.push({
        create: {
          campaign: campaign.resource,
          negative: true,
          keyword: { text: negative, matchType: 'PHRASE' },
        },
      });
    }

    for (const exact of approvedExact) {
      const key = [campaign.id, normalize(exact.text), 'EXACT'].join('|');
      if (existingKeys.has(key)) {
        skippedExisting.push({ campaignName, keywordText: exact.text, matchType: 'EXACT' });
        continue;
      }
      const coveredBy = coveragePhraseTexts.find((phrase) => isCoveredByPhrase(exact.text, [phrase]));
      if (coveredBy) {
        skippedCoveredByPhrase.push({ campaignName, keywordText: exact.text, matchType: 'EXACT', coveredByPhrase: coveredBy });
        continue;
      }
      planned.push({
        campaignName,
        campaignStatus: campaign.status,
        keywordText: exact.text,
        matchType: 'EXACT',
        source: exact.priority,
        intent: exact.intent,
        estimatedWasteCop: exact.estimatedWasteCop,
      });
      operations.push({
        create: {
          campaign: campaign.resource,
          negative: true,
          keyword: { text: exact.text, matchType: 'EXACT' },
        },
      });
    }
  }

  const response = await mutateCampaignCriteria({
    env: process.env,
    accessToken,
    operations,
    validateOnly,
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: validateOnly ? 'validateOnly' : 'apply',
    customerId: stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
    targetCampaigns: [...campaignByName.values()].map((campaign) => ({ id: campaign.id, name: campaign.name, status: campaign.status })),
    operationCount: operations.length,
    planned,
    skippedExisting,
    skippedCoveredByPhrase,
    existingNegativeRows: existingRows.length,
    approvedExactCount: approvedExact.length,
    approvedPhraseNegatives: APPROVED_PHRASE_NEGATIVES,
    response: redact(response),
  };
  const jsonPath = path.join(OUT_DIR, `${stamp}-${validateOnly ? 'validate' : 'apply'}-report.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, `${stamp}-${validateOnly ? 'validate' : 'apply'}-planned.csv`), toCsv(planned));
  fs.writeFileSync(path.join(OUT_DIR, `${stamp}-${validateOnly ? 'validate' : 'apply'}-skipped-covered.csv`), toCsv(skippedCoveredByPhrase));

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    jsonPath: path.relative(repoRoot, jsonPath),
    operationCount: report.operationCount,
    plannedByMatchType: Object.fromEntries([...groupBy(planned, (row) => row.matchType)].map(([key, rows]) => [key, rows.length])),
    skippedExisting: skippedExisting.length,
    skippedCoveredByPhrase: skippedCoveredByPhrase.length,
    campaignStatuses: Object.fromEntries([...campaignByName.values()].map((campaign) => [campaign.name, campaign.status])),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
