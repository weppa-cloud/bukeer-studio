import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Pages Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('create a new page', async ({ page }) => {
    await gotoWebsiteSection(page, 'pages');
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
    await page.getByRole('button', { name: /add page/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create page' })).toBeVisible();

    const title = `Contact ${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder('About Us').fill(title);
    await expect(page.getByPlaceholder('about-us')).toHaveValue(/contact-/);

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { name: 'Create page' })).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Drag to reorder' }).first()).toBeVisible();
  });

  test('page list shows drag handles on hover', async ({ page }) => {
    await gotoWebsiteSection(page, 'pages');
    await expect(page.getByRole('button', { name: 'Drag to reorder' }).first()).toBeVisible();
  });
});
