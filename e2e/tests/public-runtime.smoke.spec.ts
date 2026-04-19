import { test, expect } from '@playwright/test';

test.describe('Public Runtime Smoke', () => {
  test('login route renders without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    // Login form is behind a Suspense boundary (useSearchParams) — wait for hydration
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 30000 });
  });

  test('public home route responds without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/site/colombiatours', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
  });

  test('destinations route responds without 5xx @smoke', async ({ page }) => {
    const response = await page.goto('/site/colombiatours/destinos', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
  });

  test('market switcher is visible in header when enabled', async ({ page }) => {
    const response = await page.goto('/site/colombiatours', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(500);
    const switcherButton = page.getByRole('button', { name: /Personalización de idioma y moneda/i });
    const switcherCount = await switcherButton.count();
    test.skip(switcherCount === 0, 'Market switcher disabled for this tenant configuration');
    await expect(switcherButton).toBeVisible();
  });

  test('EN /packages segment rewrites without 5xx @smoke', async ({ page }) => {
    // Option C (ADR-019 amendment): /en/packages/X rewrites internally to
    // /paquetes/X so a single route file serves all locales. Tenant may or
    // may not have `en` in supported_locales — either way the request must
    // not 500. If en is not supported, middleware resolves default locale
    // and still rewrites to a valid Spanish-canonical internal path.
    const response = await page.goto('/en/packages/non-existent-slug?subdomain=colombiatours', {
      waitUntil: 'domcontentloaded',
    });
    const status = response?.status() ?? 0;
    // Acceptable: 200 (rendered), 404 (product not found), 301/302 (slug redirect).
    // Not acceptable: 5xx (middleware routing regression).
    expect(status).toBeLessThan(500);
  });
});
