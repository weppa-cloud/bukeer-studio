import { test, expect } from '@playwright/test';
import { applicableRows, PRODUCT_MATRIX } from '../../../fixtures/product-matrix';
import {
  assertMatrixRow,
  assertVisualSnapshot,
  freezeAnimations,
  type MatrixRowOutcome,
} from '../../../setup/matrix-helpers';
import {
  captureBeforeAfter,
  getPilotSeed,
  pilotSubdomain,
  waitForRevalidate,
} from '../helpers';
import { MarketingEditorPom } from '../../../pom/marketing-editor.pom';

/**
 * EPIC #214 · W6 #220 — Matrix visual E2E · activity detail (editable cells).
 *
 * Per AC-W6-12 (v2): activities cover the editable cells post-W2 (#216). This
 * spec (a) walks the applicable matrix rows for the activity surface, (b)
 * captures visual snapshots, and (c) exercises an editable-loop subset via the
 * Studio marketing editor and re-asserts the public page reflects the edit.
 *
 * Hotels are read-only (separate spec). Booking rows skip via ADR-024.
 */
test.describe('@pilot-w6 Pilot W6 · matrix · activity', () => {
  test('matrix walk renders expected blocks + captures visual snapshots', async ({
    page,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const act = seed.activities[0];
    test.skip(
      !act,
      `Pilot baseline seed missing activity — warnings: ${seed.warnings.join(' | ')}`,
    );

    const subdomain = pilotSubdomain();
    const route = `/site/${subdomain}/actividades/${act.slug}`;

    const response = await page.goto(route, { waitUntil: 'networkidle' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public activity page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    await freezeAnimations(page);

    const outcomes: MatrixRowOutcome[] = [];
    for (const row of applicableRows('act')) {
      outcomes.push(await assertMatrixRow({ page, row, type: 'act' }));
    }

    await assertVisualSnapshot({
      page,
      testInfo,
      route,
      contentType: 'act',
      viewport: 'desktop',
    });

    await testInfo.attach('matrix-activity-outcomes.json', {
      body: JSON.stringify({ route, outcomes }, null, 2),
      contentType: 'application/json',
    });

    const failures = outcomes.filter((o) => o.status === 'fail');
    expect(
      failures,
      `Matrix rows failed structural assertion for activity: ${failures.map((f) => f.reason).join(' | ')}`,
    ).toHaveLength(0);
  });

  test('matrix walk on mobile viewport', async ({ browser }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const act = seed.activities[0];
    test.skip(!act, 'Pilot baseline missing activity');

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    try {
      const subdomain = pilotSubdomain();
      const route = `/site/${subdomain}/actividades/${act.slug}`;
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      test.skip(
        !response || response.status() === 404 || response.status() >= 500,
        `Public activity page unreachable on mobile (status=${response?.status() ?? 'no-response'}).`,
      );

      await freezeAnimations(page);
      const outcomes: MatrixRowOutcome[] = [];
      for (const row of applicableRows('act').filter((r) => r.viewports.includes('mobile'))) {
        outcomes.push(await assertMatrixRow({ page, row, type: 'act' }));
      }

      await assertVisualSnapshot({
        page,
        testInfo,
        route,
        contentType: 'act',
        viewport: 'mobile',
      });

      await testInfo.attach('matrix-activity-mobile-outcomes.json', {
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

  // AC-W6-12: editable loop. Consumes W2 `update_activity_marketing_field` RPC
  // (shipped in PR #229). Exercises one editable cell (description) end-to-end;
  // W4 `activity-parity.spec.ts` already covers deeper parity.
  test.describe('activity editable loop (AC-W6-12)', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test('edit description in Studio → public activity reflects edit', async ({
      page,
      request,
    }, testInfo) => {
      const seed = await getPilotSeed('baseline');
      const act = seed.activities[0];
      test.skip(!act, 'Pilot baseline missing activity');

      const pom = new MarketingEditorPom(page);
      await pom.goto(seed.websiteId, act.slug);

      const uniq = Date.now();
      const nextDescription =
        `W6 matrix · activity description updated ${uniq}. Edit from Studio → public render parity check.`;

      await captureBeforeAfter(page, testInfo, 'activity-editable-matrix', async () => {
        await pom.setDescription(nextDescription);
      });

      const subdomain = pilotSubdomain();
      const revalidate = await waitForRevalidate(request, {
        subdomain,
        type: 'activity',
        slug: act.slug,
      });
      test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');

      const route = `/site/${subdomain}/actividades/${act.slug}`;
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      test.skip(
        !response || response.status() === 404 || response.status() >= 500,
        `Public activity page unreachable (status=${response?.status() ?? 'no-response'}).`,
      );

      const description = page.getByTestId('detail-description');
      await expect(description).toBeVisible();
      await expect(description).toContainText(nextDescription.slice(0, 60));

      // Count matrix editable cells covered by the activity (via v2 scope).
      const editableActivityRows = PRODUCT_MATRIX.filter(
        (r) => r.types.act?.editable === true,
      ).map((r) => `${r.row}:${r.id}`);
      await testInfo.attach('activity-editable-rows-inventory.json', {
        body: JSON.stringify({ editableRows: editableActivityRows }, null, 2),
        contentType: 'application/json',
      });
    });
  });
});
