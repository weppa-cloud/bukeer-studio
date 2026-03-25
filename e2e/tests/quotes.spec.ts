import { test, expect } from '@playwright/test';

test.describe('Leads Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows leads table', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/quotes');
    await expect(page.getByText('Leads & Quotes')).toBeVisible();
  });

  test('filter by status', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/quotes');
    await page.getByRole('button', { name: 'new' }).click();
    await expect(page.getByRole('button', { name: 'new' })).toHaveClass(/bg-blue/);
  });

  test('export CSV', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/quotes');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/leads-.*\.csv$/);
  });
});
