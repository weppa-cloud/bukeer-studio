import { generateHreflangLinksForLocales } from '@/lib/seo/hreflang';

describe('generateHreflangLinksForLocales translated locale filtering', () => {
  const baseUrl = 'https://example.com';
  const pathname = '/paquetes/cartagena';
  const options = {
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'en-US', 'pt-BR'],
  };

  it('keeps only translated locales plus default locale and x-default', () => {
    const links = generateHreflangLinksForLocales(baseUrl, pathname, options, ['en-US']);
    const tags = links.map((link) => link.hreflang);

    expect(tags).toEqual(['es-CO', 'en-US', 'x-default']);
    expect(links.find((link) => link.hreflang === 'es-CO')?.href).toBe(
      'https://example.com/paquetes/cartagena',
    );
    expect(links.find((link) => link.hreflang === 'en-US')?.href).toBe(
      'https://example.com/en/packages/cartagena',
    );
  });
});
