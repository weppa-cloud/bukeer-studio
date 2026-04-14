import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Design Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('change theme preset', async ({ page }) => {
    await gotoWebsiteSection(page, 'design');
    await expect(page.getByRole('heading', { name: 'Design & Brand' })).toBeVisible();

    await page.getByRole('button', { name: /^Tropical$/ }).click();

    await expect(page.locator('input[type="color"]')).toHaveValue('#00897b');
  });

  test('change primary color', async ({ page }) => {
    await gotoWebsiteSection(page, 'design');

    const hexInput = page.locator('input[maxlength="7"]');
    await hexInput.clear();
    await hexInput.fill('#ff5722');

    await expect(page.locator('input[type="color"]')).toHaveValue('#ff5722');
  });

  test('switch to brand kit section', async ({ page }) => {
    await gotoWebsiteSection(page, 'design');
    await page.getByRole('button', { name: 'Brand Kit' }).click();
    await expect(page.getByRole('heading', { name: 'Logo' })).toBeVisible();
  });
});
