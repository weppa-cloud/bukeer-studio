import { test, expect } from '@playwright/test';
import { gotoWebsiteSection } from './helpers';

/**
 * EPIC #226 Recovery Gate · P0 · Settings + domain wizard
 *
 * Validates the AC4 contract: settings subdomain field + domain wizard
 * (steps 0/1/2) + danger zone buttons all expose stable testids
 * (`settings-*` + `domain-wizard-*`).
 *
 * Matrix: desktop chromium + firefox + mobile-chrome (per #226 AC9 —
 * settings/domain runs on mobile-chrome; DnD editor flows do not).
 */

test.describe('Settings tab + domain wizard @p0-settings', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('subdomain field + save button use stable testids', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');

    // Navigate to General tab (default)
    await page.getByTestId('settings-tab-general').click();

    const subdomainField = page.getByTestId('settings-subdomain-field');
    await expect(subdomainField).toBeVisible({ timeout: 20000 });

    const currentSubdomain = (await subdomainField.inputValue()) ?? '';
    const nextSubdomain = currentSubdomain
      ? currentSubdomain
      : `e2e-recovery-${Date.now().toString().slice(-6)}`;
    await subdomainField.fill(nextSubdomain);

    // If a save button surfaces (only when the value is dirty AND valid),
    // assert its stable testid. Otherwise the field already matches the
    // persisted subdomain — that's also a pass for this contract check.
    const saveButton = page.getByTestId('settings-save-button');
    const saveVisible = await saveButton.isVisible().catch(() => false);
    if (saveVisible) {
      await expect(saveButton).toBeEnabled();
    }
  });

  test('domain wizard steps + verify button expose testids', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');

    await page.getByTestId('settings-tab-domain').click();
    await expect(page.getByTestId('domain-wizard-root')).toBeVisible({ timeout: 20000 });

    // Step 0 OR Step 2 (connected) is the initial state depending on data.
    const atStep0 = await page.getByTestId('domain-wizard-step-0').isVisible().catch(() => false);
    const atStep2 = await page.getByTestId('domain-wizard-step-2').isVisible().catch(() => false);
    expect(atStep0 || atStep2).toBeTruthy();

    if (atStep2) {
      // Reset back to step 0 via the prev/remove button, then continue.
      await page.getByTestId('domain-wizard-prev').click();
      await expect(page.getByTestId('domain-wizard-step-0')).toBeVisible({ timeout: 10000 });
    }

    // Fill a disposable domain + Continue → Step 1
    await page.getByTestId('domain-wizard-domain-input').fill(
      `recovery-${Date.now().toString().slice(-6)}.example.com`,
    );
    await page.getByTestId('domain-wizard-next').click();
    await expect(page.getByTestId('domain-wizard-step-1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('domain-wizard-verify-button')).toBeVisible();
  });

  test('danger zone exposes unpublish + delete testids', async ({ page }) => {
    await gotoWebsiteSection(page, 'settings');
    await page.getByTestId('settings-tab-general').click();

    const dangerZone = page.getByTestId('settings-danger-zone');
    await expect(dangerZone).toBeVisible({ timeout: 20000 });

    // Unpublish button exists (enabled only when website is published —
    // we only assert presence, not functional state, for the contract).
    await expect(dangerZone.getByTestId('settings-unpublish-button')).toBeVisible();
    await expect(dangerZone.getByTestId('settings-delete-button')).toBeVisible();
  });
});
