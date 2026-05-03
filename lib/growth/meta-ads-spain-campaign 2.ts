import type { ProductFAQ } from '@bukeer/website-contract';

export const META_ADS_SPAIN_CAMPAIGN = {
  name: 'ES | Colombia Tours | High-Ticket | WhatsApp + Sales Proxy | Madrid-Barcelona',
  dailyBudgetUsd: 50,
  budgetSplit: {
    prospectingUsd: 30,
    retargetingUsd: 15,
    tacticalReserveUsd: 5,
  },
  utm: {
    source: 'meta',
    medium: 'paid_social',
    campaign: 'es_high_ticket_colombia_may2026',
    contentPattern: '{funnel}_{angle}_{asset}_{cityhint}',
    termPattern: '{package_slug}',
  },
} as const;

const CAMPAIGN_PACKAGE_SLUGS = new Set([
  'bogota-esencial-cultura-y-sal-4-dias',
  'colombia-imperdible-9-dias-bogota-medellin-y-cartagena',
  'escapada-colombia-7-dias-medellin-y-cartagena',
  'medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera',
]);

export interface SpainCampaignPillar {
  title: string;
  body: string;
}

export interface SpainCampaignLandingContent {
  eyebrow: string;
  title: string;
  body: string;
  pillars: SpainCampaignPillar[];
  madridRoute: string;
  barcelonaRoute: string;
  ctaLabel: string;
  ctaMeta: string;
}

export const SPAIN_CAMPAIGN_FAQS: ProductFAQ[] = [
  {
    question: '¿Es seguro viajar a Colombia con este paquete?',
    answer:
      'Sí. El viaje se planifica con rutas turísticas curadas, traslados privados cuando aplica, proveedores verificados y acompañamiento local para reducir improvisaciones durante el recorrido.',
  },
  {
    question: '¿Cómo puedo conectar desde Madrid o Barcelona?',
    answer:
      'Madrid tiene conexiones fuertes hacia Bogotá y Medellín. Barcelona funciona especialmente bien como puerta directa a Bogotá; para Medellín se recomienda validar conexión o itinerario combinado antes de confirmar la propuesta.',
  },
  {
    question: '¿Puedo recibir una propuesta en euros?',
    answer:
      'Sí. El equipo puede preparar el presupuesto en euros con fechas, número de viajeros, alojamientos y servicios incluidos para que compares el viaje con claridad antes de reservar.',
  },
];

export function isSpainMetaAdsPackage(slug: string | null | undefined): boolean {
  return Boolean(slug && CAMPAIGN_PACKAGE_SLUGS.has(slug));
}

export function mergeSpainCampaignFaqs(
  faqs: ProductFAQ[] | null | undefined,
  slug: string | null | undefined,
): ProductFAQ[] {
  const base = Array.isArray(faqs) ? faqs : [];
  if (!isSpainMetaAdsPackage(slug)) return base;

  const existingQuestions = new Set(base.map((faq) => faq.question.trim().toLowerCase()));
  const additions = SPAIN_CAMPAIGN_FAQS.filter(
    (faq) => !existingQuestions.has(faq.question.trim().toLowerCase()),
  );
  return [...base, ...additions];
}

export function getSpainCampaignLandingContent(
  slug: string | null | undefined,
): SpainCampaignLandingContent | null {
  if (!isSpainMetaAdsPackage(slug)) return null;

  const isMedellinOnly = slug?.includes('medellin-y-guatape');
  const isBogotaOnly = slug?.includes('bogota-esencial');

  return {
    eyebrow: 'Campaña España · Madrid + Barcelona',
    title: 'Colombia, diseñada para viajar tranquilo',
    body:
      'Una ruta pensada para viajeros españoles que quieren descubrir Colombia con deseo urbano, logística clara y soporte humano por WhatsApp desde el primer mensaje.',
    pillars: [
      {
        title: 'Seguridad operativa',
        body:
          'Itinerarios en zonas turísticas curadas, proveedores verificados y traslados privados cuando el plan lo requiere.',
      },
      {
        title: 'Plan en euros',
        body:
          'Te ayudamos a convertir fechas, viajeros y estilo de viaje en un presupuesto claro antes de reservar.',
      },
      {
        title: 'WhatsApp con contexto',
        body:
          'La conversación arranca con este paquete, tu referencia y la intención de viaje para acelerar la cotización.',
      },
    ],
    madridRoute: isBogotaOnly
      ? 'Desde Madrid, Bogotá es la puerta natural para entrar a Colombia con conexiones directas y una llegada sencilla.'
      : 'Desde Madrid, Bogotá y Medellín son rutas fuertes para construir un itinerario urbano, cultural y bien conectado.',
    barcelonaRoute: isMedellinOnly
      ? 'Desde Barcelona, la recomendación es entrar por Bogotá o validar una conexión hacia Medellín antes de cerrar fechas.'
      : 'Desde Barcelona, Bogotá funciona como puerta directa para iniciar el viaje y conectar con el resto del itinerario.',
    ctaLabel: 'Cotizar por WhatsApp',
    ctaMeta: 'La ventana que abre Colombia al mundo',
  };
}
