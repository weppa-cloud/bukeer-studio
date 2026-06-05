#!/usr/bin/env node
'use strict';

/**
 * Executes only learning-safe ColombiaTours Search optimizations.
 *
 * Safety contract:
 * - No Google Ads mutate calls.
 * - No Supabase writes.
 * - No campaign/ad group/ad/keyword/budget/bidding/geo/conversion changes.
 * - Reads live state, validates active landing URLs, and materializes an execution ledger.
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

const CAMPAIGNS = [
  { id: '23843668228', market: 'BR', expectedName: 'BR_Search_Colombia_Packages_2026_05', activeScope: true },
  { id: '23815528484', market: 'MX', expectedName: 'MX_Multidestino_y_Caribe_2026_05', activeScope: true },
  { id: '23819986291', market: 'ES', expectedName: 'ES_Cartagena_Medellin_2026_05', activeScope: true },
  { id: '23829507075', market: 'CL', expectedName: 'CL_Search_Colombia_SanAndres_2026_05', activeScope: true },
  { id: '23833803528', market: 'AR', expectedName: 'AR_Search_Colombia_Packages_2026_05', activeScope: false },
  { id: '23829536568', market: 'US', expectedName: 'US_Florida_NY_Colombia_Packages_2026_05', activeScope: false },
  { id: '23833804680', market: 'FR', expectedName: 'FR_Search_Colombie_Sur_Mesure_2026_05', activeScope: false },
  { id: '23843667802', market: 'DE', expectedName: 'DE_Search_Kolumbien_Rundreise_2026_05', activeScope: false },
];

const BLOCKED_MUTATIONS = [
  ['budget_change', 'HIGH', 'Budget changes can disturb Smart Bidding and traffic volume.'],
  ['bidding_strategy_change', 'HIGH', 'Changing bidding strategy resets the optimization context.'],
  ['conversion_goal_change', 'HIGH', 'Changing primary goals changes the Smart Bidding objective.'],
  ['geo_or_presence_change', 'HIGH', 'Geo and presence changes alter the eligible auction population.'],
  ['active_keyword_add_remove_or_match_type_change', 'HIGH', 'Keyword/match changes alter search-term eligibility.'],
  ['active_ad_enable_pause_or_final_url_change', 'MEDIUM_HIGH', 'Active creative changes alter CTR, approval, and routing.'],
  ['asset_attachment_to_active_campaigns', 'MEDIUM', 'Attachments can change CTR and query mix; gate after 72h.'],
  ['lead_form_attachment', 'MEDIUM_HIGH', 'Lead forms can change lead quality and attribution flow.'],
  ['paused_campaign_activation', 'HIGH', 'Activation creates new traffic and learning/comparison noise.'],
];

function usage() {
  console.log(`Usage:
  node scripts/google-ads/optimize-colombiatours-learning-safe.cjs [--date=YYYY-MM-DD]

Produces a no-mutation optimization ledger for ColombiaTours active Search campaigns.
`);
}

function parseArgs(argv) {
  const args = { date: DEFAULT_DATE, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true;
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
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) throw new Error(`${requestPath} failed ${response.status}: ${JSON.stringify(redact(parsed))}`);
  return parsed;
}

async function search({ env, accessToken, query }) {
  const chunks = await googleAdsRequest({ env, accessToken, requestPath: 'googleAds:searchStream', body: { query } });
  return (chunks || []).flatMap((chunk) => chunk.results || []);
}

async function loadCampaignState(env, accessToken) {
  const ids = CAMPAIGNS.map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.serving_status,
        campaign.primary_status,
        campaign.primary_status_reasons,
        campaign.bidding_strategy_type,
        campaign.bidding_strategy_system_status,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.id IN (${ids})
      ORDER BY campaign.name`,
  });
  return rows.map((row) => {
    const campaignMeta = CAMPAIGNS.find((campaign) => campaign.id === String(row.campaign.id));
    const smartBidding = ['MAXIMIZE_CONVERSIONS', 'MAXIMIZE_CONVERSION_VALUE', 'TARGET_CPA', 'TARGET_ROAS'].includes(row.campaign.biddingStrategyType);
    return {
      id: String(row.campaign.id),
      market: campaignMeta?.market || '',
      name: row.campaign.name,
      status: row.campaign.status,
      servingStatus: row.campaign.servingStatus,
      primaryStatus: row.campaign.primaryStatus,
      primaryStatusReasons: row.campaign.primaryStatusReasons || [],
      biddingStrategyType: row.campaign.biddingStrategyType,
      biddingStrategySystemStatus: row.campaign.biddingStrategySystemStatus,
      budgetCop: Number(row.campaignBudget?.amountMicros || 0) / 1000000,
      learningRisk: smartBidding ? 'HIGH' : 'LOW',
      optimizationRule: smartBidding
        ? 'Freeze budget, bidding, conversions, geo, active keywords, active ads, and active asset attachments.'
        : 'Manual CPC: no Smart Bidding learning reset, but preserve controlled test windows.',
    };
  });
}

async function loadActiveAdFinalUrls(env, accessToken) {
  const activeIds = CAMPAIGNS.filter((campaign) => campaign.activeScope).map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.status,
        ad_group_ad.ad.final_urls
      FROM ad_group_ad
      WHERE campaign.id IN (${activeIds})
        AND campaign.status = ENABLED
        AND ad_group.status = ENABLED
        AND ad_group_ad.status = ENABLED`,
  });
  return rows.flatMap((row) => {
    const urls = row.adGroupAd?.ad?.finalUrls || [];
    return urls.map((url) => ({
      campaignId: String(row.campaign.id),
      campaignName: row.campaign.name,
      adGroupId: String(row.adGroup.id),
      adGroupName: row.adGroup.name,
      adId: String(row.adGroupAd.ad.id),
      adStatus: row.adGroupAd.status,
      finalUrl: url,
    }));
  });
}

async function inspectLanding(row) {
  const started = Date.now();
  try {
    const response = await fetch(row.finalUrl, {
      redirect: 'follow',
      headers: { 'user-agent': 'Codex ColombiaTours learning-safe landing audit/1.0' },
    });
    const body = await response.text();
    const lower = body.toLowerCase();
    return {
      ...row,
      httpStatus: response.status,
      resolvedUrl: response.url,
      latencyMs: Date.now() - started,
      hasGtmOrGtag: /gtm-|gtag\(|googletagmanager|datalayer/.test(lower),
      hasWhatsapp: /whatsapp|wa\.me|api\.whatsapp/.test(lower),
      hasWaflow: /waflow|wa-flow|wa_flow/.test(lower),
      indexableHint: /noindex/.test(lower) ? 'CHECK_NOINDEX_PRESENT' : 'NO_NOINDEX_DETECTED',
      okForActiveTraffic: response.status >= 200 && response.status < 300,
    };
  } catch (error) {
    return {
      ...row,
      httpStatus: 'ERROR',
      resolvedUrl: '',
      latencyMs: Date.now() - started,
      hasGtmOrGtag: false,
      hasWhatsapp: false,
      hasWaflow: false,
      indexableHint: 'UNKNOWN',
      okForActiveTraffic: false,
      error: error.message,
    };
  }
}

function loadCreativeShadow(date) {
  const creativePath = path.join(repoRoot, 'artifacts/google-ads', `${date}-colombiatours-search-creative-assets-p1-p2-shadow`, 'creative-shadow-plan.json');
  if (!fs.existsSync(creativePath)) {
    return { exists: false, path: path.relative(repoRoot, creativePath), summary: null, validate: null };
  }
  const parsed = JSON.parse(fs.readFileSync(creativePath, 'utf8'));
  return {
    exists: true,
    path: path.relative(repoRoot, creativePath),
    summary: {
      pausedRsaPlans: parsed.shadowRsas?.length || 0,
      sitelinks: parsed.sitelinks?.length || 0,
      callouts: parsed.callouts?.length || 0,
      structuredSnippets: parsed.snippets?.length || 0,
      imageBriefs: parsed.imageBriefs?.length || 0,
      leadFormBriefs: parsed.leadFormBriefs?.length || 0,
    },
    validate: parsed.validateReport || null,
  };
}

function buildSafeActions({ creativeShadow, landingChecks }) {
  return [
    {
      priority: 'P1',
      action: 'creative_shadow_package',
      status: creativeShadow.exists ? 'EXECUTED_LOCAL' : 'MISSING',
      learningImpact: 'NONE',
      evidence: creativeShadow.path,
      nextGate: 'Manual review before any paused-asset creation.',
    },
    {
      priority: 'P1',
      action: 'google_ads_validate_only',
      status: creativeShadow.validate?.mode === 'validateOnly' ? 'PASSED' : 'NOT_RUN',
      learningImpact: 'NONE',
      evidence: creativeShadow.exists ? creativeShadow.path : '',
      nextGate: 'No serving mutation applied.',
    },
    {
      priority: 'P1',
      action: 'active_landing_health_check',
      status: landingChecks.every((row) => row.okForActiveTraffic) ? 'PASSED' : 'REVIEW',
      learningImpact: 'NONE',
      evidence: `${landingChecks.length} active final URL rows checked`,
      nextGate: 'Fix only if HTTP/tracking fails; avoid final URL changes during learning window.',
    },
    {
      priority: 'P1',
      action: 'mutation_guardrail',
      status: 'APPLIED_AS_POLICY',
      learningImpact: 'NONE',
      evidence: 'Blocked high-risk mutation list generated.',
      nextGate: 'Any future apply must pass explicit user approval and validateOnly first.',
    },
  ];
}

function renderMarkdown({ generatedAt, campaignState, landingChecks, creativeShadow, safeActions, outDirRelative }) {
  return [
    '# ColombiaTours Learning-Safe Optimizations',
    '',
    `Generated: ${generatedAt}`,
    'Mode: read-only + local artifacts + Google Ads validateOnly evidence.',
    'Google Ads mutations applied: 0.',
    'Supabase writes applied: 0.',
    'Active campaign learning impact: none.',
    '',
    '## Campaign Learning Risk',
    '',
    table(campaignState, [
      { key: 'market', label: 'Market' },
      { key: 'name', label: 'Campaign' },
      { key: 'status', label: 'Status' },
      { key: 'primaryStatus', label: 'Primary' },
      { key: 'biddingStrategyType', label: 'Bidding' },
      { key: 'biddingStrategySystemStatus', label: 'Bid Status' },
      { key: 'learningRisk', label: 'Risk' },
    ]),
    '',
    '## Executed Safe Optimizations',
    '',
    table(safeActions, [
      { key: 'priority', label: 'Priority' },
      { key: 'action', label: 'Action' },
      { key: 'status', label: 'Status' },
      { key: 'learningImpact', label: 'Learning Impact' },
      { key: 'nextGate', label: 'Gate' },
    ]),
    '',
    '## Creative Shadow Package',
    '',
    creativeShadow.exists
      ? [
          `- Package: \`${creativeShadow.path}\``,
          `- Paused RSA plans: ${creativeShadow.summary.pausedRsaPlans}`,
          `- Sitelinks: ${creativeShadow.summary.sitelinks}`,
          `- Callouts: ${creativeShadow.summary.callouts}`,
          `- Structured snippets: ${creativeShadow.summary.structuredSnippets}`,
          `- Image briefs: ${creativeShadow.summary.imageBriefs}`,
          `- Lead-form briefs: ${creativeShadow.summary.leadFormBriefs}`,
          `- Validate-only RSA operations: ${creativeShadow.validate?.rsa?.operationCount || 0}`,
          `- Validate-only asset operations: ${creativeShadow.validate?.assets?.operationCount || 0}`,
        ].join('\n')
      : `- Missing: \`${creativeShadow.path}\``,
    '',
    '## Active Landing Checks',
    '',
    table(landingChecks.map((row) => ({
      campaignName: row.campaignName,
      adGroupName: row.adGroupName,
      httpStatus: row.httpStatus,
      hasTracking: row.hasGtmOrGtag,
      hasWhatsapp: row.hasWhatsapp,
      hasWaflow: row.hasWaflow,
      okForActiveTraffic: row.okForActiveTraffic,
      resolvedUrl: row.resolvedUrl,
    })), [
      { key: 'campaignName', label: 'Campaign' },
      { key: 'adGroupName', label: 'Ad Group' },
      { key: 'httpStatus', label: 'HTTP' },
      { key: 'hasTracking', label: 'GTM/gtag' },
      { key: 'hasWhatsapp', label: 'WhatsApp' },
      { key: 'hasWaflow', label: 'WAFlow' },
      { key: 'okForActiveTraffic', label: 'OK' },
      { key: 'resolvedUrl', label: 'Resolved URL' },
    ]),
    '',
    '## Blocked Until Gate',
    '',
    '- No budget changes.',
    '- No bidding strategy changes.',
    '- No conversion-goal changes.',
    '- No geo or location-mode changes.',
    '- No active keyword or match-type changes.',
    '- No active ad enable/pause/final URL changes.',
    '- No asset attachments to active campaigns before the 72h/30-click gate.',
    '- No lead-form attachments until CRM quality is confirmed.',
    '',
    '## Files',
    '',
    `- \`${outDirRelative}/learning-safe-report.json\``,
    `- \`${outDirRelative}/campaign-learning-risk.csv\``,
    `- \`${outDirRelative}/active-landing-url-checks.csv\``,
    `- \`${outDirRelative}/safe-actions.csv\``,
    `- \`${outDirRelative}/blocked-mutations.csv\``,
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
  const outDir = path.join(repoRoot, 'artifacts/google-ads', `${args.date}-colombiatours-learning-safe-optimizations`);
  const docsOut = path.join(repoRoot, 'docs/audits', `${args.date}-colombiatours-learning-safe-optimizations.md`);
  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));

  const accessToken = await getAccessToken(process.env);
  const campaignState = await loadCampaignState(process.env, accessToken);
  const activeFinalUrls = await loadActiveAdFinalUrls(process.env, accessToken);
  const landingChecks = [];
  for (const row of activeFinalUrls) {
    landingChecks.push(await inspectLanding(row));
  }

  const creativeShadow = loadCreativeShadow(args.date);
  const safeActions = buildSafeActions({ creativeShadow, landingChecks });
  const blockedMutations = BLOCKED_MUTATIONS.map(([mutation, risk, reason]) => ({
    mutation,
    risk,
    status: 'BLOCKED_FOR_ACTIVE_CAMPAIGNS',
    reason,
    allowedAlternative: 'Use local plan, validateOnly, paused resource, or wait for gate.',
  }));

  const report = {
    meta: {
      generatedAt,
      mode: 'read_only_learning_safe_optimization',
      googleAdsMutationsApplied: 0,
      supabaseWritesApplied: 0,
      activeCampaignLearningImpact: 'none',
      customerId: stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
    },
    campaignState,
    creativeShadow,
    safeActions,
    activeFinalUrls,
    landingChecks,
    blockedMutations,
  };

  fs.writeFileSync(path.join(outDir, 'learning-safe-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'campaign-learning-risk.csv'), toCsv(campaignState, [
    'id', 'market', 'name', 'status', 'servingStatus', 'primaryStatus', 'primaryStatusReasons',
    'biddingStrategyType', 'biddingStrategySystemStatus', 'budgetCop', 'learningRisk', 'optimizationRule',
  ]));
  fs.writeFileSync(path.join(outDir, 'active-landing-url-checks.csv'), toCsv(landingChecks, [
    'campaignId', 'campaignName', 'adGroupId', 'adGroupName', 'adId', 'finalUrl', 'httpStatus',
    'resolvedUrl', 'latencyMs', 'hasGtmOrGtag', 'hasWhatsapp', 'hasWaflow', 'indexableHint',
    'okForActiveTraffic', 'error',
  ]));
  fs.writeFileSync(path.join(outDir, 'safe-actions.csv'), toCsv(safeActions, [
    'priority', 'action', 'status', 'learningImpact', 'evidence', 'nextGate',
  ]));
  fs.writeFileSync(path.join(outDir, 'blocked-mutations.csv'), toCsv(blockedMutations, [
    'mutation', 'risk', 'status', 'reason', 'allowedAlternative',
  ]));
  fs.writeFileSync(docsOut, renderMarkdown({
    generatedAt,
    campaignState,
    landingChecks,
    creativeShadow,
    safeActions,
    outDirRelative: path.relative(repoRoot, outDir),
  }));

  console.log(JSON.stringify({
    ok: true,
    mode: report.meta.mode,
    googleAdsMutationsApplied: 0,
    supabaseWritesApplied: 0,
    activeCampaignLearningImpact: 'none',
    docsOut: path.relative(repoRoot, docsOut),
    outDir: path.relative(repoRoot, outDir),
    counts: {
      campaigns: campaignState.length,
      activeFinalUrls: activeFinalUrls.length,
      landingChecksPassed: landingChecks.filter((row) => row.okForActiveTraffic).length,
      landingChecksReview: landingChecks.filter((row) => !row.okForActiveTraffic).length,
      safeActions: safeActions.length,
      blockedMutations: blockedMutations.length,
    },
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
