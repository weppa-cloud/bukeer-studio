import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage } from '@/lib/supabase/get-pages';
import { resolvePublicUiLocale, type SupportedPublicUiLocale } from '@/lib/site/public-ui-messages';
import { resolveWebsiteContactChannels } from '@/lib/site/contact-channels';

const CONTACT_SLUGS = new Set(['contact', 'contacto']);
const PRESS_SLUGS = new Set(['press', 'prensa']);

function getSiteName(website: WebsiteData): string {
  return (
    website.content?.account?.name ||
    website.content?.siteName ||
    website.subdomain ||
    'Travel Agency'
  );
}

interface FallbackCopy {
  contactTitle: string;
  contactHeroTitle: string;
  contactHeroSubtitle: (siteName: string) => string;
  contactCta: string;
  contactSectionTitle: string;
  contactSectionSubtitle: (siteName: string) => string;
  contactBody: (siteName: string) => string;
  contactSeoTitle: (siteName: string) => string;
  contactSeoDescription: (siteName: string) => string;
  pressTitle: string;
  pressHeroTitle: (siteName: string) => string;
  pressHeroSubtitle: string;
  pressCtaEmail: string;
  pressCtaFallback: string;
  pressBody: (siteName: string) => string[];
  pressSeoTitle: (siteName: string) => string;
  pressSeoDescription: (siteName: string) => string;
  emailLabel: string;
  phoneLabel: string;
}

const FALLBACK_COPY: Record<SupportedPublicUiLocale, FallbackCopy> = {
  'es-CO': {
    contactTitle: 'Contacto',
    contactHeroTitle: 'Contáctanos',
    contactHeroSubtitle: (siteName) => `Habla con un planner de ${siteName} y empieza a diseñar tu viaje.`,
    contactCta: 'Solicitar asesoría',
    contactSectionTitle: 'Contáctanos',
    contactSectionSubtitle: (siteName) => `Cuéntanos qué viaje sueñas y el equipo de ${siteName} te ayudará a planificarlo.`,
    contactBody: (siteName) => `El equipo de ${siteName} está listo para ayudarte a planificar tu próximo viaje.`,
    contactSeoTitle: (siteName) => `Contacto | ${siteName}`,
    contactSeoDescription: (siteName) => `Contacta a ${siteName} para planificar viajes, paquetes y experiencias a medida.`,
    pressTitle: 'Prensa',
    pressHeroTitle: (siteName) => `Prensa ${siteName}`,
    pressHeroSubtitle: 'Información institucional y contacto para medios.',
    pressCtaEmail: 'Contactar prensa',
    pressCtaFallback: 'Solicitar información',
    pressBody: (siteName) => [
      `${siteName} conecta viajeros con experiencias diseñadas por especialistas locales.`,
      'Para solicitudes de prensa, alianzas o información institucional, contacta al equipo por los canales oficiales del sitio.',
    ],
    pressSeoTitle: (siteName) => `Prensa | ${siteName}`,
    pressSeoDescription: (siteName) => `Información de prensa y contacto institucional de ${siteName}.`,
    emailLabel: 'Email',
    phoneLabel: 'Teléfono',
  },
  'en-US': {
    contactTitle: 'Contact',
    contactHeroTitle: 'Contact us',
    contactHeroSubtitle: (siteName) => `Talk to a ${siteName} planner and start designing your trip.`,
    contactCta: 'Request advice',
    contactSectionTitle: 'Contact us',
    contactSectionSubtitle: (siteName) => `Tell us the trip you are dreaming of and the ${siteName} team will help you plan it.`,
    contactBody: (siteName) => `The ${siteName} team is ready to help you plan your next trip.`,
    contactSeoTitle: (siteName) => `Contact | ${siteName}`,
    contactSeoDescription: (siteName) => `Contact ${siteName} to plan custom trips, packages, and experiences.`,
    pressTitle: 'Press',
    pressHeroTitle: (siteName) => `${siteName} Press`,
    pressHeroSubtitle: 'Institutional information and media contact.',
    pressCtaEmail: 'Contact press',
    pressCtaFallback: 'Request information',
    pressBody: (siteName) => [
      `${siteName} connects travelers with experiences designed by local specialists.`,
      'For press requests, partnerships, or institutional information, contact the team through the official site channels.',
    ],
    pressSeoTitle: (siteName) => `Press | ${siteName}`,
    pressSeoDescription: (siteName) => `Press information and institutional contact for ${siteName}.`,
    emailLabel: 'Email',
    phoneLabel: 'Phone',
  },
  'pt-BR': {
    contactTitle: 'Contato',
    contactHeroTitle: 'Fale conosco',
    contactHeroSubtitle: (siteName) => `Fale com um planner da ${siteName} e comece a desenhar sua viagem.`,
    contactCta: 'Solicitar consultoria',
    contactSectionTitle: 'Fale conosco',
    contactSectionSubtitle: (siteName) => `Conte-nos que viagem você sonha e a equipe da ${siteName} ajudará no planejamento.`,
    contactBody: (siteName) => `A equipe da ${siteName} está pronta para ajudar a planejar sua próxima viagem.`,
    contactSeoTitle: (siteName) => `Contato | ${siteName}`,
    contactSeoDescription: (siteName) => `Entre em contato com ${siteName} para planejar viagens, pacotes e experiências sob medida.`,
    pressTitle: 'Imprensa',
    pressHeroTitle: (siteName) => `Imprensa ${siteName}`,
    pressHeroSubtitle: 'Informações institucionais e contato para mídia.',
    pressCtaEmail: 'Contatar imprensa',
    pressCtaFallback: 'Solicitar informações',
    pressBody: (siteName) => [
      `${siteName} conecta viajantes a experiências desenhadas por especialistas locais.`,
      'Para pedidos de imprensa, parcerias ou informações institucionais, fale com a equipe pelos canais oficiais do site.',
    ],
    pressSeoTitle: (siteName) => `Imprensa | ${siteName}`,
    pressSeoDescription: (siteName) => `Informações de imprensa e contato institucional da ${siteName}.`,
    emailLabel: 'Email',
    phoneLabel: 'Telefone',
  },
  'fr-FR': {
    contactTitle: 'Contact',
    contactHeroTitle: 'Contactez-nous',
    contactHeroSubtitle: (siteName) => `Parlez avec un planner de ${siteName} et commencez à concevoir votre voyage.`,
    contactCta: 'Demander un conseil',
    contactSectionTitle: 'Contactez-nous',
    contactSectionSubtitle: (siteName) => `Dites-nous le voyage dont vous rêvez et l’équipe ${siteName} vous aidera à le planifier.`,
    contactBody: (siteName) => `L’équipe ${siteName} est prête à vous aider à planifier votre prochain voyage.`,
    contactSeoTitle: (siteName) => `Contact | ${siteName}`,
    contactSeoDescription: (siteName) => `Contactez ${siteName} pour planifier des voyages, forfaits et expériences sur mesure.`,
    pressTitle: 'Presse',
    pressHeroTitle: (siteName) => `Presse ${siteName}`,
    pressHeroSubtitle: 'Informations institutionnelles et contact médias.',
    pressCtaEmail: 'Contacter la presse',
    pressCtaFallback: 'Demander des informations',
    pressBody: (siteName) => [
      `${siteName} connecte les voyageurs à des expériences conçues par des spécialistes locaux.`,
      'Pour les demandes presse, partenariats ou informations institutionnelles, contactez l’équipe via les canaux officiels du site.',
    ],
    pressSeoTitle: (siteName) => `Presse | ${siteName}`,
    pressSeoDescription: (siteName) => `Informations presse et contact institutionnel de ${siteName}.`,
    emailLabel: 'Email',
    phoneLabel: 'Téléphone',
  },
  'de-DE': {
    contactTitle: 'Kontakt',
    contactHeroTitle: 'Kontaktieren Sie uns',
    contactHeroSubtitle: (siteName) => `Sprechen Sie mit einem ${siteName}-Planner und beginnen Sie mit der Reiseplanung.`,
    contactCta: 'Beratung anfragen',
    contactSectionTitle: 'Kontaktieren Sie uns',
    contactSectionSubtitle: (siteName) => `Erzählen Sie uns von Ihrer Wunschreise und das ${siteName}-Team hilft bei der Planung.`,
    contactBody: (siteName) => `Das ${siteName}-Team ist bereit, Ihnen bei der Planung Ihrer nächsten Reise zu helfen.`,
    contactSeoTitle: (siteName) => `Kontakt | ${siteName}`,
    contactSeoDescription: (siteName) => `Kontaktieren Sie ${siteName}, um individuelle Reisen, Pakete und Erlebnisse zu planen.`,
    pressTitle: 'Presse',
    pressHeroTitle: (siteName) => `Presse ${siteName}`,
    pressHeroSubtitle: 'Institutionelle Informationen und Medienkontakt.',
    pressCtaEmail: 'Presse kontaktieren',
    pressCtaFallback: 'Informationen anfragen',
    pressBody: (siteName) => [
      `${siteName} verbindet Reisende mit Erlebnissen, die von lokalen Spezialisten gestaltet werden.`,
      'Für Presseanfragen, Partnerschaften oder institutionelle Informationen kontaktieren Sie das Team über die offiziellen Kanäle der Website.',
    ],
    pressSeoTitle: (siteName) => `Presse | ${siteName}`,
    pressSeoDescription: (siteName) => `Presseinformationen und institutioneller Kontakt von ${siteName}.`,
    emailLabel: 'Email',
    phoneLabel: 'Telefon',
  },
};

function getFallbackCopy(localeLike?: string | null): { locale: SupportedPublicUiLocale; copy: FallbackCopy } {
  const locale = resolvePublicUiLocale(localeLike);
  return { locale, copy: FALLBACK_COPY[locale] ?? FALLBACK_COPY['en-US'] };
}


function buildContactPage(slug: string, website: WebsiteData, localeLike?: string | null): WebsitePage {
  const siteName = getSiteName(website);
  const { locale, copy } = getFallbackCopy(localeLike ?? website.default_locale ?? website.content?.locale);
  const channels = resolveWebsiteContactChannels(website);
  const sections: WebsitePage['sections'] = [];

  if (channels.hasEmail || channels.hasPhone || channels.hasWhatsapp) {
    sections.push({
      id: 'system-fallback-contact-form',
      type: 'contact',
      variant: 'default',
      config: {},
      content: {
        title: copy.contactSectionTitle,
        subtitle: copy.contactSectionSubtitle(siteName),
      },
    });
  } else {
    sections.push({
      id: 'system-fallback-contact-text',
      type: 'rich_text',
      variant: 'default',
      config: {},
      content: {
        body: copy.contactBody(siteName),
      },
    });
  }

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: copy.contactTitle,
    hero_config: {
      title: copy.contactHeroTitle,
      subtitle: copy.contactHeroSubtitle(siteName),
      ctaText: copy.contactCta,
      ctaUrl: '#contact',
    },
    intro_content: {},
    sections,
    cta_config: {},
    seo_title: copy.contactSeoTitle(siteName),
    seo_description: copy.contactSeoDescription(siteName),
    robots_noindex: false,
    is_published: true,
    locale,
  };
}

function buildPressPage(slug: string, website: WebsiteData, localeLike?: string | null): WebsitePage {
  const siteName = getSiteName(website);
  const { locale, copy } = getFallbackCopy(localeLike ?? website.default_locale ?? website.content?.locale);
  const channels = resolveWebsiteContactChannels(website);
  const contactLines = [
    channels.email ? `${copy.emailLabel}: ${channels.email}` : null,
    channels.phone ? `${copy.phoneLabel}: ${channels.phone}` : null,
  ].filter(Boolean);

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: copy.pressTitle,
    hero_config: {
      title: copy.pressHeroTitle(siteName),
      subtitle: copy.pressHeroSubtitle,
      ctaText: channels.email ? copy.pressCtaEmail : copy.pressCtaFallback,
      ctaUrl: channels.email ? `mailto:${channels.email}` : '#contact',
    },
    intro_content: {},
    sections: [
      {
        id: 'system-fallback-press-content',
        type: 'rich_text',
        variant: 'default',
        config: {},
        content: {
          body: [
            ...copy.pressBody(siteName),
            ...contactLines,
          ].join('\n\n'),
        },
      },
    ],
    cta_config: {},
    seo_title: copy.pressSeoTitle(siteName),
    seo_description: copy.pressSeoDescription(siteName),
    robots_noindex: false,
    is_published: true,
    locale,
  };
}

export function getSystemFallbackPage(
  slugPath: string,
  website: WebsiteData,
  localeLike?: string | null,
): WebsitePage | null {
  const normalizedSlug = slugPath.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!normalizedSlug || normalizedSlug.includes('/')) return null;

  if (CONTACT_SLUGS.has(normalizedSlug)) {
    return buildContactPage(normalizedSlug, website, localeLike);
  }

  if (PRESS_SLUGS.has(normalizedSlug)) {
    return buildPressPage(normalizedSlug, website, localeLike);
  }

  return null;
}
