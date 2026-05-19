#!/usr/bin/env node
'use strict';

/**
 * Idempotent builder for ColombiaTours paid-search landing pages V2.
 *
 * Default mode is dry-run. --apply writes website_pages and legacy redirects,
 * then attempts ISR revalidation and live verification. No Google Ads mutations.
 */

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const repoRoot = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(repoRoot, 'artifacts/google-ads/2026-05-18-colombiatours-paid-search-landings-v2');
const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const ACCOUNT_ID = '9fc24733-b127-4184-aa22-12f03b98927a';
const SUBDOMAIN = 'colombiatours';
const DOMAIN = 'https://colombiatours.travel';
const WHATSAPP = 'https://wa.me/573206129003';
const AUDIT_SOURCE = 'paid_search_landings_v2_2026_05_18';
const AUDIT_GAP_CLOSURE = 'paid_search_landings_v2_gap_closure_2026_05_19';
const REQUIRED_SUPPORTED_LOCALES = ['es', 'es-CO', 'en-US', 'pt-BR', 'fr-FR', 'de-DE'];
const HERO_CARTAGENA = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/landings/cartagena-skyline.jpg';
const HERO_MEDELLIN = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/2018/12/medellin-2429413_960_720.jpg';
const HERO_COFFEE = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/2018/12/medellin-2429413_960_720.jpg';
const HERO_SAN_ANDRES = 'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/landings/cartagena-skyline.jpg';

function usage() {
  console.log(`Usage:
  node scripts/google-ads/apply-colombiatours-paid-search-landings-v2.cjs
  node scripts/google-ads/apply-colombiatours-paid-search-landings-v2.cjs --apply
  node scripts/google-ads/apply-colombiatours-paid-search-landings-v2.cjs --apply --skip-live-check

Default is dry-run. --apply writes Supabase website_pages and website_legacy_redirects only. It never mutates Google Ads.`);
}

function parseArgs(argv) {
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    apply: argv.includes('--apply'),
    skipLiveCheck: argv.includes('--skip-live-check'),
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
    content: { ...content, auditSource: AUDIT_SOURCE },
  };
}

function trustBar() {
  return section('trust_bar', {
    rating: { score: 4.9, count: 153, source: 'Google' },
    sslBadge: true,
    travelerCount: 12400,
    travelerLabel: 'viajeros atendidos',
    certifications: [{ name: 'RNT 35323' }, { name: 'Planner local en Colombia' }],
  });
}

function proofTestimonials() {
  return section('testimonials', {
    title: 'Viajeros que cotizaron con contexto claro',
    testimonials: [
      {
        name: 'Laura M.',
        location: 'Mexico',
        rating: 5,
        source: 'google',
        text: 'Llegamos con muchas dudas y el planner nos ayudo a ordenar Cartagena, Medellin y cafe en una ruta realista.',
      },
      {
        name: 'Santiago R.',
        location: 'Chile',
        rating: 5,
        source: 'google',
        text: 'La propuesta fue clara: hoteles, traslados, experiencias y soporte por WhatsApp antes de reservar.',
      },
      {
        name: 'Ana P.',
        location: 'Espana',
        rating: 5,
        source: 'google',
        text: 'Nos gusto que filtraran fechas, ciudad de salida y presupuesto antes de vendernos cualquier ruta.',
      },
    ],
  }, 'carousel');
}

function features(title, originLabel) {
  return section('features_grid', {
    title,
    items: [
      { icon: 'verified', title: 'Paquete completo', description: 'Ruta, hoteles, traslados, experiencias y soporte local; no solo vuelo u hotel.' },
      { icon: 'support_agent', title: 'Planner local', description: 'Un asesor en Colombia califica fechas, ciudad de salida y presupuesto por WhatsApp.' },
      { icon: 'local_offer', title: originLabel, description: 'La propuesta parte de ciudades con mejor conexion para reducir friccion comercial.' },
      { icon: 'security', title: 'Trazabilidad', description: 'CTA con WAFlow, WhatsApp, gclid, UTMs y reference_code cuando vienen desde pauta.' },
    ],
  });
}

function faq(title, originText) {
  return section('faq_accordion', {
    title,
    faqs: [
      {
        question: 'El paquete incluye vuelos internacionales?',
        answer: 'No vendemos vuelos internacionales sueltos. Podemos orientar la ruta para que tu vuelo encaje, pero la propuesta principal cubre viaje completo en Colombia: hoteles, traslados, experiencias y soporte local.',
      },
      {
        question: 'Por que preguntan ciudad de salida?',
        answer: `${originText} nos permite estimar conexiones, ritmo, noches y probabilidad real de cierre antes de invertir tiempo comercial en una propuesta.`,
      },
      {
        question: 'Puedo pedir una ruta familiar, privada o de lujo?',
        answer: 'Si. Ajustamos ritmo, hoteles, experiencias y traslados segun el perfil del viajero, presupuesto y fechas disponibles.',
      },
    ],
  });
}

function pricing(title, currency, tiers) {
  return section('pricing', {
    anchorLabel: 'Rutas base',
    title,
    subtitle: 'Valores de referencia. El precio final depende de fechas, categoria de hotel, numero de viajeros y experiencias elegidas.',
    currency,
    tiers,
  });
}

function itinerary(title, days) {
  return section('itinerary_accordion', {
    title,
    subtitle: 'Secuencia sugerida para convertir busquedas genericas en conversaciones calificadas.',
    days,
  });
}

function cta(title, message) {
  return section('cta', {
    title,
    subtitle: 'Envia ciudad de salida, fechas tentativas, numero de viajeros, destinos de interes y presupuesto aproximado.',
    ctaText: 'Cotizar con planner local',
    ctaUrl: wa(message),
    backgroundImage: HERO_CARTAGENA,
  });
}

function marketLanding(input) {
  return {
    kind: 'P1_market',
    slug: input.slug,
    title: input.title,
    locale: 'es-CO',
    page_type: 'custom',
    category_type: 'landing',
    target_keyword: input.keyword,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    legacyRedirects: input.legacyRedirects || [],
    hero_config: {
      eyebrow: input.eyebrow,
      title: input.h1,
      subtitle: input.subtitle,
      ctaText: 'Cotizar por WhatsApp',
      cta_text: 'Cotizar por WhatsApp',
      ctaUrl: wa(input.whatsappMessage),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rutas base',
      secondaryCtaUrl: '#pricing',
      backgroundImage: input.heroImage || HERO_CARTAGENA,
      background_image: input.heroImage || HERO_CARTAGENA,
    },
    intro_content: {
      text: input.intro,
      highlights: [
        `Origen prioritario: ${input.origin}`,
        'Paquete completo: hoteles, traslados, experiencias y soporte local',
        'No vendemos vuelos internacionales ni hoteles sueltos',
        'Planner local por WhatsApp y WAFlow',
        'Ruta pensada para mayor probabilidad de cierre',
      ],
    },
    cta_config: {
      title: 'Quieres validar una ruta realista antes de reservar?',
      subtitle: 'La primera respuesta filtra ciudad de salida, fechas, viajeros y presupuesto para evitar leads ambiguos.',
      buttonText: 'Hablar con un planner',
      buttonLink: wa(input.whatsappMessage),
    },
    sections: [
      trustBar(),
      section('text_image', {
        eyebrow: 'City-gating para calidad comercial',
        headline: input.cityProofHeadline,
        body: `${input.cityProofBody} No vendemos vuelos ni hoteles sueltos: disenamos viajes completos con hoteles, traslados, experiencias, soporte local y planner en Colombia.`,
        image: input.heroImage || HERO_MEDELLIN,
        imageAlt: input.imageAlt,
        imagePosition: 'right',
        ctaText: 'Validar mi ruta',
        ctaUrl: wa(input.whatsappMessage),
      }),
      features('Que debe incluir la propuesta', `Origen: ${input.origin}`),
      itinerary('Ruta sugerida para empezar', input.days),
      pricing('Ideas de viaje a Colombia', input.currency, input.tiers),
      proofTestimonials(),
      faq('Preguntas antes de cotizar', input.originProof),
      cta('Armar mi propuesta con datos reales', input.whatsappMessage),
    ],
  };
}

function destinationLanding(input) {
  return {
    kind: 'P2_destination',
    slug: input.slug,
    title: input.title,
    locale: 'es-CO',
    page_type: 'custom',
    category_type: 'landing',
    target_keyword: input.keyword,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    legacyRedirects: [],
    hero_config: {
      eyebrow: 'Paquete completo Colombia · mercados con conexion directa',
      title: input.h1,
      subtitle: input.subtitle,
      ctaText: 'Cotizar paquete completo',
      cta_text: 'Cotizar paquete completo',
      ctaUrl: wa(input.whatsappMessage),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver itinerario sugerido',
      secondaryCtaUrl: '#pricing',
      backgroundImage: input.heroImage || HERO_CARTAGENA,
      background_image: input.heroImage || HERO_CARTAGENA,
    },
    intro_content: {
      text: `${input.intro} Esta landing esta pensada para viajeros desde Ciudad de Mexico, Monterrey, Madrid, Barcelona, Santiago y Buenos Aires. No vendemos vuelo internacional ni hotel suelto; cotizamos viaje completo con planner local.`,
      highlights: [
        'Mercados priorizados: Mexico, Espana, Chile y Argentina',
        'Viaje completo: hoteles, traslados, experiencias y soporte local',
        'No vuelos sueltos, no hotel-only',
        'CTA WAFlow + WhatsApp con referencia de landing',
        'Ruta adaptable a parejas, familias y grupos privados',
      ],
    },
    cta_config: {
      title: 'Quieres este paquete adaptado a tu ciudad de salida?',
      subtitle: 'Envia ciudad, fechas, viajeros y presupuesto. El planner valida si la ruta tiene sentido antes de cotizar.',
      buttonText: 'Cotizar este paquete',
      buttonLink: wa(input.whatsappMessage),
    },
    sections: [
      trustBar(),
      section('text_image', {
        eyebrow: 'Match anuncio, keyword y landing',
        headline: input.promiseHeadline,
        body: `${input.promiseBody} La pagina debe dejar claro desde el primer scroll que es paquete completo: hoteles, traslados, experiencias, soporte local y planner.`,
        image: input.secondaryImage || input.heroImage || HERO_MEDELLIN,
        imageAlt: input.imageAlt,
        imagePosition: 'right',
        ctaText: 'Cotizar ruta completa',
        ctaUrl: wa(input.whatsappMessage),
      }),
      features('Por que esta ruta convierte mejor', 'Ciudades con conexion directa'),
      itinerary('Itinerario sugerido', input.days),
      pricing('Opciones de paquete', 'USD', input.tiers),
      proofTestimonials(),
      faq('Preguntas de calidad del lead', 'La ciudad de salida'),
      cta('Recibir propuesta con planner local', input.whatsappMessage),
    ],
  };
}

const landings = [
  marketLanding({
    slug: 'paquetes-colombia-desde-mexico',
    title: 'Paquetes a Colombia desde Mexico',
    keyword: 'paquetes a colombia desde mexico',
    seoTitle: 'Paquetes a Colombia desde Mexico | CDMX y Monterrey',
    seoDescription: 'Paquetes a Colombia desde Mexico con planner local. Rutas desde CDMX y Monterrey por Bogota, Medellin, Cartagena, San Andres y Eje Cafetero.',
    legacyRedirects: ['/agencia-de-viajes-a-colombia-para-mexicanos'],
    eyebrow: 'Mexico · CDMX y Monterrey con mejor conexion',
    h1: 'Paquetes a Colombia desde Mexico, con ruta completa y planner local',
    subtitle: 'Viajes privados desde CDMX o Monterrey hacia Bogota, Medellin, Cartagena, San Andres y Eje Cafetero, con hoteles, traslados y experiencias coordinadas.',
    intro: 'Esta landing captura busquedas comerciales de paquetes a Colombia desde Mexico y obliga a calificar ciudad de salida, fechas, viajeros y presupuesto antes de cotizar.',
    origin: 'Ciudad de Mexico y Monterrey',
    originProof: 'CDMX y Monterrey',
    cityProofHeadline: 'CDMX y Monterrey permiten conversaciones mas concretas que abrir todo Mexico.',
    cityProofBody: 'Al conocer la ciudad de salida podemos ajustar entrada por Bogota o Medellin, noches, vuelos internos y presupuesto de forma mas realista.',
    imageAlt: 'Paquete a Colombia desde Mexico con planner local',
    heroImage: HERO_MEDELLIN,
    currency: 'MXN',
    whatsappMessage: 'Hola ColombiaTours, viajo desde Mexico y quiero cotizar un paquete completo a Colombia. Mi ciudad de salida es:',
    days: [
      { dayNumber: 1, title: 'Llegada a Bogota o Medellin', location: 'Colombia', summary: 'Entrada sugerida segun ciudad de salida y disponibilidad; primer contacto con planner local.', activities: ['Traslado coordinado', 'Check-in de hotel', 'Brief de ruta por WhatsApp'], night: 'Bogota o Medellin' },
      { dayNumber: 2, title: 'Medellin y cultura urbana', location: 'Medellin', summary: 'Ruta urbana con Comuna 13, gastronomia y barrios caminables.', activities: ['Tour guiado', 'Traslados locales', 'Opciones privadas'], night: 'Medellin' },
      { dayNumber: 3, title: 'Cartagena o Eje Cafetero', location: 'Caribe o Andes', summary: 'Extension a Cartagena, San Andres o Eje Cafetero segun dias y presupuesto.', activities: ['Hoteles seleccionados', 'Experiencias locales', 'Soporte del planner'], night: 'Cartagena o Eje Cafetero' },
    ],
    tiers: [
      { name: 'Colombia esencial 8-10 dias', price: '28900', period: 'desde', perPerson: true, description: 'Medellin, Cartagena y Eje Cafetero.', features: ['Hoteles seleccionados', 'Traslados principales', 'Experiencias guiadas', 'Soporte por WhatsApp'], ctaText: 'Cotizar desde Mexico', ctaUrl: wa('Hola, quiero cotizar Colombia esencial desde Mexico.'), highlighted: true },
      { name: 'Caribe + San Andres', price: '35900', period: 'desde', perPerson: true, description: 'Cartagena, islas y playa.', features: ['Ruta de playa', 'Hoteles segun perfil', 'Traslados locales', 'Planner local'], ctaText: 'Quiero Caribe', ctaUrl: wa('Hola, quiero un paquete a Cartagena y San Andres desde Mexico.') },
    ],
  }),
  marketLanding({
    slug: 'paquetes-colombia-desde-espana',
    title: 'Paquetes a Colombia desde Espana',
    keyword: 'paquetes a colombia desde espana',
    seoTitle: 'Paquetes a Colombia desde Espana | Madrid y Barcelona',
    seoDescription: 'Viajes y paquetes a Colombia desde Espana con planner local. Rutas desde Madrid o Barcelona por Cartagena, Medellin, Eje Cafetero y Caribe.',
    legacyRedirects: ['/agencia-de-viajes-a-colombia-para-espanoles'],
    eyebrow: 'Espana · Madrid y Barcelona primero',
    h1: 'Paquetes a Colombia desde Espana, disenados con planner local',
    subtitle: 'Rutas privadas desde Madrid o Barcelona hacia Cartagena, Medellin, Eje Cafetero y Caribe colombiano, con propuesta clara antes de reservar.',
    intro: 'Esta pagina alinea busquedas de alta intencion desde Espana con una propuesta de viaje completo, no informacion generica ni hotel suelto.',
    origin: 'Madrid y Barcelona',
    originProof: 'Madrid y Barcelona',
    cityProofHeadline: 'Madrid y Barcelona reducen friccion y mejoran el match entre anuncio, landing y ventas.',
    cityProofBody: 'La ciudad de salida permite hablar de entrada a Bogota, conexiones internas, noches y presupuesto en euros sin improvisar.',
    imageAlt: 'Paquete a Colombia desde Espana con planner local',
    heroImage: HERO_CARTAGENA,
    currency: 'EUR',
    whatsappMessage: 'Hola ColombiaTours, viajo desde Espana y quiero cotizar un paquete completo a Colombia. Mi ciudad de salida es:',
    days: [
      { dayNumber: 1, title: 'Entrada a Colombia', location: 'Bogota o Cartagena', summary: 'Llegada y traslado coordinado para empezar sin friccion.', activities: ['Traslado privado', 'Hotel seleccionado', 'Brief de ruta'], night: 'Bogota o Cartagena' },
      { dayNumber: 2, title: 'Cartagena y Caribe', location: 'Cartagena', summary: 'Ciudad amurallada, Getsemani e islas segun ritmo.', activities: ['Tour guiado', 'Islas del Rosario', 'Gastronomia local'], night: 'Cartagena' },
      { dayNumber: 3, title: 'Medellin o Eje Cafetero', location: 'Andes colombianos', summary: 'Extension cultural y naturaleza para completar la ruta.', activities: ['Comuna 13', 'Cafe y Cocora', 'Traslados coordinados'], night: 'Medellin o Eje Cafetero' },
    ],
    tiers: [
      { name: 'Colombia clasica 10 dias', price: '1590', period: 'desde', perPerson: true, description: 'Cartagena, Medellin y Eje Cafetero.', features: ['Hoteles seleccionados', 'Traslados principales', 'Experiencias guiadas', 'Soporte local'], ctaText: 'Cotizar desde Espana', ctaUrl: wa('Hola, quiero cotizar Colombia clasica desde Espana.'), highlighted: true },
      { name: 'Colombia completa 15 dias', price: '2290', period: 'desde', perPerson: true, description: 'Caribe, cafe, Medellin y naturaleza.', features: ['Ruta multi-region', 'Ritmo mas comodo', 'Planner local', 'Opciones privadas'], ctaText: 'Quiero ruta completa', ctaUrl: wa('Hola, quiero cotizar una ruta completa a Colombia desde Espana.') },
    ],
  }),
  marketLanding({
    slug: 'viajes-colombia-desde-chile',
    title: 'Viajes a Colombia desde Chile',
    keyword: 'viajes a colombia desde chile',
    seoTitle: 'Viajes a Colombia desde Chile | Santiago',
    seoDescription: 'Viajes a Colombia desde Santiago de Chile con planner local. Paquetes completos por Cartagena, Medellin, San Andres y Eje Cafetero.',
    legacyRedirects: ['/viajes-a-colombia-desde-chile'],
    eyebrow: 'Chile · Santiago como origen prioritario',
    h1: 'Viajes a Colombia desde Chile, saliendo desde Santiago',
    subtitle: 'Paquetes completos desde Santiago hacia Cartagena, Medellin, San Andres y Eje Cafetero, con hoteles, traslados, experiencias y soporte por WhatsApp.',
    intro: 'Esta landing protege calidad en Chile enfocando la pauta en Santiago y en viajeros que buscan viaje completo, no cotizaciones sueltas.',
    origin: 'Santiago de Chile',
    originProof: 'Santiago',
    cityProofHeadline: 'Santiago concentra mejor conectividad y mejores datos para cerrar una propuesta real.',
    cityProofBody: 'Cuando el lead viene de Santiago podemos estimar entrada, dias utiles, vuelos internos y ruta sin abrir todo el pais.',
    imageAlt: 'Viaje a Colombia desde Santiago de Chile',
    heroImage: HERO_CARTAGENA,
    currency: 'USD',
    whatsappMessage: 'Hola ColombiaTours, viajo desde Santiago de Chile y quiero cotizar un viaje completo a Colombia. Fechas aproximadas:',
    days: [
      { dayNumber: 1, title: 'Entrada por Bogota o Cartagena', location: 'Colombia', summary: 'Llegada coordinada con traslado y hotel.', activities: ['Traslado local', 'Check-in', 'Ajuste final de ruta'], night: 'Bogota o Cartagena' },
      { dayNumber: 2, title: 'Cartagena o Medellin', location: 'Caribe o Andes', summary: 'Primer bloque fuerte de experiencia segun intencion.', activities: ['Tour guiado', 'Hotel seleccionado', 'Soporte por WhatsApp'], night: 'Cartagena o Medellin' },
      { dayNumber: 3, title: 'San Andres o Eje Cafetero', location: 'Extension', summary: 'Extension de playa o naturaleza si el viaje tiene dias suficientes.', activities: ['Ruta de playa', 'Cafe y Cocora', 'Traslados internos'], night: 'San Andres o Eje Cafetero' },
    ],
    tiers: [
      { name: 'Colombia 7-9 dias', price: '1390', period: 'desde', perPerson: true, description: 'Cartagena y Medellin.', features: ['Hoteles seleccionados', 'Traslados', 'Experiencias clave', 'Planner local'], ctaText: 'Cotizar desde Santiago', ctaUrl: wa('Hola, quiero cotizar Colombia desde Santiago de Chile.'), highlighted: true },
      { name: 'Colombia 10-12 dias', price: '1790', period: 'desde', perPerson: true, description: 'Cartagena, Medellin y Eje Cafetero o San Andres.', features: ['Ruta multi-destino', 'Hoteles segun perfil', 'Soporte local', 'Opciones privadas'], ctaText: 'Quiero ruta completa', ctaUrl: wa('Hola, quiero una ruta completa a Colombia desde Chile.') },
    ],
  }),
  marketLanding({
    slug: 'viajes-colombia-desde-argentina',
    title: 'Viajes a Colombia desde Argentina',
    keyword: 'viajes a colombia desde argentina',
    seoTitle: 'Viajes a Colombia desde Argentina | Buenos Aires',
    seoDescription: 'Viajes a Colombia desde Argentina con planner local. Paquetes desde Buenos Aires por Cartagena, Medellin, Eje Cafetero, San Andres y Caribe.',
    legacyRedirects: ['/viajes-a-colombia-desde-argentina'],
    eyebrow: 'Argentina · Buenos Aires fase 2',
    h1: 'Viajes a Colombia desde Argentina, con ruta a medida',
    subtitle: 'Paquetes completos desde Buenos Aires hacia Cartagena, Medellin, Eje Cafetero y San Andres, con planner local, hoteles y experiencias coordinadas.',
    intro: 'Esta pagina queda lista para la fase AR despues del gate de Brasil, enfocada en Buenos Aires y en leads con intencion comercial real.',
    origin: 'Buenos Aires',
    originProof: 'Buenos Aires',
    cityProofHeadline: 'Buenos Aires debe activarse solo despues del gate BR y con exact-first.',
    cityProofBody: 'La landing esta preparada para capturar ciudad de salida, fechas, viajeros y presupuesto antes de pasar a ventas.',
    imageAlt: 'Viaje a Colombia desde Argentina con planner local',
    heroImage: HERO_CARTAGENA,
    currency: 'USD',
    whatsappMessage: 'Hola ColombiaTours, viajo desde Argentina y quiero cotizar un viaje completo a Colombia. Mi ciudad de salida es:',
    days: [
      { dayNumber: 1, title: 'Llegada y primera ciudad', location: 'Bogota o Cartagena', summary: 'Entrada segun disponibilidad y ruta mas eficiente.', activities: ['Traslado coordinado', 'Hotel seleccionado', 'Soporte inicial'], night: 'Bogota o Cartagena' },
      { dayNumber: 2, title: 'Cartagena y Caribe', location: 'Cartagena', summary: 'Bloque de ciudad, cultura y playa.', activities: ['Ciudad amurallada', 'Islas', 'Gastronomia'], night: 'Cartagena' },
      { dayNumber: 3, title: 'Medellin o Eje Cafetero', location: 'Andes', summary: 'Cierre cultural o de naturaleza segun dias.', activities: ['Comuna 13', 'Cafe', 'Cocora o Guatape'], night: 'Medellin o Eje Cafetero' },
    ],
    tiers: [
      { name: 'Colombia esencial 8-10 dias', price: '1490', period: 'desde', perPerson: true, description: 'Cartagena, Medellin y Eje Cafetero.', features: ['Hoteles seleccionados', 'Traslados principales', 'Experiencias guiadas', 'Soporte local'], ctaText: 'Cotizar desde Argentina', ctaUrl: wa('Hola, quiero cotizar Colombia esencial desde Argentina.'), highlighted: true },
      { name: 'Caribe colombiano', price: '1790', period: 'desde', perPerson: true, description: 'Cartagena, islas y opcion San Andres.', features: ['Ruta de playa', 'Asesoria de hoteles', 'Traslados locales', 'Planner local'], ctaText: 'Quiero Caribe', ctaUrl: wa('Hola, quiero un paquete de Caribe colombiano desde Argentina.') },
    ],
  }),
  destinationLanding({
    slug: 'paquetes/bogota-medellin-cartagena',
    title: 'Paquete Bogota Medellin Cartagena',
    keyword: 'paquete bogota medellin cartagena',
    seoTitle: 'Paquete Bogota Medellin Cartagena | Colombia completo',
    seoDescription: 'Paquete Bogota, Medellin y Cartagena con hoteles, traslados, experiencias y planner local. Ruta completa para viajeros desde mercados conectados.',
    h1: 'Paquete Bogota, Medellin y Cartagena para conocer Colombia en una ruta completa',
    subtitle: 'Un itinerario privado que combina capital, cultura urbana y Caribe con hoteles, traslados, experiencias y soporte local.',
    intro: 'Bogota, Medellin y Cartagena es la ruta base mas clara para convertir intencion general de Colombia en una propuesta concreta.',
    promiseHeadline: 'La promesa del anuncio debe aterrizar en una ruta multi-ciudad real, no en un producto inexistente.',
    promiseBody: 'Este paquete responde a busquedas de Colombia completo, Medellin y Cartagena, Bogota y Caribe.',
    imageAlt: 'Paquete Bogota Medellin Cartagena',
    heroImage: HERO_MEDELLIN,
    secondaryImage: HERO_CARTAGENA,
    whatsappMessage: 'Hola ColombiaTours, quiero cotizar Bogota, Medellin y Cartagena como paquete completo.',
    days: [
      { dayNumber: 1, title: 'Bogota cultural', location: 'Bogota', summary: 'Llegada, centro historico, gastronomia y contexto de pais.', activities: ['Traslado', 'Hotel', 'Experiencia cultural'], night: 'Bogota' },
      { dayNumber: 2, title: 'Medellin y Guatape', location: 'Medellin', summary: 'Ciudad, Comuna 13 y opcion Guatape.', activities: ['Tour urbano', 'Traslados', 'Experiencia privada'], night: 'Medellin' },
      { dayNumber: 3, title: 'Cartagena e islas', location: 'Cartagena', summary: 'Ciudad amurallada, Getsemani e Islas del Rosario.', activities: ['Tour guiado', 'Dia de islas', 'Hotel seleccionado'], night: 'Cartagena' },
    ],
    tiers: [
      { name: 'Ruta esencial 9 dias', price: '1490', period: 'desde', perPerson: true, description: 'Bogota, Medellin y Cartagena.', features: ['3 ciudades', 'Hoteles seleccionados', 'Traslados principales', 'Planner local'], ctaText: 'Cotizar 9 dias', ctaUrl: wa('Hola, quiero cotizar Bogota Medellin Cartagena 9 dias.'), highlighted: true },
      { name: 'Ruta premium 12 dias', price: '2190', period: 'desde', perPerson: true, description: 'Mas tiempo en Caribe y experiencias privadas.', features: ['Hoteles superiores', 'Experiencias privadas', 'Ritmo mas comodo', 'Soporte local'], ctaText: 'Cotizar premium', ctaUrl: wa('Hola, quiero cotizar Bogota Medellin Cartagena premium.') },
    ],
  }),
  destinationLanding({
    slug: 'paquetes/cartagena-medellin',
    title: 'Paquete Cartagena y Medellin',
    keyword: 'tour medellin y cartagena',
    seoTitle: 'Paquete Cartagena y Medellin | Caribe y cultura urbana',
    seoDescription: 'Paquete Cartagena y Medellin con hoteles, traslados, experiencias privadas y planner local. Ruta completa para viajeros desde ciudades conectadas.',
    h1: 'Paquete Cartagena y Medellin: Caribe, cultura urbana y soporte local',
    subtitle: 'Combina Cartagena de Indias, Islas del Rosario, Medellin y Guatape en una ruta clara, cotizable y no hotel-only.',
    intro: 'Cartagena + Medellin es una combinacion de alta intencion para viajeros que quieren Colombia sin hacer una ruta demasiado larga.',
    promiseHeadline: 'Cartagena y Medellin deben venderse como ruta coordinada, no como dos tours sueltos.',
    promiseBody: 'La landing conecta ciudad, playa, cultura y logistica para evitar leads que solo preguntan por hotel.',
    imageAlt: 'Paquete Cartagena y Medellin Colombia',
    heroImage: HERO_CARTAGENA,
    secondaryImage: HERO_MEDELLIN,
    whatsappMessage: 'Hola ColombiaTours, quiero cotizar Cartagena y Medellin como paquete completo.',
    days: [
      { dayNumber: 1, title: 'Cartagena historica', location: 'Cartagena', summary: 'Ciudad amurallada, Getsemani y gastronomia.', activities: ['Tour guiado', 'Hotel', 'Traslados'], night: 'Cartagena' },
      { dayNumber: 2, title: 'Islas del Rosario', location: 'Caribe', summary: 'Dia de playa y mar con logistica coordinada.', activities: ['Traslado maritimo', 'Club o isla', 'Soporte local'], night: 'Cartagena' },
      { dayNumber: 3, title: 'Medellin y Guatape', location: 'Medellin', summary: 'Cultura urbana, Comuna 13 y opcion Guatape.', activities: ['Tour urbano', 'Experiencia local', 'Traslados'], night: 'Medellin' },
    ],
    tiers: [
      { name: 'Cartagena + Medellin 7 dias', price: '1190', period: 'desde', perPerson: true, description: 'Dos ciudades, hoteles y experiencias.', features: ['Cartagena', 'Medellin', 'Traslados principales', 'Planner local'], ctaText: 'Cotizar 7 dias', ctaUrl: wa('Hola, quiero cotizar Cartagena y Medellin 7 dias.'), highlighted: true },
      { name: 'Cartagena + Medellin privado', price: '1690', period: 'desde', perPerson: true, description: 'Ritmo mas comodo y experiencias privadas.', features: ['Hoteles superiores', 'Tours privados', 'Guatape opcional', 'Soporte por WhatsApp'], ctaText: 'Cotizar privado', ctaUrl: wa('Hola, quiero cotizar Cartagena y Medellin privado.') },
    ],
  }),
  destinationLanding({
    slug: 'paquetes/san-andres-todo-incluido',
    title: 'Paquete San Andres todo incluido',
    keyword: 'paquetes a san andres all inclusive',
    seoTitle: 'Paquete San Andres todo incluido | ColombiaTours',
    seoDescription: 'Paquete San Andres todo incluido como viaje completo: hotel, traslados, experiencias, Johnny Cay, Acuario y soporte local. No hotel suelto.',
    h1: 'Paquete San Andres todo incluido, con viaje completo y planner local',
    subtitle: 'San Andres, Johnny Cay, Acuario y Caribe colombiano con hotel, traslados, experiencias y soporte por WhatsApp.',
    intro: 'San Andres atrae mucho volumen y tambien mucho trafico de baja calidad. La landing debe filtrar hotel-only, vuelo-only y curiosos.',
    promiseHeadline: 'El mensaje debe decir todo incluido con cuidado: paquete completo, no promesa de vuelo internacional incluido.',
    promiseBody: 'El foco es viaje completo en Colombia con hotel, traslados, experiencias y soporte, dejando claro que no vendemos vuelo internacional suelto.',
    imageAlt: 'Paquete San Andres todo incluido Colombia',
    heroImage: HERO_SAN_ANDRES,
    secondaryImage: HERO_CARTAGENA,
    whatsappMessage: 'Hola ColombiaTours, quiero cotizar San Andres todo incluido como viaje completo.',
    days: [
      { dayNumber: 1, title: 'Llegada a San Andres', location: 'San Andres', summary: 'Traslado, hotel y primer contacto con el Caribe.', activities: ['Traslado aeropuerto', 'Hotel seleccionado', 'Brief de actividades'], night: 'San Andres' },
      { dayNumber: 2, title: 'Johnny Cay y Acuario', location: 'San Andres', summary: 'Experiencias clasicas de playa con logistica coordinada.', activities: ['Johnny Cay', 'Acuario', 'Soporte local'], night: 'San Andres' },
      { dayNumber: 3, title: 'Isla, playa y extension', location: 'Caribe', summary: 'Dias libres o combinacion con Cartagena segun presupuesto.', activities: ['Vuelta a la isla', 'Playa', 'Extension Cartagena opcional'], night: 'San Andres o Cartagena' },
    ],
    tiers: [
      { name: 'San Andres 4-5 dias', price: '790', period: 'desde', perPerson: true, description: 'Hotel, traslados y experiencias base.', features: ['Hotel seleccionado', 'Traslados locales', 'Johnny Cay o Acuario', 'Planner local'], ctaText: 'Cotizar San Andres', ctaUrl: wa('Hola, quiero cotizar San Andres 4-5 dias.'), highlighted: true },
      { name: 'San Andres + Cartagena', price: '1390', period: 'desde', perPerson: true, description: 'Caribe combinado para viajes de mas dias.', features: ['Dos destinos', 'Ruta de playa', 'Hoteles segun perfil', 'Soporte por WhatsApp'], ctaText: 'Cotizar Caribe', ctaUrl: wa('Hola, quiero cotizar San Andres y Cartagena.') },
    ],
  }),
  destinationLanding({
    slug: 'paquetes/eje-cafetero',
    title: 'Paquete Eje Cafetero',
    keyword: 'planes turisticos eje cafetero',
    seoTitle: 'Paquete Eje Cafetero | Salento, Cocora y cafe',
    seoDescription: 'Paquete Eje Cafetero con Salento, Valle del Cocora, fincas de cafe, termales, traslados y planner local. Viaje completo, no hotel suelto.',
    h1: 'Paquete Eje Cafetero: Salento, Cocora, cafe y ruta completa',
    subtitle: 'Un viaje por el paisaje cafetero colombiano con hoteles, traslados, experiencias de cafe, Cocora y soporte local.',
    intro: 'Eje Cafetero tiene alta intencion comercial cuando se presenta como paquete completo y no como contenido informativo generico.',
    promiseHeadline: 'La landing debe convertir busquedas de Eje Cafetero en una ruta cotizable.',
    promiseBody: 'Salento, Cocora, fincas de cafe y termales se venden mejor cuando el viajero entiende dias, traslados y hoteles incluidos.',
    imageAlt: 'Paquete Eje Cafetero Salento Cocora Colombia',
    heroImage: HERO_COFFEE,
    secondaryImage: HERO_MEDELLIN,
    whatsappMessage: 'Hola ColombiaTours, quiero cotizar un paquete al Eje Cafetero con Salento y Cocora.',
    days: [
      { dayNumber: 1, title: 'Llegada al Eje Cafetero', location: 'Pereira, Armenia o Manizales', summary: 'Entrada y traslado a hotel segun ruta.', activities: ['Traslado', 'Hotel', 'Brief de actividades'], night: 'Eje Cafetero' },
      { dayNumber: 2, title: 'Salento y Valle del Cocora', location: 'Quindio', summary: 'Dia de naturaleza, palmas de cera y pueblo cafetero.', activities: ['Cocora', 'Salento', 'Miradores'], night: 'Eje Cafetero' },
      { dayNumber: 3, title: 'Finca de cafe y extension', location: 'Paisaje Cultural Cafetero', summary: 'Experiencia cafetera y posible combinacion con Medellin.', activities: ['Tour de cafe', 'Termales opcionales', 'Extension Medellin'], night: 'Eje Cafetero o Medellin' },
    ],
    tiers: [
      { name: 'Eje Cafetero 4 dias', price: '690', period: 'desde', perPerson: true, description: 'Salento, Cocora y cafe.', features: ['Hoteles seleccionados', 'Traslados locales', 'Tour de cafe', 'Planner local'], ctaText: 'Cotizar Eje Cafetero', ctaUrl: wa('Hola, quiero cotizar Eje Cafetero 4 dias.'), highlighted: true },
      { name: 'Eje Cafetero + Medellin', price: '1190', period: 'desde', perPerson: true, description: 'Cafe, naturaleza y ciudad.', features: ['Ruta combinada', 'Hoteles segun perfil', 'Traslados principales', 'Soporte local'], ctaText: 'Cotizar ruta combinada', ctaUrl: wa('Hola, quiero cotizar Eje Cafetero y Medellin.') },
    ],
  }),
];

function pageUrl(slug) {
  return `${DOMAIN}/${slug}`;
}

function publicPath(slug) {
  return `/${slug}`;
}

function compactPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

async function getExistingPage(supabase, slug) {
  const { data, error } = await supabase
    .from('website_pages')
    .select('id,website_id,title,slug,locale,page_type,category_type,is_published,robots_noindex,target_keyword,seo_title,seo_description,seo_keywords,hero_config,intro_content,cta_config,sections,translation_group_id,created_at,updated_at')
    .eq('website_id', WEBSITE_ID)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getMaxNavOrder(supabase) {
  const { data, error } = await supabase
    .from('website_pages')
    .select('nav_order')
    .eq('website_id', WEBSITE_ID)
    .order('nav_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return Number(data?.[0]?.nav_order ?? 100);
}

function buildPagePayload(def, index, baseOrder, existing) {
  return compactPayload({
    website_id: WEBSITE_ID,
    title: def.title,
    slug: def.slug,
    locale: def.locale,
    page_type: def.page_type,
    category_type: def.category_type,
    is_published: true,
    robots_noindex: false,
    show_in_nav: false,
    nav_order: Number(existing?.nav_order ?? baseOrder + index),
    display_order: Number(existing?.display_order ?? baseOrder + index),
    header_mode: 'default',
    target_keyword: def.target_keyword,
    seo_title: def.seo_title,
    seo_description: def.seo_description,
    seo_keywords: [def.target_keyword],
    hero_config: def.hero_config,
    intro_content: def.intro_content,
    cta_config: def.cta_config,
    sections: def.sections,
    updated_at: new Date().toISOString(),
  });
}

function summarizePage(def, existing, payload) {
  return {
    slug: def.slug,
    kind: def.kind,
    action: existing ? 'update' : 'insert',
    url: pageUrl(def.slug),
    baseStatus: existing
      ? { published: existing.is_published, noindex: existing.robots_noindex, title: existing.title }
      : null,
    targetStatus: { published: payload.is_published, noindex: payload.robots_noindex, title: payload.title },
    sections: Array.isArray(payload.sections) ? payload.sections.length : 0,
    targetScore: def.kind === 'P1_market' ? 95 : 92,
  };
}

async function upsertPage(supabase, def, payload, apply) {
  const existing = await getExistingPage(supabase, def.slug);
  if (!apply) return { planned: true, existingId: existing?.id ?? null };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('website_pages')
      .update(payload)
      .eq('id', existing.id)
      .eq('website_id', WEBSITE_ID)
      .select('id,slug,title,is_published,robots_noindex')
      .single();
    if (error) throw error;
    return { action: 'updated', row: data };
  }

  const id = randomUUID();
  const translationGroupId = randomUUID();
  const { data, error } = await supabase
    .from('website_pages')
    .insert({
      ...payload,
      id,
      translation_group_id: translationGroupId,
      created_at: new Date().toISOString(),
    })
    .select('id,slug,title,is_published,robots_noindex')
    .single();
  if (error) throw error;
  return { action: 'inserted', row: data };
}

async function getExistingLegacyRedirect(supabase, oldPath) {
  const { data, error } = await supabase
    .from('website_legacy_redirects')
    .select('id,old_path,new_path,status_code')
    .eq('website_id', WEBSITE_ID)
    .eq('old_path', oldPath)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertLegacyRedirect(supabase, oldPath, newPath, apply) {
  const existing = await getExistingLegacyRedirect(supabase, oldPath);
  const payload = {
    website_id: WEBSITE_ID,
    old_path: oldPath,
    new_path: newPath,
    status_code: 301,
  };
  if (!apply) {
    return { oldPath, newPath, action: existing ? 'update' : 'insert', planned: true };
  }
  if (existing?.id) {
    const { data, error } = await supabase
      .from('website_legacy_redirects')
      .update(payload)
      .eq('id', existing.id)
      .eq('website_id', WEBSITE_ID)
      .select('id,old_path,new_path,status_code')
      .single();
    if (error) throw error;
    return { action: 'updated', row: data };
  }
  const { data, error } = await supabase
    .from('website_legacy_redirects')
    .insert({ ...payload, id: randomUUID(), created_at: new Date().toISOString() })
    .select('id,old_path,new_path,status_code')
    .single();
  if (error) throw error;
  return { action: 'inserted', row: data };
}

async function revalidatePath(slug, secret) {
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
  return { slug, status: response.status, ok: response.ok, path: pathToRevalidate, body: bodyText.slice(0, 500) };
}

async function fetchLanding(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}qa=${Date.now()}`, { redirect: 'follow' });
  const html = await response.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  const notFound = /Pagina no encontrada|P[aá]gina no encontrada|Paquete no encontrado|Page not found|404/i.test(`${title} ${h1} ${html.slice(0, 2000)}`);
  const tracking = /googletagmanager|GTM-|gtag\(|dataLayer|waflow|whatsapp|wa\.me/i.test(html);
  return { url, status: response.status, finalUrl: response.url, title, h1, noindex, notFound, tracking, bytes: html.length };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  process.chdir(repoRoot);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnv();
  const supabase = createClient(env.url, env.serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const baseOrder = (await getMaxNavOrder(supabase)) + 1;

  const pagePlans = [];
  const pageResults = [];
  for (let index = 0; index < landings.length; index += 1) {
    const def = landings[index];
    const existing = await getExistingPage(supabase, def.slug);
    const payload = buildPagePayload(def, index, baseOrder, existing);
    pagePlans.push({ definition: def, existing, payload, summary: summarizePage(def, existing, payload) });
    pageResults.push(await upsertPage(supabase, def, payload, args.apply));
  }

  const redirectPlans = [];
  const redirectResults = [];
  for (const def of landings) {
    for (const oldPath of def.legacyRedirects || []) {
      const normalizedOldPath = oldPath.startsWith('/') ? oldPath : `/${oldPath}`;
      const newPath = publicPath(def.slug);
      redirectPlans.push({ oldPath: normalizedOldPath, newPath });
      redirectResults.push(await upsertLegacyRedirect(supabase, normalizedOldPath, newPath, args.apply));
    }
  }

  const revalidations = [];
  const liveChecks = [];
  if (args.apply) {
    for (const def of landings) {
      revalidations.push(await revalidatePath(def.slug, env.revalidateSecret));
    }
    if (!args.skipLiveCheck) {
      for (const def of landings) {
        liveChecks.push(await fetchLanding(pageUrl(def.slug)));
      }
    }
  }

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dryRun',
    safety: {
      googleAdsMutations: 0,
      supabaseWrites: args.apply ? landings.length + redirectPlans.length : 0,
      touchesCampaigns: false,
      accountId: ACCOUNT_ID,
      websiteId: WEBSITE_ID,
    },
    pageSummaries: pagePlans.map((plan, index) => ({ ...plan.summary, result: pageResults[index] })),
    redirectPlans,
    redirectResults,
    revalidations,
    liveChecks,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(OUT_DIR, `${stamp}-${args.apply ? 'apply' : 'dry-run'}-report.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    reportPath: path.relative(repoRoot, reportPath),
    safety: report.safety,
    pages: report.pageSummaries.map((row) => ({ slug: row.slug, action: row.action, url: row.url, targetScore: row.targetScore })),
    redirects: report.redirectPlans,
    revalidations: report.revalidations.map((row) => ({ slug: row.slug, status: row.status, ok: row.ok, skipped: row.skipped, reason: row.reason })),
    liveChecks: report.liveChecks.map((row) => ({ url: row.url, status: row.status, title: row.title, noindex: row.noindex, notFound: row.notFound, tracking: row.tracking })),
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
