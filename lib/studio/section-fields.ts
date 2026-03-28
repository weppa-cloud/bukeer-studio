/**
 * Section Field Definitions — Per-type form fields for the studio editor.
 *
 * Extracted from lib/puck/configs/page-config.tsx.
 * Each section type has an array of FieldDefinition describing its editable fields.
 */

import type { SectionTypeValue } from '@bukeer/website-contract';

export type FieldType = 'text' | 'textarea' | 'image' | 'select' | 'toggle' | 'color' | 'url' | 'array';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: SelectOption[];
  /** For array fields: the shape of each item */
  itemFields?: FieldDefinition[];
}

export interface SectionDefaultProps {
  [key: string]: unknown;
}

export interface SectionFieldConfig {
  label: string;
  fields: FieldDefinition[];
  defaultProps: SectionDefaultProps;
}

// ============================================================================
// Field Definitions per Section Type
// ============================================================================

const SECTION_FIELDS: Partial<Record<SectionTypeValue, SectionFieldConfig>> = {
  hero: {
    label: 'Hero',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Your Travel Agency' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Discover amazing destinations' },
      { name: 'ctaText', label: 'Button text', type: 'text', placeholder: 'Explore' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url', placeholder: '#' },
      { name: 'backgroundImage', label: 'Background image', type: 'image' },
      {
        name: 'variant', label: 'Variant', type: 'select',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Minimal', value: 'minimal' },
        ],
      },
    ],
    defaultProps: {
      title: 'Your Travel Agency',
      subtitle: 'Discover amazing destinations',
      ctaText: 'Explore',
      ctaUrl: '#',
      backgroundImage: '',
      variant: 'default',
    },
  },

  hero_image: {
    label: 'Hero with Image',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'ctaText', label: 'Button text', type: 'text' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url' },
      { name: 'backgroundImage', label: 'Background image', type: 'image' },
    ],
    defaultProps: {
      title: 'Your Travel Agency',
      subtitle: 'Discover amazing destinations',
      ctaText: 'Explore',
      ctaUrl: '#',
      backgroundImage: '',
      variant: 'image',
    },
  },

  hero_video: {
    label: 'Hero with Video',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'ctaText', label: 'Button text', type: 'text' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url' },
      { name: 'videoUrl', label: 'Video URL', type: 'url' },
    ],
    defaultProps: {
      title: 'Your Travel Agency',
      subtitle: 'Discover amazing destinations',
      ctaText: 'Explore',
      ctaUrl: '#',
      videoUrl: '',
      variant: 'video',
    },
  },

  hero_minimal: {
    label: 'Hero Minimal',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'ctaText', label: 'Button text', type: 'text' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url' },
    ],
    defaultProps: {
      title: 'Your Travel Agency',
      subtitle: 'Discover amazing destinations',
      ctaText: 'Explore',
      ctaUrl: '#',
      variant: 'minimal',
    },
  },

  text: {
    label: 'Text',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'content', label: 'Content', type: 'textarea' },
    ],
    defaultProps: { title: '', content: '' },
  },

  rich_text: {
    label: 'Rich Text',
    fields: [
      { name: 'content', label: 'HTML Content', type: 'textarea' },
    ],
    defaultProps: { content: '<p>Write your content here...</p>' },
  },

  text_image: {
    label: 'Text + Image',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'text', label: 'Content', type: 'textarea' },
      { name: 'featuredImage', label: 'Image', type: 'image' },
    ],
    defaultProps: { title: '', text: '', featuredImage: '', variant: 'default' },
  },

  about: {
    label: 'About',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'About Us' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'featuredImage', label: 'Featured image', type: 'image' },
    ],
    defaultProps: { title: 'About Us', subtitle: '', description: '', featuredImage: '', variant: 'default' },
  },

  features: {
    label: 'Features',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Features' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Features', subtitle: '', variant: 'default' },
  },

  features_grid: {
    label: 'Features Grid',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Features' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Features', subtitle: '', variant: 'default' },
  },

  destinations: {
    label: 'Destinations',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Destinations' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Destinations', subtitle: 'Explore our destinations', variant: 'default' },
  },

  hotels: {
    label: 'Hotels',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Our Hotels' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Our Hotels', subtitle: 'Selected accommodations', variant: 'default' },
  },

  activities: {
    label: 'Activities',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Activities' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Activities', subtitle: 'Unique experiences', variant: 'default' },
  },

  packages: {
    label: 'Packages',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Featured Packages' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Complete trips ready for you' },
    ],
    defaultProps: { title: 'Featured Packages', subtitle: 'Complete trips ready for you', variant: 'default' },
  },

  testimonials: {
    label: 'Testimonials',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'What our clients say' },
    ],
    defaultProps: { title: 'What our clients say', variant: 'default' },
  },

  testimonials_carousel: {
    label: 'Testimonials Carousel',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
    ],
    defaultProps: { title: 'What our clients say', variant: 'carousel' },
  },

  logo_cloud: {
    label: 'Logo Cloud',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Our Partners' },
    ],
    defaultProps: { title: 'Our Partners', variant: 'default' },
  },

  partners: {
    label: 'Partners',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Our Partners' },
    ],
    defaultProps: { title: 'Our Partners', variant: 'default' },
  },

  stats: {
    label: 'Statistics',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'In Numbers' },
    ],
    defaultProps: { title: 'In Numbers', variant: 'default' },
  },

  gallery: {
    label: 'Gallery',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Gallery' },
    ],
    defaultProps: { title: 'Gallery', variant: 'default' },
  },

  gallery_grid: {
    label: 'Gallery Grid',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Gallery' },
    ],
    defaultProps: { title: 'Gallery', variant: 'grid' },
  },

  pricing: {
    label: 'Pricing',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Pricing' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Pricing', subtitle: '', variant: 'default' },
  },

  cta: {
    label: 'Call to Action',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Ready for your next trip?' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'ctaText', label: 'Button text', type: 'text', placeholder: 'Contact Us' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url', placeholder: '#contact' },
      { name: 'backgroundImage', label: 'Background image', type: 'image' },
    ],
    defaultProps: {
      title: 'Ready for your next trip?',
      subtitle: 'Contact us today',
      ctaText: 'Contact Us',
      ctaUrl: '#contact',
      backgroundImage: '',
      variant: 'default',
    },
  },

  cta_banner: {
    label: 'CTA Banner',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'ctaText', label: 'Button text', type: 'text' },
      { name: 'ctaUrl', label: 'Button URL', type: 'url' },
      { name: 'backgroundImage', label: 'Background image', type: 'image' },
    ],
    defaultProps: {
      title: 'Special Offer',
      subtitle: 'Book now',
      ctaText: 'Book Now',
      ctaUrl: '#',
      backgroundImage: '',
      variant: 'banner',
    },
  },

  newsletter: {
    label: 'Newsletter',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Subscribe' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Subscribe', subtitle: 'Get exclusive offers', variant: 'default' },
  },

  contact_form: {
    label: 'Contact Form',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Contact Us' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Contact Us', subtitle: '', variant: 'default' },
  },

  faq: {
    label: 'FAQ',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Frequently Asked Questions' },
    ],
    defaultProps: { title: 'Frequently Asked Questions', variant: 'default' },
  },

  faq_accordion: {
    label: 'FAQ Accordion',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'FAQ' },
    ],
    defaultProps: { title: 'FAQ', variant: 'accordion' },
  },

  blog_grid: {
    label: 'Blog',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Blog' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaultProps: { title: 'Blog', subtitle: 'Latest posts', variant: 'default' },
  },
};

// ============================================================================
// Exports
// ============================================================================

export function getSectionFieldConfig(sectionType: string): SectionFieldConfig | null {
  return SECTION_FIELDS[sectionType as SectionTypeValue] ?? null;
}

export function getSectionDefaultProps(sectionType: string): SectionDefaultProps {
  return SECTION_FIELDS[sectionType as SectionTypeValue]?.defaultProps ?? {};
}

export function getSectionLabel(sectionType: string): string {
  return SECTION_FIELDS[sectionType as SectionTypeValue]?.label ?? sectionType;
}

export { SECTION_FIELDS };
