#!/usr/bin/env node
'use strict';

/**
 * Builds a non-serving P1/P2 creative and asset plan for ColombiaTours Search.
 *
 * Safety contract:
 * - Does not call Google Ads mutate with validateOnly=false.
 * - Does not enable, pause, attach, or change current campaigns/ads/assets.
 * - Validates paused replacement RSAs and unattached text assets only.
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
const CUSTOMER_ID = () => stripCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);

const ACTIVE_CAMPAIGNS = [
  {
    id: '23843668228',
    name: 'BR_Search_Colombia_Packages_2026_05',
    market: 'BR',
    language: 'pt',
    defaultLanding: 'https://colombiatours.travel/pt/pacotes-colombia',
    path1: 'pacotes',
    path2: 'colombia',
    headlines: [
      'Pacotes Colombia',
      'Saindo De Sao Paulo',
      'Planner Local',
      'Viagem Completa',
      'Cotacao Por WhatsApp',
      'Cartagena Medellin',
      'Eixo Cafeeiro',
      'Caribe Colombiano',
      'Roteiro Sob Medida',
      'Suporte Local',
      'Hoteis E Traslados',
      'Nao Vendemos Voos',
    ],
    descriptions: [
      'Pacotes completos com hoteis, traslados, experiencias e suporte local.',
      'Nao vendemos voos nem hotel avulso. Cotacao com planner local.',
      'Roteiro sob medida para Colombia saindo de Sao Paulo por WhatsApp.',
      'Cartagena, Medellin, Eixo Cafeeiro e Caribe em uma viagem viavel.',
    ],
  },
  {
    id: '23815528484',
    name: 'MX_Multidestino_y_Caribe_2026_05',
    market: 'MX',
    language: 'es',
    defaultLanding: 'https://colombiatours.travel/paquetes-colombia-desde-mexico',
    path1: 'paquetes',
    path2: 'colombia',
    headlines: [
      'Paquetes A Colombia',
      'Desde Mexico',
      'Planner Local',
      'Viaje Completo',
      'Cotiza Por WhatsApp',
      'Cartagena Medellin',
      'Eje Cafetero',
      'San Andres Caribe',
      'Ruta A Medida',
      'Hoteles Y Traslados',
      'No Vuelos Sueltos',
      'Soporte Local',
    ],
    descriptions: [
      'Paquetes completos a Colombia con hoteles, traslados y experiencias.',
      'No vendemos vuelos ni hoteles sueltos. Cotiza con planner local.',
      'Rutas desde Mexico por Cartagena, Medellin, Eje Cafetero y Caribe.',
      'Envia fechas, viajeros y presupuesto para una propuesta clara.',
    ],
  },
  {
    id: '23819986291',
    name: 'ES_Cartagena_Medellin_2026_05',
    market: 'ES',
    language: 'es',
    defaultLanding: 'https://colombiatours.travel/paquetes-colombia-desde-espana',
    path1: 'viajes',
    path2: 'colombia',
    headlines: [
      'Paquetes A Colombia',
      'Desde Espana',
      'Planner Local',
      'Viaje Completo',
      'Cotiza Por WhatsApp',
      'Cartagena Medellin',
      'Eje Cafetero',
      'Caribe Colombiano',
      'Ruta A Medida',
      'Hoteles Y Traslados',
      'No Vuelos Sueltos',
      'Soporte Local',
    ],
    descriptions: [
      'Viajes completos a Colombia con hoteles, traslados y experiencias.',
      'No vendemos vuelos ni hoteles sueltos. Cotiza con planner local.',
      'Rutas desde Madrid o Barcelona por Cartagena, Medellin y Eje Cafetero.',
      'Envia fechas, viajeros y presupuesto para una propuesta clara.',
    ],
  },
  {
    id: '23829507075',
    name: 'CL_Search_Colombia_SanAndres_2026_05',
    market: 'CL',
    language: 'es',
    defaultLanding: 'https://colombiatours.travel/viajes-colombia-desde-chile',
    path1: 'viajes',
    path2: 'colombia',
    headlines: [
      'Viajes A Colombia',
      'Desde Chile',
      'Saliendo De Santiago',
      'Planner Local',
      'Viaje Completo',
      'Cotiza Por WhatsApp',
      'San Andres Caribe',
      'Cartagena Medellin',
      'Eje Cafetero',
      'Hoteles Y Traslados',
      'No Vuelos Sueltos',
      'Ruta A Medida',
    ],
    descriptions: [
      'Viajes completos a Colombia con hoteles, traslados y experiencias.',
      'No vendemos vuelos ni hoteles sueltos. Cotiza con planner local.',
      'Rutas desde Santiago por San Andres, Cartagena, Medellin y Eje Cafetero.',
      'Envia fechas, viajeros y presupuesto para una propuesta clara.',
    ],
  },
];

const LANDING_BY_AD_GROUP = [
  { pattern: /San_Andres|San Andres/i, url: 'https://colombiatours.travel/paquetes/san-andres-todo-incluido' },
  { pattern: /Eje_Cafetero|Eje Cafetero/i, url: 'https://colombiatours.travel/paquetes/eje-cafetero' },
  { pattern: /Cartagena.*Medellin|Medellin.*Cartagena/i, url: 'https://colombiatours.travel/paquetes/cartagena-medellin' },
  { pattern: /Cartagena/i, url: 'https://colombiatours.travel/cartagena' },
];

function usage() {
  console.log(`Usage:
  node scripts/google-ads/design-colombiatours-search-creative-assets-p1-p2.cjs [--date=YYYY-MM-DD] [--skip-validate]

Generates P1/P2 shadow creative assets and validates paused RSAs/unattached text assets with Google Ads validateOnly.
No serving or learning-impacting mutation is performed.`);
}

function parseArgs(argv) {
  const args = { date: DEFAULT_DATE, skipValidate: false, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--skip-validate') args.skipValidate = true;
    else if (arg.startsWith('--date=')) args.date = arg.slice('--date='.length);
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

function truncate(value, max) {
  return String(value || '').slice(0, max);
}

function landingForAdGroup(campaignPlan, adGroupName) {
  const match = LANDING_BY_AD_GROUP.find((row) => row.pattern.test(adGroupName));
  return match ? match.url : campaignPlan.defaultLanding;
}

function pathPart(url, part) {
  if (/san-andres/i.test(url)) return part === 1 ? 'san-andres' : 'colombia';
  if (/eje-cafetero/i.test(url)) return part === 1 ? 'eje' : 'cafetero';
  if (/cartagena-medellin/i.test(url)) return part === 1 ? 'cartagena' : 'medellin';
  try {
    const chunks = new URL(url).pathname.split('/').filter(Boolean);
    return truncate(chunks[0] || '', 15);
  } catch {
    return '';
  }
}

function buildRsa(campaignPlan, adGroup) {
  const finalUrl = landingForAdGroup(campaignPlan, adGroup.name);
  const path1 = finalUrl === campaignPlan.defaultLanding
    ? campaignPlan.path1
    : (pathPart(finalUrl, 1) || campaignPlan.path1);
  const path2 = finalUrl === campaignPlan.defaultLanding
    ? campaignPlan.path2
    : (pathPart(finalUrl, 2) || campaignPlan.path2);
  const headlines = [...new Set(campaignPlan.headlines)].slice(0, 15).map((text) => ({ text: truncate(text, 30) }));
  const descriptions = [...new Set(campaignPlan.descriptions)].slice(0, 4).map((text) => ({ text: truncate(text, 90) }));
  return {
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    adGroupId: adGroup.id,
    adGroupName: adGroup.name,
    statusForFutureApply: 'PAUSED',
    finalUrl,
    path1: truncate(path1, 15),
    path2: truncate(path2, 15),
    headlines: headlines.map((asset) => asset.text),
    descriptions: descriptions.map((asset) => asset.text),
    operation: {
      create: {
        adGroup: adGroup.resourceName,
        status: 'PAUSED',
        ad: {
          finalUrls: [finalUrl],
          responsiveSearchAd: {
            headlines,
            descriptions,
            path1: truncate(path1, 15),
            path2: truncate(path2, 15),
          },
        },
      },
    },
  };
}

function buildSitelinks(campaignPlan) {
  const market = campaignPlan.market;
  const base = market === 'BR'
    ? [
        ['Pacotes Colombia', 'Viagem completa', 'Planner local', campaignPlan.defaultLanding],
        ['Cartagena Medellin', 'Cidade e Caribe', 'Roteiro privado', 'https://colombiatours.travel/paquetes/cartagena-medellin'],
        ['Eixo Cafeeiro', 'Cafe e natureza', 'Experiencias locais', 'https://colombiatours.travel/paquetes/eje-cafetero'],
        ['Caribe Colombiano', 'Praia e cultura', 'Rota completa', 'https://colombiatours.travel/paquetes/san-andres-todo-incluido'],
        ['Roteiro Sob Medida', 'Datas e perfil', 'Cotacao WhatsApp', campaignPlan.defaultLanding],
        ['Fale Com Planner', 'Atendimento local', 'Proposta clara', campaignPlan.defaultLanding],
      ]
    : [
        ['Paquetes Colombia', 'Viaje completo', 'Planner local', campaignPlan.defaultLanding],
        ['Cartagena Medellin', 'Ciudad y Caribe', 'Ruta privada', 'https://colombiatours.travel/paquetes/cartagena-medellin'],
        ['Eje Cafetero', 'Cafe y naturaleza', 'Experiencias locales', 'https://colombiatours.travel/paquetes/eje-cafetero'],
        ['San Andres Caribe', 'Playa y cultura', 'Ruta completa', 'https://colombiatours.travel/paquetes/san-andres-todo-incluido'],
        ['Ruta A Medida', 'Fechas y perfil', 'Cotiza WhatsApp', campaignPlan.defaultLanding],
        ['Hablar Con Planner', 'Asesor local', 'Propuesta clara', campaignPlan.defaultLanding],
      ];
  return base.map(([linkText, description1, description2, finalUrl]) => ({
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    priority: 'P1',
    assetType: 'SITELINK',
    linkText: truncate(linkText, 25),
    description1: truncate(description1, 35),
    description2: truncate(description2, 35),
    finalUrl,
    attachNow: false,
    operation: {
      create: {
        finalUrls: [finalUrl],
        sitelinkAsset: {
          linkText: truncate(linkText, 25),
          description1: truncate(description1, 35),
          description2: truncate(description2, 35),
        },
      },
    },
  }));
}

function buildCallouts(campaignPlan) {
  const texts = campaignPlan.market === 'BR'
    ? ['Planner local', 'Viagem completa', 'Nao vendemos voos', 'Hoteis + traslados', 'WhatsApp', 'RNT Colombia', 'Sob medida', 'Suporte local']
    : ['Planner local', 'Viaje completo', 'No vuelos sueltos', 'Hoteles + traslados', 'WhatsApp', 'RNT Colombia', 'A medida', 'Soporte local'];
  return texts.map((text) => ({
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    priority: 'P1',
    assetType: 'CALLOUT',
    text: truncate(text, 25),
    attachNow: false,
    operation: { create: { calloutAsset: { calloutText: truncate(text, 25) } } },
  }));
}

function buildSnippets(campaignPlan) {
  const rows = campaignPlan.market === 'BR'
    ? [
        ['Destinos', ['Cartagena', 'Medellin', 'Eixo Cafeeiro', 'Caribe']],
        ['Servicios', ['Hoteis', 'Traslados', 'Experiencias', 'Planner']],
        ['Tipos', ['Privado', 'Familia', 'Lua de mel', 'Sob medida']],
      ]
    : [
        ['Destinos', ['Cartagena', 'Medellin', 'Eje Cafetero', 'San Andres']],
        ['Servicios', ['Hoteles', 'Traslados', 'Experiencias', 'Planner']],
        ['Tipos', ['Privado', 'Familiar', 'Lujo', 'A medida']],
      ];
  return rows.map(([header, values]) => ({
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    priority: 'P2',
    assetType: 'STRUCTURED_SNIPPET',
    header,
    values,
    attachNow: false,
    operation: { create: { structuredSnippetAsset: { header, values } } },
  }));
}

function buildImageBriefs(campaignPlan) {
  return ['Cartagena', 'Medellin/Guatape', 'Eje Cafetero', 'San Andres/Caribe'].map((theme) => ({
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    priority: 'P1',
    assetType: 'IMAGE_BRIEF',
    theme,
    minimumCount: 1,
    rule: 'Use clean travel imagery, no heavy text, no misleading flight/hotel-only promise. Create/upload later; not validated here.',
  }));
}

function buildLeadFormBrief(campaignPlan) {
  return {
    campaignId: campaignPlan.id,
    campaignName: campaignPlan.name,
    priority: 'P2_TEST',
    assetType: 'LEAD_FORM_BRIEF',
    headline: campaignPlan.market === 'BR' ? 'Cotacao de viagem completa' : 'Cotiza viaje completo',
    qualifyingFields: ['origin_city', 'travel_dates', 'traveler_count', 'budget_range', 'destinations_interest'],
    crmRequirements: ['gclid_or_gbraid_or_wbraid', 'utm_campaign', 'reference_code', 'chatwoot_conversation_id'],
    attachNow: false,
    rule: 'Do not attach until CRM receives qualified lead data and sales confirms lead-form quality is acceptable.',
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
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = stripCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const response = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${CUSTOMER_ID()}/${requestPath}`,
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

async function validateMutate({ env, accessToken, requestPath, operations }) {
  if (!operations.length) return { skipped: true, operationCount: 0, response: { results: [] } };
  const response = await googleAdsRequest({
    env,
    accessToken,
    requestPath,
    body: { validateOnly: true, partialFailure: false, operations },
  });
  return { skipped: false, operationCount: operations.length, response: redact(response) };
}

async function loadEnabledAdGroups(env, accessToken) {
  const ids = ACTIVE_CAMPAIGNS.map((campaign) => campaign.id).join(',');
  const rows = await search({
    env,
    accessToken,
    query: `
      SELECT campaign.id, campaign.name, campaign.status, ad_group.id, ad_group.resource_name, ad_group.name, ad_group.status
      FROM ad_group
      WHERE campaign.id IN (${ids})
        AND campaign.status = ENABLED
        AND ad_group.status = ENABLED`,
  });
  return rows.map((row) => ({
    campaignId: String(row.campaign.id),
    campaignName: row.campaign.name,
    id: String(row.adGroup.id),
    resourceName: row.adGroup.resourceName,
    name: row.adGroup.name,
    status: row.adGroup.status,
  }));
}

function renderMarkdown({ generatedAt, shadowRsas, sitelinks, callouts, snippets, imageBriefs, leadFormBriefs, validateReport, outDirRelative }) {
  const summaryRows = ACTIVE_CAMPAIGNS.map((campaign) => ({
    campaignName: campaign.name,
    pausedRsas: shadowRsas.filter((row) => row.campaignId === campaign.id).length,
    sitelinks: sitelinks.filter((row) => row.campaignId === campaign.id).length,
    callouts: callouts.filter((row) => row.campaignId === campaign.id).length,
    snippets: snippets.filter((row) => row.campaignId === campaign.id).length,
    images: imageBriefs.filter((row) => row.campaignId === campaign.id).length,
    leadForms: leadFormBriefs.filter((row) => row.campaignId === campaign.id).length,
    learningImpact: 'none: local + validateOnly only',
  }));
  const coverageTable = table(summaryRows, [
    { key: 'campaignName', label: 'Campaign' },
    { key: 'pausedRsas', label: 'Paused RSAs' },
    { key: 'sitelinks', label: 'Sitelinks' },
    { key: 'callouts', label: 'Callouts' },
    { key: 'snippets', label: 'Snippets' },
    { key: 'images', label: 'Image Briefs' },
    { key: 'leadForms', label: 'Lead Form Briefs' },
    { key: 'learningImpact', label: 'Learning Impact' },
  ]);

  return [
    '# ColombiaTours Search Creative Assets P1/P2 Shadow Plan',
    '',
    `Generated: ${generatedAt}`,
    'Mode: non-serving shadow plan + Google Ads validateOnly.',
    'Google Ads mutations applied: 0.',
    'Current campaign learning impact: none.',
    '',
    '## Safety Contract',
    '',
    '- No active ad, keyword, budget, geo, campaign or asset attachment was changed.',
    '- Replacement RSAs are planned as PAUSED only.',
    '- Sitelink/callout/structured-snippet assets are validated as unattached assets only.',
    '- Image and lead-form work is delivered as briefs, not attached to campaigns.',
    '- Any future apply must create paused ads/assets first and wait for manual approval before enabling or attaching.',
    '',
    '## Coverage',
    '',
    coverageTable,
    '',
    '## Validate-only Result',
    '',
    `- Paused RSA create operations validated: ${validateReport.rsa.operationCount}.`,
    `- Text asset create operations validated: ${validateReport.assets.operationCount}.`,
    `- Validation mode: ${validateReport.mode}.`,
    '',
    '## Next Apply Gate',
    '',
    '1. Do not apply during the first 24h BR learning window.',
    '2. If approved later, create RSAs in PAUSED state only.',
    '3. Attach assets only after creative review and after confirming no campaign learning reset concern.',
    '4. Lead forms require CRM attribution QA before any campaign attachment.',
    '',
    '## Files',
    '',
    `- \`${outDirRelative}/creative-shadow-plan.json\``,
    `- \`${outDirRelative}/shadow-rsas.csv\``,
    `- \`${outDirRelative}/sitelinks.csv\``,
    `- \`${outDirRelative}/callouts.csv\``,
    `- \`${outDirRelative}/structured-snippets.csv\``,
    `- \`${outDirRelative}/image-briefs.csv\``,
    `- \`${outDirRelative}/lead-form-briefs.csv\``,
    `- \`${outDirRelative}/validate-only-report.json\``,
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

  const outDir = path.join(repoRoot, 'artifacts/google-ads', `${args.date}-colombiatours-search-creative-assets-p1-p2-shadow`);
  const docsOut = path.join(repoRoot, 'docs/audits', `${args.date}-colombiatours-search-creative-assets-p1-p2-shadow.md`);
  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));

  const accessToken = await getAccessToken(process.env);
  const enabledAdGroups = await loadEnabledAdGroups(process.env, accessToken);
  const shadowRsas = [];
  for (const campaign of ACTIVE_CAMPAIGNS) {
    for (const adGroup of enabledAdGroups.filter((row) => row.campaignId === campaign.id)) {
      shadowRsas.push(buildRsa(campaign, adGroup));
    }
  }

  const sitelinks = ACTIVE_CAMPAIGNS.flatMap(buildSitelinks);
  const callouts = ACTIVE_CAMPAIGNS.flatMap(buildCallouts);
  const snippets = ACTIVE_CAMPAIGNS.flatMap(buildSnippets);
  const imageBriefs = ACTIVE_CAMPAIGNS.flatMap(buildImageBriefs);
  const leadFormBriefs = ACTIVE_CAMPAIGNS.map(buildLeadFormBrief);

  const rsaOperations = shadowRsas.map((row) => row.operation);
  const assetOperations = [...sitelinks, ...callouts, ...snippets].map((row) => row.operation);
  const validateReport = args.skipValidate
    ? { mode: 'skipped', rsa: { skipped: true, operationCount: 0 }, assets: { skipped: true, operationCount: 0 } }
    : {
        mode: 'validateOnly',
        rsa: await validateMutate({ env: process.env, accessToken, requestPath: 'adGroupAds:mutate', operations: rsaOperations }),
        assets: await validateMutate({ env: process.env, accessToken, requestPath: 'assets:mutate', operations: assetOperations }),
      };

  const generatedAt = new Date().toISOString();
  const report = {
    meta: {
      generatedAt,
      mode: 'shadow_plan_validate_only',
      googleAdsMutationsApplied: 0,
      servingChanges: 0,
      campaignLearningImpact: 'none',
      customerId: CUSTOMER_ID(),
    },
    enabledAdGroups,
    shadowRsas: shadowRsas.map(({ operation, ...row }) => row),
    sitelinks: sitelinks.map(({ operation, ...row }) => row),
    callouts: callouts.map(({ operation, ...row }) => row),
    snippets: snippets.map(({ operation, ...row }) => row),
    imageBriefs,
    leadFormBriefs,
    validateReport,
  };

  fs.writeFileSync(path.join(outDir, 'creative-shadow-plan.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'shadow-rsas.csv'), toCsv(report.shadowRsas, ['campaignId', 'campaignName', 'adGroupId', 'adGroupName', 'statusForFutureApply', 'finalUrl', 'path1', 'path2', 'headlines', 'descriptions']));
  fs.writeFileSync(path.join(outDir, 'sitelinks.csv'), toCsv(report.sitelinks, ['campaignId', 'campaignName', 'priority', 'assetType', 'linkText', 'description1', 'description2', 'finalUrl', 'attachNow']));
  fs.writeFileSync(path.join(outDir, 'callouts.csv'), toCsv(report.callouts, ['campaignId', 'campaignName', 'priority', 'assetType', 'text', 'attachNow']));
  fs.writeFileSync(path.join(outDir, 'structured-snippets.csv'), toCsv(report.snippets, ['campaignId', 'campaignName', 'priority', 'assetType', 'header', 'values', 'attachNow']));
  fs.writeFileSync(path.join(outDir, 'image-briefs.csv'), toCsv(report.imageBriefs, ['campaignId', 'campaignName', 'priority', 'assetType', 'theme', 'minimumCount', 'rule']));
  fs.writeFileSync(path.join(outDir, 'lead-form-briefs.csv'), toCsv(report.leadFormBriefs, ['campaignId', 'campaignName', 'priority', 'assetType', 'headline', 'qualifyingFields', 'crmRequirements', 'attachNow', 'rule']));
  fs.writeFileSync(path.join(outDir, 'validate-only-report.json'), `${JSON.stringify(validateReport, null, 2)}\n`);
  fs.writeFileSync(docsOut, renderMarkdown({
    generatedAt,
    shadowRsas: report.shadowRsas,
    sitelinks: report.sitelinks,
    callouts: report.callouts,
    snippets: report.snippets,
    imageBriefs: report.imageBriefs,
    leadFormBriefs: report.leadFormBriefs,
    validateReport,
    outDirRelative: path.relative(repoRoot, outDir),
  }));

  console.log(JSON.stringify({
    ok: true,
    mode: report.meta.mode,
    googleAdsMutationsApplied: 0,
    campaignLearningImpact: 'none',
    docsOut: path.relative(repoRoot, docsOut),
    outDir: path.relative(repoRoot, outDir),
    counts: {
      enabledAdGroups: enabledAdGroups.length,
      pausedRsaPlans: report.shadowRsas.length,
      sitelinks: report.sitelinks.length,
      callouts: report.callouts.length,
      structuredSnippets: report.snippets.length,
      imageBriefs: report.imageBriefs.length,
      leadFormBriefs: report.leadFormBriefs.length,
      validateOnlyRsaOperations: validateReport.rsa.operationCount || 0,
      validateOnlyAssetOperations: validateReport.assets.operationCount || 0,
    },
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
