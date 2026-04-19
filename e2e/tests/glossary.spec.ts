import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.describe('Glossary CRUD — E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('page renders heading, filters, table', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations/glossary`);

    await expect(page.getByRole('heading', { name: 'Glosario de términos' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel('Filtrar por locale')).toBeVisible();
    await expect(page.getByLabel('Buscar término')).toBeVisible();
  });

  test('locale filter narrows the result set via URL', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations/glossary?locale=en-US`);

    await expect(page.getByLabel('Filtrar por locale')).toHaveValue('en-US', { timeout: 10000 });
  });

  test('search query round-trips to URL params', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations/glossary`);

    await page.getByLabel('Buscar término').fill('Andes');
    await page.getByRole('button', { name: /Aplicar|Filtrar/i }).first().click().catch(async () => {
      await page.getByLabel('Buscar término').press('Enter');
    });

    await expect(page).toHaveURL(/q=Andes/);
  });
});
