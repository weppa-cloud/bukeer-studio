import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('EPIC #86 - SEO Content Intelligence', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.setTimeout(90_000);

  test('analytics exposes Content Intelligence, Keywords, and Clusters tabs', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');

    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Content Intelligence' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keywords' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clusters' })).toBeVisible();
  });

  test('content intelligence tab renders audit controls', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');
    await page.getByRole('button', { name: 'Content Intelligence' }).click();

    await expect(page.getByText('Content Intelligence')).toBeVisible();
    await expect(page.locator('input[value="es-CO"]').first()).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Audit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('keywords tab renders locale-native research form', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');
    await page.getByRole('button', { name: 'Keywords' }).click();

    await expect(page.getByText('Keyword Research (locale-native)')).toBeVisible();
    await expect(page.locator('input[value="Colombia"]')).toBeVisible();
    await expect(page.locator('input[value="es"]').first()).toBeVisible();
    await expect(page.locator('input[value="es-CO"]').first()).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
    await expect(page.getByPlaceholder('cartagena tours, caribbean travel guide, best time cartagena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Research' })).toBeVisible();
  });

  test('clusters tab renders planner board controls', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');
    await page.getByRole('button', { name: 'Clusters' }).click();

    await expect(page.getByPlaceholder('Locale (es-CO)')).toBeVisible();
    await expect(page.getByPlaceholder('Country')).toBeVisible();
    await expect(page.getByPlaceholder('Language')).toBeVisible();
    await expect(page.getByPlaceholder('Cluster name')).toBeVisible();
    await expect(page.getByPlaceholder('Primary topic')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create cluster' })).toBeVisible();
  });

  test('SEO item detail exposes Brief -> Optimize -> Translate -> Track loop', async ({ page }) => {
    await gotoWebsiteSection(page, 'contenido');

    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();
    const openSeoButton = page.getByRole('button', { name: 'Open SEO' }).first();
    const count = await openSeoButton.count();
    if (count === 0) {
      test.skip(true, 'No rows in Contenido table — cannot validate full SEO loop');
      return;
    }

    await openSeoButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Brief' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Optimize' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Translate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Track' })).toBeVisible();

    await page.getByRole('button', { name: 'Translate' }).click();
    await expect(page.getByPlaceholder('Search target content by title or slug')).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 1: Create Draft|Step 2: Mark Reviewed|Step 3: Apply|Completed/i })).toBeVisible();

    await page.getByRole('button', { name: 'Track' }).click();
    await expect(page.getByRole('button', { name: 'Load Track' })).toBeVisible();
    await expect(page.getByText('Decision-grade only (live + authoritative)').first()).toBeVisible();
  });
});
