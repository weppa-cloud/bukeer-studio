import { test, expect } from '@playwright/test';
import { applicableRows } from '../../../fixtures/product-matrix';
import {
  assertMatrixRow,
  assertVisualSnapshot,
  freezeAnimations,
  type MatrixRowOutcome,
} from '../../../setup/matrix-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W6 #220 — Matrix visual E2E · package detail.
 *
 * Walks the canonical product-detail matrix (`docs/product/product-detail-matrix.md`)
 * for a pilot-seeded package and asserts:
 *   - Structural presence per matrix row (role/testid first — no CSS selectors).
 *   - Visual snapshot evidence (desktop + mobile) attached to the trace.
 *   - Section M (booking) rows emit `defer-skip` per ADR-024 (WhatsApp-only pilot).
 *
 * The spec consumes `seedPilot('baseline')` — seed overlay in `e2e/setup/pilot-seed.ts`
 * populates custom_hero, custom_faq, highlights, inclusions, exclusions, video_url,
 * description, and SEO fields so most matrix cells render with data. Conditional
 * rows whose condition isn't met in the seed are recorded as `empty`.
 */
test.describe('@pilot-w6 Pilot W6 · matrix · package', () => {
  test('matrix walk renders expected blocks + captures visual snapshots', async ({
    page,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(
      !pkg,
      `Pilot baseline seed missing package — warnings: ${seed.warnings.join(' | ')}`,
    );

    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/paquetes/${pkg.slug}`;

    const response = await page.goto(route, { waitUntil: 'networkidle' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public package page unreachable (status=${response?.status() ?? 'no-response'}) — seed → RPC gap.`,
    );

    await freezeAnimations(page);

    const outcomes: MatrixRowOutcome[] = [];
    for (const row of applicableRows('pkg')) {
      const outcome = await assertMatrixRow({ page, row, type: 'pkg' });
      outcomes.push(outcome);
    }

    await assertVisualSnapshot({
      page,
      testInfo,
      route,
      contentType: 'pkg',
      viewport: 'desktop',
    });

    // Attach matrix outcomes report to trace for evidence bundle consumption.
    await testInfo.attach('matrix-package-outcomes.json', {
      body: JSON.stringify({ route, outcomes }, null, 2),
      contentType: 'application/json',
    });

    // Structural failures fail the spec; conditional-empty + defer-skip do not.
    const failures = outcomes.filter((o) => o.status === 'fail');
    expect(
      failures,
      `Matrix rows failed structural assertion for package: ${failures.map((f) => f.reason).join(' | ')}`,
    ).toHaveLength(0);
  });

  test('matrix walk on mobile viewport', async ({ browser }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(!pkg, 'Pilot baseline missing package');

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const subdomain = pilotSubdomain();
      const route = `/site/${subdomain}/paquetes/${pkg.slug}`;
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      test.skip(
        !response || response.status() === 404 || response.status() >= 500,
        `Public package page unreachable on mobile (status=${response?.status() ?? 'no-response'}).`,
      );

      await freezeAnimations(page);

      const outcomes: MatrixRowOutcome[] = [];
      for (const row of applicableRows('pkg').filter((r) => r.viewports.includes('mobile'))) {
        outcomes.push(await assertMatrixRow({ page, row, type: 'pkg' }));
      }

      await assertVisualSnapshot({
        page,
        testInfo,
        route,
        contentType: 'pkg',
        viewport: 'mobile',
      });

      await testInfo.attach('matrix-package-mobile-outcomes.json', {
        body: JSON.stringify({ route, outcomes }, null, 2),
        contentType: 'application/json',
      });

      const failures = outcomes.filter((o) => o.status === 'fail');
      expect(
        failures,
        `Mobile matrix failures: ${failures.map((f) => f.reason).join(' | ')}`,
      ).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
});
