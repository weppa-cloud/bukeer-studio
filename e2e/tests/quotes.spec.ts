import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Leads Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows leads table', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    await expect(page.getByRole('heading', { name: 'Leads & Quotes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });

  test('filter by status', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    const newTab = page.locator('.studio-tabs').getByRole('button', { name: 'New', exact: true });
    await newTab.click();
    await expect(newTab).toHaveClass(/studio-tab-active/);
  });

  test('export CSV', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/leads-.*\.csv$/);
  });
});
