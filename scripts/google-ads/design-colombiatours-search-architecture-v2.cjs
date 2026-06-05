#!/usr/bin/env node
'use strict';

/**
 * Read-only/local ColombiaTours Search architecture blueprint generator.
 *
 * This script does not call Google Ads mutate endpoints and does not write to
 * Supabase. It converts the 24m mining, landing audits and city-gated plan into
 * local CSV/JSON/Markdown deliverables for future approval.
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);
const MINING_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-24m-mining');
const ACTIVE_LANDING_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-active-landing-alignment');
const BASE_DOMAIN = 'https://colombiatours.travel';

const KEYWORDS_BY_AD_GROUP = {
  AG1_Colombia_Packages_Exact: [
    'paquetes a colombia',
    'paquete de viajes a colombia',
    'paquete turístico a colombia',
    'colombia paquetes de viaje',
  ],
  AG2_Medellin_Cartagena_Exact: [
    'medellin colombia',
    'tour medellin y cartagena',
  ],
  AG3_Cartagena_Exact: [
    'cartagena de indias',
    'paquetes para viajar a cartagena',
  ],
  AG4_SanAndres_Exact: [
    'paquetes a san andres all inclusive',
    'paquete san andres todo incluido',
    'isla san andres paquetes',
  ],
  AG5_EjeCafetero_Exact: [
    'eje cafetero',
    'planes turisticos eje cafetero',
    'tour al eje cafetero desde medellin',
  ],
  AG6_Bogota_Cali_SantaMarta_Exact: [
    'tour bogota colombia',
    'tours en cali colombia',
    'tours en santa marta colombia',
  ],
};

const MARKET_KEYWORDS_BY_AD_GROUP = {
  MX: {
    AG1_Colombia_Packages_Exact: [
      'tour colombia desde mexico',
      'paquetes de mexico a colombia',
    ],
  },
};

const AD_GROUPS = [
  {
    name: 'AG1_Colombia_Packages_Exact',
    intent: 'high_commercial',
    landingKey: 'colombia_packages',
    offer: 'Paquetes completos a Colombia con planner local, hoteles, experiencias y soporte en destino.',
  },
  {
    name: 'AG2_Medellin_Cartagena_Exact',
    intent: 'destination_specific',
    landingKey: 'medellin_cartagena',
    offer: 'Ruta Medellin + Cartagena a medida para viajeros con intención multidestino.',
  },
  {
    name: 'AG3_Cartagena_Exact',
    intent: 'destination_specific',
    landingKey: 'cartagena',
    offer: 'Cartagena de Indias como destino premium dentro de un viaje completo por Colombia.',
  },
  {
    name: 'AG4_SanAndres_Exact',
    intent: 'high_commercial',
    landingKey: 'san_andres',
    offer: 'San Andres todo incluido como paquete completo, no hotel-only ni vuelo suelto.',
  },
  {
    name: 'AG5_EjeCafetero_Exact',
    intent: 'destination_specific',
    landingKey: 'eje_cafetero',
    offer: 'Eje Cafetero con Salento, Cocora, cafés, traslados y planner local.',
  },
  {
    name: 'AG6_Bogota_Cali_SantaMarta_Exact',
    intent: 'destination_specific',
    landingKey: 'bogota_cali_santamarta',
    offer: 'Bogota, Cali y Santa Marta como clusters de expansión controlada.',
  },
];

const LANDINGS = {
  colombia_packages: {
    slugByMarket: {
      MX: '/paquetes-colombia-desde-mexico',
      ES: '/paquetes-colombia-desde-espana',
      CL: '/viajes-colombia-desde-chile',
      AR: '/viajes-colombia-desde-argentina',
      US: '/trips-to-colombia-from-usa',
    },
    fallbackByMarket: {
      MX: '/agencia-de-viajes-a-colombia-para-mexicanos',
      ES: '/agencia-de-viajes-a-colombia-para-espanoles',
      CL: '/viajes-a-colombia-desde-chile',
      AR: '/viajar-a-colombia-desde-argentina',
      US: '/trips-to-colombia-from-usa',
    },
  },
  medellin_cartagena: {
    slugByMarket: { MX: '/paquetes/bogota-medellin-cartagena', ES: '/paquetes/cartagena-medellin', CL: '/paquetes/cartagena-medellin', AR: '/paquetes/cartagena-medellin', US: '/paquetes/cartagena-medellin' },
    fallbackByMarket: { MX: '/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera', ES: '/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera', CL: '/cartagena', AR: '/cartagena', US: '/cartagena' },
  },
  cartagena: {
    slugByMarket: { MX: '/cartagena', ES: '/cartagena', CL: '/cartagena', AR: '/cartagena', US: '/cartagena' },
    fallbackByMarket: { MX: '/cartagena', ES: '/cartagena', CL: '/cartagena', AR: '/cartagena', US: '/cartagena' },
  },
  san_andres: {
    slugByMarket: { MX: '/paquetes/san-andres-todo-incluido', ES: '/paquetes/san-andres-todo-incluido', CL: '/paquetes/san-andres-todo-incluido', AR: '/paquetes/san-andres-todo-incluido', US: '/paquetes/san-andres-todo-incluido' },
    fallbackByMarket: { MX: '/san-andres-4-dias', ES: '/san-andres-4-dias', CL: '/san-andres-4-dias', AR: '/viajes-a-san-andres-colombia', US: '/san-andres-4-dias' },
  },
  eje_cafetero: {
    slugByMarket: { MX: '/paquetes/eje-cafetero', ES: '/paquetes/eje-cafetero', CL: '/paquetes/eje-cafetero', AR: '/paquetes/eje-cafetero', US: '/paquetes/eje-cafetero' },
    fallbackByMarket: { MX: '/eje-cafetero', ES: '/eje-cafetero', CL: '/eje-cafetero', AR: '/eje-cafetero', US: '/eje-cafetero' },
  },
  bogota_cali_santamarta: {
    slugByMarket: { MX: '/paquetes/bogota-medellin-cartagena', ES: '/paquetes/bogota-medellin-cartagena', CL: '/paquetes/bogota-medellin-cartagena', AR: '/paquetes/bogota-medellin-cartagena', US: '/paquetes/bogota-medellin-cartagena' },
    fallbackByMarket: { MX: '/agencia-de-viajes-a-colombia-para-mexicanos', ES: '/agencia-de-viajes-a-colombia-para-espanoles', CL: '/viajes-a-colombia-desde-chile', AR: '/viajar-a-colombia-desde-argentina', US: '/trips-to-colombia-from-usa' },
  },
};

const CAMPAIGNS = [
  {
    market: 'BR',
    campaignName: 'BR_Search_Colombia_Packages_2026_05',
    architectureRole: 'current_controlled_test',
    futureAction: 'monitor_only_no_new_campaign',
    statusForFutureBuild: 'ENABLED_EXISTING_NO_CHANGE',
    dailyBudgetCop: 50000,
    geoTargetType: 'PRESENCE',
    cityTargets: [{ name: 'Sao Paulo', geoId: '1001773', evidence: 'GRU -> BOG direct' }],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'pt',
    phase: 'active_learning_gate',
    launchGate: 'Do not reset 72h window until ad is serving or first click/spend appears.',
    allowedAdGroups: ['AG1_Colombia_Packages_Exact'],
    baseLanding: '/pt/pacotes-colombia',
    fallbackLanding: '/pt/pacotes',
  },
  {
    market: 'MX',
    campaignName: 'MX_Search_Colombia_CityIntent_2026_06_NEXT',
    architectureRole: 'shadow_new_campaign',
    futureAction: 'create_paused_only_after_validate_only',
    statusForFutureBuild: 'PAUSED',
    dailyBudgetCop: 40000,
    geoTargetType: 'PRESENCE',
    cityTargets: [
      { name: 'Mexico City', geoId: '1010043', evidence: 'MEX -> BOG/MDE/CTG direct' },
      { name: 'Monterrey', geoId: '1010132', evidence: 'MTY -> BOG direct' },
    ],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'es',
    phase: 'build_ready_paused',
    launchGate: 'Only after 72h post-negatives confirms MX quality and landing briefs pass score >= 90.',
  },
  {
    market: 'ES',
    campaignName: 'ES_Search_Colombia_CityIntent_2026_06_NEXT',
    architectureRole: 'shadow_new_campaign',
    futureAction: 'create_paused_only_after_validate_only',
    statusForFutureBuild: 'PAUSED',
    dailyBudgetCop: 35000,
    geoTargetType: 'PRESENCE',
    cityTargets: [
      { name: 'Madrid', geoId: '1005493', evidence: 'MAD -> BOG/MDE direct' },
      { name: 'Barcelona', geoId: '1005424', evidence: 'BCN -> BOG direct' },
    ],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'es',
    phase: 'build_ready_paused',
    launchGate: 'Only after 72h post-negatives confirms ES quality and landing briefs pass score >= 90.',
  },
  {
    market: 'CL',
    campaignName: 'CL_Search_Colombia_Santiago_2026_06_NEXT',
    architectureRole: 'shadow_new_campaign',
    futureAction: 'create_paused_only_after_validate_only',
    statusForFutureBuild: 'PAUSED',
    dailyBudgetCop: 20000,
    geoTargetType: 'PRESENCE',
    cityTargets: [{ name: 'Santiago', geoId: '1003325', evidence: 'SCL -> BOG direct' }],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'es',
    phase: 'build_ready_paused',
    launchGate: 'Only after CL active campaign keeps CRM quality with low junk spend.',
  },
  {
    market: 'AR',
    campaignName: 'AR_Search_Colombia_BuenosAires_2026_06_NEXT',
    architectureRole: 'shadow_phase_2',
    futureAction: 'create_paused_or_use_existing_after_br_gate',
    statusForFutureBuild: 'PAUSED',
    dailyBudgetCop: 30000,
    geoTargetType: 'PRESENCE',
    cityTargets: [{ name: 'Buenos Aires', geoId: '1000073', evidence: 'EZE -> BOG direct' }],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'es',
    phase: 'phase_2_after_br',
    launchGate: 'Do not activate until BR reaches 72h or 30 clicks and sales confirms useful lead quality.',
  },
  {
    market: 'US',
    campaignName: 'US_Search_Private_Colombia_CityIntent_2026_06_HOLD',
    architectureRole: 'hold_rebuild_design',
    futureAction: 'do_not_create_until_offer_rebuilt',
    statusForFutureBuild: 'HOLD',
    dailyBudgetCop: 0,
    geoTargetType: 'PRESENCE',
    cityTargets: [{ name: 'New York City', geoId: '1023191', evidence: 'NYC -> BOG direct options exist' }],
    negativeGeoTargets: [{ name: 'Colombia', geoId: '2170' }],
    language: 'en',
    phase: 'hold',
    launchGate: 'No launch until private/luxury US offer and English landing are rebuilt.',
  },
];

const PRIORITY_LANDINGS = [
  { slug: '/paquetes-colombia-desde-mexico', market: 'MX', city: 'Mexico City + Monterrey', language: 'es', intent: 'Colombia packages from Mexico' },
  { slug: '/paquetes-colombia-desde-espana', market: 'ES', city: 'Madrid + Barcelona', language: 'es', intent: 'Colombia packages from Spain' },
  { slug: '/viajes-colombia-desde-chile', market: 'CL', city: 'Santiago', language: 'es', intent: 'Colombia packages from Chile' },
  { slug: '/pt/pacotes-colombia', market: 'BR', city: 'Sao Paulo', language: 'pt', intent: 'Pacotes Colombia from Sao Paulo' },
  { slug: '/viajes-colombia-desde-argentina', market: 'AR', city: 'Buenos Aires', language: 'es', intent: 'Colombia packages from Argentina' },
  { slug: '/paquetes/cartagena-medellin', market: 'MULTI', city: 'direct-connect markets', language: 'es', intent: 'Cartagena + Medellin package' },
  { slug: '/paquetes/san-andres-todo-incluido', market: 'MULTI', city: 'direct-connect markets', language: 'es', intent: 'San Andres package' },
  { slug: '/paquetes/eje-cafetero', market: 'MULTI', city: 'direct-connect markets', language: 'es', intent: 'Eje Cafetero package' },
  { slug: '/paquetes/bogota-medellin-cartagena', market: 'MULTI', city: 'direct-connect markets', language: 'es', intent: 'Bogota Medellin Cartagena package' },
];

function usage() {
  console.log(`Usage: node scripts/google-ads/design-colombiatours-search-architecture-v2.cjs [--date=YYYY-MM-DD] [--validate-landings]\n\nGenerates local-only campaign architecture artifacts. No Google Ads or Supabase mutations.`);
}

function parseArgs(argv) {
  const opts = { date: DEFAULT_DATE, validateLandings: false, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--validate-landings') opts.validateLandings = true;
    else if (arg.startsWith('--date=')) opts.date = arg.slice('--date='.length);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error('--date must be YYYY-MM-DD');
  return opts;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift();
  return rows.filter((r) => r.some((cell) => cell !== '')).map((r) => Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? ''])));
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function fullUrl(slug) {
  if (!slug) return '';
  if (/^https?:\/\//i.test(slug)) return slug;
  return `${BASE_DOMAIN}${slug.startsWith('/') ? slug : `/${slug}`}`;
}

function normalizeTerm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function inferLanding(campaign, adGroup) {
  if (campaign.market === 'BR') return fullUrl(campaign.baseLanding || campaign.fallbackLanding);
  const landing = LANDINGS[adGroup.landingKey];
  const candidate = landing?.slugByMarket?.[campaign.market] || landing?.fallbackByMarket?.[campaign.market];
  return fullUrl(candidate);
}

function inferFallbackLanding(campaign, adGroup) {
  if (campaign.market === 'BR') return fullUrl(campaign.fallbackLanding || campaign.baseLanding);
  const landing = LANDINGS[adGroup.landingKey];
  return fullUrl(landing?.fallbackByMarket?.[campaign.market] || landing?.slugByMarket?.[campaign.market]);
}

function campaignCanUseAdGroup(campaign, adGroupName) {
  if (campaign.allowedAdGroups) return campaign.allowedAdGroups.includes(adGroupName);
  if (campaign.market === 'US') return true;
  return true;
}

function buildRsa(campaign, adGroup, finalUrl) {
  const marketCopy = {
    MX: { origin: 'Mexico', city: 'CDMX y Monterrey', cta: 'Cotiza por WhatsApp' },
    ES: { origin: 'España', city: 'Madrid y Barcelona', cta: 'Solicita propuesta' },
    CL: { origin: 'Chile', city: 'Santiago', cta: 'Cotiza por WhatsApp' },
    AR: { origin: 'Argentina', city: 'Buenos Aires', cta: 'Solicita propuesta' },
    BR: { origin: 'Brasil', city: 'Sao Paulo', cta: 'Planeje pelo WhatsApp' },
    US: { origin: 'USA', city: 'New York City', cta: 'Request a quote' },
  }[campaign.market] || { origin: campaign.market, city: '', cta: 'Cotiza' };

  const headlineSets = {
    AG1_Colombia_Packages_Exact: ['Paquetes A Colombia', `Desde ${marketCopy.origin}`, 'Viaje A Medida', 'Planner Local Colombia'],
    AG2_Medellin_Cartagena_Exact: ['Medellin Y Cartagena', `Desde ${marketCopy.city}`, 'Ruta Completa Colombia', 'Planner Local'],
    AG3_Cartagena_Exact: ['Cartagena De Indias', 'Viaje A Medida', `Desde ${marketCopy.origin}`, 'Caribe Colombiano'],
    AG4_SanAndres_Exact: ['San Andres Todo Incluido', 'Paquete Completo', `Desde ${marketCopy.origin}`, 'No Hotel Suelto'],
    AG5_EjeCafetero_Exact: ['Eje Cafetero Colombia', 'Salento Y Cocora', `Desde ${marketCopy.origin}`, 'Ruta Con Planner'],
    AG6_Bogota_Cali_SantaMarta_Exact: ['Bogota Cali Santa Marta', 'Colombia A Medida', `Desde ${marketCopy.origin}`, 'Viaje Completo'],
  };

  const ptHeadlines = ['Pacotes Colombia', 'Saindo De Sao Paulo', 'Viagem Sob Medida', 'Planner Local Colombia'];
  const enHeadlines = ['Private Colombia Tours', 'Colombia Custom Trip', 'Local Travel Planner', 'Full Trip Support'];
  const headlines = campaign.language === 'pt'
    ? ptHeadlines
    : campaign.language === 'en'
      ? enHeadlines
      : headlineSets[adGroup.name];

  const descriptions = campaign.language === 'pt'
    ? [
        'Pacote completo para Colombia com hotéis, experiências e suporte local. Nao vendemos voos avulsos.',
        'Planeje sua viagem saindo de Sao Paulo com roteiro sob medida e atendimento por WhatsApp.',
      ]
    : campaign.language === 'en'
      ? [
          'Custom Colombia itinerary with local planners, hotels, experiences and on-trip support.',
          'Designed for qualified travelers looking for a complete private trip, not flights only.',
        ]
      : [
          `Viaje completo a Colombia desde ${marketCopy.city || marketCopy.origin} con planner local, hoteles y experiencias.`,
          'No vendemos vuelos ni hoteles sueltos: diseñamos una ruta completa según fechas y presupuesto.',
        ];

  return {
    campaignName: campaign.campaignName,
    adGroupName: adGroup.name,
    market: campaign.market,
    language: campaign.language,
    finalUrl,
    fallbackFinalUrl: inferFallbackLanding(campaign, adGroup),
    statusForFutureBuild: campaign.market === 'BR' ? 'ENABLED_EXISTING_NO_CHANGE' : 'PAUSED_DRAFT',
    headlines: unique([...headlines, marketCopy.cta, 'Soporte En Tu Viaje', 'Presupuesto Claro']).slice(0, 15).join(' | '),
    descriptions: descriptions.join(' | '),
    approvalRequiredBeforeLaunch: true,
  };
}

async function fetchLanding(url) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 ColombiaToursArchitectureV2/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    const html = await response.text();
    return {
      url,
      ok200: response.ok && response.status === 200,
      status: response.status,
      finalUrl: response.url,
      elapsedMs: Math.round(performance.now() - started),
      indexFollow: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*index,\s*follow/i.test(html) || !/noindex/i.test(html),
      gtmOrGtag: /googletagmanager|GTM-|gtag\(|google-analytics/i.test(html),
      dataLayer: /dataLayer/i.test(html),
      waFlow: /waflow|record_funnel_event|funnel/i.test(html),
      whatsapp: /wa\.me|whatsapp/i.test(html),
      notFound: /P[aá]gina no encontrada|Page not found|404/i.test(html.slice(0, 10000)),
    };
  } catch (error) {
    return { url, ok200: false, status: 0, finalUrl: url, elapsedMs: Math.round(performance.now() - started), indexFollow: false, gtmOrGtag: false, dataLayer: false, waFlow: false, whatsapp: false, notFound: false, error: error.message };
  }
}

function loadInputs() {
  const mining = readJson(path.join(MINING_DIR, 'mining-report.json'), {});
  return {
    mining,
    positives: parseCsv(readText(path.join(MINING_DIR, 'positive-build-approval-shortlist.csv'))),
    landingOpps: parseCsv(readText(path.join(MINING_DIR, 'landing-opportunities.csv'))),
    campaignActions: parseCsv(readText(path.join(MINING_DIR, 'campaign-actions.csv'))),
    marketInsights: parseCsv(readText(path.join(MINING_DIR, 'market-insights.csv'))),
    activeLandingScores: parseCsv(readText(path.join(ACTIVE_LANDING_DIR, 'landing-scores.csv'))),
  };
}

function buildBlueprint(inputs, landingChecks, opts) {
  const positiveTerms = inputs.mining?.analysis?.positiveSearchTerms || inputs.positives;
  const positiveByTerm = new Map((positiveTerms || []).map((row) => [normalizeTerm(row.searchTerm || row.searchTerm), row]));
  const activeLandingByUrl = new Map(inputs.activeLandingScores.map((row) => [row.url, row]));
  const landingCheckByUrl = new Map((landingChecks || []).map((row) => [row.url, row]));

  const campaignRows = CAMPAIGNS.map((campaign) => ({
    campaignName: campaign.campaignName,
    market: campaign.market,
    architectureRole: campaign.architectureRole,
    futureAction: campaign.futureAction,
    statusForFutureBuild: campaign.statusForFutureBuild,
    dailyBudgetCop: campaign.dailyBudgetCop,
    geoTargetType: campaign.geoTargetType,
    cityTargets: campaign.cityTargets.map((city) => `${city.name} (${city.geoId})`).join(' | '),
    negativeGeoTargets: campaign.negativeGeoTargets.map((geo) => `${geo.name} (${geo.geoId})`).join(' | '),
    language: campaign.language,
    phase: campaign.phase,
    launchGate: campaign.launchGate,
    currentCampaignsUnaffected: true,
    sharedNegativesRequiredBeforeLaunch: true,
  }));

  const adGroupRows = [];
  const keywordRows = [];
  const adRows = [];

  for (const campaign of CAMPAIGNS) {
    for (const adGroup of AD_GROUPS) {
      if (!campaignCanUseAdGroup(campaign, adGroup.name)) continue;
      const finalUrl = inferLanding(campaign, adGroup);
      const fallbackUrl = inferFallbackLanding(campaign, adGroup);
      const status = campaign.statusForFutureBuild === 'HOLD' ? 'HOLD' : campaign.market === 'BR' ? 'ENABLED_EXISTING_NO_CHANGE' : 'PAUSED_DRAFT';
      adGroupRows.push({
        campaignName: campaign.campaignName,
        adGroupName: adGroup.name,
        market: campaign.market,
        intent: adGroup.intent,
        statusForFutureBuild: status,
        phase: campaign.phase,
        landingUrl: finalUrl,
        fallbackLandingUrl: fallbackUrl,
        offer: adGroup.offer,
        activationGate: 'landing score >= 90, tracking present, manual RSA approval, validate-only pass',
      });
      const baseTerms = KEYWORDS_BY_AD_GROUP[adGroup.name] || [];
      const marketTerms = MARKET_KEYWORDS_BY_AD_GROUP[campaign.market]?.[adGroup.name] || [];
      const terms = campaign.market === 'BR'
        ? ['pacotes colombia', 'pacote viagem colombia']
        : campaign.market === 'AR' && adGroup.name !== 'AG1_Colombia_Packages_Exact'
          ? []
          : unique([...baseTerms, ...marketTerms]);
      for (const term of terms) {
        const positive = positiveByTerm.get(normalizeTerm(term));
        keywordRows.push({
          campaignName: campaign.campaignName,
          adGroupName: adGroup.name,
          market: campaign.market,
          keywordText: term,
          matchType: 'EXACT',
          statusForFutureBuild: status,
          phase: campaign.phase,
          source: positive ? '24m_positive_mining' : campaign.market === 'BR' ? 'current_br_controlled_test' : 'seed_plan',
          historicalSpendCop: positive?.spendCop || positive?.spendCop === 0 ? positive.spendCop : '',
          historicalClicks: positive?.clicks || positive?.clicks === 0 ? positive.clicks : '',
          intent: positive?.intent || adGroup.intent,
          expansionScore: positive?.expansionScore || '',
          landingUrl: finalUrl,
          phraseBlockedUntilCrmQuality: true,
        });
      }
      adRows.push(buildRsa(campaign, adGroup, finalUrl));
    }
  }

  const landingBriefRows = PRIORITY_LANDINGS.map((landing) => {
    const url = fullUrl(landing.slug);
    const check = landingCheckByUrl.get(url);
    const active = activeLandingByUrl.get(url);
    const usableNow = Boolean((check && check.ok200 && check.indexFollow && check.gtmOrGtag && check.waFlow && check.whatsapp && !check.notFound) || (active && Number(active.score) >= 90 && String(active.status) === '200'));
    return {
      slug: landing.slug,
      url,
      market: landing.market,
      primaryCity: landing.city,
      language: landing.language,
      intent: landing.intent,
      buildPriority: landing.market === 'BR' ? 'P0_existing_validate' : ['MX', 'ES', 'CL', 'AR'].includes(landing.market) ? 'P1_market_landing' : 'P2_destination_landing',
      currentStatus: usableNow ? 'usable_after_manual_confirmation' : 'needs_build_or_validation',
      httpStatus: check?.status || active?.status || '',
      ok200: check?.ok200 ?? (active ? String(active.status) === '200' : ''),
      indexFollow: check?.indexFollow ?? '',
      trackingPresent: check ? Boolean(check.gtmOrGtag && check.waFlow && check.whatsapp) : active ? Number(active.score) >= 90 : '',
      requiredModules: 'city-origin proof | direct-flight/friction reducer | full package offer | planner local | no flight/hotel-only qualifier | testimonials | suggested itineraries | WAFlow CTA | WhatsApp CTA | FAQ | tracking QA',
      requiredTracking: 'gclid/gbraid/wbraid | utm_source | utm_medium | utm_campaign | utm_content | reference_code | source_url',
      doNotUseUntil: '200 + index,follow + GTM/gtag/dataLayer + WAFlow + WhatsApp + score >= 90',
    };
  });

  const rolloutGateRows = [
    { gate: 'BR_24h', market: 'BR', trigger: '24h after first serving/spend', passCriteria: 'serving approved, landing URL healthy, no junk spend >20%, tracking present', actionIfPass: 'continue to 72h/30-click gate', actionIfFail: 'pause or adjust BR ad group/keywords only after approval' },
    { gate: 'BR_72h_or_30_clicks', market: 'BR', trigger: '72h or 30 clicks, whichever first after serving starts', passCriteria: 'waflow_submit or quote_sent or useful conversation with gclid/UTM/reference_code; spend < COP 150k without submit', actionIfPass: 'consider AR phase 2 validate-only', actionIfFail: 'hold AR and diagnose search terms/landing/ad copy' },
    { gate: 'AR_phase_2', market: 'AR', trigger: 'BR gate pass', passCriteria: 'Buenos Aires PRESENCE, AG1 only, [paquetes a colombia] EXACT, landing score >=90', actionIfPass: 'future create/activate paused-first plan for AR', actionIfFail: 'keep AR paused' },
    { gate: 'MX_ES_CL_shadow', market: 'MX|ES|CL', trigger: '72h post-negatives review', passCriteria: 'CRM quality remains >= current baseline, junk spend <=20%, no tracking regression', actionIfPass: 'prepare validate-only for shadow campaigns paused', actionIfFail: 'do not create shadow campaigns; refine landings/keywords' },
    { gate: 'smart_bidding_blocker', market: 'ALL', trigger: 'before any Smart Bidding optimization', passCriteria: 'Google Ads offline uploads, GA4 MP and Meta CAPI receive recent events without 401 backlog', actionIfPass: 'consider bidding experiments', actionIfFail: 'continue manual quality-led optimization' },
  ];

  const trackingChecklistRows = [
    { item: 'No current campaign mutation', requiredState: 'true', validation: 'runner writes local files only; no Google Ads mutate calls', status: 'planned_safe' },
    { item: 'Future campaign status', requiredState: 'PAUSED for new campaigns; HOLD for US', validation: 'campaigns.csv statusForFutureBuild', status: 'planned_safe' },
    { item: 'Geo mode', requiredState: 'PRESENCE', validation: 'campaigns.csv geoTargetType', status: 'planned_safe' },
    { item: 'Keyword match type', requiredState: 'EXACT only in phase 1', validation: 'keywords.csv matchType', status: 'planned_safe' },
    { item: 'Shared negatives', requiredState: 'attached/copied before future activation', validation: 'campaigns.csv sharedNegativesRequiredBeforeLaunch', status: 'required_before_launch' },
    { item: 'Landing health', requiredState: '200 + index,follow + GTM/gtag + WAFlow + WhatsApp', validation: 'landing-briefs.csv', status: 'required_before_launch' },
    { item: 'First-party quality', requiredState: 'waflow_submit, useful conversation, crm_quote_sent, opportunity, itinerary', validation: 'rollout-gates.csv', status: 'primary_optimization_signal' },
    { item: 'Downstream dispatch', requiredState: 'no GA4/Google Ads/Meta dispatch 401 backlog', validation: 'funnel audit / redispatch health', status: 'blocker_for_smart_bidding' },
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceArtifacts: {
      miningDir: path.relative(repoRoot, MINING_DIR),
      activeLandingDir: path.relative(repoRoot, ACTIVE_LANDING_DIR),
    },
    safety: {
      readOnlyLocalFilesOnly: true,
      googleAdsMutations: 0,
      supabaseWrites: 0,
      currentCampaignsUnaffected: true,
      futureNewCampaignsStatus: 'PAUSED_OR_HOLD',
    },
    counts: {
      campaigns: campaignRows.length,
      adGroups: adGroupRows.length,
      keywords: keywordRows.length,
      ads: adRows.length,
      landingBriefs: landingBriefRows.length,
      rolloutGates: rolloutGateRows.length,
      trackingChecklistItems: trackingChecklistRows.length,
      minedPositiveTerms: positiveTerms?.length || 0,
      historicalCampaignActions: inputs.campaignActions.length,
      landingOpportunities: inputs.landingOpps.length,
    },
  };

  return {
    meta: summary,
    campaigns: campaignRows,
    adGroups: adGroupRows,
    keywords: keywordRows,
    ads: adRows,
    landingBriefs: landingBriefRows,
    rolloutGates: rolloutGateRows,
    trackingChecklist: trackingChecklistRows,
    supportingInsights: {
      marketInsights: inputs.marketInsights,
      topPositiveTerms: (positiveTerms || []).slice(0, 50),
      topLandingOpportunities: inputs.landingOpps.slice(0, 25),
      campaignActions: inputs.campaignActions,
      landingChecks: landingChecks || [],
    },
  };
}

function table(rows, columns) {
  if (!rows.length) return '';
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(row[c.key] ?? '').replace(/\|/g, '/')).join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

function renderMarkdown(blueprint, opts) {
  const campaignsTable = table(blueprint.campaigns, [
    { key: 'campaignName', label: 'Campaign' },
    { key: 'market', label: 'Market' },
    { key: 'statusForFutureBuild', label: 'Future status' },
    { key: 'dailyBudgetCop', label: 'Budget COP/day' },
    { key: 'cityTargets', label: 'City gates' },
    { key: 'phase', label: 'Phase' },
  ]);
  const landingTable = table(blueprint.landingBriefs, [
    { key: 'slug', label: 'Landing' },
    { key: 'market', label: 'Market' },
    { key: 'primaryCity', label: 'Origin city' },
    { key: 'currentStatus', label: 'Status' },
    { key: 'httpStatus', label: 'HTTP' },
    { key: 'trackingPresent', label: 'Tracking' },
  ]);
  const gatesTable = table(blueprint.rolloutGates, [
    { key: 'gate', label: 'Gate' },
    { key: 'market', label: 'Market' },
    { key: 'trigger', label: 'Trigger' },
    { key: 'passCriteria', label: 'Pass criteria' },
  ]);
  const adGroupsByCampaign = blueprint.adGroups.reduce((acc, row) => {
    acc[row.campaignName] = (acc[row.campaignName] || 0) + 1;
    return acc;
  }, {});

  return `# ColombiaTours Search Architecture V2\n\nGenerated: ${blueprint.meta.generatedAt}\nMode: local blueprint only. No Google Ads or Supabase mutations.\n\n## Executive Summary\n\n- Built a city-gated Search architecture from 24m mining, 5d review, landing audits and CRM/WAFlow quality signals.\n- Current campaigns are explicitly not changed by this phase. New campaign designs are marked \`PAUSED\` or \`HOLD\`.\n- Output includes ${blueprint.campaigns.length} campaign rows, ${blueprint.adGroups.length} ad group rows, ${blueprint.keywords.length} exact keywords, ${blueprint.ads.length} RSA drafts and ${blueprint.landingBriefs.length} landing briefs.\n- Optimization source of truth remains first-party quality: \`waflow_submit\`, useful conversations, \`crm_quote_sent\`, opportunities, itineraries and click/UTM/reference traceability.\n\n## Safety Contract\n\n- Google Ads mutate operations: \`${blueprint.meta.safety.googleAdsMutations}\`.\n- Supabase writes: \`${blueprint.meta.safety.supabaseWrites}\`.\n- Future new campaigns: \`${blueprint.meta.safety.futureNewCampaignsStatus}\`.\n- Current MX/ES/CL/BR campaigns remain untouched; AR/US/FR/DE remain untouched.\n- Any future implementation must run validate-only first and requires explicit approval before creating paused campaigns.\n\n## Campaign Blueprint\n\n${campaignsTable}\n\nAd group count by campaign: ${Object.entries(adGroupsByCampaign).map(([name, count]) => `${name}: ${count}`).join('; ')}.\n\n## Landing Blueprint\n\n${landingTable}\n\nEach landing brief requires city-origin proof, direct-flight/friction reducer, full-package offer, planner local, no flight/hotel-only qualifier, testimonials, suggested itineraries, WAFlow CTA, WhatsApp CTA, FAQ and tracking QA.\n\n## Rollout Gates\n\n${gatesTable}\n\n## Files Generated\n\n- JSON: \`artifacts/google-ads/${opts.date}-colombiatours-search-architecture-v2/campaign-blueprint.json\`\n- CSV: \`campaigns.csv\`, \`ad-groups.csv\`, \`keywords.csv\`, \`ads.csv\`, \`landing-briefs.csv\`, \`rollout-gates.csv\`, \`tracking-checklist.csv\`\n\n## Implementation Notes For Future Apply\n\n1. Do not create or activate any campaign from this blueprint until landing briefs are built and score >= 90.\n2. Attach/copy the shared negative coverage before any campaign can leave paused state.\n3. Keep phase 1 exact-only; phrase is blocked until CRM confirms quality.\n4. Do not optimize with Smart Bidding until downstream dispatch to Google Ads offline uploads, GA4 MP and Meta CAPI is clean.\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  const outDir = path.join(repoRoot, 'artifacts/google-ads', `${opts.date}-colombiatours-search-architecture-v2`);
  const docsOut = path.join(repoRoot, 'docs/audits', `${opts.date}-colombiatours-search-architecture-v2.md`);
  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));

  const inputs = loadInputs();
  const landingUrls = unique(PRIORITY_LANDINGS.map((landing) => fullUrl(landing.slug)));
  const landingChecks = opts.validateLandings ? await Promise.all(landingUrls.map(fetchLanding)) : [];
  const blueprint = buildBlueprint(inputs, landingChecks, opts);

  fs.writeFileSync(path.join(outDir, 'campaign-blueprint.json'), JSON.stringify(blueprint, null, 2));
  fs.writeFileSync(path.join(outDir, 'campaigns.csv'), toCsv(blueprint.campaigns, ['campaignName', 'market', 'architectureRole', 'futureAction', 'statusForFutureBuild', 'dailyBudgetCop', 'geoTargetType', 'cityTargets', 'negativeGeoTargets', 'language', 'phase', 'launchGate', 'currentCampaignsUnaffected', 'sharedNegativesRequiredBeforeLaunch']));
  fs.writeFileSync(path.join(outDir, 'ad-groups.csv'), toCsv(blueprint.adGroups, ['campaignName', 'adGroupName', 'market', 'intent', 'statusForFutureBuild', 'phase', 'landingUrl', 'fallbackLandingUrl', 'offer', 'activationGate']));
  fs.writeFileSync(path.join(outDir, 'keywords.csv'), toCsv(blueprint.keywords, ['campaignName', 'adGroupName', 'market', 'keywordText', 'matchType', 'statusForFutureBuild', 'phase', 'source', 'historicalSpendCop', 'historicalClicks', 'intent', 'expansionScore', 'landingUrl', 'phraseBlockedUntilCrmQuality']));
  fs.writeFileSync(path.join(outDir, 'ads.csv'), toCsv(blueprint.ads, ['campaignName', 'adGroupName', 'market', 'language', 'finalUrl', 'fallbackFinalUrl', 'statusForFutureBuild', 'headlines', 'descriptions', 'approvalRequiredBeforeLaunch']));
  fs.writeFileSync(path.join(outDir, 'landing-briefs.csv'), toCsv(blueprint.landingBriefs, ['slug', 'url', 'market', 'primaryCity', 'language', 'intent', 'buildPriority', 'currentStatus', 'httpStatus', 'ok200', 'indexFollow', 'trackingPresent', 'requiredModules', 'requiredTracking', 'doNotUseUntil']));
  fs.writeFileSync(path.join(outDir, 'rollout-gates.csv'), toCsv(blueprint.rolloutGates, ['gate', 'market', 'trigger', 'passCriteria', 'actionIfPass', 'actionIfFail']));
  fs.writeFileSync(path.join(outDir, 'tracking-checklist.csv'), toCsv(blueprint.trackingChecklist, ['item', 'requiredState', 'validation', 'status']));
  fs.writeFileSync(docsOut, renderMarkdown(blueprint, opts));

  console.log(JSON.stringify({
    ok: true,
    readOnlyLocalFilesOnly: true,
    googleAdsMutations: 0,
    supabaseWrites: 0,
    outDir: path.relative(repoRoot, outDir),
    docsOut: path.relative(repoRoot, docsOut),
    counts: blueprint.meta.counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
