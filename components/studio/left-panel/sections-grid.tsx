'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StudioInput, StudioTabs } from '@/components/studio/ui/primitives';
import { useDraggable } from '@dnd-kit/core';
import {
  Search,
  Star,
  Type,
  Grid3x3,
  MapPin,
  Building2,
  Compass,
  MessageSquareQuote,
  Images,
  Target,
  Mail,
  HelpCircle,
  FileText,
  BarChart3,
  Bell,
  Handshake,
  Users,
  UserCircle,
  CreditCard,
  Image,
  Video,
  Sparkles,
  Quote,
  LayoutGrid,
} from 'lucide-react';
import type { SectionTypeValue } from '@bukeer/website-contract';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Section icon mapping
// ============================================================================

const SECTION_ICONS: Partial<Record<SectionTypeValue, LucideIcon>> = {
  hero: Star,
  hero_image: Image,
  hero_video: Video,
  hero_minimal: Sparkles,
  text: Type,
  rich_text: FileText,
  text_image: Image,
  about: Users,
  features: Grid3x3,
  features_grid: LayoutGrid,
  destinations: MapPin,
  hotels: Building2,
  activities: Compass,
  packages: CreditCard,
  testimonials: MessageSquareQuote,
  testimonials_carousel: Quote,
  logo_cloud: Handshake,
  partners: Handshake,
  planners: UserCircle,
  stats: BarChart3,
  gallery: Images,
  gallery_grid: Images,
  pricing: CreditCard,
  cta: Target,
  cta_banner: Target,
  newsletter: Bell,
  contact_form: Mail,
  faq: HelpCircle,
  faq_accordion: HelpCircle,
  blog_grid: FileText,
  team: UserCircle,
  travel_planners: UserCircle,
};

// ============================================================================
// Categories & labels (reused from section-picker)
// ============================================================================

// Only show section types that have implemented React components.
// Each type maps to a real component in section-registry.tsx.
// Aliases (gallery_carousel, stats_counters, etc.) are excluded to avoid confusion.
const SECTION_CATEGORIES: { key: string; label: string; types: SectionTypeValue[] }[] = [
  { key: 'hero', label: 'Hero', types: ['hero', 'hero_image', 'hero_video', 'hero_minimal'] },
  { key: 'content', label: 'Content', types: ['text', 'rich_text', 'text_image', 'about'] },
  { key: 'features', label: 'Features', types: ['features', 'features_grid'] },
  { key: 'travel', label: 'Travel', types: ['destinations', 'hotels', 'activities', 'packages'] },
  { key: 'social', label: 'Social', types: ['testimonials', 'partners', 'planners'] },
  { key: 'data', label: 'Media', types: ['stats', 'gallery'] },
  { key: 'conversion', label: 'CTA', types: ['cta', 'cta_banner', 'newsletter', 'contact_form'] },
  { key: 'interactive', label: 'Interactive', types: ['faq', 'blog_grid'] },
];

const SECTION_LABELS: Partial<Record<SectionTypeValue, string>> = {
  hero: 'Hero',
  hero_image: 'Hero Image',
  hero_video: 'Hero Video',
  hero_minimal: 'Hero Min.',
  text: 'Text',
  rich_text: 'Rich Text',
  text_image: 'Text + Img',
  about: 'About',
  features: 'Features',
  features_grid: 'Features Grid',
  destinations: 'Destinations',
  hotels: 'Hotels',
  activities: 'Activities',
  packages: 'Packages',
  testimonials: 'Testimonials',
  testimonials_carousel: 'Testimonials C.',
  logo_cloud: 'Logo Cloud',
  partners: 'Partners',
  planners: 'Planners',
  stats: 'Statistics',
  gallery: 'Gallery',
  gallery_grid: 'Gallery Grid',
  pricing: 'Pricing',
  cta: 'CTA',
  cta_banner: 'CTA Banner',
  newsletter: 'Newsletter',
  contact_form: 'Contact',
  faq: 'FAQ',
  faq_accordion: 'FAQ Acc.',
  blog_grid: 'Blog Grid',
};

const SECTION_DESCRIPTIONS: Partial<Record<SectionTypeValue, string>> = {
  hero: 'Main hero banner with title, subtitle, and CTA',
  hero_image: 'Hero with background image',
  hero_video: 'Hero with background video',
  hero_minimal: 'Simple hero with clean design',
  text: 'Simple text block',
  rich_text: 'Rich text with HTML content',
  text_image: 'Text content with image side by side',
  about: 'About us section with description',
  features: 'Feature highlights',
  features_grid: 'Features in a grid layout',
  destinations: 'Travel destinations showcase',
  hotels: 'Hotel listings from your catalog',
  activities: 'Activity listings from your catalog',
  packages: 'Travel packages with pricing',
  testimonials: 'Customer testimonials',
  testimonials_carousel: 'Testimonials in carousel format',
  logo_cloud: 'Partner/brand logos',
  partners: 'Partners showcase',
  stats: 'Statistics and numbers',
  gallery: 'Photo gallery',
  gallery_grid: 'Photo gallery in grid layout',
  pricing: 'Pricing plans',
  cta: 'Call to action section',
  cta_banner: 'Full-width CTA banner',
  newsletter: 'Newsletter signup form',
  contact_form: 'Contact form',
  faq: 'Frequently asked questions',
  faq_accordion: 'FAQ with accordion',
  blog_grid: 'Blog posts grid',
  planners: 'Travel planners team with WhatsApp',
};

// ============================================================================
// Section card — click to add
// ============================================================================

function SectionCard({
  type,
  onAdd,
}: {
  type: SectionTypeValue;
  onAdd: (type: SectionTypeValue) => void;
}) {
  const Icon = SECTION_ICONS[type] ?? LayoutGrid;
  const label = SECTION_LABELS[type] ?? type;
  const description = SECTION_DESCRIPTIONS[type] ?? '';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `section-card-${type}`,
    data: { sectionType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(type)}
      title={description ? `${label} — ${description}` : label}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg',
        'border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]',
        'transition-all duration-150 cursor-grab active:cursor-grabbing',
        'hover:border-[color-mix(in_srgb,var(--studio-primary)_40%,transparent)]',
        'hover:bg-[color-mix(in_srgb,var(--studio-primary)_8%,transparent)]',
        'hover:shadow-sm hover:-translate-y-0.5',
        'active:scale-95 active:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-focus)]',
        isDragging && 'opacity-50 ring-2 ring-blue-500'
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="w-5 h-5 text-[var(--studio-text-muted)]" />
      <span className="text-[10px] font-medium text-[var(--studio-text)] text-center leading-tight line-clamp-1">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// Main component
// ============================================================================

interface SectionsGridProps {
  onAddSection: (type: SectionTypeValue) => void;
  className?: string;
}

export function SectionsGrid({ onAddSection, className }: SectionsGridProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    return SECTION_CATEGORIES.map((cat) => ({
      ...cat,
      types: cat.types.filter((type) => {
        if (!search) return true;
        const label = SECTION_LABELS[type] ?? type;
        const q = search.toLowerCase();
        return label.toLowerCase().includes(q) || type.includes(q);
      }),
    })).filter((cat) => cat.types.length > 0);
  }, [search]);

  const categoriesToShow = activeCategory
    ? filteredCategories.filter((cat) => cat.key === activeCategory)
    : filteredCategories;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--studio-text-muted)] pointer-events-none" />
          <StudioInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections..."
            className="pl-9 text-xs h-8"
          />
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="px-3 pb-2 overflow-x-auto">
          <StudioTabs
            value={activeCategory ?? 'all'}
            onChange={(value) => setActiveCategory(value === 'all' ? null : value)}
            options={[
              { id: 'all', label: 'All' },
              ...SECTION_CATEGORIES.map((cat) => ({ id: cat.key, label: cat.label })),
            ]}
            className="w-max text-[10px]"
          />
        </div>
      )}

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-4">
          {categoriesToShow.map((cat) => (
            <div key={cat.key}>
              <h4 className="text-[10px] font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider mb-1.5 px-0.5">
                {cat.label}
              </h4>
              <div className="grid grid-cols-3 gap-1.5">
                {cat.types.map((type) => (
                  <SectionCard key={type} type={type} onAdd={onAddSection} />
                ))}
              </div>
            </div>
          ))}

          {categoriesToShow.length === 0 && (
            <p className="text-xs text-[var(--studio-text-muted)] text-center py-8">
              No sections match &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Export for reuse
export { SECTION_ICONS, SECTION_LABELS, SECTION_CATEGORIES };
