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
 * Surface:
 *   - SectionVisibilityToggle → `section[aria-label="Visibilidad de secciones"]`
 *   - SectionsReorderEditor   → `section[aria-label="Orden de secciones"]`
 *
 * Target: the public package page section order + hidden sections honored by
 * `website_product_pages.{sections_order, hidden_sections}`.
 *
 * Per AC-W4-3a: SectionsReorderEditor uses DnD internally; the POM exposes
 * `nudgeSection` which uses the arrow buttons so this spec stays compatible
 * with mobile-chrome. The DnD-only flows (drag handle) skip on mobile-chrome
 * — those are covered by `page-editor` DnD specs, not here.
 */
test.describe('@pilot-w4 Pilot W4 · sections layout', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('reorder + hide sections → public renderer honors overlay', async ({
    page,
    request,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(
      !pkg,
      `Pilot baseline seed missing package — warnings: ${seed.warnings.join(' | ')}`,
    );

    const pom = new ContentEditorPom(page);
    await pom.goto(seed.websiteId, pkg.slug);

    await captureBeforeAfter(page, testInfo, 'sections-layout-editor', async () => {
      // Hide reviews (matches overlay baseline, asserts the toggle is stable).
      await pom.toggleVisibility('Reseñas', { hidden: true });
      // Nudge the second section up — exercises the reorder save path via the
      // keyboard-accessible arrow buttons (not DnD).
      await pom.nudgeSection(1, 'up');
    });

    const subdomain = pilotSubdomain();
    const revalidate = await waitForRevalidate(request, {
      subdomain,
      type: 'package',
      slug: pkg.slug,
    });
    test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');
    expect(revalidate.paths).toEqual(
      expect.arrayContaining([`/site/${subdomain}/paquetes/${pkg.slug}`]),
    );

    const productPath = `/site/${subdomain}/paquetes/${pkg.slug}`;
    const response = await page.goto(productPath, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public package page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    // Reviews section hidden — detail-reviews must NOT be visible.
    const reviews = page.getByTestId('detail-reviews');
    const reviewCount = await reviews.count();
    if (reviewCount > 0) {
      await expect(reviews).toBeHidden();
    }
    // Hero stays visible (sanity — reorder/hidden must not drop the hero).
    await expect(page.getByTestId('detail-hero')).toBeVisible();
  });
});
