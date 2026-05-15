import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage } from '@/lib/supabase/get-pages';

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

function hasContactChannel(website: WebsiteData): boolean {
  return Boolean(
    website.content?.account?.email ||
      website.content?.contact?.email ||
      website.content?.account?.phone ||
      website.content?.contact?.phone ||
      website.content?.social?.whatsapp,
  );
}

function buildContactPage(slug: string, website: WebsiteData): WebsitePage {
  const siteName = getSiteName(website);
  const sections: WebsitePage['sections'] = [];

  if (hasContactChannel(website)) {
    sections.push({
      id: 'system-fallback-contact-form',
      type: 'contact',
      variant: 'default',
      config: {},
      content: {
        title: 'Contáctanos',
        subtitle: `Cuéntanos qué viaje sueñas y el equipo de ${siteName} te ayudará a planificarlo.`,
      },
    });
  } else {
    sections.push({
      id: 'system-fallback-contact-text',
      type: 'rich_text',
      variant: 'default',
      config: {},
      content: {
        body: `El equipo de ${siteName} está listo para ayudarte a planificar tu próximo viaje.`,
      },
    });
  }

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: 'Contacto',
    hero_config: {
      title: 'Contáctanos',
      subtitle: `Habla con un planner de ${siteName} y empieza a diseñar tu viaje.`,
      ctaText: 'Solicitar asesoría',
      ctaUrl: '#contact',
    },
    intro_content: {},
    sections,
    cta_config: {},
    seo_title: `Contacto | ${siteName}`,
    seo_description: `Contacta a ${siteName} para planificar viajes, paquetes y experiencias a medida.`,
    robots_noindex: false,
    is_published: true,
    locale: website.default_locale ?? website.content?.locale ?? 'es-CO',
  };
}

function buildPressPage(slug: string, website: WebsiteData): WebsitePage {
  const siteName = getSiteName(website);
  const contactEmail = website.content?.account?.email || website.content?.contact?.email;
  const contactPhone = website.content?.account?.phone || website.content?.contact?.phone;
  const contactLines = [
    contactEmail ? `Email: ${contactEmail}` : null,
    contactPhone ? `Teléfono: ${contactPhone}` : null,
  ].filter(Boolean);

  return {
    id: `system-fallback-${slug}`,
    page_type: 'static',
    slug,
    title: 'Prensa',
    hero_config: {
      title: `Prensa ${siteName}`,
      subtitle: 'Información institucional y contacto para medios.',
      ctaText: contactEmail ? 'Contactar prensa' : 'Solicitar información',
      ctaUrl: contactEmail ? `mailto:${contactEmail}` : '#contact',
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
            `${siteName} conecta viajeros con experiencias diseñadas por especialistas locales.`,
            'Para solicitudes de prensa, alianzas o información institucional, contacta al equipo por los canales oficiales del sitio.',
            ...contactLines,
          ].join('\n\n'),
        },
      },
    ],
    cta_config: {},
    seo_title: `Prensa | ${siteName}`,
    seo_description: `Información de prensa y contacto institucional de ${siteName}.`,
    robots_noindex: false,
    is_published: true,
    locale: website.default_locale ?? website.content?.locale ?? 'es-CO',
  };
}

export function getSystemFallbackPage(
  slugPath: string,
  website: WebsiteData,
): WebsitePage | null {
  const normalizedSlug = slugPath.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!normalizedSlug || normalizedSlug.includes('/')) return null;

  if (CONTACT_SLUGS.has(normalizedSlug)) {
    return buildContactPage(normalizedSlug, website);
  }

  if (PRESS_SLUGS.has(normalizedSlug)) {
    return buildPressPage(normalizedSlug, website);
  }

  return null;
}
