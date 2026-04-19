import { test, expect } from '@playwright/test';

/**
 * EPIC #226 Recovery Gate · P0 · Auth/smoke contract (AC2)
 *
 * Unauthenticated smoke: ensures `/`, `/login`, and `/forgot-password`
 * return sane statuses (no 500, correct routing behavior). These flows
 * do not require storageState.
 */

test.describe('Auth surface smoke @p0-auth', () => {
  test('root route does not 5xx', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    expect(status, `GET / returned ${status}`).toBeLessThan(500);
  });

  test('login page renders form fields', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 0).toBeLessThan(500);

    // Password field is a strong signal that the login form mounted.
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 20000 });
  });

  test('forgot-password page renders without 5xx', async ({ page }) => {
    const response = await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;

    // Some routing strategies redirect forgot-password through /login or
    // serve a localized variant. Tolerate 200 or 3xx but never 5xx.
    expect(status, `GET /forgot-password returned ${status}`).toBeLessThan(500);
  });
});
