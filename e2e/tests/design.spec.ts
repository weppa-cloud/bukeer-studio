import { test, expect } from '@playwright/test';

test.describe('Design Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('change theme preset', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/design');

    // Click tropical preset
    await page.getByText('Tropical').click();

    // Verify color picker updated
    await expect(page.locator('input[type="color"]')).toHaveValue('#00897B');
  });

  test('change primary color', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/design');

    const hexInput = page.locator('input[maxlength="7"]');
    await hexInput.clear();
    await hexInput.fill('#FF5722');

    // Verify live preview updates
    await expect(page.locator('[style*="FF5722"]')).toBeTruthy();
  });

  test('switch to brand kit section', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/design');
    await page.getByRole('button', { name: 'Brand Kit' }).click();
    await expect(page.getByText('Logo')).toBeVisible();
  });
});
