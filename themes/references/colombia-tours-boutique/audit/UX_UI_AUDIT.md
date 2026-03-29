# UX/UI Audit — Colombia Tours Boutique Theme
> **Date**: 2026-03-29
> **Auditor**: Claude (UX/UI Architect)
> **Method**: Side-by-side comparison — Hardcoded (localhost:3002) vs Bukeer (localhost:3000/site/colombiatours)
> **Snapshots**: `audit/snapshots/hardcoded/` vs `audit/snapshots/bukeer/`

---

## Executive Summary

The Bukeer implementation captures ~70% of the hardcoded design. The CSS Variable Bridge solved the color/accent matching, but significant structural and UX differences remain in **listings, details, header, and activity cards**.

**Critical gaps**: 13 issues found, 6 high priority.

---

## Issue Registry

### HIGH PRIORITY (blocks theme parity)

#### H1. Hotel Listing — Missing filter bar (destination dropdown + star rating pills)
- **Hardcoded**: Search input + Destination dropdown + Star rating pills (Todos/3★/4★/5★) in a single row card
- **Bukeer**: Only search input + results count
- **Impact**: Core filtering UX missing — users can't filter by city or rating
- **Fix**: Add destination dropdown and rating pills to `category-page.tsx` when `categoryType === 'hotel'`
- **Ref**: `hardcoded/10-hotels-listing.png` vs `bukeer/10-hotels-listing.png`

#### H2. Activity Listing — Missing category pills + wrong card layout
- **Hardcoded**: Category pills (Todos, City Tours, Naturaleza, Aventura, Nautico, Gastronomia) centered, cards are 1:1 aspect ratio with image overlay (name + price at bottom)
- **Bukeer**: No category pills, cards are standard 16:10 with content below image
- **Impact**: Activity cards look like hotel cards — should have distinct overlay style
- **Fix**: Add category pills to `category-page.tsx` for activities; create activity-specific card variant with image overlay
- **Ref**: `hardcoded/15-activities-listing.png` vs `bukeer/15-activities-listing.png`

#### H3. Hotel Detail — Missing sticky price card (sidebar)
- **Hardcoded**: Right sidebar with price ($180/noche), 5-star rating, "Cotizar" button, trust badges (Pago seguro, Cancelacion 48h, Soporte 24/7) — sticky on scroll
- **Bukeer**: Has form but missing the price header and visual hierarchy. Form uses generic labels instead of themed mono uppercase labels
- **Impact**: The price card is the #1 conversion element — its absence reduces booking intent
- **Fix**: Update `product-landing-page.tsx` QuoteForm to use bridge CSS variables + display price prominently
- **Ref**: `hardcoded/12-hotel-detail-hero.png` vs `bukeer/12-hotel-detail.png`

#### H4. Hotel Detail — Missing amenities grid + gallery 2x2 + includes/excludes
- **Hardcoded**: Description section → 2x4 amenities grid (emoji + label) → 2x2 gallery → Includes/Excludes with check/X icons
- **Bukeer**: Has these sections but uses generic default data instead of product-specific data from DB
- **Impact**: Detail page feels generic — should pull amenities/includes from product data when available
- **Fix**: Extend `ProductData` type to include `amenities`, `includes`, `excludes` fields; update RPC

#### H5. Header — Missing "Reservar Tour" CTA button (golden pill)
- **Hardcoded**: Header has golden pill button "Reservar Tour" on the right side
- **Bukeer**: Header has "Contactanos" with WhatsApp icon (functional but different styling)
- **Impact**: Visual inconsistency — the golden CTA button is a key brand element
- **Fix**: Style the CTA button in header with accent color pill style

#### H6. Theme Toggle — Dark/Light switch not working
- **Hardcoded**: Theme toggle toggles `light` class on `<html>`, smooth transition, entire palette shifts
- **Bukeer**: Toggle exists but M3ThemeProvider manages the theme differently — toggle may not trigger bridge variable recalculation
- **Impact**: Users can't switch to light mode
- **Fix**: Ensure `applyBridgeVariables()` re-runs when theme changes; verify next-themes integration

---

### MEDIUM PRIORITY (visual polish)

#### M1. Listing Hero — Missing eyebrow text
- **Hardcoded**: "ALOJAMIENTO" eyebrow above "Hoteles en Colombia", "397 opciones desde boutique hasta resort" subtitle
- **Bukeer**: Has title + subtitle but no eyebrow label
- **Impact**: Missing visual hierarchy element — eyebrow provides context
- **Fix**: Category page already has `getCategoryLabel()` — add it as eyebrow in the hero

#### M2. Activity Cards — Should be 1:1 overlay style, not 16:10 standard
- **Hardcoded**: Square (1:1) cards with full image, dark gradient bottom, name + price overlaid at bottom, duration badge top-right
- **Bukeer**: Standard 16:10 cards with content section below image
- **Impact**: Activities should feel visually distinct from hotels
- **Fix**: Create activity-specific card variant in `category-page.tsx` with overlay layout

#### M3. Package Cards — Missing gradient overlay on image
- **Hardcoded**: Package cards have `linear-gradient(to top, var(--card-gradient), transparent)` on images
- **Bukeer**: Showcase packages have this — but listing page packages use standard cards
- **Impact**: Minor — homepage showcase is correct, listing doesn't have packages anyway
- **Fix**: Already done for showcase variant; will apply when listing has data

#### M4. Blog Listing — Missing category filter pills styling
- **Hardcoded**: Category pills with gold active state, mono uppercase tracking
- **Bukeer**: Blog listing has pills but with default shadcn styling
- **Impact**: Visual inconsistency with theme aesthetic
- **Fix**: Apply bridge variables to blog page category filters

#### M5. Footer — Social icons spacing and gradient transition
- **Hardcoded**: Gradient transition from page bg to darker footer, social icons with hover effects
- **Bukeer**: Footer renders correctly but lacks the gradient transition
- **Impact**: Minor — subtle design polish
- **Fix**: Add `border-top` gradient or transition div before footer

---

### LOW PRIORITY (nice to have)

#### L1. Font-mono not rendering for labels
- **Hardcoded**: Uses DM Mono for labels, badges, tracking text
- **Bukeer**: Uses `font-mono` class which falls back to system monospace — DM Mono not loaded
- **Impact**: Subtle font difference in small labels
- **Fix**: Add DM Mono to Google Font imports in theme tokens

#### L2. Selection color
- **Hardcoded**: `::selection { background: #c4a96e; color: #1a1714 }` — gold selection
- **Bukeer**: Default selection color
- **Impact**: Very minor polish
- **Fix**: Add to globals.css or bridge variables

---

## Comparison Matrix

| Component | Hardcoded | Bukeer | Match % | Priority |
|-----------|-----------|--------|:-------:|----------|
| Hero (immersive) | Full-screen, stats badges, scroll indicator | Same layout | 90% | OK |
| Header nav | Golden CTA pill | WhatsApp CTA | 75% | H5 |
| Theme toggle | Works (dark/light) | Broken | 0% | H6 |
| Stats counters | Animated | Animated | 95% | OK |
| Destinations marquee | Dual-row scroll | Dual-row scroll | 95% | OK |
| Hotel homepage cards | Showcase with stars | Showcase with stars | 90% | OK |
| Package homepage cards | Showcase with badges | Showcase with badges | 90% | OK |
| Blog homepage cards | Category + date | Category + date | 90% | OK |
| About split_stats | 2-col with stats | 2-col with stats | 90% | OK |
| Testimonials crossfade | Single card rotate | Single card rotate | 85% | OK |
| FAQ accordion | Expand/collapse | Expand/collapse | 90% | OK |
| CTA banner | Gradient bg | Gradient bg | 85% | OK |
| **Hotel listing** | Search + dropdown + pills | Search only | 50% | H1 |
| **Activity listing** | Category pills + 1:1 overlay cards | Search + standard cards | 40% | H2, M2 |
| **Hotel detail** | Hero + breadcrumb + sidebar price card | Hero + breadcrumb + form | 60% | H3, H4 |
| **Activity detail** | Badges + includes/excludes + rates table | Badges + includes + recommendations | 75% | OK |
| Blog listing | Category pills + cards | Category pills + cards | 80% | M4 |
| Footer | Gradient transition + social | Social + nav | 80% | M5 |
| 404 page | N/A (not in hardcoded) | Custom themed | 100% | OK |
| Search page | N/A (not in hardcoded) | Custom themed | 100% | OK |

---

## Recommended Fix Order

1. **H6** Theme toggle fix — quick, high visibility
2. **H1** Hotel listing filters — add dropdown + pills
3. **H2** Activity listing pills + overlay cards — distinct visual identity
4. **H3** Hotel detail price card — conversion-critical
5. **H5** Header CTA golden pill — brand consistency
6. **M1** Listing hero eyebrow — quick add
7. **M2** Activity overlay cards — already have data
8. **H4** Detail page product-specific data — needs RPC update
9. **M4** Blog pill styling — polish
10. **M5** Footer gradient — polish

**Estimated effort**: ~4-6 hours for H1-H6, ~2 hours for M1-M5

---

## Snapshots Index

### Hardcoded (localhost:3002)
| # | File | Content |
|---|------|---------|
| 01 | `hardcoded/01-hero.png` | Homepage hero immersive |
| 02 | `hardcoded/02-destinations.png` | Destination showcase |
| 03 | `hardcoded/03-activities.png` | Activity experience cards |
| 04 | `hardcoded/04-hotels.png` | Hotel showcase cards |
| 05 | `hardcoded/05-packages.png` | Package cards |
| 06 | `hardcoded/06-stats-about.png` | Stats + Why Choose Us |
| 07 | `hardcoded/07-testimonials.png` | Testimonials marquee |
| 08 | `hardcoded/08-blog-faq.png` | Blog preview + FAQ |
| 09 | `hardcoded/09-cta-footer.png` | CTA banner + footer |
| 10 | `hardcoded/10-hotels-listing.png` | Hotels listing page |
| 11 | `hardcoded/11-hotels-cards.png` | Hotel listing cards |
| 12 | `hardcoded/12-hotel-detail-hero.png` | Hotel detail hero |
| 13 | `hardcoded/13-hotel-detail-content.png` | Hotel detail description + sidebar |
| 14 | `hardcoded/14-hotel-detail-sidebar.png` | Hotel detail amenities + gallery |
| 15 | `hardcoded/15-activities-listing.png` | Activities listing |
| 16 | `hardcoded/16-activities-cards.png` | Activity overlay cards |
| 17 | `hardcoded/17-activity-detail-hero.png` | Activity detail hero |
| 18 | `hardcoded/18-activity-detail-content.png` | Activity detail includes/rates |
| 19 | `hardcoded/19-blog-listing.png` | Blog listing |
| 20 | `hardcoded/20-packages-listing.png` | Packages listing |

### Bukeer (localhost:3000/site/colombiatours)
| # | File | Content |
|---|------|---------|
| 01 | `bukeer/01-hero.png` | Homepage hero |
| 02 | `bukeer/02-stats-destinations.png` | Stats + destinations |
| 03 | `bukeer/03-hotels.png` | Hotel showcase cards |
| 04 | `bukeer/04-packages.png` | Package showcase cards |
| 05 | `bukeer/05-about.png` | About split_stats |
| 06 | `bukeer/06-testimonials.png` | Testimonials |
| 07 | `bukeer/07-blog.png` | Blog showcase |
| 08 | `bukeer/08-faq.png` | FAQ accordion |
| 10 | `bukeer/10-hotels-listing.png` | Hotels listing |
| 11 | `bukeer/11-hotels-cards.png` | Hotel listing cards |
| 12 | `bukeer/12-hotel-detail.png` | Hotel detail hero |
| 13 | `bukeer/13-hotel-detail-content.png` | Hotel detail content |
| 15 | `bukeer/15-activities-listing.png` | Activities listing |
