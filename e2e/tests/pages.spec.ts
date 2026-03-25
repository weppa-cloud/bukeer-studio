import { test, expect } from '@playwright/test';

test.describe('Pages Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('create a new page', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/pages');
    await page.getByRole('button', { name: /add page/i }).click();

    await page.getByPlaceholder('About Us').fill('Contact');
    await expect(page.getByPlaceholder('about-us')).toHaveValue('contact');

    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('Contact')).toBeVisible();
  });

  test('page list shows drag handles on hover', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/pages');
    const firstPage = page.locator('[class*="group"]').first();
    await firstPage.hover();
    await expect(firstPage.getByLabel(/drag/i)).toBeVisible();
  });
});
