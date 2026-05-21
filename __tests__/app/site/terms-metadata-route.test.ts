import { getPageBySlugForLocale } from '@/lib/supabase/get-pages';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
jest.mock('next/link', () => 'a');
jest.mock('@/components/pages/static-page', () => ({
  StaticPage: () => null,
}));
jest.mock('@/lib/sanitize', () => ({
  SafeHtml: () => null,
}));
jest.mock('@/lib/supabase/get-pages', () => ({
  getDestinations: jest.fn(),
  getPageBySlugForLocale: jest.fn(),
}));
jest.mock('@/lib/supabase/get-website', () => ({
  getWebsiteBySubdomain: jest.fn(),
}));
jest.mock('@/lib/seo/public-metadata', () => ({
  buildLocaleAwareAlternateLanguages: jest.fn(() => ({
    'fr-FR': 'https://colombiatours.travel/fr/conditions-generales',
    'x-default': 'https://colombiatours.travel/terminos-y-condiciones',
  })),
  resolvePublicMetadataLocale: jest.fn(async () => ({
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'fr-FR'],
    resolvedLocale: 'fr-FR',
    resolvedLanguage: 'fr',
    languageSegment: null,
    localizedPathname: '/fr/conditions-generales',
  })),
}));

describe('terms metadata route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getWebsiteBySubdomain as jest.Mock).mockResolvedValue({
      id: 'website-1',
      subdomain: 'colombiatours',
      custom_domain: 'colombiatours.travel',
      status: 'published',
      default_locale: 'es-CO',
      supported_locales: ['es-CO', 'fr-FR'],
      content: {
        siteName: 'ColombiaTours.Travel',
        account: { name: 'ColombiaTours.Travel' },
      },
    });
    (getPageBySlugForLocale as jest.Mock).mockResolvedValue({
      id: 'page-fr-terms',
      slug: 'conditions-generales',
      locale: 'fr-FR',
      title: 'Conditions générales',
      seo_title: 'Conditions générales | ColombiaTours.Travel',
      seo_description: 'Conditions générales de ColombiaTours.Travel en français.',
      is_published: true,
      robots_noindex: false,
    });
  });

  it('looks up the published fr-FR terms CMS row and emits indexable hreflang metadata', async () => {
    const { generateMetadata } = await import(
      '@/app/site/[subdomain]/terms/page'
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({ subdomain: 'colombiatours' }),
    });

    expect(getPageBySlugForLocale).toHaveBeenCalledWith(
      'colombiatours',
      'conditions-generales',
      'fr-FR',
    );
    expect(metadata.title).toBe('Conditions générales | ColombiaTours.Travel');
    expect(metadata.description).toBe(
      'Conditions générales de ColombiaTours.Travel en français.',
    );
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({
      canonical: 'https://colombiatours.travel/fr/conditions-generales',
      languages: {
        'fr-FR': 'https://colombiatours.travel/fr/conditions-generales',
        'x-default': 'https://colombiatours.travel/terminos-y-condiciones',
      },
    });
  });
});
