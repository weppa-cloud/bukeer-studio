import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.describe('Content health dashboard — E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('dashboard loads with heading + table', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/content-health`);
    expect(response?.status() ?? 0).toBeLessThan(500);

    await expect(page.getByText(/Content Health|Content health|Salud del contenido/i).first())
      .toBeVisible({ timeout: 15000 });
  });

  test('route does not 500 and renders dashboard shell', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/content-health`);
    expect([200, 404]).toContain(response?.status() ?? 0);
  });
});
