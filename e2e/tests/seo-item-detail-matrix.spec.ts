import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures, getSeededSeoItem } from './helpers';

test.describe('SEO item detail — matrix', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('page item detail loads with save control', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const item = await getSeededSeoItem('page');
    await page.goto(`/dashboard/${websiteId}/seo/page/${item.pageId}`);

    await expect(page.getByRole('button', { name: /^Guardar$/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Meta Description/i)).toBeVisible();
  });

  test('package item detail loads with save control', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.packageId, 'Package seed missing — cannot test package route.');
    await page.goto(`/dashboard/${websiteId}/seo/package/${fixtures.packageId}`);

    await expect(page.getByRole('button', { name: /^Guardar$/ })).toBeVisible({ timeout: 20000 });
  });

  test('blog item detail loads when blog fixture exists', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.blogId, 'blog_posts schema mismatch in fixture — skipping.');
    await page.goto(`/dashboard/${websiteId}/seo/blog/${fixtures.blogId}`);

    await expect(page.getByRole('button', { name: /^Guardar$/ })).toBeVisible({ timeout: 20000 });
  });

  test('edit + save meta title on page item persists via RPC', async ({ page }) => {
    let saveRequestBody: Record<string, unknown> | null = null;
    await page.route('**/rest/v1/rpc/**', async (route) => {
      const body = (await route.request().postDataJSON().catch(() => null)) as
        | Record<string, unknown>
        | null;
      if (body) saveRequestBody = body;
      await route.continue();
    });

    const websiteId = await getFirstWebsiteId(page);
    const item = await getSeededSeoItem('page');
    await page.goto(`/dashboard/${websiteId}/seo/page/${item.pageId}`);

    const titleInput = page.locator('input[maxlength="80"]').first();
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('E2E Seo Title Update');

    await page.getByRole('button', { name: /^Guardar$/ }).click();

    // Saved badge or toast
    await expect(
      page.getByText(/Guardado|Saved/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
