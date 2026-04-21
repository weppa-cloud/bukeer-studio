'use client';

import './market-switcher.css';

/**
 * editorial-v1 Market Switcher — header pill variant.
 *
 * Port of designer `MarketSwitcher` from
 * `themes/references/claude design 1/project/switcher.jsx`.
 *
 * A pill-style trigger that combines locale + currency into a single control
 * and expands to a `role="dialog"` popover with one row per option (compact
 * list — the designer's default `groupStyle`).
 *
 * Reuses `useMarketPreferences` (and therefore the generic
 * `lib/site/currency.ts` state layer) — this component does NOT duplicate
 * storage/query/path logic.
 *
 * Accessibility:
 *  - trigger has `aria-haspopup="dialog"`, `aria-expanded`
 *  - `Escape` closes the popover
 *  - outside click closes the popover
 *  - each option is a button with `aria-pressed`
 *
 * Analytics:
 *  - fires `locale_switch` / `currency_switch` with `{ from, to, surface: 'header' }`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { trackEvent } from '@/lib/analytics/track';
import { getEditorialTextGetter } from '../i18n';
import {
  getCurrencySymbol,
  getLocaleFlag,
  useMarketPreferences,
} from './use-market-preferences';

export interface MarketSwitcherProps {
  website: WebsiteData;
  /** Style hint to render the pill on dark backgrounds (e.g. transparent header over hero). */
  onDark?: boolean;
}

export function MarketSwitcher({ website, onDark = false }: MarketSwitcherProps) {
  const editorialText = getEditorialTextGetter(website);
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

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !anchorRef.current) return;
      if (!anchorRef.current.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLocalePick = useCallback(
    (code: string) => {
      const from = selectedLocale;
      trackEvent('locale_switch', { from, to: code, surface: 'header' });
      setOpen(false);
      applyLocale(code);
    },
    [applyLocale, selectedLocale],
  );

  const handleCurrencyPick = useCallback(
    (code: string) => {
      const from = selectedCurrency ?? '';
      trackEvent('currency_switch', { from, to: code, surface: 'header' });
      applyCurrency(code);
    },
    [applyCurrency, selectedCurrency],
  );

  // Nothing to switch — render nothing so we don't take up header space.
  if (!hasLanguageSwitcher && !hasCurrencySwitcher) return null;

  const currentLocale =
    localeOptions.find((locale) => locale.code === selectedLocale) ??
    localeOptions[0];
  const currentLocaleFlag = currentLocale ? getLocaleFlag(currentLocale.code) : '🌐';
  const currentLocaleCode = (currentLocale?.code ?? '').toUpperCase();

  const currentCurrency =
    (selectedCurrency ?? currencyOptions[0] ?? '').toUpperCase();
  const currentCurrencySymbol = currentCurrency ? getCurrencySymbol(currentCurrency) : '';

  const triggerAria =
    hasLanguageSwitcher && currentLocale
      ? `${editorialText('editorialSwitcherTriggerAria')} · ${currentLocale.label}${
          hasCurrencySwitcher && currentCurrency ? ` · ${currentCurrency}` : ''
        }`
      : editorialText('editorialSwitcherTriggerAria');

  return (
    <div className="mkt-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`mkt-pill${open ? ' open' : ''}${onDark ? ' on-dark' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerAria}
        onClick={() => setOpen((prev) => !prev)}
      >
        {hasLanguageSwitcher && currentLocale ? (
          <>
            <span className="mkt-flag" aria-hidden>
              {currentLocaleFlag}
            </span>
            <span className="mkt-code">{currentLocaleCode}</span>
          </>
        ) : null}
        {hasLanguageSwitcher && hasCurrencySwitcher ? (
          <span className="mkt-sep" aria-hidden />
        ) : null}
        {hasCurrencySwitcher ? (
          <span className="mkt-cur">
            <span className="mkt-sym" aria-hidden>
              {currentCurrencySymbol}
            </span>
            {currentCurrency}
          </span>
        ) : null}
        <SwCaret open={open} />
      </button>

      {open ? (
        <div
          className="mkt-pop"
          role="dialog"
          aria-label={editorialText('editorialSwitcherDialogAria')}
        >
          <div className="mkt-pop-head">
            {editorialText('editorialSwitcherHeading')}{' '}
            <em>{editorialText('editorialSwitcherHeadingEmphasis')}</em>
          </div>
          <div className="mkt-pop-desc">
            {editorialText('editorialSwitcherDescription')}
          </div>

          {hasLanguageSwitcher ? (
            <>
              <div className="mkt-pop-sub">
                {editorialText('editorialSwitcherLanguageSubheading')}
              </div>
              <div className="mkt-list">
                {localeOptions.map((locale) => {
                  const isActive = locale.code === selectedLocale;
                  return (
                    <button
                      key={locale.code}
                      type="button"
                      className={`mkt-item${isActive ? ' on' : ''}`}
                      aria-pressed={isActive}
                      aria-label={`${editorialText('editorialSwitcherLanguageItemAria')}: ${locale.label}`}
                      onClick={() => handleLocalePick(locale.code)}
                    >
                      <span className="mkt-item-lead">
                        <span className="mkt-item-flag" aria-hidden>
                          {getLocaleFlag(locale.code)}
                        </span>
                      </span>
                      <span className="mkt-item-label">{locale.label}</span>
                      <span className="mkt-item-hint">
                        {locale.code.toUpperCase()}
                      </span>
                      {isActive ? <span className="mkt-item-dot" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {hasLanguageSwitcher && hasCurrencySwitcher ? (
            <hr className="mkt-pop-div" />
          ) : null}

          {hasCurrencySwitcher ? (
            <>
              <div className="mkt-pop-sub">
                {editorialText('editorialSwitcherCurrencySubheading')}
              </div>
              <div className="mkt-list">
                {currencyOptions.map((code) => {
                  const normalized = code.toUpperCase();
                  const isActive = normalized === currentCurrency;
                  return (
                    <button
                      key={normalized}
                      type="button"
                      className={`mkt-item${isActive ? ' on' : ''}`}
                      aria-pressed={isActive}
                      aria-label={`${editorialText('editorialSwitcherCurrencyItemAria')}: ${normalized}`}
                      onClick={() => handleCurrencyPick(normalized)}
                    >
                      <span className="mkt-item-lead">
                        <span className="mkt-item-sym" aria-hidden>
                          {getCurrencySymbol(normalized)}
                        </span>
                      </span>
                      <span className="mkt-item-label">{normalized}</span>
                      <span className="mkt-item-hint">{normalized}</span>
                      {isActive ? <span className="mkt-item-dot" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="mkt-pop-foot">
            <span>{editorialText('editorialSwitcherSavedHint')}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SwCaret({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      style={{
        opacity: 0.6,
        transition: 'transform .2s cubic-bezier(.2,.7,.2,1)',
        transform: open ? 'rotate(180deg)' : 'none',
      }}
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
