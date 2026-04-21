import type {
  WebsiteContent,
  MarketExperienceSettings,
  MarketSwitcherStyle,
} from '@bukeer/website-contract';

export const SITE_LANG_QUERY_PARAM = 'lang';
export const SITE_CURRENCY_QUERY_PARAM = 'currency';
export const SITE_LANG_STORAGE_KEY = 'bukeer.site.lang';
export const SITE_CURRENCY_STORAGE_KEY = 'bukeer.site.currency';

export const SITE_MENU_LOCALES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

export const SWITCHER_ALLOWED_LANGUAGE_CODES: ReadonlySet<string> = new Set(
  SITE_MENU_LOCALES.map((locale) => locale.code),
);
export const SWITCHER_ALLOWED_CURRENCIES = ['COP', 'USD'] as const;

export type SiteMenuLocale = typeof SITE_MENU_LOCALES[number];
export const MARKET_SWITCHER_STYLES: readonly MarketSwitcherStyle[] = ['compact', 'chips', 'segmented'];
export const DEFAULT_MARKET_SWITCHER_STYLE: MarketSwitcherStyle = 'compact';

export interface CurrencyConfig {
  baseCurrency: string;
  enabledCurrencies: string[];
  rates: Record<string, number>;
}

export interface MarketExperienceConfig {
  switcherStyle: MarketSwitcherStyle;
  showInHeader: boolean;
  showInFooter: boolean;
  showLanguage: boolean;
  showCurrency: boolean;
}

const LOCALE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands',
};

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

function normalizeLanguageToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .split('-')[0];
  if (!normalized) return null;
  return /^[a-z]{2,5}$/.test(normalized) ? normalized : null;
}

function uniqueItems(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    seen.add(value);
  }
  return Array.from(seen);
}

export function normalizeLanguageCode(value: string | null | undefined): string | null {
  return normalizeLanguageToken(value);
}

export function normalizeCurrencyCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length >= 3 ? normalized : null;
}

function dedupeCurrencyCodes(values: Array<string | null | undefined>): string[] {
  return uniqueItems(values.map((value) => normalizeCurrencyCode(value)));
}

function parseMarketBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeMarketSwitcherStyle(value: unknown): MarketSwitcherStyle {
  if (typeof value !== 'string') return DEFAULT_MARKET_SWITCHER_STYLE;
  const normalized = value.trim().toLowerCase();
  return MARKET_SWITCHER_STYLES.includes(normalized as MarketSwitcherStyle)
    ? (normalized as MarketSwitcherStyle)
    : DEFAULT_MARKET_SWITCHER_STYLE;
}

export function getLocaleLabel(code: string): string {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) return code.toUpperCase();
  return LOCALE_LABELS[normalized] ?? normalized.toUpperCase();
}

export function resolveSiteMenuLocales(input: {
  defaultLocale?: string | null;
  supportedLocales?: string[] | null;
  contentLocale?: string | null;
}): Array<{ code: string; label: string }> {
  const defaultLocale = normalizeLanguageCode(input.defaultLocale);
  const contentLocale = normalizeLanguageCode(input.contentLocale);
  const supportedLocales = Array.isArray(input.supportedLocales)
    ? input.supportedLocales
      .map((locale) => normalizeLanguageCode(locale))
      .filter((locale): locale is string => {
        if (!locale) return false;
        return SWITCHER_ALLOWED_LANGUAGE_CODES.has(locale);
      })
    : [];

  const fallbackLocales = SITE_MENU_LOCALES.map((locale) => locale.code);
  const localeCodes = supportedLocales.length > 0
    ? uniqueItems([
      defaultLocale && SWITCHER_ALLOWED_LANGUAGE_CODES.has(defaultLocale) ? defaultLocale : null,
      ...supportedLocales,
    ])
    : uniqueItems([
      defaultLocale && SWITCHER_ALLOWED_LANGUAGE_CODES.has(defaultLocale) ? defaultLocale : null,
      contentLocale && SWITCHER_ALLOWED_LANGUAGE_CODES.has(contentLocale) ? contentLocale : null,
      ...fallbackLocales,
    ]);

  return localeCodes.map((code) => ({
    code,
    label: getLocaleLabel(code),
  }));
}

export function resolveMarketExperienceConfig(content: WebsiteContent | null | undefined): MarketExperienceConfig {
  const marketExperience = (content?.market_experience ?? {}) as MarketExperienceSettings;
  const showLanguage = parseMarketBoolean(marketExperience.show_language, true);
  const showCurrency = parseMarketBoolean(marketExperience.show_currency, true);

  return {
    switcherStyle: normalizeMarketSwitcherStyle(marketExperience.switcher_style),
    showInHeader: parseMarketBoolean(marketExperience.show_in_header, true),
    showInFooter: parseMarketBoolean(marketExperience.show_in_footer, true),
    showLanguage,
    showCurrency,
  };
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
