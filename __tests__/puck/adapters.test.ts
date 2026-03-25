/**
 * Adapter Roundtrip Tests
 *
 * Verifies that sectionsToPuckData → puckDataToSections produces
 * equivalent data (modulo field name normalization).
 */

import {
  sectionsToPuckData,
  puckDataToSections,
  sectionTypeToComponentName,
  componentNameToSectionType,
} from '@/lib/puck/adapters';
import type { WebsiteSection } from '@/lib/supabase/get-website';

// ============================================================================
// Fixtures
// ============================================================================

const heroSection: WebsiteSection = {
  id: 'sec-hero-001',
  section_type: 'hero',
  variant: 'default',
  display_order: 0,
  is_enabled: true,
  config: {},
  content: {
    title: 'Welcome to Paradise',
    subtitle: 'Discover amazing destinations',
    cta_text: 'Explore Now',
    cta_url: '/destinations',
    background_image: 'https://example.com/hero.jpg',
  },
};

const ctaSection: WebsiteSection = {
  id: 'sec-cta-002',
  section_type: 'cta',
  variant: 'banner',
  display_order: 2,
  is_enabled: true,
  config: {},
  content: {
    title: 'Ready for your next trip?',
    subtitle: 'Contact us today',
    cta_text: 'Get Started',
    cta_url: '#contact',
  },
};

const disabledSection: WebsiteSection = {
  id: 'sec-disabled-003',
  section_type: 'hotels',
  variant: '',
  display_order: 1,
  is_enabled: false,
  config: {},
  content: { title: 'Hotels' },
};

const hotelsSection: WebsiteSection = {
  id: 'sec-hotels-004',
  section_type: 'hotels',
  variant: 'default',
  display_order: 1,
  is_enabled: true,
  config: {},
  content: { title: 'Our Hotels', subtitle: 'Hand-picked accommodations' },
};

// ============================================================================
// Tests
// ============================================================================

describe('sectionTypeToComponentName', () => {
  it('maps known section types to PascalCase', () => {
    expect(sectionTypeToComponentName('hero')).toBe('Hero');
    expect(sectionTypeToComponentName('cta')).toBe('CTA');
    expect(sectionTypeToComponentName('text_image')).toBe('TextImage');
    expect(sectionTypeToComponentName('features_grid')).toBe('FeaturesGrid');
    expect(sectionTypeToComponentName('faq')).toBe('FAQ');
  });

  it('returns original for unknown types', () => {
    expect(sectionTypeToComponentName('unknown_type')).toBe('unknown_type');
  });
});

describe('componentNameToSectionType', () => {
  it('maps PascalCase back to section types', () => {
    expect(componentNameToSectionType('Hero')).toBe('hero');
    expect(componentNameToSectionType('CTA')).toBe('cta');
    expect(componentNameToSectionType('TextImage')).toBe('text_image');
  });

  it('returns original for unknown names', () => {
    expect(componentNameToSectionType('UnknownComponent')).toBe('UnknownComponent');
  });
});

describe('sectionsToPuckData', () => {
  it('converts sections to Puck Data format', () => {
    const result = sectionsToPuckData([heroSection, hotelsSection]);

    expect(result.root).toEqual({ props: {} });
    expect(result.content).toHaveLength(2);

    // Hero (display_order 0 → first)
    expect(result.content[0].type).toBe('Hero');
    expect(result.content[0].props.id).toBe('sec-hero-001');
    expect(result.content[0].props.variant).toBe('default');
    // Content normalized to camelCase
    expect(result.content[0].props.ctaText).toBe('Explore Now');
    expect(result.content[0].props.ctaUrl).toBe('/destinations');
    expect(result.content[0].props.backgroundImage).toBe('https://example.com/hero.jpg');
  });

  it('filters out disabled sections', () => {
    const result = sectionsToPuckData([heroSection, disabledSection]);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].props.id).toBe('sec-hero-001');
  });

  it('sorts by display_order', () => {
    const result = sectionsToPuckData([ctaSection, heroSection, hotelsSection]);
    expect(result.content[0].props.id).toBe('sec-hero-001'); // order 0
    expect(result.content[1].props.id).toBe('sec-hotels-004'); // order 1
    expect(result.content[2].props.id).toBe('sec-cta-002'); // order 2
  });

  it('handles empty sections array', () => {
    const result = sectionsToPuckData([]);
    expect(result.content).toHaveLength(0);
    expect(result.root).toEqual({ props: {} });
  });

  it('sets default variant when empty', () => {
    const sectionNoVariant: WebsiteSection = {
      ...hotelsSection,
      variant: '',
    };
    const result = sectionsToPuckData([sectionNoVariant]);
    expect(result.content[0].props.variant).toBe('default');
  });
});

describe('puckDataToSections', () => {
  it('converts Puck Data back to sections', () => {
    const puckData = sectionsToPuckData([heroSection]);
    const sections = puckDataToSections(puckData);

    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe('sec-hero-001');
    expect(sections[0].section_type).toBe('hero');
    expect(sections[0].display_order).toBe(0);
    expect(sections[0].is_enabled).toBe(true);
  });

  it('strips Puck-internal props from content', () => {
    const puckData = sectionsToPuckData([heroSection]);
    const sections = puckDataToSections(puckData);

    const content = sections[0].content as Record<string, unknown>;
    expect(content).not.toHaveProperty('id');
    expect(content).not.toHaveProperty('variant');
    expect(content).not.toHaveProperty('puck');
    expect(content).not.toHaveProperty('editMode');
  });

  it('preserves display_order as array index', () => {
    const puckData = sectionsToPuckData([heroSection, hotelsSection, ctaSection]);
    const sections = puckDataToSections(puckData);

    expect(sections[0].display_order).toBe(0);
    expect(sections[1].display_order).toBe(1);
    expect(sections[2].display_order).toBe(2);
  });
});

describe('roundtrip: sections → puckData → sections', () => {
  it('preserves section IDs', () => {
    const original = [heroSection, hotelsSection, ctaSection];
    const puckData = sectionsToPuckData(original);
    const roundtripped = puckDataToSections(puckData);

    expect(roundtripped.map((s) => s.id)).toEqual([
      'sec-hero-001',
      'sec-hotels-004',
      'sec-cta-002',
    ]);
  });

  it('preserves section types', () => {
    const original = [heroSection, hotelsSection, ctaSection];
    const puckData = sectionsToPuckData(original);
    const roundtripped = puckDataToSections(puckData);

    expect(roundtripped.map((s) => s.section_type)).toEqual([
      'hero',
      'hotels',
      'cta',
    ]);
  });

  it('preserves content values (normalized to camelCase)', () => {
    const puckData = sectionsToPuckData([heroSection]);
    const roundtripped = puckDataToSections(puckData);

    const content = roundtripped[0].content as Record<string, unknown>;
    // After normalization: cta_text → ctaText, background_image → backgroundImage
    expect(content.title).toBe('Welcome to Paradise');
    expect(content.subtitle).toBe('Discover amazing destinations');
    expect(content.ctaText).toBe('Explore Now');
    expect(content.ctaUrl).toBe('/destinations');
    expect(content.backgroundImage).toBe('https://example.com/hero.jpg');
  });

  it('all roundtripped sections are enabled', () => {
    const puckData = sectionsToPuckData([heroSection, ctaSection]);
    const roundtripped = puckDataToSections(puckData);

    roundtripped.forEach((s) => {
      expect(s.is_enabled).toBe(true);
    });
  });
});
