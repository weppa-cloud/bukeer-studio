import {
  isValidPublicLocale,
  publicLocaleSchema,
} from '@/lib/seo/public-metadata';

describe('publicLocaleSchema (#208)', () => {
  it('accepts language-only tokens', () => {
    expect(isValidPublicLocale('es')).toBe(true);
    expect(isValidPublicLocale('en')).toBe(true);
  });

  it('accepts language-region tokens in BCP-47 shape', () => {
    expect(isValidPublicLocale('es-CO')).toBe(true);
    expect(isValidPublicLocale('en-US')).toBe(true);
    expect(isValidPublicLocale('pt-BR')).toBe(true);
  });

  it('rejects malformed tokens', () => {
    expect(isValidPublicLocale('es_CO')).toBe(false); // underscore form
    expect(isValidPublicLocale('ES-CO')).toBe(false); // wrong-case language
    expect(isValidPublicLocale('es-co')).toBe(false); // wrong-case region
    expect(isValidPublicLocale('es-COL')).toBe(false); // over-long region
    expect(isValidPublicLocale('not-a-locale!')).toBe(false);
    expect(isValidPublicLocale('')).toBe(false);
    expect(isValidPublicLocale(null)).toBe(false);
    expect(isValidPublicLocale(undefined)).toBe(false);
  });

  it('publicLocaleSchema.safeParse surfaces the same decision', () => {
    expect(publicLocaleSchema.safeParse('es-CO').success).toBe(true);
    expect(publicLocaleSchema.safeParse('not-a-locale').success).toBe(false);
  });
});
