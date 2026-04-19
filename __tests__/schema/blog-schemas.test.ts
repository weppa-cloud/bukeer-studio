/**
 * Snapshot test for generateBlogPostSchemas()
 *
 * Acts as merge gate — protects blog JSON-LD from regressions.
 * Verifies FAQPage schema is emitted when faq_items present (B4).
 */

import { generateBlogPostSchemas } from '@/lib/schema/generators';
import type { WebsiteData, BlogPost } from '@/lib/supabase/get-website';

// ============================================================================
// Fixtures
// ============================================================================

const mockWebsite: WebsiteData = {
  id: 'test-website-001',
  subdomain: 'test-travel',
  status: 'published',
  theme: {} as WebsiteData['theme'],
  content: {
    siteName: 'Test Travel Agency',
    tagline: 'Discover the world',
    seo: { title: 'Test Travel', description: 'Best tours', keywords: 'travel' },
    contact: { email: 'info@test.com', phone: '+57 300 000 0000', address: 'Cartagena, Colombia' },
    social: {},
  },
  account_id: 'test-account-001',
  custom_domain: null,
  template_id: '',
  featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
  sections: [],
};

const mockPostBasic: BlogPost = {
  id: 'post-001',
  website_id: 'test-website-001',
  title: 'Best Hotels in Cartagena',
  slug: 'best-hotels-cartagena',
  excerpt: 'Discover the top hotels in Cartagena Old City',
  content: '## Introduction\n\nCartagena is beautiful...',
  featured_image: 'https://example.com/hotel.jpg',
  category_id: null,
  status: 'published',
  published_at: '2026-03-15T10:00:00Z',
  seo_title: 'Best Hotels in Cartagena 2026',
  seo_description: 'Top 10 hotels in Cartagena Old City with prices and reviews',
  seo_keywords: ['cartagena hotels', 'best hotels', 'old city'],
  word_count: 2200,
  category: { id: 'cat-1', name: 'Destinations', slug: 'destinations', description: null, color: null },
};

const mockPostWithFAQ: BlogPost = {
  ...mockPostBasic,
  id: 'post-002',
  faq_items: [
    { question: 'What is the best area to stay?', answer: 'The Old City (Centro Histórico) is the most popular area.' },
    { question: 'How much do hotels cost?', answer: 'Prices range from $50 to $500 per night depending on the category.' },
    { question: 'Is it safe to walk around?', answer: 'Yes, the tourist areas are generally safe, especially during the day.' },
  ],
  locale: 'es',
  updated_at: '2026-03-20T14:00:00Z',
};

const BASE_URL = 'https://test-travel.bukeer.com';

// ============================================================================
// Tests
// ============================================================================

describe('generateBlogPostSchemas', () => {
  it('returns an array of schema objects', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    expect(Array.isArray(schemas)).toBe(true);
    expect(schemas.length).toBeGreaterThanOrEqual(3); // BlogPosting + Breadcrumb + Org
  });

  it('includes BlogPosting schema', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect(article).toBeDefined();
    expect((article as any).headline).toBe('Best Hotels in Cartagena 2026');
    expect((article as any).description).toBe('Top 10 hotels in Cartagena Old City with prices and reviews');
  });

  it('uses post.locale for inLanguage (F2 fix)', () => {
    const schemas = generateBlogPostSchemas(mockPostWithFAQ, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).inLanguage).toBe('es');
  });

  it('defaults inLanguage to es-CO when no locale', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).inLanguage).toBe('es-CO');
  });

  it('falls back to website.language when post.locale is missing', () => {
    const websiteWithLanguage = {
      ...mockWebsite,
      language: 'en',
    } as WebsiteData;
    const schemas = generateBlogPostSchemas(mockPostBasic, websiteWithLanguage, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).inLanguage).toBe('en');
  });

  it('falls back to website.locale when post.locale and website.language are missing', () => {
    const websiteWithLocale = {
      ...mockWebsite,
      locale: 'pt',
    } as WebsiteData;
    const schemas = generateBlogPostSchemas(mockPostBasic, websiteWithLocale, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).inLanguage).toBe('pt');
  });

  // Issue #208: request-scoped locale must win over post/website fallback.
  describe('inLanguage request-locale override (#208)', () => {
    it('uses resolvedLocale when supplied — wins over post.locale', () => {
      const schemas = generateBlogPostSchemas(mockPostWithFAQ, mockWebsite, BASE_URL, 'en-US');
      const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
      expect((article as any).inLanguage).toBe('en-US');
    });

    it('uses resolvedLocale when supplied — wins over website.language', () => {
      const websiteWithLanguage = { ...mockWebsite, language: 'es' } as WebsiteData;
      const schemas = generateBlogPostSchemas(mockPostBasic, websiteWithLanguage, BASE_URL, 'en-US');
      const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
      expect((article as any).inLanguage).toBe('en-US');
    });

    it('falls back through post/website chain when resolvedLocale is malformed', () => {
      const schemas = generateBlogPostSchemas(
        mockPostWithFAQ,
        mockWebsite,
        BASE_URL,
        'not-a-locale!',
      );
      const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
      // Malformed request locale is rejected → post.locale ('es') wins.
      expect((article as any).inLanguage).toBe('es');
    });

    it('falls back through the full chain when resolvedLocale is undefined', () => {
      const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL, undefined);
      const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
      expect((article as any).inLanguage).toBe('es-CO');
    });
  });

  it('uses updated_at for dateModified (F2 fix)', () => {
    const schemas = generateBlogPostSchemas(mockPostWithFAQ, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).dateModified).toBe('2026-03-20T14:00:00Z');
  });

  it('falls back to published_at for dateModified when no updated_at', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).dateModified).toBe('2026-03-15T10:00:00Z');
  });

  it('uses seo_keywords as array directly (F3 fix)', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const article = schemas.find((s: any) => s['@type'] === 'BlogPosting');
    expect((article as any).keywords).toEqual(['cartagena hotels', 'best hotels', 'old city']);
  });

  describe('FAQPage schema (B4)', () => {
    it('includes FAQPage when faq_items present', () => {
      const schemas = generateBlogPostSchemas(mockPostWithFAQ, mockWebsite, BASE_URL);
      const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
      expect(faq).toBeDefined();
      expect((faq as any).mainEntity).toHaveLength(3);
      expect((faq as any).mainEntity[0]['@type']).toBe('Question');
      expect((faq as any).mainEntity[0].name).toBe('What is the best area to stay?');
    });

    it('does NOT include FAQPage when no faq_items', () => {
      const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
      const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
      expect(faq).toBeUndefined();
    });
  });

  it('includes Breadcrumb schema', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
  });

  it('localizes breadcrumb labels for en-US', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL, 'en-US');
    const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList') as any;
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement?.[0]?.name).toBe('Home');
    expect(breadcrumb.itemListElement?.[1]?.name).toBe('Blog');
  });

  it('includes Organization schema', () => {
    const schemas = generateBlogPostSchemas(mockPostBasic, mockWebsite, BASE_URL);
    const org = schemas.find(
      (s: any) => s['@type'] === 'TravelAgency' || s['@type'] === 'Organization'
    );
    expect(org).toBeDefined();
  });

  it('snapshot: schema shape is stable', () => {
    const schemas = generateBlogPostSchemas(mockPostWithFAQ, mockWebsite, BASE_URL);
    const shape = schemas.map((s: any) => ({
      type: s['@type'],
      context: s['@context'],
    }));
    expect(shape).toMatchSnapshot();
  });
});
