import { resolvePublicPageForRoute } from '@/lib/site/public-page-resolution';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage } from '@/lib/supabase/get-pages';

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
    supported_locales: ['es-CO', 'pt-BR', 'en-US'],
    sections: [],
    navigation: [],
    site_parts: {},
    content: {
      siteName: 'ColombiaTours.Travel',
      locale: 'es-CO',
      account: { name: 'ColombiaTours.Travel', email: 'hola@example.com' },
      contact: {},
      social: {},
    },
    ...overrides,
  } as WebsiteData;
}

function makePage(overrides: Partial<WebsitePage>): WebsitePage {
  return {
    id: 'page-1',
    page_type: 'custom',
    slug: 'contact',
    title: 'Contact',
    hero_config: {},
    intro_content: {},
    sections: [],
    cta_config: {},
    robots_noindex: false,
    is_published: true,
    locale: 'es-CO',
    ...overrides,
  } as WebsitePage;
}

describe('resolvePublicPageForRoute', () => {
  it('strips pt-br public segment before custom/static page lookup', async () => {
    const calls: string[] = [];
    const page = makePage({ slug: 'contact', locale: 'pt-BR', title: 'Contato' });

    const result = await resolvePublicPageForRoute({
      website: makeWebsite(),
      publicSlugPath: 'pt-br/contact',
      loadPageBySlug: async (_subdomain, slug) => {
        calls.push(slug);
        return slug === 'contact' ? page : null;
      },
      loadPageBySlugForLocale: async () => null,
      loadPageByTranslationGroup: async () => null,
    });

    expect(result.slugPath).toBe('contact');
    expect(result.locale.resolvedLocale).toBe('pt-BR');
    expect(result.page).toBe(page);
    expect(calls).toContain('contact');
    expect(calls).not.toContain('pt-br/contact');
  });

  it('prefers a published same-slug row in the requested locale over the default row', async () => {
    const defaultPage = makePage({
      id: 'page-es',
      slug: 'contact',
      locale: 'es-CO',
      title: 'Contacto',
      translation_group_id: 'tg-contact',
    });
    const ptPage = makePage({
      id: 'page-pt',
      slug: 'contact',
      locale: 'pt-BR',
      title: 'Contato',
      translation_group_id: 'tg-contact',
    });

    const result = await resolvePublicPageForRoute({
      website: makeWebsite(),
      publicSlugPath: 'pt-br/contact',
      loadPageBySlug: async () => defaultPage,
      loadPageBySlugForLocale: async (_websiteId, slug, locale) =>
        slug === 'contact' && locale === 'pt-BR' ? ptPage : null,
      loadPageByTranslationGroup: async () => null,
    });

    expect(result.page?.id).toBe('page-pt');
    expect(result.page?.title).toBe('Contato');
  });

  it('uses localized system fallback chrome for translated static aliases', async () => {
    const result = await resolvePublicPageForRoute({
      website: makeWebsite(),
      publicSlugPath: 'pt-br/contact',
      loadPageBySlug: async () => null,
      loadPageBySlugForLocale: async () => null,
      loadPageByTranslationGroup: async () => null,
    });

    expect(result.page?.slug).toBe('contact');
    expect(result.page?.locale).toBe('pt-BR');
    expect(result.page?.title).toBe('Contato');
    expect(result.page?.hero_config?.title).toBe('Fale conosco');
    expect(result.page?.seo_title).toContain('Contato');
  });

  it('keeps ColombiaTours priority locales routable even when DB locale columns lag behind', async () => {
    const result = await resolvePublicPageForRoute({
      website: makeWebsite({ supported_locales: ['es-CO', 'en-US', 'fr-FR', 'de-DE'] }),
      publicSlugPath: 'pt-br/contact',
      loadPageBySlug: async () => null,
      loadPageBySlugForLocale: async () => null,
      loadPageByTranslationGroup: async () => null,
    });

    expect(result.slugPath).toBe('contact');
    expect(result.locale.resolvedLocale).toBe('pt-BR');
    expect(result.page?.locale).toBe('pt-BR');
    expect(result.page?.title).toBe('Contato');
  });
});
