import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.describe('Translations dashboard — E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    const fixtures = await seedWave2Fixtures();
    if (fixtures.transcreationJobIds.length === 0) {
      throw new Error(
        `Translations dashboard requires seeded jobs. Warnings: ${fixtures.warnings.join(' | ')}`,
      );
    }
  });

  test('renders KPIs, coverage matrix, pending + active tables', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations`);

    await expect(page.getByRole('heading', { name: 'Traducciones' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total').first()).toBeVisible();
    await expect(page.getByText('Traducidos').first()).toBeVisible();
    await expect(page.getByText('In Draft').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Coverage matrix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pendientes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jobs activos' })).toBeVisible();
  });

  test('filter by status=draft narrows active table to zero rows', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations?status=draft`);

    await expect(page.getByRole('heading', { name: 'Traducciones' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('draft');

    const activeSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Jobs activos' }) })
      .first();

    await expect(activeSection.locator('tbody input[type="checkbox"]')).toHaveCount(0);
    await expect(
      page.getByText('Aún no hay jobs en review / applied / published.'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('bulk apply calls API with selected job ids', async ({ page }) => {
    let bulkRequestBody: Record<string, unknown> | null = null;
    await page.route('**/api/seo/translations/bulk', async (route) => {
      bulkRequestBody = (await route.request().postDataJSON().catch(() => null)) as
        | Record<string, unknown>
        | null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { processed: 1, failed: 0, rows: [] },
        }),
      });
    });

    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations?status=published`);

    const activeSection = page.getByRole('heading', { name: 'Jobs activos' }).locator('..').locator('..');
    const firstCheckbox = activeSection.locator('tbody input[type="checkbox"]').first();
    const firstCheckboxCount = await firstCheckbox.count();
    test.skip(firstCheckboxCount === 0, 'No active jobs to select — seed mismatch.');

    await firstCheckbox.check();

    const bulkBar = page.getByRole('button', { name: /Apply/i }).last();
    await bulkBar.click();

    await expect.poll(() => (bulkRequestBody?.jobIds as string[] | undefined)?.length ?? 0, {
      timeout: 10000,
    }).toBeGreaterThan(0);
    expect(bulkRequestBody?.action).toBe('apply');
  });
});
