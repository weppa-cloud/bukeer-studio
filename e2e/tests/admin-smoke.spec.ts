import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.describe('Admin surfaces — smoke @p0-auth', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('analytics route loads without 500', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/analytics`);
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(page).toHaveURL(/\/analytics/, { timeout: 15000 });
  });

  test('ops/reconciliation route returns 200 or 404 (never 500)', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/ops/reconciliation`);
    const status = response?.status() ?? 0;
    expect([200, 404]).toContain(status);
  });

  test('contenido route loads', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/contenido`);
    expect(response?.status() ?? 0).toBeLessThan(500);
  });

  test('settings route loads', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const response = await page.goto(`/dashboard/${websiteId}/settings`);
    expect(response?.status() ?? 0).toBeLessThan(500);
  });
});
