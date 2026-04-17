import {
  buildLocaleAdaptationPrompt,
  LocaleAdaptationOutputSchema,
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
});
