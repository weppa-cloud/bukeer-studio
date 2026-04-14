import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Settings Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows subdomain editor', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Subdomain' })).toBeVisible();
    await expect(page.getByText('.bukeer.com')).toBeVisible();
  });

  test('domain wizard step-by-step', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');
    await page.getByRole('button', { name: 'Domain' }).click();

    const connectedBanner = page.getByText('Domain connected');
    if (await connectedBanner.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Remove custom domain' }).click();
    }

    await page.getByPlaceholder('www.myagency.com').fill('test.example.com');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Step 1: Add CNAME record' })).toBeVisible();
    await expect(page.getByText('cname.bukeer.com', { exact: true })).toBeVisible();
  });

  test('danger zone requires confirmation', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: 'Delete website' })).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();
  });
});
