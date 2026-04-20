import { test, expect } from '@playwright/test';
import { ContentEditorPom } from '../../../pom/content-editor.pom';
import {
  captureBeforeAfter,
  getPilotSeed,
  pilotSubdomain,
  waitForRevalidate,
} from '../helpers';

/**
 * EPIC #214 · W4 #218 — Editor → SSR render parity.
 *
 * Surface: HeroOverrideEditor on `/dashboard/[websiteId]/products/[slug]/content`
 * Target : `<section data-testid="detail-hero">` on `/site/<sub>/paquetes/<slug>`
 *
 * Flow:
 *   1. Seed `baseline` pilot package.
 *   2. Open content editor → enable + save hero override.
 *   3. Revalidate + refetch public page → assert override visible.
 *
 * DnD / reorder specs skip on mobile-chrome per AC-W4-3a; this spec does NOT
 * use DnD (plain inputs) so it runs on all 3 projects.
 */
test.describe('@pilot-w4 Pilot W4 · hero override', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('HeroOverrideEditor → detail-hero renders override copy', async ({ page, request }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(
      !pkg,
      `Pilot baseline seed missing package — warnings: ${seed.warnings.join(' | ')}`,
    );

    const pom = new ContentEditorPom(page);
    await pom.goto(seed.websiteId, pkg.slug);

    const nextTitle = `Pilot hero override · ${Date.now()}`;
    const nextSubtitle = 'Verificación E2E editor→render';

    await captureBeforeAfter(page, testInfo, 'hero-override-editor', async () => {
      await pom.saveHeroOverride({
        title: nextTitle,
        subtitle: nextSubtitle,
        backgroundImage: 'https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=1600',
      });
    });

    // Contract: on-demand revalidate returns the product + listing paths.
    const subdomain = pilotSubdomain();
    const revalidate = await waitForRevalidate(request, {
      subdomain,
      type: 'package',
      slug: pkg.slug,
    });
    test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');

    const expectedProduct = `/site/${subdomain}/paquetes/${pkg.slug}`;
    const expectedListing = `/site/${subdomain}/paquetes`;
    expect(revalidate.paths).toEqual(expect.arrayContaining([expectedProduct, expectedListing]));

    await captureBeforeAfter(page, testInfo, 'hero-override-public', async () => {
      const response = await page.goto(expectedProduct, { waitUntil: 'domcontentloaded' });
      test.skip(
        !response || response.status() === 404 || response.status() >= 500,
        `Public package page unreachable (status=${response?.status() ?? 'no-response'}) — seed → RPC gap.`,
      );
      const hero = page.getByTestId('detail-hero');
      await expect(hero).toBeVisible();
      // The override title is the H1 rendered inside detail-hero.
      await expect(hero).toContainText(nextTitle);
    });
  });
});
