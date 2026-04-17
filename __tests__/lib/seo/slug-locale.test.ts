import {
  prefixSlugForLocale,
  stripLocalePrefix,
  detectLocaleFromSlug,
  DEFAULT_LOCALE,
} from '@/lib/seo/slug-locale';

describe('prefixSlugForLocale', () => {
  it('returns slug unchanged when locale matches default', () => {
    expect(prefixSlugForLocale('mejor-epoca', 'es-CO')).toBe('mejor-epoca');
  });

  it('prefixes slug with normalized en-US locale', () => {
    expect(prefixSlugForLocale('best-time', 'en-US', 'es-CO')).toBe(
      'en-us-best-time',
    );
  });

  it('prefixes slug with normalized pt-BR locale', () => {
    expect(prefixSlugForLocale('melhor-epoca', 'pt-BR', 'es-CO')).toBe(
      'pt-br-melhor-epoca',
    );
  });

  it('is idempotent when slug already has the locale prefix', () => {
    expect(
      prefixSlugForLocale('en-us-best-time', 'en-US', 'es-CO'),
    ).toBe('en-us-best-time');
  });

  it('normalizes underscore locales to dash-separated prefixes', () => {
    expect(prefixSlugForLocale('best-time', 'en_US', 'es-CO')).toBe(
      'en-us-best-time',
    );
  });

  it('throws when slug is empty', () => {
    expect(() => prefixSlugForLocale('', 'en-US')).toThrow(/slug/);
  });

  it('throws when locale is empty', () => {
    expect(() => prefixSlugForLocale('x', '', 'es-CO')).toThrow(/locale/);
  });

  it('trims surrounding whitespace before operating', () => {
    expect(prefixSlugForLocale('  best-time  ', 'en-US', 'es-CO')).toBe(
      'en-us-best-time',
    );
  });

  it('uses DEFAULT_LOCALE when defaultLocale omitted', () => {
    expect(DEFAULT_LOCALE).toBe('es-CO');
    // locale === DEFAULT_LOCALE → no prefix
    expect(prefixSlugForLocale('mejor-epoca', DEFAULT_LOCALE)).toBe(
      'mejor-epoca',
    );
    // locale !== DEFAULT_LOCALE → prefix applied
    expect(prefixSlugForLocale('best-time', 'en-US')).toBe('en-us-best-time');
  });

  it('rejects locales with invalid characters', () => {
    expect(() =>
      prefixSlugForLocale('x', 'en.US', 'es-CO'),
    ).toThrow(/invalid/);
  });
});

describe('stripLocalePrefix', () => {
  it('strips a matching locale prefix', () => {
    expect(stripLocalePrefix('en-us-best-time', 'en-US')).toBe('best-time');
  });

  it('is a no-op when no prefix present', () => {
    expect(stripLocalePrefix('best-time', 'en-US')).toBe('best-time');
  });

  it('is a no-op when prefix does not match the given locale', () => {
    expect(stripLocalePrefix('en-us-best-time', 'pt-BR')).toBe(
      'en-us-best-time',
    );
  });

  it('normalizes underscore locales (en_US matches en-us prefix)', () => {
    expect(stripLocalePrefix('en-us-best-time', 'en_US')).toBe('best-time');
  });
});

describe('detectLocaleFromSlug', () => {
  it('returns the candidate whose prefix matches the slug', () => {
    expect(
      detectLocaleFromSlug('en-us-x', ['en-US', 'pt-BR']),
    ).toBe('en-US');
  });

  it('returns null when no candidate prefix matches', () => {
    expect(
      detectLocaleFromSlug('mejor-epoca', ['en-US', 'pt-BR']),
    ).toBeNull();
  });

  it('returns null for empty candidate list', () => {
    expect(detectLocaleFromSlug('en-us-x', [])).toBeNull();
  });

  it('prefers the longest matching prefix when candidates overlap', () => {
    // `en` and `en-US` both start the slug; `en-us-` must win over `en-`.
    expect(
      detectLocaleFromSlug('en-us-best-time', ['en', 'en-US']),
    ).toBe('en-US');
  });
});
