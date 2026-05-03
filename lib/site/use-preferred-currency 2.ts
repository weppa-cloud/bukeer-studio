'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { WebsiteData } from '@/lib/supabase/get-website';
import {
  SITE_CURRENCY_QUERY_PARAM,
  SITE_CURRENCY_STORAGE_KEY,
  buildCurrencyConfig,
  normalizeCurrencyCode,
  resolvePreferredCurrency,
  type CurrencyConfig,
} from '@/lib/site/currency';

type WebsiteAccount = WebsiteData['content']['account'];

export interface PreferredCurrencyState {
  currencyConfig: CurrencyConfig | null;
  preferredCurrency: string | null;
}

export function usePreferredCurrency(account: WebsiteAccount | null | undefined): PreferredCurrencyState {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? '';

  const currencyConfig = useMemo(
    () => buildCurrencyConfig(account ?? null),
    [account],
  );
  const enabledCurrenciesKey = currencyConfig?.enabledCurrencies.join(',') ?? '';
  const [preferredCurrency, setPreferredCurrency] = useState<string | null>(
    currencyConfig?.baseCurrency ?? null,
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const queryCurrency = normalizeCurrencyCode(params.get(SITE_CURRENCY_QUERY_PARAM));
    const storedCurrency = typeof window !== 'undefined'
      ? normalizeCurrencyCode(window.localStorage.getItem(SITE_CURRENCY_STORAGE_KEY))
      : null;
    const preferred = resolvePreferredCurrency({
      queryCurrency,
      storedCurrency,
      config: currencyConfig,
      fallbackCurrency: currencyConfig?.baseCurrency ?? null,
    });
    setPreferredCurrency(preferred);
    if (typeof window !== 'undefined') {
      if (preferred) {
        window.localStorage.setItem(SITE_CURRENCY_STORAGE_KEY, preferred);
      } else {
        window.localStorage.removeItem(SITE_CURRENCY_STORAGE_KEY);
      }
    }
  }, [currencyConfig, enabledCurrenciesKey, searchParamsString]);

  return {
    currencyConfig,
    preferredCurrency,
  };
}
