#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const repoRoot = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-landing-optimizations');
const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const SUBDOMAIN = 'colombiatours';
const DOMAIN = 'https://colombiatours.travel';
const WHATSAPP = 'https://wa.me/573206129003';
const AUDIT_SOURCE = 'paid_search_landing_optimization_2026_05_18';
const HERO_CARTAGENA = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/landings/cartagena-skyline.jpg';
const HERO_MEDELLIN = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/2018/12/medellin-2429413_960_720.jpg';

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-landing-optimizations.cjs
  node scripts/google-ads/apply-colombiatours-landing-optimizations.cjs --apply

Default mode is dry-run. --apply writes website_pages updates and attempts ISR revalidation.
`);
}

function parseArgs(argv) {
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    apply: argv.includes('--apply'),
  };
}

function loadEnv() {
  dotenv.config({ path: path.join(repoRoot, '.env.local') });
  dotenv.config({ path: path.join(repoRoot, '.env.mcp') });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return { url, serviceRole, revalidateSecret: process.env.REVALIDATE_SECRET || '' };
}

function wa(message) {
  return `${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function section(type, content, variant = '') {
  return {
    id: randomUUID(),
    type,
    variant,
    content: {
      ...content,
      auditSource: AUDIT_SOURCE,
    },
  };
}

function stripAuditSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.filter((item) => item?.content?.auditSource !== AUDIT_SOURCE);
}

function withAuditSections(existingSections, newSections, position = 'append') {
  const base = stripAuditSections(existingSections);
  if (position === 'prepend') return [...newSections, ...base];
  return [...base, ...newSections];
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

const patches = [
  {
    slug: 'pacotes-colombia',
    title: 'Pacotes para Colombia saindo de Sao Paulo',
    seo_title: 'Pacotes Colombia Sao Paulo',
    seo_description:
      'Pacotes para Colombia saindo de Sao Paulo com planner local: Cartagena, Medellin, Eixo Cafeeiro e Caribe. Cotacao por WhatsApp, sem venda de voo avulso.',
    target_keyword: 'pacotes colombia sao paulo',
    hero_config: {
      eyebrow: 'Para viajantes de Sao Paulo · conexao direta com Bogota',
      title: 'Pacotes para Colombia saindo de Sao Paulo, feitos sob medida',
      subtitle:
        'Roteiros privados por Cartagena, Medellin, Eixo Cafeeiro e Caribe colombiano, com planner local na Colombia e proposta clara antes de reservar.',
      ctaText: 'Pedir cotacao por WhatsApp',
      cta_text: 'Pedir cotacao por WhatsApp',
      ctaUrl: wa('Ola ColombiaTours, sou de Sao Paulo e quero cotar um pacote para a Colombia. Datas aproximadas:'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rotas sugeridas',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_CARTAGENA,
      background_image: HERO_CARTAGENA,
    },
    intro_content: {
      text:
        'Esta landing e para viajantes do Brasil que querem um pacote completo para a Colombia, nao apenas passagem ou hotel. Priorizamos Sao Paulo porque a conexao direta com Bogota facilita uma rota mais viavel e aumenta a chance de fechar uma proposta real.',
      highlights: [
        'Origem prioritaria: Sao Paulo',
        'Roteiros privados de 8 a 15 dias',
        'Cartagena, Medellin, Eixo Cafeeiro e Caribe',
        'Cotacao por WhatsApp com planner local',
        'Nao vendemos voo internacional avulso',
      ],
    },
    cta_config: {
      title: 'Quer validar uma rota realista antes de reservar?',
      subtitle: 'Envie cidade de origem, datas, numero de viajantes e estilo de viagem. Respondemos com uma proposta concreta.',
      buttonText: 'Falar com um planner',
      buttonLink: wa('Ola ColombiaTours, quero montar minha rota pela Colombia saindo de Sao Paulo.'),
    },
    position: 'prepend',
    sections: [
      section('text_image', {
        eyebrow: 'Origem com melhor eficiencia',
        headline: 'Sao Paulo entra primeiro porque reduz friccao logistica e melhora qualidade do lead.',
        body:
          'Para esta fase de aprendizado vamos priorizar viajantes com origem em Sao Paulo. A rota costuma ser mais simples para entrar por Bogota e conectar Cartagena, Medellin, Eixo Cafeeiro ou Caribe colombiano sem improvisar deslocamentos.',
        image: HERO_MEDELLIN,
        imageAlt: 'Roteiro pela Colombia para viajantes saindo de Sao Paulo',
        imagePosition: 'right',
        ctaText: 'Cotizar rota desde Sao Paulo',
        ctaUrl: wa('Ola, sou de Sao Paulo e quero uma rota pela Colombia com Cartagena, Medellin e Eixo Cafeeiro.'),
      }),
      section('faq_accordion', {
        title: 'Antes de cotar',
        faqs: [
          {
            question: 'O pacote inclui passagem internacional do Brasil?',
            answer:
              'O foco e montar o roteiro terrestre e a logistica na Colombia. Se voce ja tem ou vai comprar o voo internacional, alinhamos a chegada com a melhor rota interna.',
          },
          {
            question: 'Por que Sao Paulo e a origem prioritaria?',
            answer:
              'Porque a conectividade com Bogota reduz atrito, melhora a viabilidade da rota e ajuda nossa equipe comercial a qualificar melhor datas, orcamento e destinos.',
          },
        ],
      }),
    ],
  },
  {
    slug: 'agencia-de-viajes-a-colombia-para-espanoles',
    title: 'Viaje a Colombia a medida desde Espana',
    seo_title: 'Colombia desde Espana a medida',
    seo_description:
      'Viajes a Colombia desde Espana con planner local. Rutas privadas por Cartagena, Medellin, Eje Cafetero y Caribe desde Madrid o Barcelona.',
    target_keyword: 'viaje a colombia desde espana',
    hero_config: {
      eyebrow: 'Para viajeros desde Madrid y Barcelona · planner local en Colombia',
      title: 'Viaje a Colombia a medida desde Espana',
      subtitle:
        'Itinerarios privados por Cartagena, Medellin, Eje Cafetero y Caribe con precio claro, soporte por WhatsApp y rutas pensadas para viajar desde Espana.',
      ctaUrl: wa('Hola ColombiaTours, viajo desde Espana y quiero cotizar una ruta privada por Colombia. Ciudad de salida:'),
      ctaText: 'Cotizar por WhatsApp',
      cta_text: 'Cotizar por WhatsApp',
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rutas base',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_CARTAGENA,
      background_image: HERO_CARTAGENA,
    },
    intro_content: {
      text:
        'Disenamos viajes a Colombia desde Espana para viajeros que quieren una ruta completa y coordinada. Priorizamos Madrid y Barcelona por conectividad, claridad de origen y mayor probabilidad de cierre comercial.',
      highlights: [
        'Origenes prioritarios: Madrid y Barcelona',
        'Cartagena, Medellin, Eje Cafetero y Caribe',
        'Planner local en Colombia',
        'Cotizacion por WhatsApp',
        'Rutas privadas de 8 a 15 dias',
      ],
    },
    sections: [
      section('text_image', {
        eyebrow: 'Madrid y Barcelona primero',
        headline: 'La ciudad de salida importa: mejora la ruta, la conversacion y la probabilidad de cierre.',
        body:
          'Cuando sabemos si sales de Madrid o Barcelona podemos ajustar noches, entrada a Bogota o Cartagena, vuelos internos, traslados y ritmo. La propuesta deja de ser generica y pasa a ser una ruta viable.',
        image: HERO_CARTAGENA,
        imageAlt: 'Cartagena en una ruta a Colombia desde Espana',
        imagePosition: 'right',
        ctaText: 'Cotizar desde mi ciudad',
        ctaUrl: wa('Hola, viajo desde Madrid o Barcelona y quiero cotizar una ruta a Colombia.'),
      }),
    ],
  },
  {
    slug: 'agencia-de-viajes-a-colombia-para-mexicanos',
    title: 'Viajes a Colombia desde Mexico, CDMX y Monterrey',
    seo_title: 'Colombia desde CDMX y Monterrey',
    seo_description:
      'Viajes a Colombia desde Mexico con planner local. Rutas a medida desde CDMX, Monterrey o Guadalajara por Cartagena, Medellin, Eje Cafetero y Caribe.',
    target_keyword: 'viajes a colombia desde mexico',
    hero_config: {
      eyebrow: 'Para viajeros de CDMX, Monterrey y Guadalajara',
      title: 'Viajes personalizados a Colombia desde Mexico',
      subtitle:
        'Arma tu ruta por Medellin, Eje Cafetero, Cartagena o San Andres con planner local. Priorizamos ciudades con mejor conectividad para darte una propuesta mas cerrable.',
      ctaUrl: wa('Hola ColombiaTours, viajo desde Mexico y quiero cotizar una ruta a Colombia. Mi ciudad de salida es:'),
      ctaText: 'Cotizar por WhatsApp',
      cta_text: 'Cotizar por WhatsApp',
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver paquetes desde MXN',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_MEDELLIN,
      background_image: HERO_MEDELLIN,
    },
    intro_content: {
      text:
        'Esta propuesta esta pensada para viajeros de Mexico que quieren paquete completo, no vuelos u hoteles sueltos. Para optimizar calidad vamos a priorizar CDMX, Monterrey y Guadalajara por conectividad y facilidad de cierre.',
      highlights: [
        'Origenes prioritarios: CDMX, Monterrey y Guadalajara',
        'Rutas con Medellin, Eje Cafetero, Cartagena o San Andres',
        'Precios de referencia en MXN',
        'Planner local en Colombia',
        'No vendemos vuelos internacionales sueltos',
      ],
    },
    sections: [
      section('text_image', {
        eyebrow: 'City-gating comercial',
        headline: 'La pauta debe atraer viajeros con ciudad de salida clara, fechas y presupuesto real.',
        body:
          'CDMX, Monterrey y Guadalajara permiten conversaciones mas concretas: fechas, entrada a Colombia, rutas internas y presupuesto. Esa informacion ayuda a ventas a separar curiosos de oportunidades reales.',
        image: HERO_MEDELLIN,
        imageAlt: 'Viaje a Colombia desde Mexico con planner local',
        imagePosition: 'right',
        ctaText: 'Validar mi ruta',
        ctaUrl: wa('Hola, viajo desde CDMX, Monterrey o Guadalajara y quiero validar una ruta a Colombia.'),
      }),
    ],
  },
  {
    slug: 'viajes-a-colombia-desde-chile',
    title: 'Viajes a Colombia desde Santiago de Chile',
    seo_title: 'Colombia desde Santiago Chile',
    seo_description:
      'Viajes a Colombia desde Santiago de Chile con planner local. Rutas privadas por Cartagena, Medellin, Eje Cafetero, San Andres y Caribe.',
    target_keyword: 'viajes a colombia desde chile',
    hero_config: {
      eyebrow: 'Para viajeros desde Santiago · planner local en Colombia',
      title: 'Viajes a Colombia desde Santiago de Chile',
      subtitle:
        'Paquetes a Colombia desde Chile con rutas a medida por Cartagena, Medellin, Eje Cafetero y Caribe. Cotiza por WhatsApp con precio claro y soporte local.',
      ctaUrl: wa('Hola ColombiaTours, viajo desde Santiago de Chile y quiero cotizar un viaje a Colombia. Fechas aproximadas:'),
      ctaText: 'Cotizar por WhatsApp',
      cta_text: 'Cotizar por WhatsApp',
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rutas base',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_CARTAGENA,
      background_image: HERO_CARTAGENA,
    },
    intro_content: {
      text:
        'Disenamos viajes a Colombia desde Chile para personas que quieren una ruta completa y bien coordinada. En pauta priorizamos Santiago porque concentra mejor conectividad y permite conversaciones comerciales mas precisas.',
      highlights: [
        'Origen prioritario: Santiago de Chile',
        'Cartagena, Medellin, Eje Cafetero y Caribe',
        'Cotizacion por WhatsApp',
        'Planner local en Colombia',
        'Rutas de 6 a 15 dias',
      ],
    },
    sections: [
      section('text_image', {
        eyebrow: 'Santiago como punto de partida',
        headline: 'El siguiente salto de calidad en Chile es limitar aprendizaje a Santiago.',
        body:
          'La landing ahora pide ciudad de salida, fechas, viajeros y destinos. Esto reduce leads ambiguos y ayuda a ventas a priorizar oportunidades con ruta y presupuesto mas claros.',
        image: HERO_CARTAGENA,
        imageAlt: 'Viaje a Colombia desde Santiago de Chile',
        imagePosition: 'right',
        ctaText: 'Cotizar desde Santiago',
        ctaUrl: wa('Hola, viajo desde Santiago de Chile y quiero cotizar una ruta a Colombia.'),
      }),
    ],
  },
  {
    slug: 'cartagena',
    title: 'Cartagena de Indias a medida',
    seo_title: 'Cartagena de Indias a medida',
    seo_description:
      'Paquetes a Cartagena de Indias con planner local: ciudad amurallada, Islas del Rosario, hoteles y experiencias privadas con soporte por WhatsApp.',
    target_keyword: 'paquetes cartagena colombia',
    hero_config: {
      eyebrow: 'Cartagena privada · Caribe colombiano',
      title: 'Cartagena de Indias con ruta, hotel y experiencias a medida',
      subtitle:
        'Combina ciudad amurallada, Islas del Rosario, Getsemani y Caribe con un planner local que coordina traslados, hoteles y actividades.',
      ctaText: 'Cotizar Cartagena por WhatsApp',
      cta_text: 'Cotizar Cartagena por WhatsApp',
      ctaUrl: wa('Hola ColombiaTours, quiero cotizar un viaje a Cartagena de Indias. Fechas aproximadas:'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver ideas de ruta',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_CARTAGENA,
      background_image: HERO_CARTAGENA,
    },
    intro_content: {
      text:
        'Cartagena funciona mejor cuando no se vende como una lista de tours sueltos. La propuesta debe conectar ciudad amurallada, islas, hotel, traslados y ritmo de viaje en una ruta clara.',
      highlights: [
        'Ciudad amurallada e Islas del Rosario',
        'Hoteles boutique o playa segun perfil',
        'Traslados y experiencias coordinadas',
        'Planner local por WhatsApp',
        'Ideal para parejas, familias y viajes privados',
      ],
    },
    position: 'prepend',
    sections: [
      section('trust_bar', {
        rating: { score: 4.9, count: 153, source: 'Google' },
        sslBadge: true,
        travelerCount: 12400,
        travelerLabel: 'viajeros atendidos',
        certifications: [{ name: 'RNT 35323' }, { name: 'Operador local en Colombia' }],
      }),
      section('pricing', {
        anchorLabel: 'Ideas de ruta',
        title: 'Rutas base para Cartagena',
        subtitle: 'Los valores finales dependen de fechas, hotel, numero de viajeros y experiencias elegidas.',
        currency: 'USD',
        tiers: [
          {
            name: 'Cartagena esencial 4 dias',
            price: '620',
            period: 'desde',
            perPerson: true,
            description: 'Ciudad amurallada, Getsemani e Islas del Rosario.',
            features: ['Hotel seleccionado', 'Traslados privados', 'Experiencia guiada', 'Soporte por WhatsApp'],
            ctaText: 'Cotizar Cartagena',
            ctaUrl: wa('Hola, quiero cotizar Cartagena esencial 4 dias.'),
            highlighted: true,
          },
          {
            name: 'Cartagena + Caribe 6 dias',
            price: '980',
            period: 'desde',
            perPerson: true,
            description: 'Cartagena, islas y playa con ritmo mas tranquilo.',
            features: ['Ruta privada', 'Hoteles boutique o playa', 'Traslados', 'Planner local'],
            ctaText: 'Quiero Caribe colombiano',
            ctaUrl: wa('Hola, quiero cotizar Cartagena y Caribe colombiano.'),
          },
        ],
      }),
      section('faq_accordion', {
        title: 'Preguntas antes de viajar a Cartagena',
        faqs: [
          {
            question: 'Cuantos dias conviene estar en Cartagena?',
            answer: 'Para una primera visita recomendamos 4 a 6 dias si quieres combinar ciudad amurallada, Getsemani, islas y tiempo libre sin correr.',
          },
          {
            question: 'Es mejor hotel en centro historico o playa?',
            answer: 'Depende del perfil. Centro historico funciona para caminar y gastronomia; playa o islas funcionan mejor si buscas descanso. Podemos combinar ambos.',
          },
        ],
      }),
    ],
  },
];

function buildUpdate(row, patch) {
  const existingSections = Array.isArray(row.sections) ? row.sections : [];
  return compactObject({
    title: patch.title,
    slug: row.slug,
    locale: row.locale,
    page_type: row.page_type || 'custom',
    category_type: row.category_type || 'landing',
    is_published: true,
    robots_noindex: false,
    target_keyword: patch.target_keyword,
    seo_title: patch.seo_title,
    seo_description: patch.seo_description,
    hero_config: { ...(row.hero_config || {}), ...(patch.hero_config || {}) },
    intro_content: patch.intro_content ?? row.intro_content,
    cta_config: { ...(row.cta_config || {}), ...(patch.cta_config || {}) },
    sections: withAuditSections(existingSections, patch.sections || [], patch.position || 'append'),
    updated_at: new Date().toISOString(),
  });
}

function summarizeChange(before, after) {
  return {
    slug: before.slug,
    title: { from: before.title, to: after.title },
    seoTitle: { from: before.seo_title, to: after.seo_title },
    seoDescriptionChanged: before.seo_description !== after.seo_description,
    heroTitle: { from: before.hero_config?.title || null, to: after.hero_config?.title || null },
    sectionCount: {
      from: Array.isArray(before.sections) ? before.sections.length : 0,
      to: Array.isArray(after.sections) ? after.sections.length : 0,
    },
    auditSectionsAdded: (after.sections || []).filter((item) => item?.content?.auditSource === AUDIT_SOURCE).length,
  };
}

async function revalidatePathForSlug(slug, secret) {
  if (!secret) return { slug, skipped: true, reason: 'missing_REVALIDATE_SECRET' };
  const pathToRevalidate = `/site/${SUBDOMAIN}/${slug}`;
  const response = await fetch(`${DOMAIN}/api/revalidate`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ subdomain: SUBDOMAIN, path: pathToRevalidate }),
  });
  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }
  return { slug, status: response.status, ok: response.ok, path: pathToRevalidate, body };
}

async function fetchTitle(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const html = await response.text();
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || null;
  const noindex = /name=["']robots["'][^>]*noindex/i.test(html) || /noindex/i.test(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || '');
  const notFound = /Pagina no encontrada|Página no encontrada|Page not found/i.test(html);
  return { url, status: response.status, finalUrl: response.url, title, noindex, notFound, bytes: html.length };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  const env = loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(env.url, env.serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const slugs = patches.map((patch) => patch.slug);
  const { data: rows, error } = await supabase
    .from('website_pages')
    .select('id,website_id,title,slug,locale,page_type,category_type,is_published,robots_noindex,target_keyword,seo_title,seo_description,hero_config,intro_content,cta_config,sections,updated_at')
    .eq('website_id', WEBSITE_ID)
    .in('slug', slugs);
  if (error) throw error;

  const rowsBySlug = new Map((rows || []).map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !rowsBySlug.has(slug));
  if (missing.length) throw new Error(`Missing website_pages rows: ${missing.join(', ')}`);

  const updates = patches.map((patch) => {
    const before = rowsBySlug.get(patch.slug);
    const after = buildUpdate(before, patch);
    return { slug: patch.slug, id: before.id, before, after, summary: summarizeChange(before, after) };
  });

  const applyResults = [];
  if (args.apply) {
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('website_pages')
        .update(update.after)
        .eq('id', update.id)
        .eq('website_id', WEBSITE_ID);
      if (updateError) throw updateError;
      applyResults.push({ slug: update.slug, applied: true });
    }
  }

  const revalidations = [];
  if (args.apply) {
    for (const patch of patches) {
      revalidations.push(await revalidatePathForSlug(patch.slug, env.revalidateSecret));
    }
  }

  const liveChecks = [];
  if (args.apply) {
    for (const patch of patches) {
      liveChecks.push(await fetchTitle(`${DOMAIN}/${patch.slug}?landing_opt=${Date.now()}`));
    }
  }

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dryRun',
    websiteId: WEBSITE_ID,
    domain: DOMAIN,
    auditSource: AUDIT_SOURCE,
    updates: updates.map((update) => update.summary),
    applyResults,
    revalidations,
    liveChecks,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(OUT_DIR, `${stamp}-${args.apply ? 'apply' : 'dry-run'}-report.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, `${stamp}-${args.apply ? 'apply' : 'dry-run'}-snapshots.json`), `${JSON.stringify(updates, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    reportPath: path.relative(repoRoot, reportPath),
    updates: report.updates,
    revalidations: report.revalidations.map((item) => ({ slug: item.slug, status: item.status, ok: item.ok, skipped: item.skipped, reason: item.reason })),
    liveChecks: report.liveChecks.map((item) => ({ url: item.url, status: item.status, title: item.title, noindex: item.noindex, notFound: item.notFound })),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
