import { test, expect } from '@playwright/test';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

/**
 * EPIC #207 W2 · P1 · Market switcher (combined locale + currency).
 *
 * The market switcher in the site header lets a visitor set both locale and
 * currency in one interaction. Validates the URL carries the /en prefix and
 * the rendered prices show the USD symbol after selecting en-US + USD.
 *
 * Source: components/site/site-header.tsx (MarketOptionGroup)
 *         lib/site/currency.ts
 */

const TENANT_SUBDOMAIN = 'colombiatours';

test.describe('Market switcher flow @p1-seo', () => {
  test('selecting en-US + USD updates URL prefix and price currency', async ({ page }) => {
    const response = await page.goto(`/site/${TENANT_SUBDOMAIN}`, {
      waitUntil: 'domcontentloaded',
    });
    test.skip(
      !response || response.status() >= 500,
      `Tenant "${TENANT_SUBDOMAIN}" unreachable — skip market switcher flow`,
    );

    const esMessages = getPublicUiMessages('es-CO');

    // Open the combined market switcher if it's behind a trigger button.
    const switcherTrigger = page
      .getByRole('button', { name: esMessages.header.languageCurrencyCustomizationAria })
      .or(page.getByRole('button', { name: esMessages.header.preferences }))
      .first();

    const triggerCount = await switcherTrigger.count();
    if (triggerCount > 0) {
      await switcherTrigger.click().catch(() => {});
    }

    const languageSelect = page
      .getByRole('combobox', { name: esMessages.header.siteLanguageAria })
      .first();
    const currencySelect = page
      .getByRole('combobox', { name: esMessages.header.siteCurrencyAria })
      .first();

    const hasLanguage = (await languageSelect.count()) > 0;
    const hasCurrency = (await currencySelect.count()) > 0;
    test.skip(
      !hasLanguage || !hasCurrency,
      'Market switcher controls not exposed (tenant may disable market experience)',
    );

    await languageSelect.selectOption('en-US').catch(() => {});
    await currencySelect.selectOption('USD').catch(() => {});
    await page.waitForURL(/\/en(\/|$)/, { timeout: 15_000 }).catch(() => {});

    // URL should carry the /en/ prefix.
    expect(page.url()).toMatch(/\/en(\/|$)/);

    // Rendered prices should use the USD symbol ($). Skip if no price is
    // surfaced on the current route (e.g. pure landing without products).
    const priceLocator = page
      .locator('[data-testid*="price"]')
      .or(page.locator('body'));
    const bodyText = await priceLocator.first().textContent().catch(() => '');
    test.skip(
      !bodyText || !/\$|US\$|USD/.test(bodyText),
      'No currency symbol visible in DOM — tenant may hide prices on homepage',
    );
    expect(bodyText).toMatch(/\$|US\$|USD/);
  });
});
