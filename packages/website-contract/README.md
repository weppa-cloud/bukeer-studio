# @bukeer/website-contract

Shared TypeScript types and Zod schemas for the Bukeer website platform. Consumed by `web-public` (Next.js), `bukeer-mcp` (MCP tools), and AI generators.

## Core Types

### WebsiteData

Root type for a website record from the database.

```typescript
interface WebsiteData {
  id: string;
  account_id: string | null;
  subdomain: string;
  custom_domain: string | null;
  status: 'draft' | 'published';
  template_id: string;
  theme: ThemeV3;                    // { tokens, profile } from @bukeer/theme-sdk
  content: WebsiteContent;
  analytics?: AnalyticsConfig;
  featured_products: FeaturedProducts;
  sections: WebsiteSection[];
  site_parts?: SiteParts;            // Header/footer variants + mobile bar
}
```

### NavigationItem

Dynamic navigation items returned by `get_website_navigation` RPC.

```typescript
interface NavigationItem {
  slug: string;
  label: string;
  page_type: PageType;               // 'category' | 'static' | 'custom' | 'anchor' | 'external'
  category_type?: string;
  href?: string;                     // For anchor (#section) and external links
  parent_slug?: string;              // For 1-level dropdown hierarchy
  target?: '_self' | '_blank';
  header_mode?: HeaderMode;          // 'default' | 'minimal' | 'none'
  children?: NavigationItem[];       // Computed client-side via buildNavTree()
}
```

### HeaderCTA

Configurable call-to-action button in the website header.

```typescript
interface HeaderCTA {
  label: string;                     // "Cotizar viaje", "Reservar ahora"
  href: string;                      // URL, wa.me/..., #contact, /pagina
  variant: 'primary' | 'outline' | 'whatsapp';
  icon?: 'whatsapp' | 'phone' | 'mail' | 'calendar';
  enabled: boolean;
}
```

### SiteParts

Configurable header/footer variants and mobile sticky bar (Issue #551 Layer 2).

```typescript
interface SiteParts {
  header: HeaderConfig;
  footer: FooterConfig;
  mobileStickyBar?: MobileStickyBarConfig;
}

interface HeaderConfig {
  variant: HeaderVariant;            // 'left-logo' | 'centered-logo' | 'split' | 'minimal-burger' | 'transparent-hero'
  blocks: HeaderBlock[];             // ['logo', 'nav', 'cta', 'theme_toggle', 'social', 'search']
  shrinkOnScroll: boolean;
}

interface FooterConfig {
  variant: FooterVariant;            // '4-column' | '3-column' | 'centered' | 'minimal'
  blocks: FooterBlock[];             // ['logo', 'nav', 'legal', 'contact', 'social', 'newsletter', 'copyright']
}

interface MobileStickyBarConfig {
  enabled: boolean;
  buttons: MobileStickyButton[];     // max 3: { type, label, href }
}
```

### Page Types

```typescript
type PageType = 'category' | 'static' | 'custom' | 'anchor' | 'external';
type HeaderMode = 'default' | 'minimal' | 'none';
```

- **anchor**: Internal link to a section hash (`#destinations`, `#contact`)
- **external**: External URL that opens in a new tab
- **HeaderMode**: Controls header visibility per page (full / logo+CTA only / hidden)

## Exports

```typescript
// Types
export type { WebsiteData, WebsiteContent, HeaderCTA, AnalyticsConfig, FeaturedProducts };
export type { WebsitePage, NavigationItem, PageType, HeaderMode };
export type { SiteParts, HeaderConfig, FooterConfig, HeaderVariant, FooterVariant };
export type { HeaderBlock, FooterBlock, MobileStickyBarConfig, MobileStickyButton };
export type { WebsiteSection, PageSection, SectionTypeValue };
export type { WebsitePage, BlogPost, ProductData, QuoteRequestPayload };

// Values
export { SECTION_TYPES, DEFAULT_SITE_PARTS, PAGE_TYPES, CATEGORY_TYPES };

// Schemas (Zod)
export { SectionSchema, M3ThemeSchema, QuoteRequestSchema };

// Validation
export { validateSection, isValidSectionType, isValidPageType };
```

## Package Structure

```
src/
├── types/
│   ├── website.ts       # WebsiteData, WebsiteContent, HeaderCTA
│   ├── page.ts          # WebsitePage, NavigationItem, PageType, HeaderMode
│   ├── site-parts.ts    # SiteParts, HeaderConfig, FooterConfig, MobileStickyBar
│   ├── section.ts       # WebsiteSection, 31 section types
│   ├── theme.ts         # ThemeV3 (lightweight, canonical in @bukeer/theme-sdk)
│   ├── blog.ts          # BlogPost, ContentScore
│   ├── product.ts       # ProductData, ProductPageCustomization
│   ├── template.ts      # WebsiteTemplate
│   ├── quote.ts         # QuoteRequestPayload
│   └── copilot.ts       # CopilotAction, CopilotPlan
├── schemas/
│   ├── sections.ts      # Zod schemas for all 31 section types
│   ├── theme.ts         # M3ThemeSchema (transitional)
│   └── quote.ts         # QuoteRequestSchema
├── validation/
│   ├── validate-section.ts
│   └── valid-types.ts   # PAGE_TYPES, CATEGORY_TYPES guards
└── index.ts
```

## Theme Integration

Theme types are canonical in `@bukeer/theme-sdk`. This package exports a lightweight `ThemeV3` interface for type-safety:

```typescript
interface ThemeV3 {
  tokens: Record<string, unknown>;
  profile: Record<string, unknown>;
}
```

For full validation and compilation, use `@bukeer/theme-sdk` directly.
