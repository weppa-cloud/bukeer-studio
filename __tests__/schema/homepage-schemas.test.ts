/**
 * Snapshot test for generateHomepageSchemas()
 *
 * Acts as a merge gate — if generators.ts changes break the
 * schema shape, this snapshot will fail and require review.
 */

import { generateHomepageSchemas } from '@/lib/schema/generators';
import type { WebsiteData } from '@/lib/supabase/get-website';

// ============================================================================
// Fixture
// ============================================================================

const mockWebsite: WebsiteData = {
  id: 'test-website-001',
  subdomain: 'test-travel',
  status: 'published',
  theme: {} as WebsiteData['theme'],
  content: {
    siteName: 'Test Travel Agency',
    tagline: 'Discover the world with us',
    logo: 'https://example.com/logo.png',
    seo: {
      title: 'Test Travel Agency - Adventure Tours',
      description: 'We offer the best adventure tours in Colombia',
      keywords: 'travel, colombia, adventure',
    },
    contact: {
      email: 'info@testtravel.com',
      phone: '+57 300 123 4567',
      address: 'Cartagena, Colombia',
    },
    social: {
      facebook: 'https://facebook.com/testtravel',
      instagram: 'https://instagram.com/testtravel',
      whatsapp: '+573001234567',
    },
  },
  account_id: 'test-account-001',
  custom_domain: null,
  template_id: '',
  featured_products: {
    destinations: [],
    hotels: [],
    activities: [],
    transfers: [],
    packages: [],
  },
  sections: [
    {
      id: 'sec-hero',
      section_type: 'hero',
      variant: 'default',
      display_order: 0,
      is_enabled: true,
      config: {},
      content: {
        title: 'Explore Colombia',
        subtitle: 'Adventure awaits',
      },
    },
    {
      id: 'sec-faq',
      section_type: 'faq',
      variant: 'default',
      display_order: 1,
      is_enabled: true,
      config: {},
      content: {
        items: [
          { question: 'What tours do you offer?', answer: 'We offer adventure and cultural tours.' },
          { question: 'How to book?', answer: 'Contact us via WhatsApp or email.' },
        ],
      },
    },
  ],
};

const BASE_URL = 'https://test-travel.bukeer.com';

// ============================================================================
// Tests
// ============================================================================

describe('generateHomepageSchemas', () => {
  it('returns an array of schema objects', () => {
    const schemas = generateHomepageSchemas(mockWebsite, BASE_URL);
    expect(Array.isArray(schemas)).toBe(true);
    expect(schemas.length).toBeGreaterThan(0);
  });

  it('includes TravelAgency schema', () => {
    const schemas = generateHomepageSchemas(mockWebsite, BASE_URL);
    const org = schemas.find(
      (s: any) => s['@type'] === 'TravelAgency' || s['@type'] === 'Organization'
    );
    expect(org).toBeDefined();
    expect((org as any).name).toBe('Test Travel Agency');
    expect((org as any).url).toBe(BASE_URL);
  });

  it('includes WebSite schema', () => {
    const schemas = generateHomepageSchemas(mockWebsite, BASE_URL);
    const site = schemas.find((s: any) => s['@type'] === 'WebSite');
    expect(site).toBeDefined();
    expect((site as any).url).toBe(BASE_URL);
  });

  it('includes FAQ schema when FAQ section exists', () => {
    const schemas = generateHomepageSchemas(mockWebsite, BASE_URL);
    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect((faq as any).mainEntity).toHaveLength(2);
  });

  it('does NOT include FAQ when no FAQ section', () => {
    const noFaqWebsite = {
      ...mockWebsite,
      sections: mockWebsite.sections.filter((s) => s.section_type !== 'faq'),
    };
    const schemas = generateHomepageSchemas(noFaqWebsite, BASE_URL);
    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
    expect(faq).toBeUndefined();
  });

  it('snapshot matches expected shape', () => {
    const schemas = generateHomepageSchemas(mockWebsite, BASE_URL);
    // Extract @type and key fields for stable snapshot
    const shape = schemas.map((s: any) => ({
      type: s['@type'],
      context: s['@context'],
      hasName: !!s.name,
      hasUrl: !!s.url,
    }));
    expect(shape).toMatchSnapshot();
  });
});
