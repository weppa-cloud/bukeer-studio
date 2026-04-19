'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SectionTypeValue } from '@bukeer/website-contract';
import { Search } from 'lucide-react';
import { StudioInput, StudioTabs } from '@/components/studio/ui/primitives';

// ============================================================================
// Section categories (from section-palette.tsx, expanded)
// ============================================================================

const SECTION_CATEGORIES: { key: string; label: string; types: SectionTypeValue[] }[] = [
  {
    key: 'hero',
    label: 'Hero',
    types: ['hero', 'hero_image', 'hero_video', 'hero_minimal'],
  },
  {
    key: 'content',
    label: 'Content',
    types: ['text', 'rich_text', 'text_image', 'about'],
  },
  {
    key: 'features',
    label: 'Features',
    types: ['features', 'features_grid'],
  },
  {
    key: 'travel',
    label: 'Travel & Products',
    types: ['destinations', 'hotels', 'activities'],
  },
  {
    key: 'social',
    label: 'Social Proof',
    types: ['testimonials', 'testimonials_carousel', 'logo_cloud', 'partners'],
  },
  {
    key: 'data',
    label: 'Data & Media',
    types: ['stats', 'gallery', 'gallery_grid', 'pricing'],
  },
  {
    key: 'conversion',
    label: 'Conversion',
    types: ['cta', 'cta_banner', 'newsletter', 'contact_form'],
  },
  {
    key: 'interactive',
    label: 'Interactive',
    types: ['faq', 'faq_accordion'],
  },
  {
    key: 'blog',
    label: 'Blog',
    types: ['blog_grid'],
  },
];

const SECTION_LABELS: Partial<Record<SectionTypeValue, string>> = {
  hero: 'Hero',
  hero_image: 'Hero with Image',
  hero_video: 'Hero with Video',
  hero_minimal: 'Hero Minimal',
  text: 'Text',
  rich_text: 'Rich Text',
  text_image: 'Text + Image',
  about: 'About',
  features: 'Features',
  features_grid: 'Features Grid',
  destinations: 'Destinations',
  hotels: 'Hotels',
  activities: 'Activities',
  testimonials: 'Testimonials',
  testimonials_carousel: 'Testimonials Carousel',
  logo_cloud: 'Logo Cloud',
  partners: 'Partners',
  stats: 'Statistics',
  gallery: 'Gallery',
  gallery_grid: 'Gallery Grid',
  pricing: 'Pricing',
  cta: 'Call to Action',
  cta_banner: 'CTA Banner',
  newsletter: 'Newsletter',
  contact_form: 'Contact Form',
  faq: 'FAQ',
  faq_accordion: 'FAQ Accordion',
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
};

// ============================================================================
// Component
// ============================================================================

interface SectionPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sectionType: SectionTypeValue) => void;
}

export function SectionPicker({ open, onClose, onSelect }: SectionPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSelect = useCallback(
    (type: SectionTypeValue) => {
      onSelect(type);
      onClose();
      setSearch('');
      setActiveCategory(null);
    },
    [onSelect, onClose]
  );

  const filteredCategories = SECTION_CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter((type) => {
      if (!search) return true;
      const label = SECTION_LABELS[type] ?? type;
      const desc = SECTION_DESCRIPTIONS[type] ?? '';
      const q = search.toLowerCase();
      return label.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || type.includes(q);
    }),
  })).filter((cat) => cat.types.length > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="studio-panel max-w-3xl max-h-[82vh] p-0 overflow-hidden bg-[var(--studio-bg-elevated)] border-[var(--studio-border)]"
        data-testid="studio-picker-dialog"
      >
        <DialogHeader>
          <div className="px-5 pt-5 pb-3 border-b border-[var(--studio-border)]">
            <DialogTitle className="text-[var(--studio-text)] text-lg font-semibold">Add Section</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--studio-text-muted)]" />
            <StudioInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections..."
              className="pl-9"
              autoFocus
              data-testid="studio-picker-search"
            />
          </div>
        </div>

        {!search && (
          <div className="px-5 pb-2" data-testid="studio-picker-category-tabs">
            <StudioTabs
              value={activeCategory ?? 'all'}
              onChange={(value) => setActiveCategory(value === 'all' ? null : value)}
              testIdPrefix="studio-picker-category-tab"
              aria-label="Section categories"
              options={[
                { id: 'all', label: 'All' },
                ...SECTION_CATEGORIES.map((cat) => ({ id: cat.key, label: cat.label })),
              ]}
              className="w-full overflow-x-auto flex-nowrap"
            />
          </div>
        )}

        <ScrollArea className="max-h-[56vh]">
          <div className="space-y-6 px-5 pb-5" data-testid="studio-picker-items">
            {filteredCategories
              .filter((cat) => !activeCategory || cat.key === activeCategory)
              .map((cat) => (
                <div key={cat.key} data-testid={`studio-picker-group-${cat.key}`}>
                  <h4 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wider mb-2">
                    {cat.label}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.types.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleSelect(type)}
                        type="button"
                        data-testid={`studio-picker-item-${type}`}
                        className={cn(
                          'text-left p-3 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] transition-all duration-150',
                          'hover:border-[color-mix(in_srgb,var(--studio-primary)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--studio-primary)_8%,transparent)] hover:shadow-sm hover:-translate-y-0.5',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-focus)]'
                        )}
                      >
                        <p className="text-sm font-medium text-[var(--studio-text)]">
                          {SECTION_LABELS[type] ?? type}
                        </p>
                        <p className="text-[11px] text-[var(--studio-text-muted)] mt-0.5 line-clamp-1">
                          {SECTION_DESCRIPTIONS[type] ?? ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {filteredCategories.length === 0 && (
              <p
                className="text-sm text-[var(--studio-text-muted)] text-center py-8"
                data-testid="studio-picker-empty"
              >
                No sections match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
