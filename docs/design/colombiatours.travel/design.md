---
version: "alpha"
name: "ColombiaTours Caribe Editorial"
description: "Visual identity contract for the colombiatours.travel beta partner website in Bukeer Website Studio. Light tropical editorial system for Colombian travel discovery, WhatsApp-first planning, and trust-led conversion."
colors:
  primary: "#0e5b5b"
  on-primary: "#fffaf0"
  primary-container: "#c3d2cb"
  on-primary-container: "#0f4c4b"
  secondary: "#e85c3c"
  on-secondary: "#0b1f1d"
  secondary-container: "#f9d3c3"
  on-secondary-container: "#4a1a0d"
  tertiary: "#6ea842"
  on-tertiary: "#1e3814"
  accent-gold: "#f3b13b"
  background: "#f6f1e8"
  surface: "#fffaf0"
  surface-muted: "#efe6d3"
  surface-soft: "#fbf5e9"
  ink: "#112827"
  ink-muted: "#3b534f"
  muted: "#7a8a84"
  border: "#d6c9ad"
  border-soft: "#e6dcc6"
  dark-surface: "#0b1f1e"
  white: "#ffffff"
typography:
  display-xl:
    fontFamily: "Bricolage Grotesque"
    fontSize: "116px"
    fontWeight: "500"
    lineHeight: "0.94"
    letterSpacing: "-0.035em"
  display-lg:
    fontFamily: "Bricolage Grotesque"
    fontSize: "84px"
    fontWeight: "500"
    lineHeight: "0.98"
    letterSpacing: "-0.03em"
  display-md:
    fontFamily: "Bricolage Grotesque"
    fontSize: "60px"
    fontWeight: "500"
    lineHeight: "1.02"
    letterSpacing: "-0.025em"
  headline-lg:
    fontFamily: "Bricolage Grotesque"
    fontSize: "40px"
    fontWeight: "500"
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: "Bricolage Grotesque"
    fontSize: "26px"
    fontWeight: "500"
    lineHeight: "1.2"
    letterSpacing: "-0.015em"
  title-lg:
    fontFamily: "Bricolage Grotesque"
    fontSize: "20px"
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "Inter"
    fontSize: "18px"
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0em"
  body-md:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0em"
  label-caps:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "1.2"
    letterSpacing: "0.14em"
  editorial-emphasis:
    fontFamily: "Instrument Serif"
    fontSize: "1em"
    fontWeight: "400"
    lineHeight: "1"
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
  xl: "28px"
  hero: "36px"
  full: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "72px"
  "4xl": "112px"
  gutter: "32px"
  container: "1240px"
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
  hero:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.hero}"
  hero-emphasis:
    textColor: "{colors.accent-gold}"
    typography: "{typography.editorial-emphasis}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "14px 22px"
  button-accent:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "14px 22px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  chip:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-primary-soft:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-secondary-soft:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-nature:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  meta-text:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-md}"
  label-muted:
    textColor: "{colors.muted}"
    typography: "{typography.label-caps}"
  card-package:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-soft:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-destination:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
  card-planner:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  faq-item:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    padding: "22px 0"
  divider:
    backgroundColor: "{colors.border-soft}"
    height: "1px"
  divider-strong:
    backgroundColor: "{colors.border}"
    height: "1px"
  cta-banner:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "48px"
---

## Overview

ColombiaTours Caribe Editorial is the beta partner design system for colombiatours.travel. It should feel tropical, warm, expert-local, and human before it feels corporate. The site sells confidence in a trip to Colombia through destination photography, named travel planners, social proof, and direct WhatsApp conversation.

The visual model is a premium travel magazine merged with a practical tour operator storefront. Use immersive imagery, editorial headlines, calm comparison grids, and conversion controls that feel personal rather than transactional. The default mode is light; dark surfaces appear mainly in the hero, image overlays, maps, and high-emphasis banners.

Agents should treat this file as the design contract for the ColombiaTours tenant and the `editorial-v1` template set. Prefer existing implementation tokens from `COLOMBIA_CARIBE_PRESET` and scoped CSS under `[data-template-set="editorial-v1"]`.

## Colors

The palette is anchored by sea teal, warm cream, coral, Colombian gold, and leaf green.

- **Primary teal (#0e5b5b):** Main brand color for primary CTAs, selection states, hero washes, and confident travel-planner moments.
- **Warm cream (#f6f1e8 / #fffaf0):** Default page and card foundation. It should feel sunlit and natural, never beige-heavy or washed out.
- **Ink (#112827):** Main text and dark interactive controls. It carries seriousness and trust.
- **Coral (#e85c3c):** Conversion accent for package/category highlights and energetic calls to action. Pair with dark text when used as a filled button.
- **Gold (#f3b13b):** Editorial emphasis, star ratings, hero `<em>` text, and small moments of Colombian warmth.
- **Leaf (#6ea842):** Nature, activity, eco, and positive/supporting status color.
- **Borders (#d6c9ad / #e6dcc6):** Warm dividers and card outlines. Use them softly; avoid cold gray borders.

Use dark green surfaces only when imagery or hierarchy needs weight. Do not convert the whole site into a dark luxury theme; that direction conflicts with the partner's accessible, warm, WhatsApp-first positioning.

## Typography

Use **Bricolage Grotesque** for display, headlines, card titles, and navigation wordmarks. Its job is to make the site feel crafted and editorial without losing friendliness.

Use **Inter** for body copy, UI labels, metadata, form controls, filters, and dense transactional content. Body copy should stay readable at 15-18px with 1.6 line-height.

Use **Instrument Serif Italic** only as an editorial accent inside headings. In hero and banner contexts, emphasized `<em>` text should be gold. In normal section headings, `<em>` can inherit the heading color unless the component is explicitly designed as a high-emphasis banner.

Type rules:

- Display headings may use tight tracking from -0.035em to -0.02em.
- Body, buttons, chips, and labels must not use negative tracking.
- Labels are uppercase, 12px, semibold, and spaced at 0.14em.
- Avoid overusing serif emphasis; one emphasized phrase per headline is enough.

## Layout

Use a roomy editorial rhythm:

- Container max width: 1240px.
- Desktop gutter: 32px.
- Section vertical padding: 112px.
- Card padding: 24px.
- Header height: 76px.

Home sections should alternate between warm cream page background and slightly lighter surface bands. Avoid placing full page sections inside decorative cards. Cards are for repeated entities such as packages, destinations, planners, hotels, testimonials, and feature items.

Primary layout patterns:

- **Hero:** Full-bleed image/video feel with dark teal wash, rounded bottom corners, left editorial copy, CTAs, trust chip, and optional search/planner panel.
- **Section header:** Two-column editorial header when there is supportive text or a tool/action area; centered header for product grids.
- **Destination grid:** Mosaic cards with image overlay, top tag, large title, and circular arrow CTA.
- **Product grids:** Scannable cards with image, category/country chips, rating, duration, destination, price/consult label, and clear "Ver paquete" style CTA.
- **Planner grid:** Human-first cards with avatar, name, role/specialty, quote or experience, languages, and WhatsApp action.
- **FAQ:** Split layout with intro on the left and accordion list on the right.

Mobile behavior should collapse to one column, preserve the logo-centered header pattern, keep WhatsApp available, and avoid text overlapping imagery.

## Elevation & Depth

Elevation is subtle and tied to interaction. Use shadows to communicate affordance, not decoration.

- Low elevation: `0 1px 2px rgba(17,40,39,.05), 0 1px 1px rgba(17,40,39,.04)`.
- Medium elevation: `0 8px 24px -8px rgba(17,40,39,.18), 0 2px 6px rgba(17,40,39,.06)`.
- High hover elevation: `0 20px 48px -18px rgba(17,40,39,.28), 0 4px 10px rgba(17,40,39,.08)`.

Cards can lift by 3-4px on hover. Images may scale from 1.00 to 1.04 or 1.05 with the organic easing curve. The hero itself should remain flat and image-led.

## Shapes

Shapes are soft and travel-editorial:

- Buttons, chips, filters, icon buttons, language/currency pills: full radius.
- Small UI surfaces: 6-12px radius.
- Standard cards: 20-28px radius.
- Hero bottom corners: 36px radius.

Do not use sharp, enterprise-dashboard card geometry for public ColombiaTours pages. Do not use excessively bubbly shapes that make the brand feel childish.

## Components

**Header:** Sticky, blurred, transparent-to-solid transition on scroll. Logo appears with optional italic tagline on desktop. Navigation links are pill-shaped, with active state as dark ink fill.

**Buttons:** Primary teal for main commitment actions. Coral accent for energetic conversion when the surrounding surface supports it. Ghost and outline buttons should be quiet, with warm borders and pill geometry.

**Chips and filters:** Compact pill controls using teal, coral, ink, or white overlays. They should aid scanning rather than dominate cards.

**Hero:** Must use real destination imagery where available. Overlay with a teal wash to preserve white text contrast. Hero `<em>` text is gold and serif italic.

**Package cards:** Image-dominant with rounded top media, soft surface, warm border, hover lift, rating, metadata, and strong CTA. Prefer short, comparison-friendly content over long excerpts.

**Destination cards:** Mosaic image cards with dark wash, large editorial title, region/category tag, and circular arrow CTA. Hover rotates or shifts the CTA subtly and zooms image media.

**Planner cards:** The differentiator of the brand. Show a real person, specialty, languages, and direct WhatsApp path when possible.

**Testimonials and ratings:** Gold stars, compact rating text, and real traveler proof should be visible near conversion points.

**CTA banners:** Use primary teal or dark green, gold serif emphasis, and vertical action stack on desktop when space allows.

## Do's and Don'ts

Do:

- Use light tropical mode as the default.
- Lead with real Colombian destination imagery and traveler/planner trust.
- Keep WhatsApp CTAs visible and human in tone.
- Use gold for selective editorial emphasis and ratings.
- Keep grids scannable, with metadata that helps compare trips.
- Respect `@bukeer/theme-sdk` v3 shape: `{ tokens, profile }`.
- Use `SECTION_TYPES` from `@bukeer/website-contract` when adding or changing sections.

Don't:

- Do not hardcode section types, colors, or tenant-specific styles outside the theme/token layer.
- Do not turn ColombiaTours into a dark boutique/luxury-only visual system.
- Do not use cold gray UI surfaces when warm cream/border tokens exist.
- Do not hide the travel planner concept behind generic contact forms.
- Do not add booking-engine patterns that imply instant checkout; this pilot is WhatsApp and phone CTA first.
- Do not overuse serif emphasis, decorative gradients, or ornamental cards.
- Do not edit hotel marketing/content in Studio; hotels are Flutter-owned, with SEO metadata editable in Studio.
