import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('public site loads', async ({ page }) => {
    await page.goto('/?subdomain=bukeer');
    await expect(page).toHaveTitle(/.+/);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('dashboard redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('/login**');
  });
});
