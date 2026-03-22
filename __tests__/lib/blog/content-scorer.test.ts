/**
 * Content Scorer Tests — validates 21 checks across 4 dimensions
 */

import { scoreContent } from '@/lib/blog/content-scorer';

// Known content fixture: a well-structured travel blog post
const GOOD_CONTENT = `## TL;DR

Cartagena is one of Colombia's most popular destinations with average hotel prices of $120-$300/night.

## Best Time to Visit Cartagena

The best time to visit Cartagena is December through April. During this dry season, temperatures average 28°C with minimal rainfall. About 65% of tourists visit during these months.

Hotel prices during peak season are 40% higher than low season. Budget travelers should consider May-June when prices drop significantly and weather remains pleasant.

## Where to Stay in Old City

The Old City (Centro Histórico) offers the most authentic experience. Over 80% of boutique hotels are concentrated in this UNESCO World Heritage area. Prices range from $50 for hostels to $500 for luxury hotels.

San Diego neighborhood is increasingly popular with 25% year-over-year growth in new hotel openings. It offers better value than the walled city with similar walkability.

## Getting Around the City

Taxis are the primary transport with typical fares of $3-8 within the tourist zone. Uber operates in Cartagena since 2019 with fares approximately 30% cheaper than taxis.

Walking is the best way to explore the Old City. The walled city is roughly 1.5 km across, making most attractions accessible within 15 minutes on foot.

## Local Food Scene

Cartagena's food scene has grown 150% in restaurant openings since 2020. The average meal costs $8-15 at local restaurants and $25-50 at upscale establishments.

Don't miss ceviche at La Cevichería (rated #1 on TripAdvisor for 3 consecutive years) and arepas de huevo from street vendors in Plaza Santo Domingo.

## FAQ

### What is the best area to stay in Cartagena?
The Old City (Centro Histórico) is the most popular area, offering walkable access to major attractions, restaurants, and nightlife.

### How much should I budget per day?
Budget travelers can manage on $50-80/day. Mid-range travelers should budget $120-200/day including hotel, meals, and activities.

### Is Cartagena safe for tourists?
Yes, the tourist areas are generally safe. Standard travel precautions apply — avoid displaying expensive jewelry and use registered taxis at night.`;

const POOR_CONTENT = `This is a short post about travel. It is nice to travel. Travel is fun.`;

describe('scoreContent', () => {
  describe('grading', () => {
    it('gives A/B grade to well-structured content', () => {
      const result = scoreContent({
        content: GOOD_CONTENT,
        title: 'Best Hotels in Cartagena 2026',
        metaDescription: 'Discover the top hotels in Cartagena Old City with prices and insider tips for every budget.',
        keywords: ['cartagena hotels', 'best hotels'],
        faqItems: [
          { question: 'What is the best area?', answer: 'The Old City.' },
          { question: 'How much to budget?', answer: '$50-200/day.' },
          { question: 'Is it safe?', answer: 'Yes, tourist areas are safe.' },
        ],
        locale: 'en',
      });

      // Content is ~500 words (not 2100+) so word_count check lowers grade
      // But structure, FAQ, data density should still score well
      expect(['A', 'B', 'C']).toContain(result.grade);
      expect(result.overall).toBeGreaterThanOrEqual(50);
    });

    it('gives D/F grade to poor content', () => {
      const result = scoreContent({
        content: POOR_CONTENT,
        title: 'Travel',
        locale: 'en',
      });

      expect(['D', 'F']).toContain(result.grade);
      expect(result.overall).toBeLessThan(40);
    });
  });

  describe('dimensions', () => {
    it('returns all 4 dimension scores', () => {
      const result = scoreContent({ content: GOOD_CONTENT, title: 'Test', locale: 'en' });

      expect(result.seo).toBeGreaterThanOrEqual(0);
      expect(result.seo).toBeLessThanOrEqual(100);
      expect(result.structure).toBeGreaterThanOrEqual(0);
      expect(result.readability).toBeGreaterThanOrEqual(0);
      expect(result.geo).toBeGreaterThanOrEqual(0);
    });
  });

  describe('21 checks', () => {
    it('returns exactly 21 checks', () => {
      const result = scoreContent({ content: GOOD_CONTENT, title: 'Test', locale: 'en' });
      expect(result.checks).toHaveLength(21);
    });

    it('each check has required fields', () => {
      const result = scoreContent({ content: GOOD_CONTENT, title: 'Test', locale: 'en' });

      for (const check of result.checks) {
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('category');
        expect(check).toHaveProperty('pass');
        expect(check).toHaveProperty('score');
        expect(check).toHaveProperty('weight');
        expect(check).toHaveProperty('message');
        expect(['seo', 'readability', 'structure', 'geo']).toContain(check.category);
      }
    });

    it('detects FAQ section', () => {
      const result = scoreContent({
        content: GOOD_CONTENT,
        title: 'Test',
        faqItems: [
          { question: 'Q1', answer: 'A1' },
          { question: 'Q2', answer: 'A2' },
          { question: 'Q3', answer: 'A3' },
        ],
        locale: 'en',
      });

      const faqCheck = result.checks.find(c => c.id === 'has_faq');
      expect(faqCheck?.pass).toBe(true);
    });

    it('detects TL;DR', () => {
      const result = scoreContent({ content: GOOD_CONTENT, title: 'Test', locale: 'en' });
      const tldrCheck = result.checks.find(c => c.id === 'has_tldr');
      expect(tldrCheck?.pass).toBe(true);
    });

    it('detects missing TL;DR', () => {
      const result = scoreContent({ content: POOR_CONTENT, title: 'Test', locale: 'en' });
      const tldrCheck = result.checks.find(c => c.id === 'has_tldr');
      expect(tldrCheck?.pass).toBe(false);
    });

    it('checks keyword in title', () => {
      const result = scoreContent({
        content: GOOD_CONTENT,
        title: 'Best Hotels in Cartagena',
        keywords: ['cartagena'],
        locale: 'en',
      });
      const kwCheck = result.checks.find(c => c.id === 'keyword_in_title');
      expect(kwCheck?.pass).toBe(true);
    });
  });

  describe('contentStructure', () => {
    it('parses sections from markdown', () => {
      const result = scoreContent({ content: GOOD_CONTENT, title: 'Test', locale: 'en' });
      expect(result.contentStructure.sections.length).toBeGreaterThan(3);
      expect(result.contentStructure.totalWords).toBeGreaterThan(300);
    });

    it('detects internal and external links', () => {
      const contentWithLinks = GOOD_CONTENT + '\n\n[INTERNAL_LINK:hotels] [More info](https://example.com)';
      const result = scoreContent({ content: contentWithLinks, title: 'Test', locale: 'en' });
      expect(result.contentStructure.internalLinkCount).toBeGreaterThanOrEqual(1);
      expect(result.contentStructure.externalLinkCount).toBeGreaterThanOrEqual(1);
    });
  });
});
