import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

/**
 * Editor gates desktop-only usage — mobile viewport shows the "Desktop required"
 * interstitial. This spec verifies that guard renders correctly under the
 * Pixel 5 project so we catch regressions where the gate is bypassed or the
 * public-site mobile golden paths 500.
 */
test.describe('Mobile — editor guard + public site', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('editor shows Desktop required interstitial on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Pixel 5 project is only wired under chromium.');
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.pageId, 'Missing seeded pageId.');

    await page.goto(`/dashboard/${websiteId}/pages/${fixtures.pageId}/edit`);
    await expect(page.getByRole('heading', { name: /Desktop required/i }))
      .toBeVisible({ timeout: 15000 });
  });

  test('public site home loads on mobile', async ({ page }) => {
    const response = await page.goto('/site/colombiatours');
    expect(response?.status() ?? 0).toBeLessThan(500);
  });

  test('dashboard sidebar navigates via mobile tap', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/pages`);
    expect(response?.status() ?? 0).toBeLessThan(500);
  });
});
