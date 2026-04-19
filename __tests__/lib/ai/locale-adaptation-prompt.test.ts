import {
  buildLocaleAdaptationPrompt,
  LocaleAdaptationOutputEnvelopeSchemaV2_1,
  LocaleAdaptationOutputEnvelopeSchemaV2,
  LocaleAdaptationOutputSchema,
  normalizeLocaleAdaptationOutputEnvelope,
} from '@/lib/ai/prompts/locale-adaptation';

describe('locale adaptation prompt', () => {
  it('builds prompt payload with required sections', () => {
    const prompt = buildLocaleAdaptationPrompt({
      sourceLocale: 'es-CO',
      targetLocale: 'en-US',
      pageType: 'package',
      sourceFields: {
        title: 'Paquete Caribe',
        seoTitle: 'Paquete Caribe 5 días',
      },
      glossaryBlock: '- Bukeer -> Bukeer',
      tmHints: [{ field: 'seoTitle', source: 'Paquete Caribe 5 días', target: 'Caribbean Package 5 Days' }],
    });

    expect(typeof prompt.system).toBe('string');
    expect(typeof prompt.user).toBe('string');
    expect(prompt.system).toContain('Glossary terms are non-negotiable');
    expect(prompt.system).toContain('meta_title must stay <= 60 chars');
    expect(prompt.user).toContain('"seoTitle"');
    expect(prompt.user).toContain('glossary');
  });

  it('validates locale adaptation output contract', () => {
    const valid = LocaleAdaptationOutputSchema.safeParse({
      meta_title: 'Best Cartagena Tours',
      meta_desc: 'Discover Cartagena with curated local guides and flexible departures.',
      slug: 'best-cartagena-tours',
      h1: 'Best Cartagena Tours',
      keywords: ['cartagena tours', 'colombia travel'],
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid slug and overlong fields', () => {
    const invalid = LocaleAdaptationOutputSchema.safeParse({
      meta_title: 'x'.repeat(71),
      meta_desc: 'x'.repeat(161),
      slug: 'Invalid Slug',
      h1: 'Heading',
      keywords: [],
    });

    expect(invalid.success).toBe(false);
  });

  it('normalizes legacy output into v2 envelope', () => {
    const normalized = normalizeLocaleAdaptationOutputEnvelope({
      meta_title: 'Best Cartagena Tours',
      meta_desc: 'Discover Cartagena with curated local guides and flexible departures.',
      slug: 'best-cartagena-tours',
      h1: 'Best Cartagena Tours',
      keywords: ['cartagena tours'],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.schema_version).toBe('2.0');
    const valid = LocaleAdaptationOutputEnvelopeSchemaV2.safeParse(normalized);
    expect(valid.success).toBe(true);
  });

  it('accepts explicit v2.1 envelope and keeps full payload fields', () => {
    const normalized = normalizeLocaleAdaptationOutputEnvelope({
      schema_version: '2.1',
      payload_v2: {
        meta_title: 'Best Cartagena Tours',
        meta_desc: 'Discover Cartagena with curated local guides and flexible departures.',
        slug: 'best-cartagena-tours',
        h1: 'Best Cartagena Tours',
        keywords: ['cartagena tours'],
        description_long: 'Long localized description',
        highlights: ['Historic center'],
        faq: [{ question: 'Best season?', answer: 'All year.' }],
        recommendations: ['Add Rosario Islands'],
        cta_final_text: 'Book your trip now',
        program_timeline: [{ title: 'Arrival', description: 'Airport transfer' }],
        inclusions: ['Hotel'],
        exclusions: ['Flights'],
        hero_subtitle: 'Tailor-made experiences',
        category_label: 'Travel',
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.schema_version).toBe('2.1');
    const valid = LocaleAdaptationOutputEnvelopeSchemaV2_1.safeParse(normalized);
    expect(valid.success).toBe(true);
  });

  it('fails closed for unsupported schema versions', () => {
    const normalized = normalizeLocaleAdaptationOutputEnvelope({
      schema_version: '3.0',
      payload_v2: {
        meta_title: 'Title',
        meta_desc: 'Description',
        slug: 'title',
        h1: 'Heading',
        keywords: ['keyword'],
      },
    });

    expect(normalized).toBeNull();
  });

  it('fails closed for malformed explicit v2.1 envelopes', () => {
    const normalized = normalizeLocaleAdaptationOutputEnvelope({
      schema_version: '2.1',
      payload_v2: {
        meta_title: 'Title',
        meta_desc: 'Description',
        slug: 'title',
        h1: 'Heading',
        keywords: ['keyword'],
      },
    });

    expect(normalized).toBeNull();
  });
});
