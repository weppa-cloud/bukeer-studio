import type { WebsiteContent } from '@bukeer/website-contract';

export const SITE_LANG_QUERY_PARAM = 'lang';
export const SITE_CURRENCY_QUERY_PARAM = 'currency';
export const SITE_LANG_STORAGE_KEY = 'bukeer.site.lang';
export const SITE_CURRENCY_STORAGE_KEY = 'bukeer.site.currency';

export const SITE_MENU_LOCALES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
] as const;

export type SiteMenuLocale = typeof SITE_MENU_LOCALES[number];

export interface CurrencyConfig {
  baseCurrency: string;
  enabledCurrencies: string[];
  rates: Record<string, number>;
}

type WebsiteAccount = WebsiteContent['account'];

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeLanguageCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().split(/[-_]/)[0];
  if (!normalized) return null;
  return SITE_MENU_LOCALES.some((entry) => entry.code === normalized) ? normalized : null;
}

export function normalizeCurrencyCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length >= 3 ? normalized : null;
}

function dedupeCurrencyCodes(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeCurrencyCode(value);
    if (!normalized) continue;
    seen.add(normalized);
  }
  return Array.from(seen);
}

export function buildCurrencyConfig(account: WebsiteAccount | null | undefined): CurrencyConfig | null {
  if (!account) return null;

  const rates: Record<string, number> = {};
  let baseCurrency = normalizeCurrencyCode(account.primary_currency);

  if (Array.isArray(account.currency)) {
    for (const row of account.currency) {
      if (!row || typeof row !== 'object') continue;
      const code = normalizeCurrencyCode(row.name);
      const rate = parseFiniteNumber(row.rate);
      if (!code || rate === null || rate <= 0) continue;
      rates[code] = rate;

      if (!baseCurrency && typeof row.type === 'string' && row.type.toLowerCase() === 'base') {
        baseCurrency = code;
      }
    }
  }

  if (!baseCurrency) {
    baseCurrency = rates.COP ? 'COP' : Object.keys(rates)[0] ?? null;
  }
  if (!baseCurrency) {
    return null;
  }

  rates[baseCurrency] = 1;

  const enabledFromAccount = Array.isArray(account.enabled_currencies)
    ? account.enabled_currencies
    : [];
  const enabledCurrencies = dedupeCurrencyCodes([
    ...enabledFromAccount,
    ...Object.keys(rates),
    baseCurrency,
  ]);

  return {
    baseCurrency,
    enabledCurrencies,
    rates,
  };
}

export function resolvePreferredCurrency(input: {
  queryCurrency?: string | null;
  storedCurrency?: string | null;
  config: CurrencyConfig | null;
  fallbackCurrency?: string | null;
}): string | null {
  const available = input.config?.enabledCurrencies ?? [];
  const fallback = normalizeCurrencyCode(input.fallbackCurrency)
    ?? input.config?.baseCurrency
    ?? null;

  const candidates = [
    normalizeCurrencyCode(input.queryCurrency),
    normalizeCurrencyCode(input.storedCurrency),
    fallback,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (available.length === 0 || available.includes(candidate)) {
      return candidate;
    }
  }

  return available[0] ?? null;
}

export function convertCurrencyAmount(
  value: number | string | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: string | null | undefined,
  config: CurrencyConfig | null
): number | null {
  const numeric = parseFiniteNumber(value);
  if (numeric === null) return null;

  const sourceCode = normalizeCurrencyCode(fromCurrency) ?? config?.baseCurrency ?? null;
  const targetCode = normalizeCurrencyCode(toCurrency) ?? sourceCode;

  if (!sourceCode || !targetCode || !config || sourceCode === targetCode) {
    return numeric;
  }

  const sourceRate = sourceCode === config.baseCurrency ? 1 : config.rates[sourceCode];
  const targetRate = targetCode === config.baseCurrency ? 1 : config.rates[targetCode];

  if (!sourceRate || !targetRate) {
    return numeric;
  }

  const amountInBase = numeric / sourceRate;
  const converted = amountInBase * targetRate;
  return Number.isFinite(converted) ? converted : numeric;
}
