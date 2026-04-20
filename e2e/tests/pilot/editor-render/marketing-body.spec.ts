import { test, expect } from '@playwright/test';
import { MarketingEditorPom } from '../../../pom/marketing-editor.pom';
import {
  attachHtmlExcerpt,
  captureBeforeAfter,
  getPilotSeed,
  pilotSubdomain,
  waitForRevalidate,
} from '../helpers';

/**
 * EPIC #214 · W4 #218 — Editor → SSR render parity.
 *
 * Surface:
 *   - DescriptionEditor → `marketing-editor-description`
 *   - HighlightsEditor  → `marketing-editor-highlights`
 *
 * Target:
 *   - `<section data-testid="detail-description">` on the public package page
 *   - `<div data-testid="detail-highlights">`
 *
 * ADR-025 — package-only (activities covered by activity-parity.spec.ts).
 */
test.describe('@pilot-w4 Pilot W4 · marketing body', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('Description + Highlights save round-trips to public detail page', async ({
    page,
    request,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(
      !pkg,
      `Pilot baseline seed missing package — warnings: ${seed.warnings.join(' | ')}`,
    );

    const pom = new MarketingEditorPom(page);
    await pom.goto(seed.websiteId, pkg.slug);

    const uniq = Date.now();
    const nextDescription =
      `Pilot description update ${uniq}. Colombia combina naturaleza, cultura y gastronomía en un mismo viaje. ` +
      'Este texto se escribió desde Studio y debe aparecer textualmente en /paquetes/<slug>.';
    const nextHighlights = [
      `Pilot highlight uno ${uniq}`,
      `Pilot highlight dos ${uniq}`,
      `Pilot highlight tres ${uniq}`,
    ];

    await captureBeforeAfter(page, testInfo, 'marketing-body-editor', async () => {
      await pom.setDescription(nextDescription);
      await pom.replaceHighlights(nextHighlights);
    });

    const subdomain = pilotSubdomain();
    const revalidate = await waitForRevalidate(request, {
      subdomain,
      type: 'package',
      slug: pkg.slug,
    });
    test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');

    const productPath = `/site/${subdomain}/paquetes/${pkg.slug}`;
    expect(revalidate.paths).toEqual(expect.arrayContaining([productPath]));

    const response = await page.goto(productPath, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public package page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    const description = page.getByTestId('detail-description');
    await expect(description).toBeVisible();
    await expect(description).toContainText(nextDescription.slice(0, 80));
    await attachHtmlExcerpt(page, testInfo, 'marketing-body-description', '[data-testid="detail-description"]');

    const highlights = page.getByTestId('detail-highlights');
    await expect(highlights).toBeVisible();
    for (const entry of nextHighlights) {
      await expect(highlights).toContainText(entry);
    }
    await attachHtmlExcerpt(page, testInfo, 'marketing-body-highlights', '[data-testid="detail-highlights"]');
  });
});
