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

  test('desktop validates sticky UI, sorting, density, selection and pagination', async ({ page }) => {
    await gotoContenidoPreferRows(page);
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

    const stickyToolbar = page.locator('main .sticky.top-2.z-30').first();
    await expect(stickyToolbar).toBeVisible();
    await expect(
      stickyToolbar.evaluate((el) => getComputedStyle(el).position)
    ).resolves.toBe('sticky');

    const stickyHeaderCell = page.locator('table thead th').first();
    await expect(stickyHeaderCell).toBeVisible();
    await expect(
      stickyHeaderCell.evaluate((el) => getComputedStyle(el).position)
    ).resolves.toBe('sticky');

    const scoreSortButton = page.getByRole('button', { name: /^Score$/ }).first();
    await expect(scoreSortButton).toBeVisible();
    await scoreSortButton.click();

    const ascScores = await page.$$eval('table tbody tr td:nth-child(5)', (cells) =>
      cells
        .map((cell) => Number((cell.textContent || '').match(/(\d+)/)?.[1] || 0))
        .filter((value) => value > 0)
        .slice(0, 8)
    );
    for (let i = 1; i < ascScores.length; i += 1) {
      expect(ascScores[i]).toBeGreaterThanOrEqual(ascScores[i - 1]);
    }

    await scoreSortButton.click();
    const descScores = await page.$$eval('table tbody tr td:nth-child(5)', (cells) =>
      cells
        .map((cell) => Number((cell.textContent || '').match(/(\d+)/)?.[1] || 0))
        .filter((value) => value > 0)
        .slice(0, 8)
    );
    for (let i = 1; i < descScores.length; i += 1) {
      expect(descScores[i]).toBeLessThanOrEqual(descScores[i - 1]);
    }

    const dataRowCount = await page.locator('table tbody tr:has(td input[type="checkbox"])').count();
    if (dataRowCount > 0) {
      const firstDataRow = page.locator('table tbody tr:has(td input[type="checkbox"])').first();
      await expect(firstDataRow).toBeVisible();
      const comfortableHeight = await firstDataRow.evaluate((el) => el.getBoundingClientRect().height);

      await page.getByRole('button', { name: 'Compact' }).click();
      const compactHeight = await firstDataRow.evaluate((el) => el.getBoundingClientRect().height);
      expect(compactHeight).toBeLessThan(comfortableHeight);

      const rowCheckbox = firstDataRow.locator('input[type="checkbox"]').first();
      await rowCheckbox.check();
      await expect(page.getByText(/seleccionados/i)).toBeVisible();

      await firstDataRow.hover();
      await expect(firstDataRow.getByRole('button', { name: 'SEO' })).toBeVisible();
      await expect(firstDataRow.getByRole('button', { name: 'Publicar' })).toBeVisible();
      await expect(firstDataRow.getByRole('button', { name: 'Ocultar' })).toBeVisible();
    } else {
      const hasLoading = await page.getByText('Loading content...').first().isVisible().catch(() => false);
      const hasNoItems = await page.getByText('No items match the filters.').isVisible().catch(() => false);
      const hasZeroSummary = await page.getByText(/Mostrando 0-0 de 0 items/).isVisible().catch(() => false);
      expect(hasLoading || hasNoItems || hasZeroSummary).toBeTruthy();
    }

    const pageSizeSelect = page.locator('select').last();
    await pageSizeSelect.selectOption('25');
    await expect(page.getByText(/Página 1 \/ /)).toBeVisible();

    const renderedRows = await page.locator('table tbody tr:has(td input[type="checkbox"])').count();
    expect(renderedRows).toBeLessThanOrEqual(25);
  });

  test('mobile validates card mode instead of table', async ({ page }) => {
    await gotoContenidoPreferRows(page);
    await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

    const mobileList = page.locator('div.space-y-3.md\\:hidden').first();
    await expect(mobileList).toBeVisible();

    const desktopTable = page.locator('div.studio-card.hidden.md\\:block').first();
    await expect(desktopTable).toBeHidden();

    const mobileCards = mobileList.locator('.studio-card');
    const seoButtonsInCards = mobileCards.getByRole('button', { name: 'SEO' });
    const seoButtonsCount = await seoButtonsInCards.count();
    if (seoButtonsCount > 0) {
      await expect(seoButtonsInCards.first()).toBeVisible();
    } else {
      const hasLoading = await page.getByText('Loading content...').first().isVisible().catch(() => false);
      const hasNoItems = await page.getByText('No items match the filters.').isVisible().catch(() => false);
      const hasZeroSummary = await page.getByText(/Mostrando 0-0 de 0 items/).isVisible().catch(() => false);
      expect(hasLoading || hasNoItems || hasZeroSummary).toBeTruthy();
    }
  });
});
