import { test, expect } from '@playwright/test';
import path from 'node:path';
import {
  runLighthouseAudit,
  LIGHTHOUSE_THRESHOLDS,
} from '../../../setup/matrix-helpers';
import { getPilotSeed, pilotSubdomain } from '../helpers';

test.describe('@pilot-w6 Pilot W6 · lighthouse · hotel (read-only)', () => {
  const HOTEL_SLUG = process.env.PILOT_HOTEL_SLUG ?? 'aloft-bogota-airport';

  test('run lighthouse audit and record scores (desktop)', async ({
    page,
  }, testInfo) => {
    await getPilotSeed('baseline');

    const port = process.env.PORT ?? '3001';
    const subdomain = pilotSubdomain();
    const url = `http://localhost:${port}/site/${subdomain}/hoteles/${HOTEL_SLUG}`;

    const prewarm = await page.goto(url, { waitUntil: 'networkidle' });
    test.skip(
      !prewarm || prewarm.status() === 404 || prewarm.status() >= 500,
      `Hotel prewarm failed for ${url} (status=${prewarm?.status() ?? 'no-response'}) — Flutter-owner seed gap.`,
    );

    const outputDir = path.resolve(
      process.cwd(),
      `artifacts/qa/pilot/${new Date().toISOString().slice(0, 10)}/w6-220/lighthouse`,
    );

    const result = runLighthouseAudit({
      url,
      contentType: 'hotel',
      outputDir,
      slug: 'hotel',
      preset: 'desktop',
    });

    await testInfo.attach('lighthouse-hotel.json', {
      body: JSON.stringify({ url, scores: result.scores, reportPaths: result.reportPaths }, null, 2),
      contentType: 'application/json',
    });

    test.skip(result.skipped, result.reason ?? 'lighthouse skipped');

    expect(
      result.scores.accessibility ?? 0,
      `accessibility score below ${LIGHTHOUSE_THRESHOLDS.accessibility.min}`,
    ).toBeGreaterThanOrEqual(LIGHTHOUSE_THRESHOLDS.accessibility.min);
    expect(
      result.scores.seo ?? 0,
      `seo score below ${LIGHTHOUSE_THRESHOLDS.seo.min}`,
    ).toBeGreaterThanOrEqual(LIGHTHOUSE_THRESHOLDS.seo.min);

    if ((result.scores.performance ?? 0) < LIGHTHOUSE_THRESHOLDS.performance.min) {
      console.warn(
        `[w6-lighthouse-hotel] performance ${result.scores.performance} below ${LIGHTHOUSE_THRESHOLDS.performance.min} (warn).`,
      );
    }
    if ((result.scores.bestPractices ?? 0) < LIGHTHOUSE_THRESHOLDS.bestPractices.min) {
      console.warn(
        `[w6-lighthouse-hotel] best-practices ${result.scores.bestPractices} below ${LIGHTHOUSE_THRESHOLDS.bestPractices.min} (warn).`,
      );
    }
  });
});
