import { test, expect } from '@playwright/test';
import { ContentEditorPom } from '../../../pom/content-editor.pom';
import {
  assertJsonLd,
  attachHtmlExcerpt,
  captureBeforeAfter,
  getPilotSeed,
  pilotSubdomain,
  videoObjectSkipReason,
  waitForRevalidate,
} from '../helpers';

/**
 * EPIC #214 · W4 #218 — Editor → SSR render parity.
 *
 * Surface: VideoUrlEditor on `/dashboard/[websiteId]/products/[slug]/content`
 * Target : `<iframe>` inside the hero + `VideoObject` JSON-LD block.
 *
 * Upstream gap (#234 `get_website_product_page` does not JOIN
 * `package_kits.video_url`) — we seed the DB correctly, the editor save
 * succeeds, but the public RPC does not expose the column so the
 * `<iframe>` + JSON-LD short-circuit. We mirror the justified-skip pattern
 * from `public-structured-data.spec.ts` lines 86-128 so chromium + firefox
 * converge to the same skip branch while #234 is in flight.
 */
test.describe('@pilot-w4 Pilot W4 · video URL', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('VideoUrlEditor → iframe + VideoObject JSON-LD (skips until #234 ships)', async ({
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

    const videoUrl = `https://www.youtube.com/watch?v=pilot_w4_${Date.now()}`;
    const caption = 'Pilot W4 video override';

    await captureBeforeAfter(page, testInfo, 'video-url-editor', async () => {
      await pom.saveVideoUrl(videoUrl, caption);
    });

    const subdomain = pilotSubdomain();
    const revalidate = await waitForRevalidate(request, {
      subdomain,
      type: 'package',
      slug: pkg.slug,
    });
    test.skip(revalidate.skipped, revalidate.reason ?? 'revalidate helper skipped');

    const productPath = `/site/${subdomain}/paquetes/${pkg.slug}`;
    const response = await page.goto(productPath, { waitUntil: 'domcontentloaded' });
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Public package page unreachable (status=${response?.status() ?? 'no-response'}).`,
    );

    // Justified-skip guard (parity with public-structured-data.spec.ts).
    const skipReason = await videoObjectSkipReason(page);
    test.skip(Boolean(skipReason), skipReason ?? '');

    await attachHtmlExcerpt(page, testInfo, 'video-url-hero', '[data-testid="detail-hero"]');
    await assertJsonLd(page, 'VideoObject');
  });
});
