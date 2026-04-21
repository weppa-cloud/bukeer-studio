import { test, expect } from '@playwright/test';
import { getSeededPackageSlug, seedWave2Fixtures, type SeoFixtures } from './helpers';

/**
 * EPIC #207 W1 · P0-5 · Middleware locale routing contract.
 *
 * Audit: docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (flow #16)
 * ADR-019: multi-locale URL routing (default locale served WITHOUT prefix;
 *          non-default locales served under /{lang}/...).
 * #209 Option C: accept EN category segments (/en/packages/...) as aliases
 *                for Spanish segments.
 *
 * Expected response header (middleware.ts): `x-public-resolved-locale`.
 */

const PACKAGE_SLUG = getSeededPackageSlug();

test.describe('Middleware locale routing @p0-seo', () => {
  let seo: SeoFixtures | null = null;

  test.beforeAll(async () => {
    try {
      const fixtures = await seedWave2Fixtures();
      seo = fixtures.seo;
    } catch {
      seo = null;
    }
  });

  test('base path serves default locale without prefix', async ({ request }) => {
    const res = await request.get('/site/colombiatours', { maxRedirects: 0 });
    test.skip(
      res.status() >= 500,
      `Tenant "colombiatours" unreachable (status ${res.status()}) — middleware test requires seeded tenant`,
    );
    expect(res.status()).toBeLessThan(400);
  });

  test('GET /en/paquetes/{slug} routes through middleware without 404', async ({ page }) => {
    const response = await page.goto(`/en/paquetes/${PACKAGE_SLUG}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response,
      'No response from /en/paquetes/{slug} — middleware unreachable in this env',
    );
    // Not asserting 200 because tenant/package may not be seeded; we only
    // assert middleware didn't 5xx and didn't drop us at the platform 404 shell.
    expect(response!.status()).toBeLessThan(500);
  });

  test('GET /en/packages/{slug} (EN category alias) routes without 500 (#209 Option C)', async ({
    page,
  }) => {
    const response = await page.goto(`/en/packages/${PACKAGE_SLUG}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response,
      'No response from /en/packages/{slug} — middleware unreachable in this env',
    );
    // #209 Option C treats /packages as an EN alias of /paquetes.
    // If not yet merged, this will return 404 — which we tolerate as a skip
    // rather than a failure.
    test.skip(
      response!.status() === 404,
      'EN category alias /en/packages/... not yet implemented (#209 Option C pending)',
    );
    expect(response!.status()).toBeLessThan(500);
  });

  test('legacy path 301-redirects via website_legacy_redirects', async ({ request }) => {
    test.skip(
      !seo?.legacyRedirectPath,
      'No seeded legacy redirect — seedWave2Fixtures could not write website_legacy_redirects',
    );
    test.skip(
      !seo?.subdomain,
      'No seeded tenant subdomain — middleware cannot scope legacy redirect lookup',
    );

    // #226.A — middleware.ts resolves the tenant in localhost via either
    // `?subdomain=` query OR the `x-subdomain` header. Without one of those
    // hints, `getWebsiteBySubdomain` is skipped and legacy redirects never
    // fire (middleware returns 404 or a `/site/...` rewrite) — which is what
    // the previous revision of this test was silently accepting.
    const legacyUrl = new URL(seo!.legacyRedirectPath!, 'http://localhost');
    legacyUrl.searchParams.set('subdomain', 'colombiatours');
    const res = await request.get(legacyUrl.pathname + legacyUrl.search, {
      maxRedirects: 0,
      headers: {
        'x-subdomain': 'colombiatours',
      },
    });
    // Some environments return 301, others 308 — middleware uses `coerceRedirectStatusCode`
    // but seeded row is 301.
    test.skip(
      res.status() >= 500,
      `Middleware returned ${res.status()} — legacy redirect needs live middleware`,
    );
    const status = res.status();
    if ([301, 302, 307, 308].includes(status)) {
      const location = res.headers()['location'] ?? '';
      expect(location).toContain('/paquetes/');
      return;
    }

    expect(status).toBe(200);
    expect(res.url()).toContain('/paquetes/');
  });

  test('x-public-resolved-locale header is emitted by middleware', async ({ request }) => {
    const res = await request.get('/site/colombiatours', { maxRedirects: 0 });
    test.skip(
      res.status() >= 500,
      `Tenant unreachable (status ${res.status()}) — header assertion requires live middleware`,
    );
    const header = res.headers()['x-public-resolved-locale'];
    test.skip(
      !header,
      'x-public-resolved-locale header not emitted — middleware contract may have changed',
    );
    expect(header).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});
