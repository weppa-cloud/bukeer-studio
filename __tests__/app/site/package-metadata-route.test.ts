import { notFound } from 'next/navigation';
import { getProductPage, getPageBySlugForLocale } from '@/lib/supabase/get-pages';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('@/components/pages/product-landing-page', () => ({
  ProductLandingPage: () => null,
}));
jest.mock('@/components/pages/static-page', () => ({
  StaticPage: () => null,
}));
jest.mock('@/components/site/themes/editorial-v1/template-slot', () => ({
  TemplateSlot: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/supabase/get-reviews', () => ({
  getReviewsForContext: jest.fn(),
}));
jest.mock('@/lib/supabase/get-planners', () => ({
  getPlanners: jest.fn(),
}));
jest.mock('@/lib/seo/public-metadata', () => ({
  buildLocaleAwareAlternateLanguages: jest.fn(() => ({
    'fr-FR': 'https://colombiatours.travel/fr/forfaits/bogota-medellin-carthagene',
    'x-default': 'https://colombiatours.travel/paquetes/bogota-medellin-carthagene',
  })),
  resolvePublicMetadataLocale: jest.fn(async () => ({
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'fr-FR'],
    resolvedLocale: 'fr-FR',
    resolvedLanguage: 'fr',
    languageSegment: 'fr',
    localizedPathname: '/fr/forfaits/bogota-medellin-carthagene',
  })),
}));
jest.mock('@/lib/supabase/get-pages', () => ({
  getCategoryProducts: jest.fn(),
  getDestinations: jest.fn(),
  getPageBySlugForLocale: jest.fn(),
  getLocalizedProductOverlay: jest.fn(),
  getProductPage: jest.fn(),
  getProductSlugRedirect: jest.fn(),
}));
jest.mock('@/lib/supabase/get-website', () => ({
  getWebsiteBySubdomain: jest.fn(),
}));

describe('package metadata route semantics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getWebsiteBySubdomain as jest.Mock).mockResolvedValue({
      id: 'website-1',
      account_id: 'account-1',
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
    (getProductPage as jest.Mock).mockResolvedValue(null);
    (getPageBySlugForLocale as jest.Mock).mockResolvedValue(null);
  });

  it('throws notFound for absent localized forfaits instead of emitting a Spanish soft-404 metadata document', async () => {
    const { generateMetadata } = await import(
      '@/app/site/[subdomain]/paquetes/[slug]/page'
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({
          subdomain: 'colombiatours',
          slug: 'bogota-medellin-carthagene',
        }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
