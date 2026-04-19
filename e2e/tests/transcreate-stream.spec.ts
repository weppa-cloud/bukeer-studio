import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { installOpenrouterMocks } from './helpers/mock-openrouter';

test.describe('Transcreate streaming — E2E', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test.beforeEach(async ({ page }) => {
    await installOpenrouterMocks(page, { transcreateStream: true, aiEditor: false, copilotChat: false });
  });

  test('translations dashboard "Translate with AI" streams and creates draft', async ({ page }) => {
    let createDraftBody: Record<string, unknown> | null = null;
    await page.route('**/api/seo/content-intelligence/transcreate', async (route) => {
      createDraftBody = (await route.request().postDataJSON().catch(() => null)) as
        | Record<string, unknown>
        | null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { job: { id: crypto.randomUUID() } },
        }),
      });
    });

    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations`);

    const coverageSection = page.getByRole('heading', { name: 'Coverage matrix' }).locator('..').locator('..');
    await expect(coverageSection).toBeVisible({ timeout: 15000 });

    const generateButton = coverageSection.getByRole('button', { name: /Translate with AI|Generating/ }).first();
    const count = await generateButton.count();
    test.skip(count === 0, 'Coverage matrix has no missing-locale cells — seed or filters filled all locales.');

    await generateButton.click();

    await expect.poll(() => createDraftBody?.draftSource ?? null, { timeout: 15000 }).toBe('ai');
    expect(createDraftBody?.aiOutput).toBeTruthy();
    expect(createDraftBody?.schemaVersion).toBe('2.0');
  });

  test('stream error surfaces inline message without creating a draft', async ({ page }) => {
    await installOpenrouterMocks(page, {
      transcreateStream: true,
      aiEditor: false,
      copilotChat: false,
      simulateError: true,
    });

    let createDraftCalled = false;
    await page.route('**/api/seo/content-intelligence/transcreate', async (route) => {
      createDraftCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });

    const websiteId = await getFirstWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/translations`);

    const coverageSection = page.getByRole('heading', { name: 'Coverage matrix' }).locator('..').locator('..');
    const generateButton = coverageSection.getByRole('button', { name: /Translate with AI/ }).first();
    const count = await generateButton.count();
    test.skip(count === 0, 'Coverage matrix empty in current filters.');

    await generateButton.click();

    await expect(coverageSection.getByText(/No se pudo generar draft AI|No se pudo ejecutar Translate/i))
      .toBeVisible({ timeout: 10000 });

    expect(createDraftCalled).toBe(false);
  });
});
