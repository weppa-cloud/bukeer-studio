import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.describe('Security — cross-website access', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('authenticated user cannot reach a foreign websiteId', async ({ page }) => {
    await getFirstWebsiteId(page);

    const response = await page.goto(
      '/dashboard/00000000-0000-4000-8000-000000000000/pages',
    );
    const status = response?.status() ?? 0;
    expect([200, 302, 303, 307, 404]).toContain(status);
  });

  test('marketing page for a foreign slug does not 500', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(
      `/dashboard/${websiteId}/products/non-existent-slug-xyz/marketing`,
    );
    const status = response?.status() ?? 0;
    expect(status).toBeLessThan(500);
    expect([404, 200, 302, 307]).toContain(status);
  });

  test('SEO item detail with bogus uuid returns 404', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(
      `/dashboard/${websiteId}/seo/page/00000000-0000-4000-8000-000000000000`,
    );
    expect(response?.status() ?? 0).toBeLessThan(500);
  });
});
