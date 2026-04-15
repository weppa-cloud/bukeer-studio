import {
  computePriorityScore,
  extractBlockedTransactionalFields,
  isDecisionGrade,
  parseLocaleParts,
} from '@/lib/seo/content-intelligence';

describe('seo content intelligence helpers', () => {
  it('computes higher priority for transactional content than blog for same volume', () => {
    const searchVolume = 1000;
    const blogScore = computePriorityScore({ searchVolume, contentType: 'blog', locale: 'es-CO' });
    const packageScore = computePriorityScore({ searchVolume, contentType: 'package', locale: 'es-CO' });

    expect(packageScore).toBeGreaterThan(blogScore);
  });

  it('applies locale multiplier for english locales', () => {
    const esScore = computePriorityScore({ searchVolume: 500, contentType: 'destination', locale: 'es-CO' });
    const enScore = computePriorityScore({ searchVolume: 500, contentType: 'destination', locale: 'en-US' });

    expect(enScore).toBeGreaterThan(esScore);
  });

  it('flags blocked transactional truth fields', () => {
    const blocked = extractBlockedTransactionalFields({
      seoTitle: 'Allowed',
      seo_intro: 'Allowed',
      price: 123,
      itinerary: ['day 1'],
      policies: { cancellation: 'strict' },
    });

    expect(blocked).toEqual(expect.arrayContaining(['price', 'itinerary', 'policies']));
    expect(blocked).not.toContain('seoTitle');
  });

  it('marks only live/partial as decision-grade', () => {
    expect(isDecisionGrade('live')).toBe(true);
    expect(isDecisionGrade('partial')).toBe(true);
    expect(isDecisionGrade('exploratory')).toBe(false);
  });

  it('parses locale tuple for transcreation metadata', () => {
    const tuple = parseLocaleParts({
      sourceLocale: 'es-CO',
      targetLocale: 'en-US',
      country: 'United States',
      language: 'en',
    });

    expect(tuple).toEqual({
      source_locale: 'es-CO',
      target_locale: 'en-US',
      country: 'United States',
      language: 'en',
    });
  });
});
