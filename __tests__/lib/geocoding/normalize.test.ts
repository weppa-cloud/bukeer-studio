import { normalizePlaceName } from '@/lib/geocoding/normalize';

describe('normalizePlaceName', () => {
  it('strips diacritics (NFD + combining marks)', () => {
    expect(normalizePlaceName('Medellín')).toBe('medellin');
    expect(normalizePlaceName('Bogotá')).toBe('bogota');
    expect(normalizePlaceName('Peñón')).toBe('penon');
  });

  it('lowercases and trims outer whitespace', () => {
    expect(normalizePlaceName('  Cartagena  ')).toBe('cartagena');
    expect(normalizePlaceName('SANTA MARTA')).toBe('santa marta');
  });

  it('collapses internal whitespace to a single space', () => {
    expect(normalizePlaceName('valle   del    cocora')).toBe('valle del cocora');
    expect(normalizePlaceName('san\t andres')).toBe('san andres');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizePlaceName('   ')).toBe('');
    expect(normalizePlaceName('')).toBe('');
  });
});
