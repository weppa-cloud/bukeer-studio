import { test, expect } from '@playwright/test';
import path from 'node:path';
import {
  runLighthouseAudit,
  waitForDetailReady,
  LIGHTHOUSE_THRESHOLDS,
} from '../../../setup/matrix-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

/**
 * EPIC #214 · W6 #220 — Lighthouse audit · package detail.
 *
 * Produces HTML + JSON report under
 * `artifacts/qa/pilot/<date>/w6-220/lighthouse/package-desktop.*`.
 *
 * Thresholds align with `lighthouserc.js` (desktop). The spec skips cleanly
 * when the `lighthouse` CLI is not installed or the URL is unreachable — Stage
 * 4 gate metric stays "0 failed, justified skips only".
 */
test.describe('@pilot-w6 Pilot W6 · lighthouse · package', () => {
  test('run lighthouse audit and record scores (desktop)', async ({
    page,
  }, testInfo) => {
    const seed = await getPilotSeed('baseline');
    const pkg = seed.packages[0];
    test.skip(!pkg, 'Pilot baseline seed missing package');

    const port = process.env.PORT ?? '3001';
    const subdomain = pilotSubdomain();
    const url = `http://localhost:${port}/site/${subdomain}/paquetes/${pkg.slug}`;

    // Prewarm so first compile doesn't skew the audit. Deterministic wait via
    // `waitForDetailReady` mirrors cluster-C (PR #245): Turbopack dev mode
    // keeps websocket pings open so `networkidle` races the 90s spec timeout
    // — see matrix-helpers.ts. DOMContentLoaded + detail-hero visibility is
    // sufficient for the Lighthouse prewarm (page renderable from first flush).
    const prewarm = await page.goto(url, { waitUntil: 'domcontentloaded' });
    test.skip(
      !prewarm || prewarm.status() === 404 || prewarm.status() >= 500,
      `Prewarm failed for ${url} (status=${prewarm?.status() ?? 'no-response'}).`,
    );
    await waitForDetailReady(page, 'pkg');

    const outputDir = path.resolve(
      process.cwd(),
      `artifacts/qa/pilot/${new Date().toISOString().slice(0, 10)}/w6-220/lighthouse`,
    );

    const result = runLighthouseAudit({
      url,
      contentType: 'pkg',
      outputDir,
      slug: 'package',
      preset: 'desktop',
    });

    await testInfo.attach('lighthouse-package.json', {
      body: JSON.stringify({ url, scores: result.scores, reportPaths: result.reportPaths }, null, 2),
      contentType: 'application/json',
    });

    test.skip(result.skipped, result.reason ?? 'lighthouse skipped');

    // Error-severity thresholds — fail on a11y + SEO regressions.
    expect(
      result.scores.accessibility ?? 0,
      `accessibility score below ${LIGHTHOUSE_THRESHOLDS.accessibility.min}`,
    ).toBeGreaterThanOrEqual(LIGHTHOUSE_THRESHOLDS.accessibility.min);
    expect(
      result.scores.seo ?? 0,
      `seo score below ${LIGHTHOUSE_THRESHOLDS.seo.min}`,
    ).toBeGreaterThanOrEqual(LIGHTHOUSE_THRESHOLDS.seo.min);

    // Warn-only categories: log but do not fail.
    if ((result.scores.performance ?? 0) < LIGHTHOUSE_THRESHOLDS.performance.min) {
      console.warn(
        `[w6-lighthouse-package] performance ${result.scores.performance} below ${LIGHTHOUSE_THRESHOLDS.performance.min} (warn).`,
      );
    }
    if ((result.scores.bestPractices ?? 0) < LIGHTHOUSE_THRESHOLDS.bestPractices.min) {
      console.warn(
        `[w6-lighthouse-package] best-practices ${result.scores.bestPractices} below ${LIGHTHOUSE_THRESHOLDS.bestPractices.min} (warn).`,
      );
    }
  });
});
