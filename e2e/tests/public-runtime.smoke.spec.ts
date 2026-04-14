import { test, expect } from '@playwright/test';

test.describe('Public Runtime Smoke', () => {
  test('login route renders without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('public home route responds without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/site/colombiatours', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
  });

  test('destinations route responds without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/site/colombiatours/destinos', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
  });
});
