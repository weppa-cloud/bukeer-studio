import { parseLocaleAdaptationCompletion } from '@/lib/seo/transcreate-client';
import {
  SERP_META_DESC_MAX,
  SERP_META_TITLE_MAX,
  normalizeLocaleAdaptationOutput,
} from '@/lib/ai/prompts/locale-adaptation';

describe('transcreate client parsing', () => {
  it('normalizes keywords string output into array with fallback', () => {
    const raw = JSON.stringify({
      meta_title: 'Cartagena 4 Days All Inclusive | Walled City + Rosario Islands',
      meta_desc: 'Discover Cartagena in 4 days with Caribbean sunsets and islands.',
      slug: 'cartagena-4-days',
      h1: 'Cartagena 4 Days',
      keywords: '',
    });

    const parsed = parseLocaleAdaptationCompletion(raw, 'cartagena 4 days 3 nights');
    expect(parsed).not.toBeNull();
    expect(parsed?.keywords).toEqual(['cartagena 4 days 3 nights']);
  });

  it('clips SERP fields and sanitizes slug', () => {
    const input = {
      meta_title: 'A'.repeat(90),
      meta_desc: 'B'.repeat(200),
      slug: 'Cartagena 4 días !!! and islands',
      h1: 'Cartagena 4 Days',
      keywords: 'cartagena tours',
    };

    const normalized = normalizeLocaleAdaptationOutput(input);
    expect(normalized).not.toBeNull();
    expect(normalized?.meta_title.length).toBeLessThanOrEqual(SERP_META_TITLE_MAX);
    expect(normalized?.meta_desc.length).toBeLessThanOrEqual(SERP_META_DESC_MAX);
    expect(normalized?.slug).toBe('cartagena-4-dias-and-islands');
    expect(normalized?.keywords).toEqual(['cartagena tours']);
  });

  it('parses v2 envelope output and preserves backward-compatible shape', () => {
    const raw = JSON.stringify({
      schema_version: '2.0',
      payload_v2: {
        meta_title: 'Cartagena in 4 Days',
        meta_desc: 'A curated 4-day Cartagena itinerary.',
        slug: 'cartagena-in-4-days',
        h1: 'Cartagena in 4 Days',
        keywords: ['cartagena itinerary'],
        body_content: {
          seo_intro: 'Discover Cartagena with local experts.',
        },
      },
    });

    const parsed = parseLocaleAdaptationCompletion(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.meta_title).toBe('Cartagena in 4 Days');
    expect(parsed?.keywords).toEqual(['cartagena itinerary']);
  });

  it('parses v2.1 envelope output and exposes full payload fields', () => {
    const raw = JSON.stringify({
      schema_version: '2.1',
      payload_v2: {
        meta_title: 'Cartagena in 4 Days',
        meta_desc: 'A curated 4-day Cartagena itinerary.',
        slug: 'cartagena-in-4-days',
        h1: 'Cartagena in 4 Days',
        keywords: ['cartagena itinerary'],
        description_long: 'Long form text',
        highlights: ['Historic center'],
        faq: [{ question: 'When to go?', answer: 'Any season.' }],
        recommendations: ['Visit Rosario Islands'],
        cta_final_text: 'Book now',
        program_timeline: [{ title: 'Day 1', description: 'Arrival' }],
        inclusions: ['Hotel'],
        exclusions: ['Flights'],
        hero_subtitle: 'Tailor-made experiences',
        category_label: 'Travel',
      },
    });

    const parsed = parseLocaleAdaptationCompletion(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.meta_title).toBe('Cartagena in 4 Days');
    expect((parsed as Record<string, unknown>)?.description_long).toBe('Long form text');
  });
});
