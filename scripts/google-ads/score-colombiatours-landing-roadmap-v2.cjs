#!/usr/bin/env node
'use strict';

/**
 * Read-only/local landing roadmap scorer for ColombiaTours Search Architecture V2.
 *
 * No Google Ads mutations. No Supabase writes. Fetches public landing URLs and
 * writes local scorecards/roadmap files only.
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const repoRoot = path.resolve(__dirname, '../..');
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);
const BASE_ARCH_DATE = '2026-05-18';

function usage() {
  console.log(`Usage: node scripts/google-ads/score-colombiatours-landing-roadmap-v2.cjs [--date=YYYY-MM-DD] [--architecture-date=YYYY-MM-DD]\n\nGenerates local-only landing base/target scores for ColombiaTours Search Architecture V2.`);
}

function parseArgs(argv) {
  const opts = { date: DEFAULT_DATE, architectureDate: BASE_ARCH_DATE, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--date=')) opts.date = arg.slice('--date='.length);
    else if (arg.startsWith('--architecture-date=')) opts.architectureDate = arg.slice('--architecture-date='.length);
  }
  for (const [name, value] of Object.entries({ date: opts.date, architectureDate: opts.architectureDate })) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--${name} must be YYYY-MM-DD`);
  }
  return opts;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(html, regex) {
  const match = html.match(regex);
  return match ? match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function extractMeta(html) {
  return {
    title: pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description:
      pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i),
    robots:
      pick(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i) ||
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i),
    canonical:
      pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i) ||
      pick(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i),
    h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
  };
}

async function fetchLanding(url) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 ColombiaToursLandingRoadmap/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    const html = await response.text();
    const text = stripHtml(html);
    const meta = extractMeta(html);
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      elapsedMs: Math.round(performance.now() - started),
      bytes: Buffer.byteLength(html),
      htmlSample: html.slice(0, 20000),
      text,
      textNorm: normalize(`${meta.title} ${meta.description} ${meta.h1} ${text}`),
      ...meta,
      markers: detectMarkers(html, text, meta),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      finalUrl: url,
      elapsedMs: Math.round(performance.now() - started),
      bytes: 0,
      htmlSample: '',
      text: '',
      textNorm: '',
      title: '',
      description: '',
      h1: '',
      robots: '',
      canonical: '',
      error: error.message,
      markers: {},
    };
  }
}

function detectMarkers(html, text, meta) {
  const haystack = `${html} ${text} ${meta.title} ${meta.description} ${meta.h1}`;
  const norm = normalize(haystack);
  return {
    indexFollow: !/noindex/i.test(meta.robots) && !/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
    notFound: /P[aá]gina no encontrada|Page not found|Paquete no encontrado|Package not found|Pacote n[aã]o encontrado|404/i.test(
      `${meta.title} ${meta.h1} ${text.slice(0, 1500)}`
    ),
    gtm: /googletagmanager|GTM-/i.test(html),
    gtag: /gtag\(|gtag\/js|google-analytics/i.test(html),
    dataLayer: /dataLayer/i.test(html),
    waFlow: /waflow|record_funnel_event|funnel/i.test(html),
    whatsapp: /wa\.me|whatsapp/i.test(haystack),
    planner: /planner|asesor|experto local|equipe local|equipo local|sob medida|a medida|personalizad|custom/i.test(haystack),
    fullPackage: /paquete completo|viaje completo|viagem completa|full trip|hoteles y experiencias|hot[eé]is, experi|hotels, experiences/i.test(haystack),
    noFlightHotelOnly: /no vendemos vuelos|no vendemos vuelo|no vendemos hoteles|no hotel suelto|no flight|not flights only|nao vendemos voos|não vendemos voos/i.test(haystack),
    directFlight: /vuelo directo|conexi[oó]n directa|direct flight|saindo de sao paulo|saliendo de|desde madrid|desde barcelona|desde santiago|desde buenos aires|desde cdmx|desde monterrey|sao paulo|ciudad de mexico|monterrey|madrid|barcelona|santiago|buenos aires/i.test(haystack),
    itinerary: /itinerario|ruta|roteiro|d[ií]as|day by day|salento|cocora|cartagena|medellin|bogota|san andres|eje cafetero|santa marta|cali/i.test(haystack),
    testimonials: /testimonio|testimonios|rese[nñ]a|reviews?|avalia[cç][oõ]es|google reviews|clientes/i.test(haystack),
    trust: /RNT\s*\d+|seguridad|soporte|agencia colombiana|local experts|expertos en colombia|presupuesto claro|calidad/i.test(haystack),
    faq: /preguntas frecuentes|faq|dudas|perguntas frequentes/i.test(haystack),
    priceBudget: /presupuesto|precio|desde \$|COP|USD|EUR|MXN|budget|quote|cotiza|cotizar/i.test(haystack),
    strongCta: /(cotiza|cotizar|solicita|planejar|planear|whatsapp|propuesta|quote|reserva|cont[aá]ctanos)/i.test(haystack),
    repeatedCtas: (haystack.match(/cotiza|cotizar|solicita|planejar|planear|whatsapp|propuesta|quote|reserva|cont[aá]ctanos/gi) || []).length,
    hero: /hero|<h1|backgroundImage|background-image|headline|cover/i.test(html),
    visualSections: (html.match(/section|card|grid|gallery|image|picture|figure|testimonial|faq|accordion|itinerary|timeline/gi) || []).length,
    hasImages: /<img|<picture|background-image|imageUrl|main_image|hero/i.test(html),
    packageLanguage: /paquetes|pacotes|packages|viajes|viagens|tours|itinerarios|roteiro/i.test(haystack),
    marketOrigin: /mexico|m[eé]xico|cdmx|monterrey|espa[nñ]a|madrid|barcelona|chile|santiago|argentina|buenos aires|brasil|sao paulo|s[aã]o paulo|usa|new york/i.test(norm),
  };
}

function campaignLandingMap(blueprint) {
  const rows = [];
  for (const adGroup of blueprint.adGroups) {
    rows.push({
      landingUrl: adGroup.landingUrl,
      campaignName: adGroup.campaignName,
      adGroupName: adGroup.adGroupName,
      market: adGroup.market,
      intent: adGroup.intent,
      phase: adGroup.phase,
      statusForFutureBuild: adGroup.statusForFutureBuild,
      offer: adGroup.offer,
    });
  }
  return rows;
}

function groupByLanding(blueprint) {
  const rows = campaignLandingMap(blueprint);
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.landingUrl) || {
      landingUrl: row.landingUrl,
      campaigns: [],
      adGroups: [],
      markets: [],
      intents: [],
      phases: [],
      offers: [],
      keywords: [],
      ads: [],
    };
    current.campaigns.push(row.campaignName);
    current.adGroups.push(row.adGroupName);
    current.markets.push(row.market);
    current.intents.push(row.intent);
    current.phases.push(row.phase);
    current.offers.push(row.offer);
    grouped.set(row.landingUrl, current);
  }
  for (const keyword of blueprint.keywords) {
    const adGroup = blueprint.adGroups.find((row) => row.campaignName === keyword.campaignName && row.adGroupName === keyword.adGroupName);
    if (!adGroup) continue;
    const current = grouped.get(adGroup.landingUrl);
    if (current) current.keywords.push(keyword.keywordText);
  }
  for (const ad of blueprint.ads) {
    const current = grouped.get(ad.finalUrl);
    if (current) current.ads.push(`${ad.headlines} ${ad.descriptions}`);
  }
  for (const landing of blueprint.landingBriefs) {
    const current = grouped.get(landing.url) || {
      landingUrl: landing.url,
      campaigns: [],
      adGroups: [],
      markets: [],
      intents: [landing.intent],
      phases: [],
      offers: [],
      keywords: [],
      ads: [],
    };
    current.slug = landing.slug;
    current.primaryCity = landing.primaryCity;
    current.language = landing.language;
    current.buildPriority = landing.buildPriority;
    grouped.set(landing.url, current);
  }
  return [...grouped.values()].map((row) => ({
    ...row,
    campaigns: [...new Set(row.campaigns)],
    adGroups: [...new Set(row.adGroups)],
    markets: [...new Set(row.markets)],
    intents: [...new Set(row.intents)],
    phases: [...new Set(row.phases)],
    offers: [...new Set(row.offers)],
    keywords: [...new Set(row.keywords)],
    ads: [...new Set(row.ads)],
  }));
}

function containsAny(textNorm, terms) {
  return terms.some((term) => textNorm.includes(normalize(term)));
}

function scoreLanding(fetchResult, group) {
  const m = fetchResult.markers || {};
  const textNorm = fetchResult.textNorm || '';
  const blockers = [];

  let technical = 0;
  if (fetchResult.ok && fetchResult.status === 200) technical += 5;
  if (m.indexFollow) technical += 3;
  if (fetchResult.canonical) technical += 2;
  if (m.gtm || m.gtag) technical += 3;
  if (m.dataLayer) technical += 1;
  if (m.waFlow && m.whatsapp) technical += 4;
  if (m.notFound) blockers.push('renders_not_found_or_404_copy');
  if (!fetchResult.ok || fetchResult.status !== 200) blockers.push('http_not_200');
  if (!m.indexFollow) blockers.push('noindex_or_missing_index_follow');

  let messageMatch = 0;
  if (containsAny(textNorm, group.keywords.slice(0, 8))) messageMatch += 6;
  if (containsAny(textNorm, group.intents)) messageMatch += 2;
  if (containsAny(textNorm, group.markets)) messageMatch += 2;
  if (m.marketOrigin) messageMatch += 5;
  if (m.packageLanguage) messageMatch += 4;
  if (m.directFlight) messageMatch += 3;
  if (!m.marketOrigin && ['MX', 'ES', 'CL', 'AR', 'BR'].some((market) => group.markets.includes(market))) blockers.push('weak_origin_city_match');

  let persuasion = 0;
  if (m.fullPackage) persuasion += 5;
  if (m.planner) persuasion += 4;
  if (m.noFlightHotelOnly) persuasion += 4;
  if (m.itinerary) persuasion += 3;
  if (m.priceBudget) persuasion += 2;
  if (containsAny(textNorm, group.offers)) persuasion += 2;
  if (!m.noFlightHotelOnly) blockers.push('missing_no_flight_hotel_filter');
  if (!m.fullPackage) blockers.push('missing_full_package_claim');

  let conversion = 0;
  if (m.strongCta) conversion += 4;
  if ((m.repeatedCtas || 0) >= 5) conversion += 4;
  else if ((m.repeatedCtas || 0) >= 2) conversion += 2;
  if (m.whatsapp) conversion += 3;
  if (m.waFlow) conversion += 3;
  if (m.faq) conversion += 1;
  if (!m.strongCta) blockers.push('weak_cta');

  let trust = 0;
  if (m.testimonials) trust += 4;
  if (m.trust) trust += 5;
  if (m.faq) trust += 2;
  if (m.priceBudget) trust += 2;
  if (m.planner) trust += 2;
  if (!m.testimonials) blockers.push('missing_testimonials_or_reviews');

  let visual = 0;
  if (m.hero) visual += 3;
  if (m.hasImages) visual += 2;
  if ((m.visualSections || 0) >= 20) visual += 3;
  else if ((m.visualSections || 0) >= 8) visual += 2;
  if (fetchResult.bytes > 50000) visual += 1;
  if (m.itinerary) visual += 1;
  if (!m.hasImages) blockers.push('weak_visual_asset_detection');

  let baseScore = technical + messageMatch + persuasion + conversion + trust + visual;
  if (blockers.includes('http_not_200') || blockers.includes('renders_not_found_or_404_copy') || blockers.includes('noindex_or_missing_index_follow')) {
    baseScore = Math.min(baseScore, 45);
  }

  const priority = group.buildPriority || inferBuildPriority(group);
  const targetScore = priority.startsWith('P0') || priority.startsWith('P1') ? 95 : priority.startsWith('P2') ? 92 : 90;
  const gap = Math.max(0, targetScore - baseScore);
  const readiness = baseScore >= targetScore && blockers.length === 0
    ? 'ready_for_manual_ad_review'
    : baseScore >= 90 && !blockers.includes('http_not_200') && !blockers.includes('renders_not_found_or_404_copy')
      ? 'near_ready_needs_copy_or_design_qa'
      : 'optimize_before_ads';

  const actions = recommendActions(blockers, { technical, messageMatch, persuasion, conversion, trust, visual }, group);

  return {
    landingUrl: group.landingUrl,
    slug: group.slug || new URL(group.landingUrl).pathname,
    markets: group.markets.join(' | ') || 'MULTI',
    campaigns: group.campaigns.join(' | '),
    adGroups: group.adGroups.join(' | '),
    priority,
    baseScore,
    targetScore,
    gap,
    readiness,
    technicalScore: technical,
    messageMatchScore: messageMatch,
    persuasionScore: persuasion,
    conversionScore: conversion,
    trustScore: trust,
    visualScore: visual,
    status: fetchResult.status,
    indexFollow: Boolean(fetchResult.markers?.indexFollow),
    trackingPresent: Boolean((fetchResult.markers?.gtm || fetchResult.markers?.gtag) && fetchResult.markers?.dataLayer && fetchResult.markers?.waFlow && fetchResult.markers?.whatsapp),
    h1: fetchResult.h1,
    title: fetchResult.title,
    blockers: [...new Set(blockers)].join(' | '),
    topActions: actions.slice(0, 6).join(' | '),
  };
}

function inferBuildPriority(group) {
  if (group.markets.includes('BR')) return 'P0_existing_validate';
  if (['MX', 'ES', 'CL', 'AR'].some((market) => group.markets.includes(market))) return 'P1_market_landing';
  if (group.markets.includes('US')) return 'P3_hold';
  return 'P2_destination_landing';
}

function recommendActions(blockers, scores, group) {
  const actions = [];
  if (blockers.includes('http_not_200') || blockers.includes('renders_not_found_or_404_copy')) actions.push('fix routing/content before any Ads use');
  if (blockers.includes('weak_origin_city_match')) actions.push(`add above-fold origin city proof: ${group.primaryCity || group.markets.join('/')}`);
  if (blockers.includes('missing_full_package_claim')) actions.push('state complete package: hotels + experiences + support, not isolated components');
  if (blockers.includes('missing_no_flight_hotel_filter')) actions.push('add qualifier: no flights or hotel-only sales');
  if (blockers.includes('missing_testimonials_or_reviews')) actions.push('add testimonials/reviews and local agency proof near first CTA');
  if (scores.messageMatch < 15) actions.push('rewrite hero/meta/H1 to mirror exact keywords and ad promise');
  if (scores.conversion < 12) actions.push('strengthen WAFlow + WhatsApp CTA hierarchy and repeat CTAs after each intent block');
  if (scores.visual < 8) actions.push('add premium hero, itinerary cards, destination image grid and trust band');
  if (scores.trust < 12) actions.push('add RNT/local planner/security/payment clarity/FAQ proof modules');
  if (actions.length === 0) actions.push('manual creative QA before future validate-only');
  return [...new Set(actions)];
}

function buildActionRows(scoreRows) {
  const rows = [];
  for (const row of scoreRows) {
    if (row.gap <= 0 && row.readiness === 'ready_for_manual_ad_review') continue;
    const actions = row.topActions.split(' | ').filter(Boolean);
    actions.forEach((action, index) => {
      rows.push({
        landingUrl: row.landingUrl,
        priority: row.priority,
        baseScore: row.baseScore,
        targetScore: row.targetScore,
        gap: row.gap,
        actionPriority: index + 1,
        action,
        owner: action.includes('routing') ? 'engineering' : action.includes('hero') || action.includes('visual') ? 'design_content' : 'growth_content',
        acceptanceCriteria: acceptanceForAction(action),
      });
    });
  }
  return rows;
}

function acceptanceForAction(action) {
  if (action.includes('routing')) return 'URL returns 200, index/follow, no not-found copy, canonical sane';
  if (action.includes('origin city')) return 'Hero and first screen mention origin city and direct-connect rationale';
  if (action.includes('complete package')) return 'Above-fold and offer block state full package components clearly';
  if (action.includes('no flights')) return 'Qualifier visible before first CTA: no flight-only or hotel-only sales';
  if (action.includes('testimonials')) return 'At least one proof band with testimonials/reviews/local agency credibility';
  if (action.includes('hero')) return 'H1/meta/hero align with exact keywords and RSA promise';
  if (action.includes('CTA')) return 'WAFlow and WhatsApp CTA visible above fold and repeated after major sections';
  if (action.includes('premium hero')) return 'Visual hero, itinerary cards, image grid and trust band present';
  if (action.includes('RNT')) return 'Trust module includes RNT/local planner/security/payment/FAQ details';
  return 'Manual QA confirms score target reached';
}

function table(rows, columns) {
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(row[c.key] ?? '').replace(/\|/g, '/')).join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

function renderMarkdown({ generatedAt, scoreRows, actionRows, campaignMap, outDirRelative }) {
  const sorted = [...scoreRows].sort((a, b) => {
    const priorityOrder = String(a.priority).localeCompare(String(b.priority));
    if (priorityOrder !== 0) return priorityOrder;
    return b.gap - a.gap;
  });
  const scoreTable = table(sorted, [
    { key: 'slug', label: 'Landing' },
    { key: 'markets', label: 'Markets' },
    { key: 'priority', label: 'Priority' },
    { key: 'baseScore', label: 'Base' },
    { key: 'targetScore', label: 'Target' },
    { key: 'gap', label: 'Gap' },
    { key: 'readiness', label: 'Readiness' },
    { key: 'topActions', label: 'Top actions' },
  ]);
  const campaignTable = table(campaignMap.slice(0, 40), [
    { key: 'campaignName', label: 'Campaign' },
    { key: 'adGroupName', label: 'Ad group' },
    { key: 'market', label: 'Market' },
    { key: 'landingUrl', label: 'Landing' },
    { key: 'statusForFutureBuild', label: 'Future status' },
  ]);
  const actionTable = table(actionRows.slice(0, 35), [
    { key: 'landingUrl', label: 'Landing' },
    { key: 'actionPriority', label: '#' },
    { key: 'action', label: 'Action' },
    { key: 'owner', label: 'Owner' },
    { key: 'acceptanceCriteria', label: 'Acceptance' },
  ]);

  return `# ColombiaTours Landing Roadmap V2 - Base vs Target Scores\n\nGenerated: ${generatedAt}\nMode: read-only fetch + local files. No Google Ads mutations. No Supabase writes.\n\n## Summary\n\n- Evaluated ${scoreRows.length} unique landings required by the Search Architecture V2 campaign/ad group map.\n- Scoring target: P0/P1 landings >=95, P2 destination landings >=92, hold landings >=90.\n- Campaigns remain untouched; this is a pre-activation CRO/design roadmap.\n- Use this before future validate-only campaign creation or any budget scale.\n\n## Scorecard\n\n${scoreTable}\n\n## Campaign To Landing Map\n\n${campaignTable}\n\n## Optimization Actions\n\n${actionTable}\n\n## Scoring Rubric\n\n- Technical/tracking: 0-18 points for 200, index/follow, canonical, GTM/gtag, dataLayer, WAFlow and WhatsApp.\n- Message match: 0-22 points for keyword, market, origin-city, package-language and direct-connect fit.\n- Persuasion: 0-20 points for complete package, planner local, no flight/hotel-only filter, itinerary and budget clarity.\n- Conversion: 0-15 points for CTA hierarchy, repeated CTAs, WAFlow, WhatsApp and FAQ.\n- Trust: 0-15 points for testimonials, RNT/local proof, support, payment/budget clarity and planner credibility.\n- Visual readiness: 0-10 points using HTML-level visual proxies: hero, images, cards/sections, itinerary modules and destination structure.\n\n## Files Generated\n\n- \`${outDirRelative}/landing-scorecard.json\`\n- \`${outDirRelative}/landing-scorecard.csv\`\n- \`${outDirRelative}/landing-actions.csv\`\n- \`${outDirRelative}/campaign-landing-map.csv\`\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  const architecturePath = path.join(repoRoot, 'artifacts/google-ads', `${opts.architectureDate}-colombiatours-search-architecture-v2`, 'campaign-blueprint.json');
  const blueprint = readJson(architecturePath);
  const outDir = path.join(repoRoot, 'artifacts/google-ads', `${opts.date}-colombiatours-landing-roadmap-v2`);
  const docsOut = path.join(repoRoot, 'docs/audits', `${opts.date}-colombiatours-landing-roadmap-v2.md`);
  ensureDir(outDir);
  ensureDir(path.dirname(docsOut));

  const groupedLandings = groupByLanding(blueprint);
  const fetches = await Promise.all(groupedLandings.map((group) => fetchLanding(group.landingUrl)));
  const byUrl = new Map(fetches.map((result) => [result.url, result]));
  const scoreRows = groupedLandings.map((group) => scoreLanding(byUrl.get(group.landingUrl), group));
  const actionRows = buildActionRows(scoreRows);
  const campaignMap = campaignLandingMap(blueprint);

  const generatedAt = new Date().toISOString();
  const scorecard = {
    meta: {
      generatedAt,
      readOnlyLocalFilesOnly: true,
      googleAdsMutations: 0,
      supabaseWrites: 0,
      architecturePath: path.relative(repoRoot, architecturePath),
      counts: {
        landings: scoreRows.length,
        actions: actionRows.length,
        campaignLandingRows: campaignMap.length,
      },
    },
    scoreRows,
    actionRows,
    campaignMap,
    fetches: fetches.map(({ htmlSample, text, textNorm, ...rest }) => ({ ...rest, textSample: text.slice(0, 1500) })),
  };

  fs.writeFileSync(path.join(outDir, 'landing-scorecard.json'), JSON.stringify(scorecard, null, 2));
  fs.writeFileSync(path.join(outDir, 'landing-scorecard.csv'), toCsv(scoreRows, ['landingUrl', 'slug', 'markets', 'campaigns', 'adGroups', 'priority', 'baseScore', 'targetScore', 'gap', 'readiness', 'technicalScore', 'messageMatchScore', 'persuasionScore', 'conversionScore', 'trustScore', 'visualScore', 'status', 'indexFollow', 'trackingPresent', 'h1', 'title', 'blockers', 'topActions']));
  fs.writeFileSync(path.join(outDir, 'landing-actions.csv'), toCsv(actionRows, ['landingUrl', 'priority', 'baseScore', 'targetScore', 'gap', 'actionPriority', 'action', 'owner', 'acceptanceCriteria']));
  fs.writeFileSync(path.join(outDir, 'campaign-landing-map.csv'), toCsv(campaignMap, ['landingUrl', 'campaignName', 'adGroupName', 'market', 'intent', 'phase', 'statusForFutureBuild', 'offer']));
  fs.writeFileSync(docsOut, renderMarkdown({
    generatedAt,
    scoreRows,
    actionRows,
    campaignMap,
    outDirRelative: path.relative(repoRoot, outDir),
  }));

  console.log(JSON.stringify({
    ok: true,
    readOnlyLocalFilesOnly: true,
    googleAdsMutations: 0,
    supabaseWrites: 0,
    docsOut: path.relative(repoRoot, docsOut),
    outDir: path.relative(repoRoot, outDir),
    counts: scorecard.meta.counts,
    scoreSummary: scoreRows.map((row) => ({ slug: row.slug, baseScore: row.baseScore, targetScore: row.targetScore, readiness: row.readiness })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
