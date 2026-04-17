/**
 * Unified price formatting helper for the public website.
 *
 * Convention (Colombian / Spanish-market oriented):
 *   formatPrice(352500, 'COP') → "$352.500 COP"
 *   formatPrice(13, 'USD')     → "$13 USD"
 *   formatPrice(99, 'EUR')     → "€99 EUR"
 *   formatPrice(1500)          → "$1.500"   (no code when currency omitted)
 *   formatPrice(null)          → null       (caller decides fallback: "Consultar", hide, etc.)
 *
 * Always:
 *   - prefixes with a currency symbol (`$` for USD/COP or any unknown code, `€` for EUR)
 *   - formats thousands with `es-CO` locale (period separator: 352.500)
 *   - suffixes the 3-letter ISO code when provided (consistent with how COP prices
 *     are read in Colombia — "$352.500 COP" rather than an ambiguous "$352.500")
 *   - drops decimals (tourism pricing is rounded)
 *
 * This is the ONLY place price formatting should live. Import it; do not re-implement.
 */

export interface FormatPriceOptions {
  /** When true and input is null/undefined/NaN/≤0, return `fallback` instead of `null`. */
  fallback?: string | null;
  /** Override maximum fraction digits (default: 0). */
  maximumFractionDigits?: number;
  /** Set to false to omit the 3-letter code suffix. Default: true. */
  includeCode?: boolean;
}

const DEFAULT_FALLBACK: string | null = null;

/** Maps a currency code to its display symbol. Unknown codes default to `$`. */
function symbolFor(currency: string | null | undefined): string {
  if (!currency) return '$';
  const code = currency.toUpperCase();
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  // USD, COP, MXN, ARS, CLP, PEN, BRL — all use `$` prefix, disambiguated by code suffix.
  return '$';
}

/** Coerces the input to a finite number (or null). Accepts numeric strings like "352,500" or "$352.500". */
function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Format a price value with currency symbol + ISO code suffix.
 * Returns `null` (or `options.fallback`) for null/undefined/invalid/zero input.
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency?: string | null,
  options: FormatPriceOptions = {}
): string | null {
  const fallback = options.fallback === undefined ? DEFAULT_FALLBACK : options.fallback;
  const maximumFractionDigits = options.maximumFractionDigits ?? 0;
  const includeCode = options.includeCode !== false;

  const numeric = coerceNumber(value);
  if (numeric === null || numeric <= 0) {
    return fallback;
  }

  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric);

  const symbol = symbolFor(currency);
  const code = currency ? currency.toUpperCase() : '';
  const suffix = includeCode && code ? ` ${code}` : '';

  return `${symbol}${formatted}${suffix}`;
}

/**
 * Same as `formatPrice` but guarantees a string — returns the provided fallback
 * (default: `"Consultar"`) when the price is missing/invalid. Useful for UI
 * surfaces that cannot render `null`.
 */
export function formatPriceOrConsult(
  value: number | string | null | undefined,
  currency?: string | null,
  options: Omit<FormatPriceOptions, 'fallback'> & { fallback?: string } = {}
): string {
  const fallback = options.fallback ?? 'Consultar';
  return formatPrice(value, currency, { ...options, fallback }) as string;
}
