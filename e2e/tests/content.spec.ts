import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

test.describe('Content & SEO Tab', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('edit site name and tagline', async ({ page }) => {
    await gotoWebsiteSection(page, 'content');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Content & SEO' })).toBeVisible();

    const siteName = `Updated Agency ${Date.now().toString().slice(-4)}`;
    const nameInput = main.locator('input').first();
    await nameInput.clear();
    await nameInput.fill(siteName);
    await expect(nameInput).toHaveValue(siteName);
  });

  test('SEO Google preview updates', async ({ page }) => {
    await gotoWebsiteSection(page, 'content');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Content & SEO' })).toBeVisible();
    await main.getByRole('button', { name: 'SEO & Scripts' }).click();

    const titleInput = main.locator('input[maxlength="70"]');
    const title = 'Best Travel Agency E2E';
    await titleInput.clear();
    await titleInput.fill(title);

    await expect(main.getByText(title)).toBeVisible();
  });
});
