import { test, expect } from '@playwright/test';

test.describe('Blog Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('create new blog post', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/blog');
    await page.getByRole('button', { name: /new post/i }).click();

    // Should redirect to editor
    await page.waitForURL(/\/blog\/[^/]+$/);
    await expect(page.getByPlaceholder(/post title/i)).toBeVisible();
  });

  test('filter posts by status', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/blog');
    await page.getByRole('button', { name: 'draft' }).click();
    // Verify filter is active
    await expect(page.getByRole('button', { name: 'draft' })).toHaveClass(/bg-blue/);
  });

  test('toggle grid/list view', async ({ page }) => {
    await page.goto('/dashboard/e2e-test-website/blog');
    // Default is grid, switch to list
    await page.locator('button[class*="rounded"]').last().click();
    // Verify list layout
  });
});
