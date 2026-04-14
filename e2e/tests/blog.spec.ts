import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Blog Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('blog route redirects to contenido', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await page.waitForURL(/\/dashboard\/[^/]+\/contenido/);
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();
  });

  test('contenido exposes blog entries in unified table', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await page.waitForURL(/\/dashboard\/[^/]+\/contenido/);

    await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible();
    await page.getByRole('combobox').nth(1).selectOption('published');
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
  });

  test('contenido keeps SEO action available', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await page.waitForURL(/\/dashboard\/[^/]+\/contenido/);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });
});
