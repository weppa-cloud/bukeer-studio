'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SectionTypeValue } from '@bukeer/website-contract';
import { Search } from 'lucide-react';

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
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Category filter tabs */}
        {!search && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={activeCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Badge>
            {SECTION_CATEGORIES.map((cat) => (
              <Badge
                key={cat.key}
                variant={activeCategory === cat.key ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Section grid */}
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6 pr-4">
            {filteredCategories
              .filter((cat) => !activeCategory || cat.key === activeCategory)
              .map((cat) => (
                <div key={cat.key}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {cat.label}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.types.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleSelect(type)}
                        className={cn(
                          'text-left p-3 rounded-lg border transition-colors',
                          'hover:border-primary hover:bg-primary/5',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                        )}
                      >
                        <p className="text-sm font-medium">
                          {SECTION_LABELS[type] ?? type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {SECTION_DESCRIPTIONS[type] ?? ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sections match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
