'use client';

/**
 * editorial-v1 Footer Switcher — compact inline variant.
 *
 * Port of designer `FooterSwitcher` from
 * `themes/references/claude design 1/project/switcher.jsx`.
 *
 * Uses native `<select>` overlays for portability + accessibility in dark
 * footers: small pill labels stay visible, the select itself is absolutely
 * positioned over the pill with `opacity: 0` so the browser picker handles
 * keyboard + touch affordances.
 *
 * Shares state + actions with the header variant via `useMarketPreferences`.
 * Emits `locale_switch` / `currency_switch` with `surface: 'footer'`.
 */

import { useCallback } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import {
  getCurrencySymbol,
  getLocaleFlag,
  useMarketPreferences,
} from './use-market-preferences';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface FooterSwitcherProps {
  website: WebsiteData;
}

export function FooterSwitcher({ website }: FooterSwitcherProps) {
  const {
    selectedLocale,
    selectedCurrency,
    localeOptions,
    currencyOptions,
    hasLanguageSwitcher,
    hasCurrencySwitcher,
    applyLocale,
    applyCurrency,
  } = useMarketPreferences(website);

  const handleLocaleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      const from = selectedLocale;
      if (next === from) return;
      trackEvent('locale_switch', { from, to: next, surface: 'footer' });
      applyLocale(next);
    },
    [applyLocale, selectedLocale],
  );

  const handleCurrencyChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      const from = selectedCurrency ?? '';
      if (next === from) return;
      trackEvent('currency_switch', { from, to: next, surface: 'footer' });
      applyCurrency(next);
    },
    [applyCurrency, selectedCurrency],
  );

  if (!hasLanguageSwitcher && !hasCurrencySwitcher) return null;

  const currentLocale =
    localeOptions.find((locale) => locale.code === selectedLocale) ??
    localeOptions[0];
  const currentCurrencyCode =
    (selectedCurrency ?? currencyOptions[0] ?? '').toUpperCase();

  return (
    <div className="mkt-footer" data-testid="editorial-footer-switcher">
      {hasLanguageSwitcher && currentLocale ? (
        <label className="mkt-footer-select">
          <span className="mkt-footer-flag" aria-hidden>
            {getLocaleFlag(currentLocale.code)}
          </span>
          <span className="mkt-footer-text">{currentLocale.label}</span>
          <SwCaret />
          <select
            value={currentLocale.code}
            onChange={handleLocaleChange}
            aria-label={editorialText('editorialSwitcherLanguageItemAria')}
          >
            {localeOptions.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {hasCurrencySwitcher ? (
        <label className="mkt-footer-select">
          <span className="mkt-footer-sym" aria-hidden>
            {getCurrencySymbol(currentCurrencyCode)}
          </span>
          <span className="mkt-footer-text">{currentCurrencyCode}</span>
          <SwCaret />
          <select
            value={currentCurrencyCode}
            onChange={handleCurrencyChange}
            aria-label={editorialText('editorialSwitcherCurrencyItemAria')}
          >
            {currencyOptions.map((code) => {
              const normalized = code.toUpperCase();
              return (
                <option key={normalized} value={normalized}>
                  {normalized}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function SwCaret() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      style={{ opacity: 0.6 }}
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
