import {
  SeoAuditRequestSchema,
  SeoBriefPostSchema,
  SeoPageCatalogQuerySchema,
  SeoResearchRequestSchema,
  SeoTrackQuerySchema,
  SeoTranscreateRequestSchema,
} from '@/packages/website-contract/src/schemas/seo-content-intelligence';

describe('SEO content intelligence contracts (ADR-003)', () => {
  const websiteId = '11111111-1111-4111-8111-111111111111';
  const itemId = '22222222-2222-4222-8222-222222222222';
  const briefId = '33333333-3333-4333-8333-333333333333';

  it('requires market tuple for research requests', () => {
    const invalid = SeoResearchRequestSchema.safeParse({
      websiteId,
      contentType: 'destination',
      seeds: ['cartagena tours'],
    });

    expect(invalid.success).toBe(false);
  });

  it('accepts explicit locale market research payload', () => {
    const valid = SeoResearchRequestSchema.safeParse({
      websiteId,
      contentType: 'destination',
      country: 'Colombia',
      language: 'es',
      locale: 'es-CO',
      seeds: ['cartagena tours', 'islas del rosario'],
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.locale).toBe('es-CO');
      expect(valid.data.decisionGradeOnly).toBe(true);
    }
  });

  it('supports draft -> approve brief payloads', () => {
    const createPayload = SeoBriefPostSchema.safeParse({
      action: 'create',
      websiteId,
      locale: 'es-CO',
      contentType: 'destination',
      pageType: 'destination',
      pageId: itemId,
      primaryKeyword: 'cartagena tours',
      secondaryKeywords: ['caribe colombiano'],
      brief: { summary: 'brief test' },
    });

    expect(createPayload.success).toBe(true);

    const approvePayload = SeoBriefPostSchema.safeParse({
      action: 'approve',
      websiteId,
      briefId,
    });

    expect(approvePayload.success).toBe(true);
  });

  it('validates transcreation tuple and orchestration fields', () => {
    const valid = SeoTranscreateRequestSchema.safeParse({
      action: 'create_draft',
      websiteId,
      sourceContentId: itemId,
      pageType: 'blog',
      sourceLocale: 'es-CO',
      targetLocale: 'en-US',
      country: 'United States',
      language: 'en',
      draft: { seoTitle: 'Best Cartagena Tours' },
    });

    expect(valid.success).toBe(true);
  });

  it('validates audit/track boundaries', () => {
    expect(
      SeoAuditRequestSchema.safeParse({
        websiteId,
        locale: 'es-CO',
        contentTypes: ['blog', 'destination'],
      }).success,
    ).toBe(true);

    expect(
      SeoTrackQuerySchema.safeParse({
        websiteId,
        from: '2026-01-01',
        to: '2026-01-31',
        locale: 'es-CO',
        contentType: 'destination',
      }).success,
    ).toBe(true);
  });

  it('supports page catalog query contract for human-friendly selectors', () => {
    const valid = SeoPageCatalogQuerySchema.safeParse({
      websiteId,
      pageType: 'page',
      locale: 'en-US',
      search: 'cartagena',
      limit: 50,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.limit).toBe(50);
    }
  });
});
