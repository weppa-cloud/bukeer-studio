import { formatPrice, formatPriceOrConsult } from '@/lib/products/format-price';

describe('formatPrice', () => {
  it('formats a COP amount with symbol prefix + 3-letter suffix using es-CO thousands', () => {
    expect(formatPrice(352500, 'COP')).toBe('$352.500 COP');
  });

  it('formats a USD amount with $ prefix and USD suffix (Spanish-market convention)', () => {
    expect(formatPrice(13, 'USD')).toBe('$13 USD');
  });

  it('formats a EUR amount with € symbol and EUR suffix', () => {
    expect(formatPrice(99, 'EUR')).toBe('€99 EUR');
  });

  it('formats large package-style numbers with period thousand separators', () => {
    expect(formatPrice(3152996, 'COP')).toBe('$3.152.996 COP');
  });

  it('falls back to $ symbol and omits suffix when currency is not provided', () => {
    expect(formatPrice(1500)).toBe('$1.500');
  });

  it('accepts numeric strings (including ones already containing symbols)', () => {
    expect(formatPrice('352500', 'COP')).toBe('$352.500 COP');
    expect(formatPrice('$352,500', 'COP')).toBe('$352.500 COP');
  });

  it('returns null for null, undefined, NaN or non-positive input (no fallback supplied)', () => {
    expect(formatPrice(null, 'COP')).toBeNull();
    expect(formatPrice(undefined, 'USD')).toBeNull();
    expect(formatPrice(0, 'USD')).toBeNull();
    expect(formatPrice(Number.NaN, 'USD')).toBeNull();
    expect(formatPrice('invalid', 'USD')).toBeNull();
  });

  it('honors a custom fallback when provided', () => {
    expect(formatPrice(null, 'USD', { fallback: 'Consultar' })).toBe('Consultar');
    expect(formatPrice(0, 'USD', { fallback: '—' })).toBe('—');
  });

  it('can suppress the code suffix via includeCode:false', () => {
    expect(formatPrice(13, 'USD', { includeCode: false })).toBe('$13');
  });

  it('is case-insensitive on the currency code and uppercases the suffix', () => {
    expect(formatPrice(1000, 'usd')).toBe('$1.000 USD');
  });

  it('handles very large numbers without scientific notation', () => {
    expect(formatPrice(1234567890, 'COP')).toBe('$1.234.567.890 COP');
  });
});

describe('formatPriceOrConsult', () => {
  it('returns a formatted price when valid', () => {
    expect(formatPriceOrConsult(100, 'USD')).toBe('$100 USD');
  });

  it('defaults to "Consultar" on null/invalid input', () => {
    expect(formatPriceOrConsult(null, 'USD')).toBe('Consultar');
    expect(formatPriceOrConsult(undefined, 'COP')).toBe('Consultar');
    expect(formatPriceOrConsult(0, 'COP')).toBe('Consultar');
  });

  it('accepts a custom fallback string', () => {
    expect(formatPriceOrConsult(null, 'USD', { fallback: 'Solicitar cotización' })).toBe(
      'Solicitar cotización'
    );
  });
});
