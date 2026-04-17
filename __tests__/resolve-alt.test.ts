import { resolveAlt } from '@bukeer/website-contract';

describe('resolveAlt', () => {
  it('returns legacy string alt as-is', () => {
    expect(resolveAlt('Imagen principal', 'es-CO')).toBe('Imagen principal');
  });

  it('resolves full locale first', () => {
    const alt = {
      'es-co': 'Alt Colombia',
      es: 'Alt ES',
      en: 'Alt EN',
    };
    expect(resolveAlt(alt, 'es-CO')).toBe('Alt Colombia');
  });

  it('falls back to language code when locale variant is missing', () => {
    const alt = {
      es: 'Alt ES',
      en: 'Alt EN',
    };
    expect(resolveAlt(alt, 'es-MX')).toBe('Alt ES');
  });

  it('falls back to es when requested locale is missing', () => {
    const alt = {
      es: 'Alt ES',
    };
    expect(resolveAlt(alt, 'pt-BR')).toBe('Alt ES');
  });

  it('returns empty string when alt is missing or empty object', () => {
    expect(resolveAlt(undefined, 'es-CO')).toBe('');
    expect(resolveAlt({}, 'es-CO')).toBe('');
  });
});
