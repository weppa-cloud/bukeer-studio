import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('EPIC #86 - SEO Content Intelligence', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

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
    await expect(page.getByPlaceholder('es-CO')).toBeVisible();
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
    await expect(page.locator('input[value="es-CO"]')).toBeVisible();
    await expect(page.getByPlaceholder('cartagena tours, caribbean travel guide, best time cartagena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Research' })).toBeVisible();
  });

  test('clusters tab renders planner board controls', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');
    await page.getByRole('button', { name: 'Clusters' }).click();

    await expect(page.getByText('Clusters planner')).toBeVisible();
    await expect(page.getByPlaceholder('Locale (es-CO)')).toBeVisible();
    await expect(page.getByPlaceholder('Country')).toBeVisible();
    await expect(page.getByPlaceholder('Language')).toBeVisible();
    await expect(page.getByPlaceholder('Cluster name')).toBeVisible();
    await expect(page.getByPlaceholder('Primary topic')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create cluster' })).toBeVisible();
  });
});
