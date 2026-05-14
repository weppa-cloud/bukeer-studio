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

  it('emits complete translated blog alternates including pt-BR on /pt-br and never /pt', () => {
    const links = generateHreflangLinksForLocales(
      'https://colombiatours.travel',
      '/blog/viajar-a-colombia-desde-panama',
      {
        defaultLocale: 'es-CO',
        supportedLocales: ['es-CO', 'en-US', 'de-DE', 'fr-FR', 'pt-BR'],
      },
      ['en-US', 'de-DE', 'fr-FR', 'pt-BR'],
    );

    const map = Object.fromEntries(links.map((link) => [link.hreflang, link.href]));
    expect(Object.keys(map)).toEqual(['es-CO', 'en-US', 'de-DE', 'fr-FR', 'pt-BR', 'x-default']);
    expect(map['pt-BR']).toBe(
      'https://colombiatours.travel/pt-br/blog/viajar-a-colombia-desde-panama',
    );
    expect(map['en-US']).toBe(
      'https://colombiatours.travel/en/blog/viajar-a-colombia-desde-panama',
    );
    expect(map['x-default']).toBe(
      'https://colombiatours.travel/blog/viajar-a-colombia-desde-panama',
    );
    expect(Object.values(map).some((href) => href.includes('/pt/blog/'))).toBe(false);
  });
});
