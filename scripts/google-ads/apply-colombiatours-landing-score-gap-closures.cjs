#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const repoRoot = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-landing-score-gaps');
const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const AUDIT_SOURCE = 'paid_search_score_gap_closure_2026_05_18';
const HERO_CARTAGENA = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/landings/cartagena-skyline.jpg';
const HERO_MEDELLIN = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/2018/12/medellin-2429413_960_720.jpg';

function parseArgs(argv) {
  return { apply: argv.includes('--apply'), help: argv.includes('--help') || argv.includes('-h') };
}

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-landing-score-gap-closures.cjs
  node scripts/google-ads/apply-colombiatours-landing-score-gap-closures.cjs --apply

Default is dry-run. --apply writes website_pages + website_product_pages updates.
`);
}

function loadEnv() {
  dotenv.config({ path: path.join(repoRoot, '.env.local') });
  dotenv.config({ path: path.join(repoRoot, '.env.mcp') });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env');
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function section(content) {
  return {
    id: randomUUID(),
    type: 'text_image',
    variant: '',
    content: {
      eyebrow: 'Criterios de calidad',
      image: HERO_CARTAGENA,
      imageAlt: 'Viaje completo a Colombia con planner local',
      imagePosition: 'right',
      ...content,
      auditSource: AUDIT_SOURCE,
    },
  };
}

function stripAuditSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.filter((item) => item?.content?.auditSource !== AUDIT_SOURCE);
}

const gapSectionsBySlug = {
  'agencia-de-viajes-a-colombia-para-mexicanos': section({
    headline: 'Paquetes y viajes completos desde Mexico, no vuelos ni hotel suelto.',
    body:
      'Esta agencia organiza paquetes, tours y viajes completos a Colombia desde CDMX, Monterrey y Guadalajara para personas que comparan agencias. La conversacion filtra ciudad de salida, fechas, viajeros y presupuesto; no vendemos solo hotel ni vuelo internacional suelto. Tambien calificamos si buscas todo incluido, Cartagena, Medellin, Eje Cafetero, San Andres o una ruta a medida. Testimonios y resenas de viajeros ayudan a validar que la oportunidad sea real antes de cotizar.',
    ctaText: 'Cotizar viaje completo',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20viajo%20desde%20Mexico%20y%20quiero%20un%20viaje%20completo%20a%20Colombia%2C%20no%20solo%20hotel%20o%20vuelo.',
  }),
  'agencia-de-viajes-a-colombia-para-espanoles': section({
    headline: 'Viajes organizados desde Espana con ruta completa y origen claro.',
    body:
      'Trabajamos viajes organizados y paquetes a Colombia desde Madrid y Barcelona para viajeros que comparan agencias, tours y rutas privadas. La propuesta puede incluir Cartagena, Medellin, Cali, Eje Cafetero y Caribe, con hoteles, traslados, experiencias y soporte local. No vendemos solo hotel: disenamos viaje completo, todo incluido cuando aplica y con testimonios de viajeros europeos.',
    ctaText: 'Cotizar desde Espana',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20viajo%20desde%20Madrid%20o%20Barcelona%20y%20quiero%20un%20viaje%20organizado%20a%20Colombia.',
  }),
  'viajes-a-colombia-desde-chile': section({
    headline: 'Viaje completo desde Santiago, no una cotizacion suelta.',
    body:
      'Para Chile priorizamos Santiago porque permite una conversacion mas concreta sobre fechas, viajeros, presupuesto y destinos. Cotizamos paquetes y viajes completos a Colombia: Cartagena de Indias, Medellin, Eje Cafetero, San Andres y Caribe, con opcion todo incluido segun ruta. No vendemos solo hotel; ventas revisa testimonios, resenas y datos del lead antes de escalar.',
    ctaText: 'Cotizar desde Santiago',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20viajo%20desde%20Santiago%20de%20Chile%20y%20quiero%20un%20viaje%20completo%20a%20Colombia.',
  }),
  cartagena: section({
    headline: 'Cartagena se vende mejor como viaje completo, no como tour aislado.',
    body:
      'La propuesta conecta Cartagena de Indias, ciudad amurallada, Islas del Rosario, hotel, traslados, experiencias privadas y soporte por WhatsApp. Para mejorar calidad preguntamos ciudad de salida: Ciudad de Mexico, Monterrey, Madrid, Barcelona o Santiago. No vendemos solo hotel; armamos viaje completo, paquetes todo incluido cuando aplica y mostramos testimonios y resenas para dar confianza antes de cotizar.',
    ctaText: 'Cotizar Cartagena completo',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20quiero%20cotizar%20un%20viaje%20completo%20a%20Cartagena%20de%20Indias.',
  }),
  'eje-cafetero': section({
    headline: 'Eje Cafetero con ruta completa desde Espana y ciudades conectadas.',
    body:
      'Este paquete al Eje Cafetero cubre Salento, Valle del Cocora, fincas de cafe, termales, traslados y planner local. Funciona para viajes desde Madrid, Barcelona, Ciudad de Mexico, Monterrey o Santiago cuando la ruta combina Bogota, Medellin y Eje Cafetero. No vendemos solo hotel: cotizamos viaje completo, tours, experiencias y opciones todo incluido segun perfil. Testimonios y resenas ayudan a decidir.',
    image: HERO_MEDELLIN,
    imageAlt: 'Eje Cafetero y Medellin en viaje completo a Colombia',
    ctaText: 'Cotizar Eje Cafetero',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20quiero%20cotizar%20un%20viaje%20completo%20al%20Eje%20Cafetero.',
  }),
  'san-andres-4-dias': section({
    headline: 'San Andres requiere filtrar origen, fechas y expectativa de todo incluido.',
    body:
      'San Andres atrae muchas busquedas de paquetes, viaje, viajes a medida y todo incluido. Para proteger calidad preguntamos si sales de Ciudad de Mexico, Monterrey, Madrid, Barcelona o Santiago, y si quieres viaje completo con vuelos internos, hotel, traslados, Johnny Cay, Acuario y soporte local. No vendemos solo hotel; usamos testimonios y resenas para dar confianza antes de cerrar.',
    ctaText: 'Cotizar San Andres completo',
    ctaUrl: 'https://wa.me/573206129003?text=Hola%2C%20quiero%20cotizar%20San%20Andres%20como%20viaje%20completo%20a%20Colombia.',
  }),
  'pacotes-colombia': section({
    headline: 'Pacotes completos para Colombia saindo de Sao Paulo.',
    body:
      'A campanha do Brasil prioriza Sao Paulo porque melhora a rota e a qualidade do lead. Cotamos pacotes, viagem completa e roteiro privado para Colombia com Cartagena, Medellin, Eixo Cafeeiro, Caribe e suporte local. Nao vendemos apenas hotel nem passagem avulsa; pedimos datas, numero de viajantes, orcamento e cidade de origem. Testimonios, avaliacoes e RNT ajudam a validar a decisao.',
    ctaText: 'Cotar pacote completo',
    ctaUrl: 'https://wa.me/573206129003?text=Ola%2C%20sou%20de%20Sao%20Paulo%20e%20quero%20um%20pacote%20completo%20para%20a%20Colombia.',
  }),
};

async function upsertPortugueseAlias(supabase, sourceRow, apply) {
  const aliasSlug = 'pt/pacotes-colombia';
  const aliasPayload = {
    website_id: sourceRow.website_id,
    title: sourceRow.title,
    slug: aliasSlug,
    locale: 'pt-BR',
    page_type: sourceRow.page_type || 'custom',
    category_type: sourceRow.category_type || 'landing',
    is_published: true,
    robots_noindex: false,
    target_keyword: 'pacotes colombia sao paulo',
    translation_group_id: sourceRow.translation_group_id || sourceRow.id,
    seo_title: sourceRow.seo_title,
    seo_description: sourceRow.seo_description,
    hero_config: sourceRow.hero_config || {},
    intro_content: sourceRow.intro_content || {},
    cta_config: sourceRow.cta_config || {},
    sections: sourceRow.sections || [],
    updated_at: new Date().toISOString(),
  };

  if (!apply) return { slug: aliasSlug, planned: true, payload: aliasPayload };
  const { data: existing, error: existingError } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', sourceRow.website_id)
    .eq('slug', aliasSlug)
    .maybeSingle();
  if (existingError) throw existingError;

  const write = existing
    ? supabase.from('website_pages').update(aliasPayload).eq('id', existing.id)
    : supabase.from('website_pages').insert(aliasPayload);
  const { data, error } = await write
    .select('id,slug,title,seo_title,is_published,robots_noindex')
    .single();
  if (error) throw error;
  return { slug: aliasSlug, applied: true, row: data };
}

async function updateProductOverlay(supabase, apply) {
  const slug = 'medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera';
  const { data: pkg, error: pkgError } = await supabase
    .from('package_kits')
    .select('id,source_itinerary_id,slug,name')
    .eq('slug', slug)
    .single();
  if (pkgError) throw pkgError;

  const payload = {
    website_id: WEBSITE_ID,
    product_type: 'package',
    product_id: pkg.id,
    locale: 'es-CO',
    slug,
    is_published: true,
    robots_noindex: false,
    custom_seo_title: 'Medellin y Guatape 5 dias',
    custom_seo_description:
      'Medellin y Guatape en viaje completo: Comuna 13, Penol, traslados, experiencias, planner local y WhatsApp. No vendemos solo hotel.',
    target_keyword: 'medellin guatape 5 dias',
    body_content:
      'Viaje completo a Medellin y Guatape con Comuna 13, Penol, traslados, experiencias locales, planner y soporte por WhatsApp. No vendemos solo hotel; calificamos ciudad de salida, fechas, presupuesto y tipo de viajero.',
    custom_faq: [
      {
        question: 'El paquete es solo hotel?',
        answer: 'No. Es un viaje completo con ruta, experiencias, traslados y soporte local; ajustamos hoteles y ritmo segun perfil.',
      },
    ],
    updated_at: new Date().toISOString(),
  };

  if (!apply) return { slug, productId: pkg.id, planned: true, payload };
  const { data: existing, error: existingError } = await supabase
    .from('website_product_pages')
    .select('id')
    .eq('website_id', WEBSITE_ID)
    .eq('product_type', payload.product_type)
    .eq('product_id', payload.product_id)
    .eq('locale', payload.locale)
    .maybeSingle();
  if (existingError) throw existingError;

  const write = existing
    ? supabase.from('website_product_pages').update(payload).eq('id', existing.id)
    : supabase.from('website_product_pages').insert(payload);
  const { data, error } = await write
    .select('id,product_id,locale,custom_seo_title,custom_seo_description')
    .single();
  if (error) throw error;
  return { slug, applied: true, row: data };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnv();
  const supabase = createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const slugs = Object.keys(gapSectionsBySlug);

  const { data: rows, error } = await supabase
    .from('website_pages')
    .select('id,website_id,title,slug,locale,page_type,category_type,is_published,robots_noindex,target_keyword,translation_group_id,seo_title,seo_description,hero_config,intro_content,cta_config,sections,updated_at')
    .eq('website_id', WEBSITE_ID)
    .in('slug', slugs);
  if (error) throw error;
  const bySlug = new Map((rows || []).map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !bySlug.has(slug));
  if (missing.length) throw new Error(`Missing pages: ${missing.join(', ')}`);

  const updates = [];
  for (const slug of slugs) {
    const row = bySlug.get(slug);
    const baseSections = stripAuditSections(row.sections);
    const next = {
      sections: [gapSectionsBySlug[slug], ...baseSections],
      updated_at: new Date().toISOString(),
    };
    updates.push({ slug, id: row.id, beforeSections: Array.isArray(row.sections) ? row.sections.length : 0, afterSections: next.sections.length, next });
    if (args.apply) {
      const { error: updateError } = await supabase.from('website_pages').update(next).eq('id', row.id).eq('website_id', WEBSITE_ID);
      if (updateError) throw updateError;
    }
  }

  const refreshedPtSource = {
    ...bySlug.get('pacotes-colombia'),
    sections: [gapSectionsBySlug['pacotes-colombia'], ...stripAuditSections(bySlug.get('pacotes-colombia').sections)],
  };
  const aliasResult = await upsertPortugueseAlias(supabase, refreshedPtSource, args.apply);
  const productOverlay = await updateProductOverlay(supabase, args.apply);

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dryRun',
    auditSource: AUDIT_SOURCE,
    updates,
    portugueseAlias: aliasResult,
    productOverlay,
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(OUT_DIR, `${stamp}-${args.apply ? 'apply' : 'dry-run'}-report.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, mode: report.mode, reportPath: path.relative(repoRoot, reportPath), updates, portugueseAlias: aliasResult, productOverlay }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
