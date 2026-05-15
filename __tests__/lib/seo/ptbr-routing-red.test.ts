process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';

import {
  buildPublicLocalizedPath,
  resolveLocaleFromPublicPath,
} from '@/lib/seo/locale-routing';
import { generateHreflangLinksForLocales } from '@/lib/seo/hreflang';
import {
  getBlogLocaleLookupCandidates,
  normalizeBlogPublicLocale,
} from '@/lib/supabase/get-website';

describe('PT-BR public blog routing regressions', () => {
  const settings = {
    defaultLocale: 'es-CO',
    supportedLocales: ['es-CO', 'en-US', 'de-DE', 'fr-FR', 'pt-BR'],
  };

  it('resolves canonical /pt-br blog paths as pt-BR and strips the locale segment', () => {
    const result = resolveLocaleFromPublicPath('/pt-br/blog/foo', settings);

    expect(result.hasLanguageSegment).toBe(true);
    expect(result.languageSegment).toBe('pt-br');
    expect(result.resolvedLocale).toBe('pt-BR');
    expect(result.resolvedLanguage).toBe('pt');
    expect(result.pathnameWithoutLang).toBe('/blog/foo');
    expect(result.canonicalPathname).toBe('/blog/foo');
  });

  it('keeps /pt as an inbound legacy alias only when pt-BR is supported', () => {
    const result = resolveLocaleFromPublicPath('/pt/blog/foo', settings);
    expect(result.hasLanguageSegment).toBe(true);
    expect(result.languageSegment).toBe('pt');
    expect(result.resolvedLocale).toBe('pt-BR');
    expect(result.pathnameWithoutLang).toBe('/blog/foo');

    const unsupported = resolveLocaleFromPublicPath('/pt/blog/foo', {
      defaultLocale: 'es-CO',
      supportedLocales: ['es-CO', 'en-US'],
    });
    expect(unsupported.hasLanguageSegment).toBe(false);
    expect(unsupported.resolvedLocale).toBe('es-CO');
    expect(unsupported.pathnameWithoutLang).toBe('/pt/blog/foo');
  });

  it('builds canonical PT-BR URLs with /pt-br instead of legacy /pt', () => {
    expect(buildPublicLocalizedPath('/blog/foo', 'pt-BR', 'es-CO')).toBe('/pt-br/blog/foo');
    expect(buildPublicLocalizedPath('/blog/foo', 'en-US', 'es-CO')).toBe('/en/blog/foo');
    expect(buildPublicLocalizedPath('/blog/foo', 'de-DE', 'es-CO')).toBe('/de/blog/foo');
    expect(buildPublicLocalizedPath('/blog/foo', 'fr-FR', 'es-CO')).toBe('/fr/blog/foo');
    expect(buildPublicLocalizedPath('/blog/foo', 'es-CO', 'es-CO')).toBe('/blog/foo');
  });

  it('normalizes all supported legacy blog locale codes and builds lookup candidates', () => {
    expect(normalizeBlogPublicLocale('pt')).toBe('pt-BR');
    expect(normalizeBlogPublicLocale('fr')).toBe('fr-FR');
    expect(normalizeBlogPublicLocale('de')).toBe('de-DE');
    expect(getBlogLocaleLookupCandidates('pt-BR')).toEqual(['pt-BR', 'pt']);
    expect(getBlogLocaleLookupCandidates('pt')).toEqual(['pt', 'pt-BR']);
    expect(getBlogLocaleLookupCandidates('fr-FR')).toEqual(['fr-FR', 'fr']);
    expect(getBlogLocaleLookupCandidates('de')).toEqual(['de', 'de-DE']);
  });

  it('emits complete hreflang alternates with PT-BR on /pt-br paths', () => {
    const links = generateHreflangLinksForLocales(
      'https://example.com',
      '/blog/villa-de-leyva-colombia',
      settings,
      ['en-US', 'de-DE', 'fr-FR', 'pt-BR'],
    );

    const map = Object.fromEntries(links.map((link) => [link.hreflang, link.href]));
    expect(Object.keys(map)).toEqual(['es-CO', 'en-US', 'de-DE', 'fr-FR', 'pt-BR', 'x-default']);
    expect(map['pt-BR']).toBe('https://example.com/pt-br/blog/villa-de-leyva-colombia');
    expect(map['x-default']).toBe('https://example.com/blog/villa-de-leyva-colombia');
  });
});
