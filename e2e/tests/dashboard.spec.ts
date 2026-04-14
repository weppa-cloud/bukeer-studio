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
    await page.getByRole('button', { name: /^Corporate\b/i }).click();
    await expect(page.getByRole('heading', { name: 'Name your website' })).toBeVisible();

    // Step 2: Name & subdomain
    const name = `Test Agency ${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder('My Travel Agency').fill(name);
    await expect(page.getByPlaceholder('my-agency')).toHaveValue(/test-agency-/);
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: Review
    await expect(page.getByRole('heading', { name: 'Review & Create' })).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
  });

  test('command palette opens from topbar search trigger', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /search/i }).first().click();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});
