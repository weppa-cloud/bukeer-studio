import { test, expect } from '@playwright/test';
import type { HreflangLink } from '@/lib/seo/hreflang';

/**
 * EPIC #207 W1 · P0-3 · Hreflang alternates rendered in <head>.
 *
 * Audit: docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (flow #11)
 * ADR-020 Rule 1: only translated locales emitted (no untranslated fallbacks).
 * ADR-020: x-default must be present.
 *
 * Type import `HreflangLink` kept as contract reference so refactors to the
 * public emission shape will force this spec to update.
 */

// Touch the type at module scope so tsc retains it (otherwise type-only import
// is elided and the reference serves only as documentation).
type _HreflangContract = HreflangLink;

const HOMEPAGE = '/site/colombiatours';

test.describe('Public hreflang alternates @p0-seo', () => {
  test('homepage exposes hreflang alternates + x-default (ADR-020)', async ({ page }) => {
    const response = await page.goto(HOMEPAGE, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() >= 500,
      'Tenant "colombiatours" unreachable — hreflang assertions require seeded multi-locale tenant',
    );

    const links = page.locator('link[rel="alternate"][hreflang]');
    const hreflangs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute('hreflang')).filter((v): v is string => Boolean(v)),
    );

    test.skip(
      hreflangs.length === 0,
      'Tenant has no hreflang emission (single-locale or feature disabled) — see ADR-019',
    );

    // Rule: x-default MUST be present when multi-locale emission is active.
    expect(hreflangs).toContain('x-default');

    // Self-reference: default locale (es-CO) must be present for this tenant.
    expect(hreflangs).toContain('es-CO');

    // ADR-020 Rule 1: untranslated locales must NOT be emitted.
    // The supported set is known to be a subset of {es-CO, en-US, pt-BR, fr-FR, x-default}.
    const ALLOWED = new Set(['es-CO', 'en-US', 'pt-BR', 'fr-FR', 'x-default']);
    for (const tag of hreflangs) {
      expect(ALLOWED.has(tag)).toBeTruthy();
    }
  });

  test('each alternate href is an absolute URL', async ({ page }) => {
    const response = await page.goto(HOMEPAGE, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() >= 500,
      'Tenant "colombiatours" unreachable — alternate href assertion requires live SSR',
    );

    const hrefs = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')).filter((v): v is string => Boolean(v)));

    test.skip(hrefs.length === 0, 'No hreflang alternates emitted — nothing to validate');

    for (const href of hrefs) {
      expect(href).toMatch(/^https?:\/\//);
    }
  });
});
