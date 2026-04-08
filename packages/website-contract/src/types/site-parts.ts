/**
 * Site Parts — Configurable header/footer variants and mobile sticky bar.
 * Issue #551 Layer 2.
 */

// Header structural layout variants
export type HeaderVariant =
  | 'left-logo'         // [Logo] — [Nav] — [CTA] (default)
  | 'centered-logo'     // [Nav left] — [Logo] — [Nav right + CTA]
  | 'split'             // [Logo + Nav] — [CTA + Social]
  | 'minimal-burger'    // [Logo] — [Hamburger] (always burger, no desktop nav)
  | 'transparent-hero'; // Same as left-logo, overlay transparent on hero

// Footer structural layout variants
export type FooterVariant =
  | '4-column'   // Brand(2col) + Nav + Legal + Contact (default)
  | '3-column'   // Brand + Nav + Contact
  | 'centered'   // Everything stacked centered
  | 'minimal';   // Copyright + social icons only

// Toggleable blocks in header
export type HeaderBlock = 'logo' | 'nav' | 'cta' | 'theme_toggle' | 'social' | 'search';

// Toggleable blocks in footer
export type FooterBlock = 'logo' | 'nav' | 'legal' | 'contact' | 'social' | 'newsletter' | 'copyright';

// Mobile sticky bar button types
export type MobileStickyButtonType = 'whatsapp' | 'phone' | 'cta' | 'email';

export interface MobileStickyButton {
  type: MobileStickyButtonType;
  label: string;
  href: string;
}

export interface HeaderConfig {
  variant: HeaderVariant;
  blocks: HeaderBlock[];
  shrinkOnScroll: boolean;
}

export interface FooterConfig {
  variant: FooterVariant;
  blocks: FooterBlock[];
}

export interface MobileStickyBarConfig {
  enabled: boolean;
  buttons: MobileStickyButton[]; // max 3
}

export interface SiteParts {
  header: HeaderConfig;
  footer: FooterConfig;
  mobileStickyBar?: MobileStickyBarConfig;
}

// Default values
export const DEFAULT_SITE_PARTS: SiteParts = {
  header: {
    variant: 'left-logo',
    blocks: ['logo', 'nav', 'cta', 'theme_toggle'],
    shrinkOnScroll: false,
  },
  footer: {
    variant: '4-column',
    blocks: ['logo', 'nav', 'legal', 'contact', 'social', 'copyright'],
  },
};
