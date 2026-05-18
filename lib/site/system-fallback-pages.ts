import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage } from '@/lib/supabase/get-pages';
import { localeToLanguage, normalizeLocale } from '@/lib/seo/locale-routing';

const CONTACT_SLUGS = new Set(['contact', 'contacto', 'contato']);
const PRESS_SLUGS = new Set(['press', 'prensa', 'imprensa']);

type FallbackPageCopy = {
  contact: {
    title: string;
    heroTitle: string;
    heroSubtitle: (siteName: string) => string;
    ctaText: string;
    sectionTitle: string;
    sectionSubtitle: (siteName: string) => string;
    richTextBody: (siteName: string) => string;
    seoTitle: (siteName: string) => string;
    seoDescription: (siteName: string) => string;
  };
  press: {
    title: string;
    heroTitle: (siteName: string) => string;
    heroSubtitle: string;
    ctaEmail: string;
    ctaFallback: string;
    body: (siteName: string) => string[];
    emailLabel: string;
    phoneLabel: string;
    seoTitle: (siteName: string) => string;
    seoDescription: (siteName: string) => string;
  };
};

const FALLBACK_PAGE_COPY: Record<string, FallbackPageCopy> = {
  es: {
    contact: {
      title: 'Contacto',
      heroTitle: 'Contáctanos',
      heroSubtitle: (siteName) => `Habla con un planner de ${siteName} y empieza a diseñar tu viaje.`,
      ctaText: 'Solicitar asesoría',
      sectionTitle: 'Contáctanos',
      sectionSubtitle: (siteName) => `Cuéntanos qué viaje sueñas y el equipo de ${siteName} te ayudará a planificarlo.`,
      richTextBody: (siteName) => `El equipo de ${siteName} está listo para ayudarte a planificar tu próximo viaje.`,
      seoTitle: (siteName) => `Contacto | ${siteName}`,
      seoDescription: (siteName) => `Contacta a ${siteName} para planificar viajes, paquetes y experiencias a medida.`,
    },
    press: {
      title: 'Prensa',
      heroTitle: (siteName) => `Prensa ${siteName}`,
      heroSubtitle: 'Información institucional y contacto para medios.',
      ctaEmail: 'Contactar prensa',
      ctaFallback: 'Solicitar información',
      body: (siteName) => [
        `${siteName} conecta viajeros con experiencias diseñadas por especialistas locales.`,
        'Para solicitudes de prensa, alianzas o información institucional, contacta al equipo por los canales oficiales del sitio.',
      ],
      emailLabel: 'Email',
      phoneLabel: 'Teléfono',
      seoTitle: (siteName) => `Prensa | ${siteName}`,
      seoDescription: (siteName) => `Información de prensa y contacto institucional de ${siteName}.`,
    },
  },
  en: {
    contact: {
      title: 'Contact',
      heroTitle: 'Contact us',
      heroSubtitle: (siteName) => `Talk to a ${siteName} planner and start designing your trip.`,
      ctaText: 'Request advice',
      sectionTitle: 'Contact us',
      sectionSubtitle: (siteName) => `Tell us about your dream trip and the ${siteName} team will help you plan it.`,
      richTextBody: (siteName) => `The ${siteName} team is ready to help you plan your next trip.`,
      seoTitle: (siteName) => `Contact | ${siteName}`,
      seoDescription: (siteName) => `Contact ${siteName} to plan custom trips, packages and experiences.`,
    },
    press: {
      title: 'Press',
      heroTitle: (siteName) => `${siteName} Press`,
      heroSubtitle: 'Institutional information and media contact.',
      ctaEmail: 'Contact press',
      ctaFallback: 'Request information',
      body: (siteName) => [
        `${siteName} connects travelers with experiences designed by local specialists.`,
        'For press requests, partnerships or institutional information, contact the team through the official site channels.',
      ],
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      seoTitle: (siteName) => `Press | ${siteName}`,
      seoDescription: (siteName) => `Press information and institutional contact for ${siteName}.`,
    },
  },
  pt: {
    contact: {
      title: 'Contato',
      heroTitle: 'Fale conosco',
      heroSubtitle: (siteName) => `Fale com um planner da ${siteName} e comece a desenhar sua viagem.`,
      ctaText: 'Solicitar consultoria',
      sectionTitle: 'Fale conosco',
      sectionSubtitle: (siteName) => `Conte-nos a viagem dos seus sonhos e a equipe da ${siteName} ajudará você a planejá-la.`,
      richTextBody: (siteName) => `A equipe da ${siteName} está pronta para ajudar você a planejar sua próxima viagem.`,
      seoTitle: (siteName) => `Contato | ${siteName}`,
      seoDescription: (siteName) => `Entre em contato com ${siteName} para planejar viagens, pacotes e experiências sob medida.`,
    },
    press: {
      title: 'Imprensa',
      heroTitle: (siteName) => `Imprensa ${siteName}`,
      heroSubtitle: 'Informações institucionais e contato para a imprensa.',
      ctaEmail: 'Contatar imprensa',
      ctaFallback: 'Solicitar informações',
      body: (siteName) => [
        `${siteName} conecta viajantes com experiências desenhadas por especialistas locais.`,
        'Para solicitações de imprensa, parcerias ou informações institucionais, entre em contato pelos canais oficiais do site.',
      ],
      emailLabel: 'Email',
      phoneLabel: 'Telefone',
      seoTitle: (siteName) => `Imprensa | ${siteName}`,
      seoDescription: (siteName) => `Informações de imprensa e contato institucional de ${siteName}.`,
    },
  },
  fr: {
    contact: {
      title: 'Contact',
      heroTitle: 'Contactez-nous',
      heroSubtitle: (siteName) => `Parlez avec un planner de ${siteName} et commencez à concevoir votre voyage.`,
      ctaText: 'Demander conseil',
      sectionTitle: 'Contactez-nous',
      sectionSubtitle: (siteName) => `Racontez-nous le voyage que vous imaginez et l'équipe ${siteName} vous aidera à le planifier.`,
      richTextBody: (siteName) => `L'équipe ${siteName} est prête à vous aider à planifier votre prochain voyage.`,
      seoTitle: (siteName) => `Contact | ${siteName}`,
      seoDescription: (siteName) => `Contactez ${siteName} pour planifier des voyages, forfaits et expériences sur mesure.`,
    },
    press: {
      title: 'Presse',
      heroTitle: (siteName) => `Presse ${siteName}`,
      heroSubtitle: 'Informations institutionnelles et contact médias.',
      ctaEmail: 'Contacter la presse',
      ctaFallback: 'Demander des informations',
      body: (siteName) => [
        `${siteName} relie les voyageurs à des expériences conçues par des spécialistes locaux.`,
        'Pour les demandes presse, partenariats ou informations institutionnelles, contactez l\'équipe via les canaux officiels du site.',
      ],
      emailLabel: 'Email',
      phoneLabel: 'Téléphone',
      seoTitle: (siteName) => `Presse | ${siteName}`,
      seoDescription: (siteName) => `Informations presse et contact institutionnel de ${siteName}.`,
    },
  },
  de: {
    contact: {
      title: 'Kontakt',
      heroTitle: 'Kontaktieren Sie uns',
      heroSubtitle: (siteName) => `Sprechen Sie mit einem Planner von ${siteName} und beginnen Sie mit der Reiseplanung.`,
      ctaText: 'Beratung anfragen',
      sectionTitle: 'Kontaktieren Sie uns',
      sectionSubtitle: (siteName) => `Erzählen Sie uns von Ihrer Wunschreise und das Team von ${siteName} hilft bei der Planung.`,
      richTextBody: (siteName) => `Das Team von ${siteName} hilft Ihnen gerne bei der Planung Ihrer nächsten Reise.`,
      seoTitle: (siteName) => `Kontakt | ${siteName}`,
      seoDescription: (siteName) => `Kontaktieren Sie ${siteName}, um individuelle Reisen, Pakete und Erlebnisse zu planen.`,
    },
    press: {
      title: 'Presse',
      heroTitle: (siteName) => `Presse ${siteName}`,
      heroSubtitle: 'Institutionelle Informationen und Medienkontakt.',
      ctaEmail: 'Presse kontaktieren',
      ctaFallback: 'Informationen anfragen',
      body: (siteName) => [
        `${siteName} verbindet Reisende mit Erlebnissen, die von lokalen Spezialisten gestaltet werden.`,
        'Für Presseanfragen, Partnerschaften oder institutionelle Informationen kontaktieren Sie das Team über die offiziellen Kanäle der Website.',
      ],
      emailLabel: 'E-Mail',
      phoneLabel: 'Telefon',
      seoTitle: (siteName) => `Presse | ${siteName}`,
      seoDescription: (siteName) => `Presseinformationen und institutioneller Kontakt von ${siteName}.`,
    },
  },
};

function getFallbackCopy(locale?: string | null): FallbackPageCopy {
  const language = localeToLanguage(normalizeLocale(locale ?? 'es-CO'));
  return FALLBACK_PAGE_COPY[language] ?? FALLBACK_PAGE_COPY.es;
}

function getSiteName(website: WebsiteData): string {
  return (
    website.content?.account?.name ||
    website.content?.siteName ||
    website.subdomain ||
    'Travel Agency'
  );
}

function hasContactChannel(website: WebsiteData): boolean {
  return Boolean(
    website.content?.account?.email ||
      website.content?.contact?.email ||
      website.content?.account?.phone ||
      website.content?.contact?.phone ||
      website.content?.social?.whatsapp,
  );
}

function buildContactPage(
  slug: string,
  website: WebsiteData,
  locale?: string | null,
): WebsitePage {
  const siteName = getSiteName(website);
  const resolvedLocale = normalizeLocale(locale ?? website.default_locale ?? website.content?.locale ?? 'es-CO');
  const copy = getFallbackCopy(resolvedLocale).contact;
  const sections: WebsitePage['sections'] = [];

  if (hasContactChannel(website)) {
    sections.push({
      id: '11111111-1111-4111-8111-111111111111',
      type: 'contact',
      variant: 'default',
      config: {},
      content: {
        title: copy.sectionTitle,
        subtitle: copy.sectionSubtitle(siteName),
      },
    });
  } else {
    sections.push({
      id: '11111111-1111-4111-8111-111111111112',
      type: 'rich_text',
      variant: 'default',
      config: {},
      content: {
        body: copy.richTextBody(siteName),
      },
    });
  }

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: copy.title,
    hero_config: {
      title: copy.heroTitle,
      subtitle: copy.heroSubtitle(siteName),
      ctaText: copy.ctaText,
      ctaUrl: '#contact',
    },
    intro_content: {},
    sections,
    cta_config: {},
    seo_title: copy.seoTitle(siteName),
    seo_description: copy.seoDescription(siteName),
    robots_noindex: false,
    is_published: true,
    locale: resolvedLocale,
  };
}

function buildPressPage(
  slug: string,
  website: WebsiteData,
  locale?: string | null,
): WebsitePage {
  const siteName = getSiteName(website);
  const resolvedLocale = normalizeLocale(locale ?? website.default_locale ?? website.content?.locale ?? 'es-CO');
  const copy = getFallbackCopy(resolvedLocale).press;
  const contactEmail = website.content?.account?.email || website.content?.contact?.email;
  const contactPhone = website.content?.account?.phone || website.content?.contact?.phone;
  const contactLines = [
    contactEmail ? `${copy.emailLabel}: ${contactEmail}` : null,
    contactPhone ? `${copy.phoneLabel}: ${contactPhone}` : null,
  ].filter(Boolean);

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: copy.title,
    hero_config: {
      title: copy.heroTitle(siteName),
      subtitle: copy.heroSubtitle,
      ctaText: contactEmail ? copy.ctaEmail : copy.ctaFallback,
      ctaUrl: contactEmail ? `mailto:${contactEmail}` : '#contact',
    },
    intro_content: {},
    sections: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'rich_text',
        variant: 'default',
        config: {},
        content: {
          body: [...copy.body(siteName), ...contactLines].join('\n\n'),
        },
      },
    ],
    cta_config: {},
    seo_title: copy.seoTitle(siteName),
    seo_description: copy.seoDescription(siteName),
    robots_noindex: false,
    is_published: true,
    locale: resolvedLocale,
  };
}

export function getSystemFallbackPage(
  slugPath: string,
  website: WebsiteData,
  locale?: string | null,
): WebsitePage | null {
  const normalizedSlug = slugPath.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!normalizedSlug || normalizedSlug.includes('/')) return null;

  if (CONTACT_SLUGS.has(normalizedSlug)) {
    return buildContactPage(normalizedSlug, website, locale);
  }

  if (PRESS_SLUGS.has(normalizedSlug)) {
    return buildPressPage(normalizedSlug, website, locale);
  }

  return null;
}
