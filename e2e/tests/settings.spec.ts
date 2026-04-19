import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Settings Tab @p0-settings', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows subdomain editor', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Subdomain' })).toBeVisible();
    await expect(page.getByText('.bukeer.com')).toBeVisible();
  });

  test('domain wizard step-by-step', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');
    await page.getByTestId('settings-tab-domain').click();

    const atStep2 = await page.getByTestId('domain-wizard-step-2').isVisible().catch(() => false);
    if (atStep2) {
      await page.getByTestId('domain-wizard-prev').click();
    }

    await page.getByTestId('domain-wizard-domain-input').fill('test.example.com');
    await page.getByTestId('domain-wizard-next').click();

    await expect(page.getByTestId('domain-wizard-step-1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('cname.bukeer.com', { exact: true })).toBeVisible();
  });

  test('danger zone requires confirmation', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('heading', { name: 'Delete website' })).toBeVisible();
    await expect(page.getByText('Type')).toBeVisible();
  });
});
