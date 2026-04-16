import {
  buildDecisionGradeBlockDetails,
  computePriorityScore,
  extractBlockedTransactionalFields,
  isDecisionGrade,
  isDecisionGradeRow,
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

  it('marks only live as decision-grade', () => {
    expect(isDecisionGrade('live')).toBe(true);
    expect(isDecisionGrade('partial')).toBe(false);
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

  it('requires live + ready rows for decision-grade panel data', () => {
    expect(isDecisionGradeRow({ confidence: 'live', decision_grade_ready: true })).toBe(true);
    expect(isDecisionGradeRow({ confidence: 'live', decision_grade_ready: false })).toBe(false);
    expect(isDecisionGradeRow({ confidence: 'partial', decision_grade_ready: true })).toBe(false);
  });

  it('builds decision-grade blocked details contract', () => {
    const details = buildDecisionGradeBlockDetails({
      route: 'track',
      websiteId: 'w1',
      locale: 'es-CO',
      contentType: 'destination',
      from: '2026-01-01',
      to: '2026-01-31',
      missingSources: ['seo_page_metrics_daily.live'],
      syncRequestId: 'req-123',
    });

    expect(details.code).toBe('AUTHORITATIVE_SOURCE_REQUIRED');
    expect(details.sync?.code).toBe('SYNC_QUEUED');
    expect(details.sync?.requestId).toBe('req-123');
  });
});
