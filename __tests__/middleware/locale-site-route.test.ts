/**
 * Cluster-E regression — middleware locale header injection for
 * already-internal `/site/<sub>/<lang>/...` routes (handoff from PR #243,
 * Stage 6 of #213).
 *
 * Background: `middleware.ts` short-circuits when `pathname.startsWith('/site/')`
 * because the rewrite has already happened in the subdomain-first path. But
 * when E2E specs (and staging smoke tests) hit the internal URL directly
 * — `/site/colombiatours/en/paquetes/<slug>` — the pass-through skipped the
 * `x-public-locale` header injection, so SSR generateMetadata fell back to
 * the tenant default locale even though the URL contained `/en/`.
 *
 * The fix parses the locale segment from the internal pathname and applies
 * the same `applyLocaleAwareTenantRewrite` path used by the subdomain-first
 * flow. These tests cover the pure-function bits (`parseInternalSitePath`
 * + `resolveLocaleFromPublicPath`) that together determine whether the
 * middleware intervenes. The NextRequest/NextResponse wiring is exercised
 * by the pilot W5 Playwright suite (`public-render.spec.ts` +
 * `hreflang-canonical.spec.ts`).
 */

import { parseInternalSitePath } from '@/middleware';
import {
  PUBLIC_LOCALE_HEADER_NAMES,
  extractWebsiteLocaleSettings,
  resolveLocaleFromPublicPath,
} from '@/lib/seo/locale-routing';

describe('parseInternalSitePath', () => {
  it('extracts subdomain + inner pathname from /site/<sub>/<lang>/<segment>/<slug>', () => {
    const parsed = parseInternalSitePath('/site/colombiatours/en/paquetes/amazon-adventure');
    expect(parsed).toEqual({
      subdomain: 'colombiatours',
      innerPathname: '/en/paquetes/amazon-adventure',
    });
  });

  it('handles /site/<sub>/<segment>/<slug> (no locale segment)', () => {
    const parsed = parseInternalSitePath('/site/colombiatours/paquetes/amazon-adventure');
    expect(parsed).toEqual({
      subdomain: 'colombiatours',
      innerPathname: '/paquetes/amazon-adventure',
    });
  });

  it('treats root site route as a bare subdomain request', () => {
    const parsed = parseInternalSitePath('/site/colombiatours');
    expect(parsed).toEqual({
      subdomain: 'colombiatours',
      innerPathname: '/',
    });
  });

  it('lowercases the subdomain for DB lookup parity', () => {
    const parsed = parseInternalSitePath('/site/ColombiaTours/en/paquetes/x');
    expect(parsed?.subdomain).toBe('colombiatours');
  });

  it('returns null for non-/site/ paths', () => {
    expect(parseInternalSitePath('/paquetes/x')).toBeNull();
    expect(parseInternalSitePath('/domain/foo.com/paquetes/x')).toBeNull();
    expect(parseInternalSitePath('/dashboard')).toBeNull();
  });

  it('returns null when /site/ has no subdomain segment', () => {
    expect(parseInternalSitePath('/site')).toBeNull();
    expect(parseInternalSitePath('/site/')).toBeNull();
  });
});

/**
 * Integration-ish contract: the three facts the middleware relies on when
 * deciding whether to intervene on `/site/<sub>/<lang>/...`:
 *
 *   1. `hasLanguageSegment` is true only when first segment is a 2-letter
 *      language that maps to a supported locale.
 *   2. `resolvedLocale` is a real translated locale (!== defaultLocale) so
 *      we don't redundantly emit headers for the default-locale path.
 *   3. `canonicalPathname` strips the locale segment AND re-translates
 *      category segments into Spanish-canonical form, which is what
 *      `applyLocaleAwareTenantRewrite` needs for the internal rewrite.
 */
describe('locale resolution for /site/<sub>/<lang>/... (contract)', () => {
  const localeSettings = extractWebsiteLocaleSettings({
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'en-US'],
  });

  it('injects en-US locale when inner path has /en/packages/<slug>', () => {
    const internal = parseInternalSitePath(
      '/site/colombiatours/en/packages/amazon-adventure',
    );
    expect(internal).not.toBeNull();

    const resolution = resolveLocaleFromPublicPath(
      internal!.innerPathname,
      localeSettings,
    );

    expect(resolution.hasLanguageSegment).toBe(true);
    expect(resolution.resolvedLocale).toBe('en-US');
    expect(resolution.defaultLocale).toBe('es-CO');
    expect(resolution.resolvedLocale).not.toBe(resolution.defaultLocale);
    // Category segment translated back to Spanish-canonical for the
    // internal rewrite target (there is no `/packages` route file).
    expect(resolution.canonicalPathname).toBe('/paquetes/amazon-adventure');
    expect(resolution.pathnameWithoutLang).toBe('/packages/amazon-adventure');
  });

  it('injects en-US locale when inner path has /en/paquetes/<slug>', () => {
    // URL in pilot spec shape: `/site/<sub>/en/paquetes/<slug>` (Spanish
    // category segment after the locale prefix is still valid under
    // [[ADR-019]] amendment — both forms resolve to the same overlay).
    const internal = parseInternalSitePath(
      '/site/colombiatours/en/paquetes/amazon-adventure',
    );
    expect(internal).not.toBeNull();

    const resolution = resolveLocaleFromPublicPath(
      internal!.innerPathname,
      localeSettings,
    );

    expect(resolution.hasLanguageSegment).toBe(true);
    expect(resolution.resolvedLocale).toBe('en-US');
    expect(resolution.resolvedLanguage).toBe('en');
    expect(resolution.canonicalPathname).toBe('/paquetes/amazon-adventure');
  });

  it('does NOT intervene when inner path is default-locale (no /<lang>/ segment)', () => {
    const internal = parseInternalSitePath(
      '/site/colombiatours/paquetes/amazon-adventure',
    );
    const resolution = resolveLocaleFromPublicPath(
      internal!.innerPathname,
      localeSettings,
    );

    expect(resolution.hasLanguageSegment).toBe(false);
    // Middleware guard: only intervene when resolvedLocale !== defaultLocale.
    expect(resolution.resolvedLocale).toBe(resolution.defaultLocale);
    expect(resolution.resolvedLocale).toBe('es-CO');
  });

  it('does NOT intervene when leading segment is 2 letters but unsupported locale', () => {
    // Tenant only supports es-CO + en-US. A `/pt/` prefix must NOT be
    // interpreted as Portuguese — leave pass-through semantics intact.
    const internal = parseInternalSitePath(
      '/site/colombiatours/pt/paquetes/amazon-adventure',
    );
    const resolution = resolveLocaleFromPublicPath(
      internal!.innerPathname,
      localeSettings,
    );

    expect(resolution.hasLanguageSegment).toBe(false);
    expect(resolution.resolvedLocale).toBe(resolution.defaultLocale);
  });

  it('header names exported by locale-routing match what the SSR page reads', () => {
    // Sanity-check: the middleware writes the canonical keys and the SSR
    // helper `resolvePublicMetadataLocale` reads the same canonical keys.
    expect(PUBLIC_LOCALE_HEADER_NAMES.resolvedLocale).toBe('x-public-locale');
    expect(PUBLIC_LOCALE_HEADER_NAMES.defaultLocale).toBe('x-public-default-locale');
    expect(PUBLIC_LOCALE_HEADER_NAMES.lang).toBe('x-public-lang');
    expect(PUBLIC_LOCALE_HEADER_NAMES.localeSegment).toBe('x-public-locale-segment');
  });
});
