// -----------------------------------------------------------------------------
// BLOCK SCHEMA DEFINITION
// -----------------------------------------------------------------------------
// This schema defines the contract for the AI Page Builder.
// The AI must generate JSON that strictly adheres to these types.
// NO direct HTML or JS generation is allowed.
// -----------------------------------------------------------------------------

export type BlockType = 
  | 'hero-modern'
  | 'bento-grid'
  | 'feature-showcase'
  | 'stats-ticker'
  | 'logo-cloud'
  | 'cta-section'
  | 'testimonials-marquee';

export interface BaseBlockProps {
  id?: string;
  className?: string;
}

// --- Specific Block Props ---

export interface HeroModernProps extends BaseBlockProps {
  variant: 'centered' | 'split-left' | 'split-right';
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    color?: 'success' | 'warning' | 'error' | 'info';
  };
  primaryCta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  backgroundImage?: string;
  withParticles?: boolean;
}

export interface BentoGridItem {
  title: string;
  description: string;
  icon?: string; // Icon name from a predefined list
  colSpan?: 1 | 2 | 3;
  href?: string;
}

export interface BentoGridProps extends BaseBlockProps {
  title?: string;
  subtitle?: string;
  items: BentoGridItem[];
}

// --- The Block Union Type ---

export interface Block {
  id: string;
  type: BlockType;
  props: HeroModernProps | BentoGridProps | Record<string, any>; // Relaxed for now, but should be strict union
}

export interface PageConfig {
  meta: {
    title: string;
    description: string;
    slug: string;
  };
  blocks: Block[];
}
