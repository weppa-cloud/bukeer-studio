# Spec: Mobile-First UX — editorial-v1 Theme

| Field | Value |
|---|---|
| **Spec ID** | SPEC-MOBILE-001 |
| **Version** | 1.0 |
| **Date** | 2026-04-21 |
| **Status** | Active |
| **Theme** | `editorial-v1` |
| **Pilot site** | colombiatours (`colombiatours.bukeer.com`) |
| **Baseline device** | iPhone 14 Pro — 390×844px |
| **Related ADRs** | ADR-001, ADR-007, ADR-009, ADR-027 |
| **Related EPICs** | #250 (Designer Reference Theme) |
| **Standard doc** | `docs/ux/MOBILE-FIRST-STANDARD.md` |
| **GitHub Epic** | [#279](https://github.com/weppa-cloud/bukeer-studio/issues/279) |

---

## Problem Statement

The editorial-v1 theme was designed desktop-first. On 390px mobile:

- **Hero overflows viewport** (864px > 844px) — meta strip with city/dots invisible below the fold
- **Sections average 1,600px each** — `--section-py: 112px` (no mobile override) = 224px dead vertical padding per section
- **Vertical-only grids** on Destinations (2,027px), Planners (2,459px), Testimonials (1,873px) — all forcing excessive scroll
- **No touch feedback** — `:hover` states don't fire on mobile; zero `:active` transforms
- **Total page height 14,560px** — 41% taller than it should be for mobile

**Impact:** ColombiaTours pilot converts primarily via WhatsApp CTA. If the hero CTA is below fold or the page feels unresponsive to touch, conversion rate drops at first interaction.

---

## Goals

1. Hero always fits viewport on any mobile device (P0)
2. No section taller than 900px on 390px — achieved via carousels/compaction (P1)
3. Touch feedback on all interactive elements (P2)
4. Page height reduction ≥35% vs unoptimized baseline (measured via Playwright) (P2)
5. Lighthouse mobile score ≥80 on performance, ≥90 on a11y (P3)
6. Standard documented + reusable across all editorial-v1 pages (P3)

---

## Scope

### In scope

- `components/site/themes/editorial-v1/editorial-v1.css` — mobile overrides block
- `docs/ux/MOBILE-FIRST-STANDARD.md` — living standard (already created)
- All public pages using `editorial-v1`:
  - Home (`/site/[sub]/`)
  - Product detail — package (`/site/[sub]/paquetes/[slug]`)
  - Activities list (`/site/[sub]/experiencias`)
  - Activity detail (`/site/[sub]/[...slug]` when `product_type=activity`)
  - Planners list (`/site/[sub]/planners`)
  - Planner detail (`/site/[sub]/planners/[slug]`)
  - Blog list (`/site/[sub]/blog`)
  - WhatsApp Flow modal (global overlay)

### Out of scope

- Desktop layout changes
- New components (only CSS-layer changes + existing HTML structure)
- Booking flow (ADR-024 DEFER)
- Hotel detail (Flutter-owned, ADR-025)
- Studio editor mobile (separate concern)

---

## Implemented (Phase 1 — Home CSS baseline)

Already shipped in `editorial-v1.css` mobile-first layer (added 2026-04-21):

| Fix | CSS rule | Before | After |
|-----|----------|--------|-------|
| Hero height exact | `.hero { height: calc(100dvh - 77px) }` | 864px | 767px |
| H1 scale | `.display-xl { font-size: clamp(36px, 9.5vw, 52px) }` | 52px | 37px |
| Global padding | `--section-py: 64px` | 112px | 64px |
| Global gutter | `--gutter: 20px` | 32px | 20px |
| Side list hidden | `.hero-inner > aside { display: none }` | visible | hidden |
| Trust bar scroll | `.trust-bar-f1 .inner` → `flex-wrap: nowrap; overflow-x: auto` | 148px | 61px |
| Destinations rail | `.dest-grid` → flex scroll-snap rail | 2,027px | 649px |
| Planners rail | `.planners` → flex scroll-snap rail | 2,459px | 780px |
| Testimonials rail | `.testi-list` → flex scroll-snap | 1,873px | 995px |
| Touch feedback | `:active { transform: scale(0.96/0.98) }` | none | ✅ |

**Total page height:** 14,560px → 8,621px (−41%)

---

## Remaining work by page

### Page 1 — Home (remaining items)

| Item | Component/CSS | Priority |
|------|---------------|----------|
| Scroll indicator dots for carousels | Pure CSS or tiny JS counter | P2 |
| Hero search form — collapse to 1 field | `.hero-search` mobile layout | P2 |
| Explore map section — hide map, show list only | `.explore-map-section` media query | P2 |
| Entrance animations — IntersectionObserver | New client component `use-reveal.ts` | P3 |
| WhatsApp FAB appears after 1 scroll | IntersectionObserver on trust-bar | P3 |

### Page 2 — Product detail (package)

| Item | Component | Priority |
|------|-----------|----------|
| Hero split single col (image top, text below) | `hero-split.tsx` + CSS | P1 |
| Pricing sticky → sticky bottom bar on mobile | `pricing-sidebar.tsx` | P1 |
| Gallery swipe support | `gallery-lightbox` touch events | P2 |
| Itinerary — collapse days by default on mobile | `itinerary-section.tsx` | P2 |
| Hotel card aspect-ratio mobile | `hotel-card.tsx` CSS | P2 |

### Page 3 — Activities list

| Item | Component | Priority |
|------|-----------|----------|
| Filter tabs `.exp-cats` → horizontal scroll rail | CSS only | P1 |
| View toggle — hide map button on mobile | CSS `display: none` | P1 |
| Activity card grid → 1-col (already done at 640px) | Verify | P2 |

### Page 4 — Activity detail

| Item | Component | Priority |
|------|-----------|----------|
| Hero full single col | CSS media query | P1 |
| Program table `.ev-dest-section` → scroll | CSS overflow-x | P2 |
| Options table → card stack | CSS breakpoint | P2 |
| Meeting point map — max-height 280px | CSS | P2 |

### Page 5 — Planners list

| Item | Component | Priority |
|------|-----------|----------|
| Verify `.pl-grid` 1-col visual | Screenshot QA | P1 |
| Filter/search bar — tap targets ≥44px | CSS min-height | P2 |
| Top planner featured card — single col | CSS | P2 |

### Page 6 — Planner detail

| Item | Component | Priority |
|------|-----------|----------|
| `.pld-hero` avatar centered (verify) | Already at 1100px breakpoint | P1 |
| Signature trips → scroll rail | CSS scroll-snap | P2 |
| Reviews list — compact mobile | CSS | P2 |

### Page 7 — Blog list

| Item | Component | Priority |
|------|-----------|----------|
| Feature post — image top, text below | CSS 1-col | P1 |
| Category filter → horizontal scroll | CSS scroll-snap | P1 |
| Blog card grid → 1-col or 2-col | CSS breakpoint | P2 |

### Page 8 — WhatsApp Flow modal

| Item | Component | Priority |
|------|-----------|----------|
| `.waf-drawer` uses `height: 100dvh` | CSS | P0 |
| Destination chips — min tap target 44px | CSS min-height | P1 |
| Adults/kids counter — large tap zones | CSS | P1 |
| CTA button — full width on mobile | CSS | P1 |

---

## Acceptance Criteria

### Global (all pages)

- [ ] `AC-M-01`: Hero height = `calc(100dvh - 77px)` on ≤640px, meta strip in viewport
- [ ] `AC-M-02`: No section height > 900px on 390px (Playwright assertion)
- [ ] `AC-M-03`: Zero horizontal scroll on any page (Playwright `scrollWidth === clientWidth`)
- [ ] `AC-M-04`: All CTAs have `:active { transform: scale(0.96) }` on mobile
- [ ] `AC-M-05`: All tap targets ≥ 44px height (axe-core or Playwright measure)
- [ ] `AC-M-06`: `--section-py: 64px`, `--gutter: 20px` in ≤640px scope
- [ ] `AC-M-07`: Carousels: `scroll-snap-type: x mandatory`, `scrollbar-width: none`
- [ ] `AC-M-08`: `@media (prefers-reduced-motion: reduce)` disables all CSS transitions/transforms

### Home specific

- [ ] `AC-M-10`: Hero side-list hidden on ≤640px
- [ ] `AC-M-11`: Destinations rail — peek-next visible (72% card width)
- [ ] `AC-M-12`: Planners rail — peek-next visible (72% card width)
- [ ] `AC-M-13`: Trust bar single row (no wrap) → height ≤ 70px

### Product detail specific

- [ ] `AC-M-20`: Pricing — sticky bottom bar on ≤640px, not sidebar
- [ ] `AC-M-21`: Hero split — image-first single column

### Automated test coverage

File: `e2e/tests/mobile/mobile-ux.spec.ts`

```typescript
test('hero fits viewport', ...)        // AC-M-01
test('no section overflow height', ...) // AC-M-02
test('no horizontal scroll', ...)       // AC-M-03
test('carousel peek visible', ...)      // AC-M-11
```

---

## Technical approach

### CSS-only where possible

All changes live in `editorial-v1.css` under the mobile-first layer at file bottom.
No new components required for CSS-only fixes (avoids SSR/bundle overhead).

Pattern:
```css
@media (max-width: 640px) {
  :where([data-template-set="editorial-v1"]) .COMPONENT { ... }
}
```

### Component changes (only when CSS insufficient)

- Pricing sidebar → sticky bottom bar: requires layout change in `pricing-sidebar.tsx`
- Hero search collapse: requires conditional rendering in `hero-search.client.tsx`
- WhatsApp FAB visibility: requires IntersectionObserver in existing `waf-fab.tsx` or CSS scroll-driven

### Breakpoint strategy

| Breakpoint | Context |
|------------|---------|
| ≤ 640px | Mobile phones (primary target) |
| 641–1100px | Tablets / landscape phones |
| > 1100px | Desktop (unchanged) |

### Performance constraints (ADR-007 Cloudflare Workers)

- No new JS bundles from CSS-only changes
- IntersectionObserver usage: only in existing client components (no new `'use client'` pages)
- No framer-motion additions for mobile — use CSS transitions only (`transition: transform 0.08s ease`)

---

## Data model

No DB changes. No new tables. No Supabase migrations.

Theme tokens `--section-py`, `--gutter` are CSS custom properties — scoped to `[data-template-set="editorial-v1"]`.

---

## Dependencies

| Dependency | Status |
|------------|--------|
| ADR-027: editorial-v1 theme adopted | ✅ Accepted |
| Epic #250: theme tokens + sections implemented | ~85% |
| `docs/ux/MOBILE-FIRST-STANDARD.md` | ✅ Created |
| Mobile CSS baseline (home) | ✅ Shipped |

---

## Risks

| Risk | Mitigation |
|------|------------|
| CSS override specificity collision with existing rules | Use `:where()` wrapper (specificity 0) — already the convention |
| Carousel breaks on content-heavy pages | Test with real DB data (pilot seed) |
| Pricing bottom bar obscures content | Use `padding-bottom` on page to prevent overlap |
| Touch `:active` flicker on fast taps | `transition: transform 0.08s ease` — fast enough, no flicker |

---

## Localization

No user-visible text changes. CSS-only in most phases.
Scroll indicator dots (if implemented) use `aria-label` with i18n key `editorialCarouselPosition`.

---

*See also: `docs/ux/MOBILE-FIRST-STANDARD.md` — living standard with device targets, carousel patterns, touch feedback rules, and KPI thresholds.*
