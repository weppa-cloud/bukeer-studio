# Section System — Reference

## Source of Truth

`web-public/lib/sections/section-registry.tsx` — 42 types (incl. aliases)

## Section Types by Category

```typescript
// From sectionTypesByCategory in section-registry.tsx
{
  homepage: ['hero', 'destinations', 'hotels', 'activities', 'testimonials', 'about', 'contact', 'cta', 'stats', 'partners', 'faq', 'blog'],
  heroVariants: ['hero_image', 'hero_video', 'hero_minimal'],
  content: ['text', 'rich_text', 'text_image', 'features', 'features_grid', 'faq_accordion'],
  gallery: ['gallery', 'gallery_grid', 'gallery_carousel', 'gallery_masonry'],
  socialProof: ['testimonials_carousel', 'logos_partners', 'logo_cloud', 'stats_counters'],
  conversion: ['cta_banner', 'contact_form', 'newsletter', 'pricing'],
}
```

## Render Pipeline

```
Section data (DB, snake_case)
  → normalizeContent() (snake_case → camelCase)
  → isValidSectionType() guard
  → validateSectionComplete() (Zod)
  → getSectionComponent() lookup
  → <Component section={normalized} website={websiteData} />
```

## Component Signature

```typescript
interface SectionComponentProps {
  section: WebsiteSection;  // Normalized content (camelCase)
  website: WebsiteData;     // Full website context for branding
}

export function HeroSection({ section, website }: SectionComponentProps) {
  const { title, subtitle, ctaUrl, ctaText, backgroundImage } = section.content;
  // ...
}
```

## 16 Section Components

Location: `web-public/components/site/sections/`

| File | Types it handles |
|---|---|
| `hero-section.tsx` | hero, hero_image, hero_video, hero_minimal |
| `destinations-section.tsx` | destinations |
| `hotels-section.tsx` | hotels |
| `activities-section.tsx` | activities |
| `testimonials-section.tsx` | testimonials, testimonials_carousel |
| `about-section.tsx` | about |
| `contact-section.tsx` | contact, contact_form |
| `cta-section.tsx` | cta, cta_banner, pricing |
| `stats-section.tsx` | stats, stats_counters |
| `partners-section.tsx` | partners, logos_partners, logo_cloud |
| `faq-section.tsx` | faq, faq_accordion |
| `blog-section.tsx` | blog |
| `text-image-section.tsx` | text, rich_text, text_image |
| `features-grid-section.tsx` | features, features_grid |
| `gallery-section.tsx` | gallery, gallery_grid, gallery_carousel, gallery_masonry |
| `newsletter-section.tsx` | newsletter |

## Content Normalization

Key aliases handled by `normalizeContent()`:

| Input (legacy) | Output (canonical) |
|---|---|
| `cta_url`, `cta_href`, `ctaLink` | `ctaUrl` |
| `background_image`, `bg_image` | `backgroundImage` |
| `button_text` | `buttonText` |
| `button_url`, `button_href` | `buttonUrl` |

All snake_case keys auto-convert to camelCase.

## Homepage vs Custom Pages

| | Homepage | Custom Page |
|---|---|---|
| Storage | `website_sections` table (1 row/section) | `website_pages.sections` JSONB |
| Load RPC | `get_website_editor_snapshot` | `get_page_editor_snapshot` |
| Save | UPDATE per section row | UPDATE page with full array |
| Section IDs | UUID from table | UUID in JSONB |
