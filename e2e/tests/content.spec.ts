import { test, expect } from '@playwright/test';

test.describe('Content & SEO Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('edit site name and tagline', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/content');

    const nameInput = page.locator('input').first();
    await nameInput.clear();
    await nameInput.fill('Updated Agency Name');

    // Auto-save should trigger
    await page.waitForTimeout(3000);
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test('SEO Google preview updates', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/content');
    await page.getByRole('button', { name: 'SEO & Scripts' }).click();

    const titleInput = page.locator('input[maxlength="70"]');
    await titleInput.clear();
    await titleInput.fill('Best Travel Agency');

    await expect(page.getByText('Best Travel Agency')).toBeVisible();
  });
});
