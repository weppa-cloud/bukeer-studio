import { test, expect, type Page } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

async function resolveQuotesDataState(page: Page): Promise<{ noLeads: boolean; rowCount: number }> {
  const emptyHeading = page.getByRole('heading', { name: 'No leads yet' });
  await expect
    .poll(
      async () => {
        const noLeads = await emptyHeading.isVisible().catch(() => false);
        const rowCount = await page.locator('input[type="checkbox"]').count();
        return noLeads || rowCount > 0;
      },
      { timeout: 12_000 },
    )
    .toBeTruthy();

  const noLeads = await emptyHeading.isVisible().catch(() => false);
  const rowCount = await page.locator('input[type="checkbox"]').count();
  return { noLeads, rowCount };
}

test.describe('Leads Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows leads table', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    await expect(page.getByRole('heading', { name: 'Leads & Quotes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });

  test('filter by status', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    const { noLeads, rowCount } = await resolveQuotesDataState(page);
    test.skip(
      noLeads || rowCount === 0,
      'No leads seeded in this environment; status filtering is not assertable.',
    );
    const newTab = page.getByRole('tablist').getByRole('tab', { name: 'New', exact: true });
    await newTab.click();
    await expect
      .poll(async () => newTab.getAttribute('aria-selected'), { timeout: 10_000 })
      .toBe('true');
  });

  test('export CSV', async ({ page }) => {
    await gotoWebsiteSection(page, 'quotes');
    const { noLeads, rowCount } = await resolveQuotesDataState(page);
    test.skip(
      noLeads || rowCount === 0,
      'No leads seeded in this environment; CSV export is skipped to avoid false negatives.',
    );
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByRole('button', { name: /export csv/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/leads-.*\.csv$/);
  });
});
