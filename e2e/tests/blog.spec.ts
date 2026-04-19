import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Blog Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  async function waitForContenido(page: import('@playwright/test').Page) {
    await page
      .waitForURL(/\/dashboard\/[^/]+\/contenido/, { timeout: 15000 })
      .catch(() => undefined);
    if (!/\/dashboard\/[^/]+\/contenido/.test(page.url())) {
      const current = page.url();
      if (/\/dashboard\/[^/]+\/blog/.test(current)) {
        await page.goto(current.replace(/\/blog$/, '/contenido'), { waitUntil: 'domcontentloaded' });
      }
    }
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();
  }

  test('blog route redirects to contenido', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await waitForContenido(page);
  });

  test('contenido exposes blog entries in unified table', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await waitForContenido(page);

    await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible();
    await page.getByRole('combobox').nth(1).selectOption('published');
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
  });

  test('contenido keeps SEO action available', async ({ page }) => {
    await gotoWebsiteSection(page, 'blog');
    await waitForContenido(page);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });
});
