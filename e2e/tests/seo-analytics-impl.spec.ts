import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('SEO + Analytics Implementation', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('analytics page renders 7 sub-tabs', async ({ page }) => {
    await gotoWebsiteSection(page, 'analytics');

    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keywords' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Competitors' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Health' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI Visibility' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backlinks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Config', exact: true })).toBeVisible();
  });

  test('contenido page renders unified controls', async ({ page }) => {
    await gotoWebsiteSection(page, 'contenido');
    await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Publicar seleccionados' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar seleccionados' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Item' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Completeness' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Published' })).toBeVisible();
  });

  test('seo detail page renders 5 tabs', async ({ page }) => {
    await gotoWebsiteSection(page, 'contenido');
    const openSeoButton = page.getByRole('button', { name: 'Open SEO' }).first();
    const openSeoCount = await openSeoButton.count();
    test.skip(openSeoCount === 0, 'No rows available in Contenido to open SEO detail');
    await expect(openSeoButton).toBeVisible();
    await openSeoButton.click();

    await expect(page.getByRole('button', { name: 'Meta & Keywords' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keyword Research' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Content Audit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technical' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
  });
});
