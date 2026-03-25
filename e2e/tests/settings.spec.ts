import { test, expect } from '@playwright/test';

test.describe('Settings Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows subdomain editor', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/settings');
    await expect(page.getByText('Subdomain')).toBeVisible();
    await expect(page.getByText('.bukeer.com')).toBeVisible();
  });

  test('domain wizard step-by-step', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/settings');
    await page.getByRole('button', { name: /domain/i }).click();

    await page.getByPlaceholder('www.myagency.com').fill('test.example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('CNAME')).toBeVisible();
    await expect(page.getByText('cname.bukeer.com')).toBeVisible();
  });

  test('danger zone requires confirmation', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/settings');

    await page.getByRole('button', { name: /delete/i }).last().click();
    await expect(page.getByText('Type')).toBeVisible();
  });
});
