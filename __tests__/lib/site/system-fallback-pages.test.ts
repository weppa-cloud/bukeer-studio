import { getSystemFallbackPage } from '@/lib/site/system-fallback-pages';
import type { WebsiteData } from '@/lib/supabase/get-website';

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'website-1',
    account_id: 'account-1',
    subdomain: 'colombiatours',
    custom_domain: 'colombiatours.travel',
    status: 'published',
    theme: null,
    analytics: {},
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'en-US', 'pt-BR'],
    sections: [],
    navigation: [],
    site_parts: {},
    content: {
      siteName: 'ColombiaTours.Travel',
      locale: 'es-CO',
      account: {
        name: 'ColombiaTours.Travel',
        email: 'hola@example.com',
        phone: '+57 300 000 0000',
      },
      contact: {},
      social: {},
    },
    ...overrides,
  } as WebsiteData;
}

describe('getSystemFallbackPage', () => {
  it('returns a published contact page for contact aliases', () => {
    const website = makeWebsite();

    for (const slug of ['contacto', 'contact']) {
      const page = getSystemFallbackPage(slug, website);

      expect(page).not.toBeNull();
      expect(page?.slug).toBe(slug);
      expect(page?.page_type).toBe('static');
      expect(page?.is_published).toBe(true);
      expect(page?.robots_noindex).toBe(false);
      expect(page?.title).toBe('Contacto');
      expect(page?.sections.some((section) => section.type === 'contact')).toBe(true);
    }
  });

  it('localizes contact fallback chrome for pt-BR requests', () => {
    const page = getSystemFallbackPage('contact', makeWebsite(), 'pt-BR');

    expect(page).not.toBeNull();
    expect(page?.locale).toBe('pt-BR');
    expect(page?.title).toBe('Contato');
    expect(page?.hero_config?.title).toBe('Fale conosco');
    expect(page?.hero_config?.ctaText).toBe('Solicitar consultoria');
    expect(page?.sections[0]?.content?.title).toBe('Fale conosco');
    expect(page?.seo_title).toBe('Contato | ColombiaTours.Travel');
  });

  it('returns a published press page for press aliases', () => {
    const website = makeWebsite();

    for (const slug of ['prensa', 'press']) {
      const page = getSystemFallbackPage(slug, website);

      expect(page).not.toBeNull();
      expect(page?.slug).toBe(slug);
      expect(page?.page_type).toBe('static');
      expect(page?.is_published).toBe(true);
      expect(page?.robots_noindex).toBe(false);
      expect(page?.title).toBe('Prensa');
      expect(page?.sections.some((section) => section.type === 'rich_text')).toBe(true);
    }
  });

  it('does not mask unrelated missing pages', () => {
    const website = makeWebsite();

    expect(getSystemFallbackPage('unknown', website)).toBeNull();
    expect(getSystemFallbackPage('contacto/extra', website)).toBeNull();
  });
});
