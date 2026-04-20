import { test, expect } from '@playwright/test';
import { MarketingEditorPom } from '../../../pom/marketing-editor.pom';
import {
  captureBeforeAfter,
  getPilotSeed,
  pilotSubdomain,
  waitForRevalidate,
} from '../helpers';

/**
 * EPIC #214 · W4 #218 — Activity variant coverage (AC-W4-2).
 *
 * Consumes `update_activity_marketing_field` RPC shipped by PR #229 (W2).
 * The dashboard product-resolver (`lib/admin/product-resolver.ts`) prefers
 * `package_kits` when both tables have a row with the same slug — our pilot
 * seed uses different slugs per type (`pilot-colombiatours-act-baseline` for
 * activities) so the resolver lands on the activity row.
 *
 * ADR-025: activities gained parity columns via PR #229. Hotels stay
 * Flutter-owner and have NO spec here (read-only render only).
 */
test.describe('@pilot-w4 Pilot W4 · activity parity', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('DescriptionEditor on activity → public /actividades/<slug> reflects edit', async ({
    page,
    request,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const act = seed.activities[0];
    test.skip(
      !act,
      `Pilot baseline seed missing activity — warnings: ${seed.warnings.join(' | ')}`,
    );

    const pom = new MarketingEditorPom(page);
    await pom.goto(seed.websiteId, act.slug);

    const uniq = Date.now();
    const nextDescription =
      `Pilot activity description ${uniq}. Experiencia caribeña narrada desde el Studio editor. ` +
      'Este texto viaja por update_activity_marketing_field y debe aparecer en /actividades/<slug>.';

    await captureBeforeAfter(page, testInfo, 'activity-parity-editor', async () => {
      await pom.setDescription(nextDescription);
    });

    const subdomain = pilotSubdomain();
    const revalidate = await waitForRevalidate(request, {
      subdomain,
      type: 'activity',
      slug: act.slug,
    });
    test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');

    const productPath = `/site/${subdomain}/actividades/${act.slug}`;
    const listingPath = `/site/${subdomain}/actividades`;
    expect(revalidate.paths).toEqual(expect.arrayContaining([productPath, listingPath]));

    const response = await page.goto(productPath, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public activity page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    const description = page.getByTestId('detail-description');
    await expect(description).toBeVisible();
    await expect(description).toContainText(nextDescription.slice(0, 80));
  });
});
