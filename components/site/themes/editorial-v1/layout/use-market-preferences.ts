'use client';

/**
 * Shared state hook for editorial-v1 header + footer market switchers.
 *
 * Reuses the generic state layer:
 *   - `lib/site/currency.ts` — storage keys, query params, normalizers
 *   - `lib/seo/locale-routing.ts` — locale-aware path building on change
 *
 * Returns `{ selectedLocale, selectedCurrency, localeOptions, currencyOptions,
 * applyLocale, applyCurrency, hasLanguageSwitcher, hasCurrencySwitcher }`.
 *
 * Keeps DOM side-effects (window.location.href navigation on locale pick,
 * router.replace on currency pick) encapsulated so both the pill and the
 * footer compact variant behave identically.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { WebsiteData } from '@/lib/supabase/get-website';
import {
  SITE_CURRENCY_QUERY_PARAM,
  SITE_CURRENCY_STORAGE_KEY,
  SITE_LANG_QUERY_PARAM,
  SITE_LANG_STORAGE_KEY,
  buildCurrencyConfig,
  normalizeCurrencyCode,
  normalizeLanguageCode,
  resolveMarketExperienceConfig,
  resolvePreferredCurrency,
  resolveSiteMenuLocales,
} from '@/lib/site/currency';
import {
  buildPublicLocalizedPath,
  localeToLanguage,
  resolveLocaleFromPublicPath,
  translateCategoryPathname,
} from '@/lib/seo/locale-routing';

export interface MarketLocaleOption {
  code: string;
  label: string;
}

export interface UseMarketPreferencesResult {
  selectedLocale: string;
  selectedCurrency: string | null;
  localeOptions: MarketLocaleOption[];
  currencyOptions: string[];
  hasLanguageSwitcher: boolean;
  hasCurrencySwitcher: boolean;
  applyLocale: (code: string) => void;
  applyCurrency: (code: string) => void;
}

export function useMarketPreferences(website: WebsiteData): UseMarketPreferencesResult {
  const { content } = website;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = pathname || '/';
  const searchParamsString = searchParams?.toString() ?? '';

  const marketExperience = useMemo(() => resolveMarketExperienceConfig(content), [content]);
  const currencyConfig = useMemo(
    () => buildCurrencyConfig(content.account),
    [content.account],
  );
  const localeOptions = useMemo(
    () =>
      resolveSiteMenuLocales({
        defaultLocale: website.default_locale ?? null,
        supportedLocales: website.supported_locales ?? null,
        contentLocale: content.locale ?? null,
      }),
    [website.default_locale, website.supported_locales, content.locale],
  );
  const localeCodes = useMemo(
    () => localeOptions.map((locale) => locale.code),
    [localeOptions],
  );
  const currencyOptions = useMemo(
    () => currencyConfig?.enabledCurrencies ?? [],
    [currencyConfig],
  );

  const hasLanguageSwitcher = marketExperience.showLanguage && localeCodes.length > 0;
  const hasCurrencySwitcher =
    marketExperience.showCurrency && currencyOptions.length > 1;

  const fallbackLocale =
    normalizeLanguageCode(content.locale) ??
    normalizeLanguageCode(website.default_locale) ??
    localeCodes[0] ??
    'es';

  const enabledCurrencyKey = currencyOptions.join(',');

  const [selectedLocale, setSelectedLocale] = useState<string>(fallbackLocale);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(
    currencyConfig?.baseCurrency ?? null,
  );

  // --- Locale resolution (query → storage → fallback) ---
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const queryLocale = normalizeLanguageCode(params.get(SITE_LANG_QUERY_PARAM));
    if (queryLocale && localeCodes.includes(queryLocale)) {
      setSelectedLocale(queryLocale);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SITE_LANG_STORAGE_KEY, queryLocale);
      }
      return;
    }
    if (typeof window !== 'undefined') {
      const stored = normalizeLanguageCode(
        window.localStorage.getItem(SITE_LANG_STORAGE_KEY),
      );
      const next = stored && localeCodes.includes(stored) ? stored : fallbackLocale;
      setSelectedLocale(next);
      return;
    }
    setSelectedLocale(fallbackLocale);
  }, [fallbackLocale, localeCodes, searchParamsString]);

  // --- Currency resolution ---
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const queryCurrency = normalizeCurrencyCode(params.get(SITE_CURRENCY_QUERY_PARAM));
    const storedCurrency =
      typeof window !== 'undefined'
        ? normalizeCurrencyCode(window.localStorage.getItem(SITE_CURRENCY_STORAGE_KEY))
        : null;
    const preferred = resolvePreferredCurrency({
      queryCurrency,
      storedCurrency,
      config: currencyConfig,
      fallbackCurrency: currencyConfig?.baseCurrency ?? null,
    });
    setSelectedCurrency(preferred);
    if (typeof window !== 'undefined' && preferred) {
      window.localStorage.setItem(SITE_CURRENCY_STORAGE_KEY, preferred);
    }
  }, [currencyConfig, enabledCurrencyKey, searchParamsString]);

  // --- Apply actions ---
  const applyLocale = useCallback(
    (value: string) => {
      const requested = normalizeLanguageCode(value);
      const next =
        requested && localeCodes.includes(requested) ? requested : fallbackLocale;
      setSelectedLocale(next);
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(SITE_LANG_STORAGE_KEY, next);
      const defaultLoc = website.default_locale ?? 'es-CO';
      const rawPathname = window.location.pathname;
      // Dev-mode internal paths: /site/<subdomain>[/<lang>][/<rest>]
      // Locale segment lives AFTER subdomain, not at the start of the URL.
      const internalSiteMatch = rawPathname.match(/^(\/site\/[^/]+)(\/[a-z]{2})?(\/.*)?$/);
      if (internalSiteMatch) {
        const base = internalSiteMatch[1]; // /site/<subdomain>
        const innerRest = internalSiteMatch[3] ?? ''; // /<rest> without old lang
        const defaultLang = localeToLanguage(defaultLoc);
        const params = new URLSearchParams(window.location.search);
        params.delete(SITE_LANG_QUERY_PARAM);
        const query = params.toString();
        // Default locale → no lang prefix; non-default → /site/<sub>/<lang>[/<rest>]
        const targetPath =
          next === defaultLang
            ? `${base}${innerRest}`
            : `${base}/${next}${innerRest}`;
        window.location.href = query ? `${targetPath}?${query}` : targetPath;
        return;
      }

      // Production / custom-domain paths: locale prefix at start of path.
      const { pathnameWithoutLang } = resolveLocaleFromPublicPath(rawPathname, {
        defaultLocale: defaultLoc,
        supportedLocales: website.supported_locales ?? [],
      });
      const translatedPath = translateCategoryPathname(
        pathnameWithoutLang,
        localeToLanguage(next),
      );
      const targetPath = buildPublicLocalizedPath(translatedPath, next, defaultLoc);
      const params = new URLSearchParams(window.location.search);
      params.delete(SITE_LANG_QUERY_PARAM);
      const query = params.toString();
      window.location.href = query ? `${targetPath}?${query}` : targetPath;
    },
    [fallbackLocale, localeCodes, website.default_locale, website.supported_locales],
  );

  const applyCurrency = useCallback(
    (value: string) => {
      const next = normalizeCurrencyCode(value);
      if (!next) return;
      if (currencyConfig && !currencyConfig.enabledCurrencies.includes(next)) return;
      setSelectedCurrency(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SITE_CURRENCY_STORAGE_KEY, next);
      }
      const params = new URLSearchParams(searchParamsString);
      params.set(SITE_CURRENCY_QUERY_PARAM, next);
      const query = params.toString();
      router.replace(query ? `${currentPathname}?${query}` : currentPathname, {
        scroll: false,
      });
    },
    [currencyConfig, currentPathname, router, searchParamsString],
  );

  return {
    selectedLocale,
    selectedCurrency,
    localeOptions,
    currencyOptions,
    hasLanguageSwitcher,
    hasCurrencySwitcher,
    applyLocale,
    applyCurrency,
  };
}

// --- Display helpers shared between the two surfaces ---

const LOCALE_FLAG_MAP: Record<string, string> = {
  es: '🇨🇴',
  en: '🇺🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  nl: '🇳🇱',
};

export function getLocaleFlag(localeCode: string): string {
  const normalized = (normalizeLanguageCode(localeCode) ?? localeCode).toLowerCase();
  return LOCALE_FLAG_MAP[normalized] ?? '🌐';
}

const CURRENCY_SYMBOL_OVERRIDES: Record<string, string> = {
  COP: '$',
  USD: '$',
  EUR: '€',
  MXN: 'Mex$',
  BRL: 'R$',
  PEN: 'S/',
  CLP: '$',
  ARS: '$',
};

export function getCurrencySymbol(currencyCode: string): string {
  const normalized = currencyCode.toUpperCase();
  if (CURRENCY_SYMBOL_OVERRIDES[normalized]) {
    return CURRENCY_SYMBOL_OVERRIDES[normalized];
  }
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(1)
      .find((piece) => piece.type === 'currency')?.value;
    if (part && part.trim().length > 0) return part;
  } catch {
    // fall through
  }
  return normalized;
}
