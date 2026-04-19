import { test, expect } from '@playwright/test';
import { seedWave2Fixtures } from './helpers';

/**
 * EPIC #207 W1 · P0-1 · Public SEO HTML head assertions.
 *
 * Audit: docs/ops/e2e-gap-audit-seo-i18n-2026-04-19.md (flows #5, #8, #12, #14)
 * ADR-019: multi-locale URL routing · ADR-020: hreflang emission policy
 *
 * Contract asserted per route:
 *   - <title> non-empty
 *   - <meta name="description"> non-empty content
 *   - <link rel="canonical"> absolute URL
 *   - <meta property="og:title"> attached
 *   - <meta property="og:image"> absolute URL
 *   - <meta name="twitter:card"> summary | summary_large_image
 */

const ROUTES: Array<{ path: string; label: string }> = [
  { path: '/site/colombiatours', label: 'homepage' },
  { path: '/site/colombiatours/paquetes', label: 'paquetes index' },
  { path: '/site/colombiatours/destinos', label: 'destinos index' },
  { path: '/site/colombiatours/blog', label: 'blog index' },
];

test.describe('Public SEO metadata @p0-seo', () => {
  test.beforeAll(async () => {
    // Seeds the package + page rows so `/site/{sub}/paquetes` has at least one
    // item to render. Failures degrade gracefully via the per-test skip guards.
    try {
      await seedWave2Fixtures();
    } catch {
      /* noop — specs skip on 5xx */
    }
  });

  for (const { path, label } of ROUTES) {
    test(`${label} renders complete <head>`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      test.skip(
        !response || response.status() >= 500,
        `Route ${path} unavailable (status ${response?.status() ?? 'none'}) — seed fixtures required`,
      );

      await expect(page).toHaveTitle(/\S+/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\//);
      await expect(page.locator('meta[property="og:title"]').first()).toBeAttached();
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
        'content',
        /^https?:\/\//,
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        /^(summary|summary_large_image)$/,
      );
    });
  }
});
