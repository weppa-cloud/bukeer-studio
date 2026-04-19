import {
  CATEGORY_CANONICAL_SEGMENT,
  resolveCategorySegment,
  resolveLocaleFromPublicPath,
  translateCategoryPathname,
} from '@/lib/seo/locale-routing';
import { generateHreflangLinksForLocales } from '@/lib/seo/hreflang';

describe('CATEGORY_CANONICAL_SEGMENT', () => {
  it('maps all five category productTypes with es and en segments', () => {
    const productTypes = Object.keys(CATEGORY_CANONICAL_SEGMENT);
    expect(productTypes.sort()).toEqual(
      ['activity', 'destination', 'hotel', 'package', 'transfer'].sort(),
    );
    for (const productType of productTypes) {
      const entry = (CATEGORY_CANONICAL_SEGMENT as Record<string, { es: string; en: string }>)[productType];
      expect(typeof entry.es).toBe('string');
      expect(typeof entry.en).toBe('string');
      expect(entry.es.length).toBeGreaterThan(0);
      expect(entry.en.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveCategorySegment', () => {
  it('resolves Spanish segments to productType + canonicalEs', () => {
    expect(resolveCategorySegment('paquetes')).toEqual({
      productType: 'package',
      canonicalEs: 'paquetes',
      language: 'es',
    });
    expect(resolveCategorySegment('hoteles')).toEqual({
      productType: 'hotel',
      canonicalEs: 'hoteles',
      language: 'es',
    });
  });

  it('resolves English segments to productType with canonical Spanish segment', () => {
    expect(resolveCategorySegment('packages')).toEqual({
      productType: 'package',
      canonicalEs: 'paquetes',
      language: 'en',
    });
    expect(resolveCategorySegment('hotels')).toEqual({
      productType: 'hotel',
      canonicalEs: 'hoteles',
      language: 'en',
    });
    expect(resolveCategorySegment('activities')).toEqual({
      productType: 'activity',
      canonicalEs: 'actividades',
      language: 'en',
    });
    expect(resolveCategorySegment('transfers')).toEqual({
      productType: 'transfer',
      canonicalEs: 'traslados',
      language: 'en',
    });
    expect(resolveCategorySegment('destinations')).toEqual({
      productType: 'destination',
      canonicalEs: 'destinos',
      language: 'en',
    });
  });

  it('returns null for unknown segments', () => {
    expect(resolveCategorySegment('unknown')).toBeNull();
    expect(resolveCategorySegment('blog')).toBeNull();
    expect(resolveCategorySegment('')).toBeNull();
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveCategorySegment('  PACKAGES ')?.productType).toBe('package');
  });
});

describe('translateCategoryPathname', () => {
  it('translates EN category segment to Spanish canonical', () => {
    expect(translateCategoryPathname('/packages/cartagena', 'es')).toBe(
      '/paquetes/cartagena',
    );
    expect(translateCategoryPathname('/hotels/bogota', 'es')).toBe(
      '/hoteles/bogota',
    );
  });

  it('translates Spanish category segment to English', () => {
    expect(translateCategoryPathname('/paquetes/cartagena', 'en')).toBe(
      '/packages/cartagena',
    );
    expect(translateCategoryPathname('/destinos/cartagena', 'en')).toBe(
      '/destinations/cartagena',
    );
  });

  it('leaves non-category segments unchanged', () => {
    expect(translateCategoryPathname('/blog/post-1', 'en')).toBe('/blog/post-1');
    expect(translateCategoryPathname('/buscar', 'en')).toBe('/buscar');
    expect(translateCategoryPathname('/', 'en')).toBe('/');
  });

  it('only translates the first segment', () => {
    // A hypothetical nested path: /packages/some/packages — only first affected
    expect(translateCategoryPathname('/packages/some/packages', 'es')).toBe(
      '/paquetes/some/packages',
    );
  });

  it('falls back to Spanish canonical for unknown target languages', () => {
    expect(translateCategoryPathname('/packages/x', 'pt')).toBe('/paquetes/x');
  });
});

describe('resolveLocaleFromPublicPath — canonicalPathname', () => {
  const settings = {
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'en-US'],
  };

  it('canonicalizes English category segment to Spanish for internal rewrite', () => {
    const result = resolveLocaleFromPublicPath('/en/packages/cartagena', settings);
    expect(result.hasLanguageSegment).toBe(true);
    expect(result.languageSegment).toBe('en');
    expect(result.pathnameWithoutLang).toBe('/packages/cartagena');
    expect(result.canonicalPathname).toBe('/paquetes/cartagena');
    expect(result.resolvedLocale).toBe('en-US');
  });

  it('leaves Spanish path unchanged in canonicalPathname', () => {
    const result = resolveLocaleFromPublicPath('/paquetes/cartagena', settings);
    expect(result.hasLanguageSegment).toBe(false);
    expect(result.pathnameWithoutLang).toBe('/paquetes/cartagena');
    expect(result.canonicalPathname).toBe('/paquetes/cartagena');
  });

  it('handles all five category EN segments', () => {
    const cases: Array<[string, string]> = [
      ['/en/packages/x', '/paquetes/x'],
      ['/en/hotels/x', '/hoteles/x'],
      ['/en/activities/x', '/actividades/x'],
      ['/en/transfers/x', '/traslados/x'],
      ['/en/destinations/x', '/destinos/x'],
    ];
    for (const [input, canonical] of cases) {
      const result = resolveLocaleFromPublicPath(input, settings);
      expect(result.canonicalPathname).toBe(canonical);
    }
  });

  it('does not canonicalize non-category paths', () => {
    const result = resolveLocaleFromPublicPath('/en/blog/post-1', settings);
    expect(result.pathnameWithoutLang).toBe('/blog/post-1');
    expect(result.canonicalPathname).toBe('/blog/post-1');
  });
});

describe('generateHreflangLinksForLocales — segment localization', () => {
  const baseUrl = 'https://example.com';
  const options = {
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'en-US'],
  };

  it('emits localized segment for en-US alternate when source is Spanish', () => {
    const links = generateHreflangLinksForLocales(baseUrl, '/paquetes/cartagena', options);
    const map = Object.fromEntries(links.map((l) => [l.hreflang, l.href]));
    expect(map['es-CO']).toBe('https://example.com/paquetes/cartagena');
    expect(map['en-US']).toBe('https://example.com/en/packages/cartagena');
    expect(map['x-default']).toBe('https://example.com/paquetes/cartagena');
  });

  it('emits Spanish segment for es-CO alternate when source is English', () => {
    const links = generateHreflangLinksForLocales(baseUrl, '/packages/cartagena', options);
    const map = Object.fromEntries(links.map((l) => [l.hreflang, l.href]));
    expect(map['es-CO']).toBe('https://example.com/paquetes/cartagena');
    expect(map['en-US']).toBe('https://example.com/en/packages/cartagena');
  });

  it('handles all five category pairs symmetrically', () => {
    const cases: Array<[string, string, string]> = [
      ['/paquetes/x', '/paquetes/x', '/en/packages/x'],
      ['/hoteles/x', '/hoteles/x', '/en/hotels/x'],
      ['/actividades/x', '/actividades/x', '/en/activities/x'],
      ['/traslados/x', '/traslados/x', '/en/transfers/x'],
      ['/destinos/x', '/destinos/x', '/en/destinations/x'],
    ];
    for (const [source, expectedEs, expectedEn] of cases) {
      const links = generateHreflangLinksForLocales(baseUrl, source, options);
      const map = Object.fromEntries(links.map((l) => [l.hreflang, l.href]));
      expect(map['es-CO']).toBe(`${baseUrl}${expectedEs}`);
      expect(map['en-US']).toBe(`${baseUrl}${expectedEn}`);
    }
  });
});
