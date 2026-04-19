import { test, expect } from '@playwright/test';
import {
  getPublicUiMessages,
  SUPPORTED_PUBLIC_UI_LOCALES,
} from '@/lib/site/public-ui-messages';

/**
 * EPIC #207 W2 · P1 · Language switcher end-to-end flow.
 *
 * Clicking the language switcher and selecting EN must navigate to the
 * path-based locale-prefixed URL (/en/...) per ADR-019 and render translated
 * header copy.
 *
 * Source: components/site/language-switcher.tsx
 *         components/site/site-header.tsx (aria=messages.header.siteLanguageAria)
 */

const TENANT_SUBDOMAIN = 'colombiatours';

test.describe('Language switcher flow @p1-seo', () => {
  test('ES → EN switch lands on /en/ and renders en-US copy', async ({ page }) => {
    test.skip(
      !SUPPORTED_PUBLIC_UI_LOCALES.includes('en-US'),
      'en-US not supported in the messages catalog',
    );

    const response = await page.goto(`/site/${TENANT_SUBDOMAIN}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response || response.status() >= 500,
      `Tenant "${TENANT_SUBDOMAIN}" unreachable — skip switcher flow`,
    );

    const esMessages = getPublicUiMessages('es-CO');
    const enMessages = getPublicUiMessages('en-US');

    // Locate the header's site-language select by its aria-label.
    const languageSelect = page
      .getByRole('combobox', { name: esMessages.header.siteLanguageAria })
      .or(
        page.locator('select').filter({
          has: page.locator('option[value="es-CO"], option[value="en-US"]'),
        }),
      )
      .first();

    const count = await languageSelect.count();
    test.skip(count === 0, 'Language switcher not rendered — tenant may hide it');

    await languageSelect.selectOption('en-US');
    await page.waitForURL(/\/en(\/|$)/, { timeout: 15_000 }).catch(() => {});

    // Assert URL carries the /en prefix (ADR-019 path-based routing).
    expect(page.url()).toMatch(/\/en(\/|$)/);

    // Assert translated header/footer copy is present after the switch.
    test.skip(
      enMessages.footer.explore === esMessages.footer.explore,
      'EN vs ES copy identical for this key — cannot distinguish',
    );
    await expect(page.locator('body')).toContainText(enMessages.footer.explore);
  });
});
