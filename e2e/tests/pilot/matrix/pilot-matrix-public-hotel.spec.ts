import { test, expect } from '@playwright/test';
import { applicableRows } from '../../../fixtures/product-matrix';
import {
  assertMatrixRow,
  assertVisualSnapshot,
  freezeAnimations,
  waitForDetailReady,
  type MatrixRowOutcome,
} from '../../../setup/matrix-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W6 #220 — Matrix visual E2E · hotel detail (READ-ONLY render).
 *
 * Per ADR-025: hotels are Flutter-owner; Studio does NOT edit hotel marketing.
 * This spec is structural + visual evidence ONLY. No editor assertions.
 *
 * The pilot seed does not mint a hotel fixture (Flutter-owner data seeded via
 * the base `seed.ts::seedTestData` happy path — "Aloft Bogota Airport" is the
 * canonical hotel for `colombiatours`). When the hotel slug is not discoverable
 * on the test website the spec emits `test.skip()` with a seed-gap explanation.
 */
test.describe('@pilot-w6 Pilot W6 · matrix · hotel (read-only)', () => {
  // Canonical hotel slug from the seeded Colombiatours website.
  const HOTEL_SLUG = process.env.PILOT_HOTEL_SLUG ?? 'aloft-bogota-airport';

  test('matrix walk renders hotel blocks + captures visual snapshots (desktop)', async ({
    page,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/hoteles/${HOTEL_SLUG}`;

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Hotel detail page unreachable (status=${response?.status() ?? 'no-response'}). Hotels are Flutter-owner — seed gap expected if \`${HOTEL_SLUG}\` missing. Seed warnings: ${seed.warnings.join(' | ')}`,
    );

    await waitForDetailReady(page, 'hotel');
    await freezeAnimations(page);

    const outcomes: MatrixRowOutcome[] = [];
    for (const row of applicableRows('hotel')) {
      outcomes.push(await assertMatrixRow({ page, row, type: 'hotel' }));
    }

    await assertVisualSnapshot({
      page,
      testInfo,
      route,
      contentType: 'hotel',
      viewport: 'desktop',
    });

    await testInfo.attach('matrix-hotel-outcomes.json', {
      body: JSON.stringify({ route, readOnly: true, outcomes }, null, 2),
      contentType: 'application/json',
    });

    const failures = outcomes.filter((o) => o.status === 'fail');
    expect(
      failures,
      `Hotel matrix failures (read-only): ${failures.map((f) => f.reason).join(' | ')}`,
    ).toHaveLength(0);
  });

  test('matrix walk on mobile viewport (read-only)', async ({ browser }, testInfo) => {
    await getPilotSeed('baseline');
    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/hoteles/${HOTEL_SLUG}`;

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      test.skip(
        !response || response.status() === 404 || response.status() >= 500,
        `Hotel detail page unreachable on mobile (status=${response?.status() ?? 'no-response'}).`,
      );

      await waitForDetailReady(page, 'hotel');
      await freezeAnimations(page);
      const outcomes: MatrixRowOutcome[] = [];
      for (const row of applicableRows('hotel').filter((r) => r.viewports.includes('mobile'))) {
        outcomes.push(await assertMatrixRow({ page, row, type: 'hotel' }));
      }

      await assertVisualSnapshot({
        page,
        testInfo,
        route,
        contentType: 'hotel',
        viewport: 'mobile',
      });

      await testInfo.attach('matrix-hotel-mobile-outcomes.json', {
        body: JSON.stringify({ route, readOnly: true, outcomes }, null, 2),
        contentType: 'application/json',
      });

      const failures = outcomes.filter((o) => o.status === 'fail');
      expect(
        failures,
        `Mobile hotel matrix failures: ${failures.map((f) => f.reason).join(' | ')}`,
      ).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
});
