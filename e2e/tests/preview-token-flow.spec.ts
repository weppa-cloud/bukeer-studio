import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Preview Token Flow', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('dashboard Preview opens /site route without 5xx', async ({ page }) => {
    await gotoWebsiteSection(page, 'pages');

    const previewButton = page.getByRole('button', { name: 'Preview' }).first();
    await expect(previewButton).toBeVisible();

    const popupPromise = page.context().waitForEvent('page');
    await previewButton.click();
    const popup = await popupPromise;

    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForURL(/\/site\/[^/?]+(?:\/.*)?$/);

    const finalUrl = popup.url();
    expect(finalUrl).not.toContain('preview_token=');

    const html = await popup.content();
    expect(html).not.toContain('Internal Server Error');
    expect(html).not.toContain('Preview token required');
  });
});
