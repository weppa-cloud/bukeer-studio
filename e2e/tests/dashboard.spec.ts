import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows website list', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('My Websites')).toBeVisible();
  });

  test('create new website wizard', async ({ page }) => {
    await page.goto('/dashboard/new');

    // Step 1: Select template
    await page.getByText('Corporate').click();

    // Step 2: Name & subdomain
    await page.getByPlaceholder('My Travel Agency').fill('Test Agency');
    await expect(page.getByPlaceholder('my-agency')).toHaveValue(/test-agency/);
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3: Review
    await expect(page.getByText('Test Agency')).toBeVisible();
    await expect(page.getByText('test-agency.bukeer.com')).toBeVisible();
  });

  test('command palette opens with Cmd+K', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Meta+k');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
