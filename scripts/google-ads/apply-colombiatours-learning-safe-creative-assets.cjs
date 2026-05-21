#!/usr/bin/env node
'use strict';

/**
 * Applies only non-serving ColombiaTours Search creative mutations.
 *
 * Safe mutations:
 * - Create responsive search ads in PAUSED state.
 * - Create text assets without attaching them to campaigns.
 *
 * Explicitly forbidden here:
 * - Enable/pause active campaigns, ad groups, ads, or keywords.
 * - Change budget, bidding, conversion goals, geo, final URLs on active ads.
 * - Attach assets to active campaigns.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  loadDotEnvFile,
  stripCustomerId,
  assertRequiredEnv,
  redact,
} = require('./validate-conversion-governance.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-learning-safe-creative-assets.cjs [--date=YYYY-MM-DD]
  node scripts/google-ads/apply-colombiatours-learning-safe-creative-assets.cjs --apply [--date=YYYY-MM-DD]

Default: validateOnly.
--apply: creates only PAUSED RSAs and unattached text assets from the validated shadow plan.
`);
}

function parseArgs(argv) {
  const args = { date: DEFAULT_DATE, apply: false, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--apply') args.apply = true;
    else if (arg.startsWith('--date=')) args.date = arg.slice('--date='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be YYYY-MM-DD');
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function toCsv(rows, columns) {
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')).join('\n')}\n`;
}

function table(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(row[column.key] ?? '').replace(/\|/g, '/')).join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return normalize(value).replace(/\/$/, '');
  }
}

function listKey(values) {
  return (values || []).map(normalize).join('|');
}

function rsaKey(row) {
  return [
    'rsa',
    row.adGroupId,
    normalizeUrl(row.finalUrl),
    normalize(row.path1),
    normalize(row.path2),
    listKey(row.headlines),
    listKey(row.descriptions),
  ].join('::');
}

function assetKey(row) {
  if (row.assetType === 'SITELINK') {
    return ['sitelink', normalize(row.linkText), normalize(row.description1), normalize(row.description2), normalizeUrl(row.finalUrl)].join('::');
  }
  if (row.assetType === 'CALLOUT') {
    return ['callout', normalize(row.text)].join('::');
  }
  if (row.assetType === 'STRUCTURED_SNIPPET') {
    return ['snippet', normalize(row.header), listKey(row.values)].join('::');
  }
  throw new Error(`Unsupported asset type: ${row.assetType}`);
}

function loadShadowPlan(date) {
  const planPath = path.join(repoRoot, 'artifacts/google-ads', `${date}-colombiatours-search-creative-assets-p1-p2-shadow`, 'creative-shadow-plan.json');
  if (!fs.existsSync(planPath)) throw new Error(`Missing shadow plan: ${path.relative(repoRoot, planPath)}`);
  const parsed = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  if (parsed?.meta?.googleAdsMutationsApplied !== 0) throw new Error('Shadow plan is not marked as zero-mutation.');
  return { planPath, parsed };
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
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${stripCustomerId(env.GOOGLE_ADS_CUSTOMER_ID)}/${requestPath}`,
    { method: 'POST', headers, body: JSON.stringify(body) },
  );
  const text = await response.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!response.ok) throw new Error(`${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  return parsed;
}

async function search({ env, accessToken, query }) {
  const chunks = await googleAdsRequest({ env, accessToken, requestPath: 'googleAds:searchStream', body: { query } });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function mutate({ env, accessToken, requestPath, operations, validateOnly }) {
  if (!operations.length) return { skipped: true, operationCount: 0, response: { results: [] } };
  const response = await googleAdsRequest({
    env,
    accessToken,
    requestPath,
    body: { validateOnly, partialFailure: false, operations },
  });
  return { skipped: false, operationCount: operations.length, response: redact(response) };
}

async function loadExistingRsaKeys(env, accessToken, adGroupIds) {
  if (!adGroupIds.length) return new Set();
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        ad_group.id,
        ad_group_ad.status,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions
      FROM ad_group_ad
      WHERE ad_group.id IN (${adGroupIds.join(',')})
        AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD
        AND ad_group_ad.status != REMOVED`,
  });
  return new Set(rows.map((row) => rsaKey({
    adGroupId: String(row.adGroup.id),
    finalUrl: row.adGroupAd.ad.finalUrls?.[0] || '',
    path1: row.adGroupAd.ad.responsiveSearchAd?.path1 || '',
    path2: row.adGroupAd.ad.responsiveSearchAd?.path2 || '',
    headlines: (row.adGroupAd.ad.responsiveSearchAd?.headlines || []).map((asset) => asset.text),
    descriptions: (row.adGroupAd.ad.responsiveSearchAd?.descriptions || []).map((asset) => asset.text),
  })));
}

async function loadExistingAssetKeys(env, accessToken) {
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        asset.type,
        asset.final_urls,
        asset.sitelink_asset.link_text,
        asset.sitelink_asset.description1,
        asset.sitelink_asset.description2,
        asset.callout_asset.callout_text,
        asset.structured_snippet_asset.header,
        asset.structured_snippet_asset.values
      FROM asset
      WHERE asset.type IN (SITELINK, CALLOUT, STRUCTURED_SNIPPET)`,
  });
  return new Set(rows.map((row) => {
    if (row.asset.type === 'SITELINK') {
      return assetKey({
        assetType: 'SITELINK',
        linkText: row.asset.sitelinkAsset?.linkText,
        description1: row.asset.sitelinkAsset?.description1,
        description2: row.asset.sitelinkAsset?.description2,
        finalUrl: row.asset.finalUrls?.[0] || '',
      });
    }
    if (row.asset.type === 'CALLOUT') {
      return assetKey({
        assetType: 'CALLOUT',
        text: row.asset.calloutAsset?.calloutText,
      });
    }
    return assetKey({
      assetType: 'STRUCTURED_SNIPPET',
      header: row.asset.structuredSnippetAsset?.header,
      values: row.asset.structuredSnippetAsset?.values || [],
    });
  }));
}

function buildRsaOperation(customerId, row) {
  return {
    create: {
      adGroup: `customers/${customerId}/adGroups/${row.adGroupId}`,
      status: 'PAUSED',
      ad: {
        finalUrls: [row.finalUrl],
        responsiveSearchAd: {
          headlines: row.headlines.map((text) => ({ text })),
          descriptions: row.descriptions.map((text) => ({ text })),
          path1: row.path1,
          path2: row.path2,
        },
      },
    },
  };
}

function buildAssetOperation(row) {
  if (row.assetType === 'SITELINK') {
    return {
      create: {
        finalUrls: [row.finalUrl],
        sitelinkAsset: {
          linkText: row.linkText,
          description1: row.description1,
          description2: row.description2,
        },
      },
    };
  }
  if (row.assetType === 'CALLOUT') {
    return { create: { calloutAsset: { calloutText: row.text } } };
  }
  if (row.assetType === 'STRUCTURED_SNIPPET') {
    return { create: { structuredSnippetAsset: { header: row.header, values: row.values } } };
  }
  throw new Error(`Unsupported asset type: ${row.assetType}`);
}

function renderMarkdown({ generatedAt, mode, sourcePlan, rsaPlanned, rsaSkipped, assetPlanned, assetSkipped, validateReport, applyReport, outDirRelative }) {
  const summaryRows = [
    { resource: 'Paused RSA', planned: rsaPlanned.length, skipped: rsaSkipped.length, appliedOrValidated: validateReport.rsa.operationCount || 0, servingImpact: 'none: status PAUSED' },
    { resource: 'Unattached text asset', planned: assetPlanned.length, skipped: assetSkipped.length, appliedOrValidated: validateReport.assets.operationCount || 0, servingImpact: 'none: not attached' },
  ];
  return [
    '# ColombiaTours Learning-Safe Creative Apply',
    '',
    `Generated: ${generatedAt}`,
    `Mode: ${mode}`,
    `Source plan: \`${sourcePlan}\``,
    `Google Ads serving mutations applied: 0`,
    `Campaign/ad group/keyword/budget/bidding/geo/conversion changes: 0`,
    '',
    '## Applied Scope',
    '',
    table(summaryRows, [
      { key: 'resource', label: 'Resource' },
      { key: 'planned', label: 'New Ops' },
      { key: 'skipped', label: 'Skipped Existing' },
      { key: 'appliedOrValidated', label: 'Ops' },
      { key: 'servingImpact', label: 'Serving Impact' },
    ]),
    '',
    '## Safety Guarantees',
    '',
    '- RSAs are created only with `PAUSED` status.',
    '- Assets are created only as account assets and are not attached to campaigns.',
    '- No active ad, keyword, budget, bid strategy, geo, conversion goal, campaign, or ad group was changed.',
    '- Any future enablement or attachment remains blocked until explicit approval after the learning gate.',
    '',
    '## Files',
    '',
    `- \`${outDirRelative}/learning-safe-creative-apply-report.json\``,
    `- \`${outDirRelative}/paused-rsas-planned.csv\``,
    `- \`${outDirRelative}/assets-planned.csv\``,
    `- \`${outDirRelative}/skipped-existing-rsas.csv\``,
    `- \`${outDirRelative}/skipped-existing-assets.csv\``,
    '',
  ].join('\n');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  loadDotEnvFile(path.join(repoRoot, '.env.local'));
  loadDotEnvFile(path.join(repoRoot, '.env.mcp'));
  assertRequiredEnv();

  const generatedAt = new Date().toISOString();
  const customerId = stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const { planPath, parsed } = loadShadowPlan(args.date);
  const outDir = path.join(repoRoot, 'artifacts/google-ads', `${args.date}-colombiatours-learning-safe-creative-apply`);
  const docsOut = path.join(repoRoot, 'docs/audits', `${args.date}-colombiatours-learning-safe-creative-apply.md`);
  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));

  const accessToken = await getAccessToken(process.env);
  const shadowRsas = parsed.shadowRsas || [];
  const textAssets = [...(parsed.sitelinks || []), ...(parsed.callouts || []), ...(parsed.snippets || [])];

  const existingRsaKeys = await loadExistingRsaKeys(process.env, accessToken, [...new Set(shadowRsas.map((row) => row.adGroupId))]);
  const existingAssetKeys = await loadExistingAssetKeys(process.env, accessToken);

  const rsaPlanned = [];
  const rsaSkipped = [];
  for (const row of shadowRsas) {
    const key = rsaKey(row);
    if (existingRsaKeys.has(key)) rsaSkipped.push({ ...row, reason: 'already_exists' });
    else rsaPlanned.push({ ...row, key, operation: buildRsaOperation(customerId, row) });
  }

  const assetPlanned = [];
  const assetSkipped = [];
  for (const row of textAssets) {
    const key = assetKey(row);
    if (existingAssetKeys.has(key)) assetSkipped.push({ ...row, reason: 'already_exists' });
    else assetPlanned.push({ ...row, key, operation: buildAssetOperation(row) });
  }

  const validateReport = {
    mode: 'validateOnly',
    rsa: await mutate({
      env: process.env,
      accessToken,
      requestPath: 'adGroupAds:mutate',
      operations: rsaPlanned.map((row) => row.operation),
      validateOnly: true,
    }),
    assets: await mutate({
      env: process.env,
      accessToken,
      requestPath: 'assets:mutate',
      operations: assetPlanned.map((row) => row.operation),
      validateOnly: true,
    }),
  };

  const applyReport = args.apply
    ? {
        mode: 'apply_non_serving_only',
        rsa: await mutate({
          env: process.env,
          accessToken,
          requestPath: 'adGroupAds:mutate',
          operations: rsaPlanned.map((row) => row.operation),
          validateOnly: false,
        }),
        assets: await mutate({
          env: process.env,
          accessToken,
          requestPath: 'assets:mutate',
          operations: assetPlanned.map((row) => row.operation),
          validateOnly: false,
        }),
      }
    : { mode: 'not_applied', rsa: { operationCount: 0 }, assets: { operationCount: 0 } };

  const report = {
    meta: {
      generatedAt,
      mode: args.apply ? 'apply_non_serving_only' : 'validate_only',
      sourcePlan: path.relative(repoRoot, planPath),
      googleAdsServingMutationsApplied: 0,
      activeCampaignLearningImpact: 'none',
      createdResourceTypes: args.apply ? ['PAUSED_RESPONSIVE_SEARCH_AD', 'UNATTACHED_TEXT_ASSET'] : [],
      customerId,
    },
    rsaPlanned: rsaPlanned.map(({ operation, ...row }) => row),
    rsaSkipped,
    assetPlanned: assetPlanned.map(({ operation, ...row }) => row),
    assetSkipped,
    validateReport,
    applyReport,
  };

  fs.writeFileSync(path.join(outDir, 'learning-safe-creative-apply-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'paused-rsas-planned.csv'), toCsv(report.rsaPlanned, [
    'campaignId', 'campaignName', 'adGroupId', 'adGroupName', 'statusForFutureApply', 'finalUrl', 'path1', 'path2', 'headlines', 'descriptions', 'key',
  ]));
  fs.writeFileSync(path.join(outDir, 'assets-planned.csv'), toCsv(report.assetPlanned, [
    'campaignId', 'campaignName', 'priority', 'assetType', 'linkText', 'description1', 'description2', 'finalUrl', 'text', 'header', 'values', 'attachNow', 'key',
  ]));
  fs.writeFileSync(path.join(outDir, 'skipped-existing-rsas.csv'), toCsv(report.rsaSkipped, [
    'campaignId', 'campaignName', 'adGroupId', 'adGroupName', 'statusForFutureApply', 'finalUrl', 'path1', 'path2', 'headlines', 'descriptions', 'reason',
  ]));
  fs.writeFileSync(path.join(outDir, 'skipped-existing-assets.csv'), toCsv(report.assetSkipped, [
    'campaignId', 'campaignName', 'priority', 'assetType', 'linkText', 'description1', 'description2', 'finalUrl', 'text', 'header', 'values', 'attachNow', 'reason',
  ]));
  fs.writeFileSync(docsOut, renderMarkdown({
    generatedAt,
    mode: report.meta.mode,
    sourcePlan: report.meta.sourcePlan,
    rsaPlanned: report.rsaPlanned,
    rsaSkipped: report.rsaSkipped,
    assetPlanned: report.assetPlanned,
    assetSkipped: report.assetSkipped,
    validateReport,
    applyReport,
    outDirRelative: path.relative(repoRoot, outDir),
  }));

  console.log(JSON.stringify({
    ok: true,
    mode: report.meta.mode,
    sourcePlan: report.meta.sourcePlan,
    googleAdsServingMutationsApplied: 0,
    activeCampaignLearningImpact: 'none',
    docsOut: path.relative(repoRoot, docsOut),
    outDir: path.relative(repoRoot, outDir),
    counts: {
      pausedRsaCreateOps: rsaPlanned.length,
      skippedExistingRsas: rsaSkipped.length,
      unattachedAssetCreateOps: assetPlanned.length,
      skippedExistingAssets: assetSkipped.length,
      validateOnlyRsaOps: validateReport.rsa.operationCount || 0,
      validateOnlyAssetOps: validateReport.assets.operationCount || 0,
      appliedPausedRsaOps: applyReport.rsa.operationCount || 0,
      appliedUnattachedAssetOps: applyReport.assets.operationCount || 0,
    },
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
