---
name: website-section-generator
description: |
  Generates production-ready Next.js section components for Bukeer tourism websites
  using shadcn/ui, Aceternity UI, Magic UI, and framer-motion.
  USE WHEN: generating hero sections, feature grids, testimonials, CTAs, landing page sections,
  "create a section", "generate the homepage", "add a destinations grid", website component code.
  NOT FOR: design decisions/theme (use website-designer), quality validation
  (use website-quality-gate), Flutter code (use flutter-developer).

  Examples:
  <example>
  Context: User needs a hero section with animated text.
  user: "Generate a hero section with animated gradient text and particle background"
  assistant: "I'll use website-section-generator with Aceternity background-beams + Magic UI animated-gradient-text."
  <commentary>Section code generation requires website-section-generator.</commentary>
  </example>
  <example>
  Context: User needs a destinations showcase.
  user: "Create a bento grid for our top 6 destinations with hover spotlight effect"
  assistant: "I'll use website-section-generator with Aceternity bento-grid + Magic UI magic-card."
  <commentary>Section component creation uses website-section-generator.</commentary>
  </example>
  <example>
  Context: User wants to change the color palette.
  user: "Switch to a warmer, more tropical color scheme"
  assistant: "I'll use website-designer for the color/theme changes."
  <commentary>Design decisions use website-designer, not this skill.</commentary>
  </example>
---

# Website Section Generator Skill

Generates production-ready Next.js section components for Bukeer tourism websites. Uses the actual tech stack proven in production: framer-motion + shadcn/ui + copy-adapted Aceternity/Magic UI patterns + CSS Variable Bridge.

## Scope

**You Handle:**
- Section component code generation (`.tsx` files)
- Selecting animation patterns from proven in-house components
- Responsive behavior (mobile-first, 3 breakpoints)
- Content structure and TypeScript interfaces matching website-contract schemas
- CSS Variable Bridge application (var(--accent), var(--text-heading), etc.)
- Section registry integration
- Variant system implementation (default + showcase + immersive, etc.)

**Delegate To:**
- `website-designer`: Design decisions, theme tokens, variant selection
- `website-quality-gate`: Lighthouse, accessibility validation
- `nextjs-developer`: Complex Next.js features (API routes, middleware, auth)
- `backend-dev`: Database changes, RPC functions

## Actual Tech Stack (PROVEN IN PRODUCTION)

### Installed Dependencies (npm)

| Library | Usage |
|---------|-------|
| `framer-motion` v12 | ALL animations — motion, AnimatePresence, useScroll, useInView, drag |
| `@radix-ui/*` (via shadcn) | Accessible primitives (Dialog, Accordion, Tabs) |
| `lucide-react` | Icon library |
| `tailwindcss` v4 | Utility CSS |
| `next/image` + `next/font` | Optimized media |
| `class-variance-authority` | Component variants |

### In-House UI Components (framer-motion only, ZERO external deps)

| Component | File | Use For |
|-----------|------|---------|
| `NumberTicker` | `components/ui/number-ticker.tsx` | Stats, ratings, prices counting up |
| `BlurFade` | `components/ui/blur-fade.tsx` | Section entrances (blur → sharp) |
| `TextGenerateEffect` | `components/ui/text-generate-effect.tsx` | Hero headline word-by-word reveal |
| `SpotlightCard` | `components/ui/spotlight-card.tsx` | Mouse-tracking hover glow on cards |
| `CardCarousel` | `components/ui/card-carousel.tsx` | Airbnb-style swipe image carousel |
| `SmoothScroll` | `components/ui/smooth-scroll.tsx` | CSS smooth scroll wrapper |

### MCP Tools (CONSULTATION ONLY — code is copied, NOT installed)

| MCP Tool | Purpose |
|----------|---------|
| `mcp__aceternity-ui__get_component_info` | Read Aceternity component code to copy-adapt |
| `mcp__magic-ui__getRegistryItem` | Read Magic UI component code to copy-adapt |
| `mcp__shadcn-ui__get_component_details` | Check shadcn components before using |

**CRITICAL**: Aceternity UI and Magic UI are NOT npm dependencies. We consult their code via MCP, then create simplified versions using only `framer-motion` as the animation engine. Never `import` from `@aceternity` or `@magicui`.

## Execution Flow

### Phase 1: Read Design Config

Accept from `website-designer` or user context:
- Section type + variant
- Content schema (from `packages/website-contract/src/schemas/sections.ts`)
- Motion profile (which effects to use)

### Phase 2: Select Animation Pattern

Choose from the proven effect catalog:

| Effect | When to Use | Implementation |
|--------|-------------|----------------|
| Text reveal | Hero headlines (1 per page) | `<TextGenerateEffect words={title} />` |
| Number count | Stats, ratings | `<NumberTicker value={num} suffix={suffix} />` |
| Blur entrance | Section titles, cards | `<BlurFade delay={i * 0.05}>` |
| Spotlight hover | Premium interactive cards | `<SpotlightCard>` |
| Card carousel | Cards with multiple images | `<CardCarousel images={imgs} alt={name} />` |
| Fade up | Default entrance | `initial={{ opacity: 0, y: 20 }}` |
| Slide from left | About sections, alternate | `initial={{ opacity: 0, x: -30 }}` |
| Slide from right | Testimonials, social proof | `initial={{ opacity: 0, x: 40 }}` |
| Scale in | Partner logos, badges | `initial={{ opacity: 0, scale: 0.8 }}` |
| Hover lift | ALL clickable cards | `whileHover={{ y: -4 }}` |
| Image zoom | Cards with images | `group-hover:scale-105 transition-transform duration-700` |
| Beam sweep | CTA backgrounds | CSS `@keyframes beam-sweep` |
| Parallax | Hero backgrounds | `useScroll` + `useTransform` |
| Video bg | Cinematic heroes | `<video autoPlay muted loop playsInline>` |

**RULE: Vary animations across sections. NOT all fadeUp.**

### Phase 3: Generate Code

Section component template:

```tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
// Import in-house UI components as needed:
// import { BlurFade } from '@/components/ui/blur-fade';
// import { NumberTicker } from '@/components/ui/number-ticker';
// import { CardCarousel } from '@/components/ui/card-carousel';

interface [Name]SectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function [Name]Section({ section, website }: [Name]SectionProps) {
  const variant = section.variant || 'default';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    // ... typed fields matching website-contract schema
  };

  if (variant === 'showcase') {
    return <Showcase[Name] /* ... */ />;
  }

  return (
    <div className="section-padding">
      <div className="container">
        {/* Use bridge CSS variables for themed styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: 'var(--text-display-md)', color: 'var(--text-heading)' }}>
            {sectionContent.title}
          </h2>
        </motion.div>
        {/* Grid content */}
      </div>
    </div>
  );
}

// Showcase variant — bridge CSS variables for theme compatibility
function Showcase[Name]({ /* props */ }) {
  return (
    <div className="section-padding">
      <div className="container">
        {/* Use style={{ color: 'var(--accent)' }} NOT Tailwind classes */}
      </div>
    </div>
  );
}
```

### Phase 4: Register Section

After creating the component:

1. Add dynamic import in `lib/sections/section-registry.tsx`
2. Register in `sectionComponents` map
3. Add content schema in `packages/website-contract/src/schemas/sections.ts`
4. Add type to `SectionType` enum

### Phase 5: Responsive + Accessibility

- Mobile-first breakpoints: `sm:`, `md:`, `lg:`
- Touch targets: min 44x44px on mobile
- `alt` text on all images
- `prefers-reduced-motion` consideration (BlurFade and motion components handle this)

## Styling Rules — CSS Variable Bridge

**CRITICAL**: Showcase variants use bridge CSS variables, NOT Tailwind color classes.

```tsx
// ✅ CORRECT — works with ANY Bukeer theme
<h2 style={{ color: 'var(--text-heading)' }}>Title</h2>
<span style={{ color: 'var(--accent)' }}>$95</span>
<div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>

// ❌ WRONG — hardcoded, breaks with theme changes
<h2 className="text-white">Title</h2>
<span className="text-primary">$95</span>
<div className="bg-card border border-border">
```

Default variants CAN use Tailwind classes (they're simpler). Showcase variants MUST use bridge variables.

## Section Registry Reference

34 section types registered in `lib/sections/section-registry.tsx`:

| Section Type | Component | Variants |
|-------------|-----------|----------|
| `hero`, `hero_image`, `hero_video`, `hero_minimal` | HeroSection | full, split, centered, minimal, parallax, wavy, globe, immersive |
| `hotels` | HotelsSection | default, showcase |
| `activities` | ActivitiesSection | default, cards, showcase |
| `packages` | PackagesSection | default, showcase |
| `destinations` | DestinationsSection | default, grid, marquee, crossfade |
| `testimonials`, `testimonials_carousel` | TestimonialsSection | default, infinite, crossfade |
| `stats`, `stats_counters` | StatsSection | default (NumberTicker + BlurFade) |
| `cta`, `cta_banner` | CtaSection | default, gradient (beam sweep) |
| `faq`, `faq_accordion` | FaqSection | default (BlurFade stagger) |
| `about` | AboutSection | default, split_stats |
| `blog`, `blog_grid` | BlogSection | default, showcase |
| `planners`, `team`, `travel_planners` | PlannersSection | default (SpotlightCard) |
| `contact`, `contact_form` | ContactSection | default |
| `newsletter` | NewsletterSection | default |
| `partners`, `logos_partners`, `logo_cloud` | PartnersSection | default, grid (scale-in spring) |
| `gallery`, `gallery_grid`, `gallery_carousel`, `gallery_masonry` | GallerySection | default |
| `text`, `rich_text`, `text_image` | TextImageSection | default |
| `features`, `features_grid` | FeaturesGridSection | default |

## Content Schemas

All schemas in `packages/website-contract/src/schemas/sections.ts`:

- `HeroContentSchema` — title, subtitle, ctaText, ctaUrl, backgroundImage, backgroundVideo, eyebrow, heroStats
- `HotelsContentSchema` — title, subtitle, hotels[] (id, name, image, stars, price, location)
- `ActivitiesContentSchema` — title, subtitle, activities[] (id, name, image, duration, price, category, difficulty)
- `PackagesContentSchema` — title, subtitle, packages[] (id, name, image, duration, price, highlights)
- `TestimonialsContentSchema` — title, items/testimonials[] (quote/text, author/name, rating, tour)
- `StatsContentSchema` — title, items/stats[] (value, label, prefix, suffix)
- `FaqContentSchema` — title, items/faqs/questions[] (question, answer)
- `CtaContentSchema` — title, subtitle, ctaText, ctaUrl, backgroundImage
- And 10+ more (see file for full list)

## Output Location

`web-public/components/site/sections/[section-type]-section.tsx`

## Critical Rules

**ALWAYS:**
- Use `'use client'` (framer-motion requires client components)
- Import from `@/components/ui/` for in-house effect components
- Use bridge CSS variables (`var(--accent)`) in showcase variants
- Support at least 2 variants: `default` + `showcase`
- Use `next/image` with `fill` + `sizes` prop
- Vary animation directions across sections
- Register in section-registry.tsx after creation
- Match content schema from website-contract
- Test with dark AND light mode

**NEVER:**
- Import from `@aceternity` or `@magicui` packages (they're NOT installed)
- Use raw Tailwind colors in showcase variants (use bridge variables)
- Use same animation (fadeUp) for every section
- Animate more than 4 elements simultaneously in viewport
- Use animation duration > 800ms (hero exception: 600-700ms)
- Skip responsive breakpoints
- Forget `whileHover={{ y: -4 }}` on clickable cards
- Forget `group-hover:scale-105` on card images
- Use `as any` type assertions on section content
