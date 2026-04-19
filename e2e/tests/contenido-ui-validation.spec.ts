import { test, expect, type Page } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

function extractWebsiteId(href: string): string {
  const match = href.match(/\/dashboard\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Invalid website href format: ${href}`);
  }
  return match[1];
}

async function waitForContenidoSettled(page: Page) {
  for (let i = 0; i < 20; i += 1) {
    const loadingVisible = await page.getByText('Loading content...').isVisible().catch(() => false);
    const hasRows = (await page.locator('table tbody tr:has(td input[type="checkbox"])').count()) > 0;
    const hasNoItems = await page.getByText(/Mostrando 0-0 de 0 items/).isVisible().catch(() => false);
    const hasError = await page.locator('text=/failed|error/i').isVisible().catch(() => false);
    if (!loadingVisible || hasRows || hasNoItems || hasError) return;
    await page.waitForTimeout(1000);
  }
}

async function gotoContenidoPreferRows(page: Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'My Websites' })).toBeVisible();
  const hrefs = await page
    .locator('a[href*="/dashboard/"][href*="/pages"]')
    .evaluateAll((elements) => elements.map((el) => el.getAttribute('href') || '').filter(Boolean));

  if (hrefs.length === 0) {
    await gotoWebsiteSection(page, 'contenido');
    await waitForContenidoSettled(page);
    return;
  }

  for (const href of hrefs) {
    const websiteId = extractWebsiteId(href);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await waitForContenidoSettled(page);
    const hasRows = (await page.locator('table tbody tr:has(td input[type="checkbox"])').count()) > 0;
    if (hasRows) return;
  }

  const fallbackId = extractWebsiteId(hrefs[0]);
  await page.goto(`/dashboard/${fallbackId}/contenido`);
  await waitForContenidoSettled(page);
}

test.describe('Contenido UI Validation', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('desktop validates unified table controls, filters and row actions', async ({ page }) => {
    await gotoContenidoPreferRows(page);
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

    await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publicar seleccionados' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar seleccionados' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Item' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Completeness' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Published' })).toBeVisible();

    const dataRowCount = await page.locator('table tbody tr:has(td input[type="checkbox"])').count();
    if (dataRowCount > 0) {
      const firstDataRow = page.locator('table tbody tr:has(td input[type="checkbox"])').first();
      await expect(firstDataRow).toBeVisible();

      const rowCheckbox = firstDataRow.locator('input[type="checkbox"]').first();
      await rowCheckbox.check();
      await expect(page.getByText(/seleccionados/i)).toBeVisible();

      await firstDataRow.hover();
      await expect(firstDataRow.getByRole('button', { name: 'Open SEO' })).toBeVisible();
    } else {
      const hasLoading = await page.getByText('Loading content...').first().isVisible().catch(() => false);
      const hasNoItems = await page.getByText('No items match the filters.').isVisible().catch(() => false);
      expect(hasLoading || hasNoItems).toBeTruthy();
    }

    await page.getByRole('combobox').nth(0).selectOption('A');
    await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible();
  });

  test('mobile keeps table controls accessible and avoids desktop-only crashes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoContenidoPreferRows(page);
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

    await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publicar seleccionados' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ocultar seleccionados' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

    const openSeoButtons = page.getByRole('button', { name: 'Open SEO' });
    const openSeoCount = await openSeoButtons.count();
    if (openSeoCount > 0) {
      await expect(openSeoButtons.first()).toBeVisible();
    } else {
      const hasLoading = await page.getByText('Loading content...').first().isVisible().catch(() => false);
      const hasNoItems = await page.getByText('No items match the filters.').isVisible().catch(() => false);
      expect(hasLoading || hasNoItems).toBeTruthy();
    }
  });
});
