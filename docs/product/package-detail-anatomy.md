# Package Detail Landing Page — Anatomy & Hygiene Guide

**Last updated:** 2026-04-19 (priority v2 note — Studio editors for Pkg shipped; Act parity pending W2; Hotel as-is; Booking DEFER — cross-ref matrix Section N/O/P)
**Spec references:** [[#127]] [[#171]] [[#172]] [[#173]] [[#174]] · EPIC #214 (pilot readiness)
**Entry point:** `components/pages/product-landing-page.tsx` (`productType === 'package'`)
**Data source:** `get_website_product_page` RPC + `get_package_aggregated_data` RPC (F1)
**Cross-ref:** [[product-detail-matrix]] Section N (editor → campo), Section O (Flutter-only gaps), Section P (blog transcreate — outside package scope but consumed by W5). Booking post-pilot per [[ADR-024]].

---

## 1. Section Inventory

Every section that renders for a package kit, in top-to-bottom order. Each row shows:
what data powers it, its current status, and its fallback when data is absent.

### 1.1 Hero

| Sub-element | Data field | Fallback | Status |
|------------|------------|----------|--------|
| Background image | `product.image` → `gallery[0]` | Gradient placeholder | ✅ |
| Title | `pageCustomization.custom_hero.title` → `product.name` | — | ✅ |
| Location subtitle | `pageCustomization.custom_hero.subtitle` → `product.location` → `city + country` | — | ✅ |
| Duration badge | `product.duration_days/duration_nights` → `product.duration` | Hidden | ✅ |
| Rating badge | `product.user_rating` → `product.rating` → avg(Google reviews) | Hidden | ✅ |
| Group size badge | Regex on `product.name` + `description` + `services_snapshot_summary` | Hidden | ⚠️ Fragile — no explicit DB field |
| Price "Desde" | `product.price` (multi-currency via `currency` config) | "Consultar" | ✅ |
| WhatsApp CTA | `website.content.whatsapp` | Phone fallback | ✅ |
| Phone CTA | `website.content.phone` | Hidden if absent | ✅ |

### 1.2 Sticky CTA Bar

| Sub-element | Data field | Status |
|------------|------------|--------|
| Price | Same as Hero price | ✅ |
| WhatsApp button | `website.content.whatsapp` | ✅ |
| Phone button | `website.content.phone` | ✅ |
| Visible after scroll | `scrollY > 200` | ✅ |

### 1.3 Breadcrumb

`Inicio / Paquetes / [product.name]` — auto-generated. ✅

### 1.4 Highlights Grid

| Data field | Fallback | Status |
|-----------|----------|--------|
| `pageCustomization.custom_highlights` | `product.highlights` (from `program_highlights` via F3 AI) | Hidden if both empty |

**Hygiene note:** If `program_highlights` is empty and no custom override exists, this section does not render. Trigger F3 AI generation or add manual highlights via Flutter admin.

**Precedence in `normalizeProduct`:** `program_highlights` (F3 AI) → `product.highlights` (legacy V2) → null.

Status: ✅ (data-dependent — see F3)

### 1.5 Gallery

| Data field | Precedence | Cap | Status |
|-----------|-----------|-----|--------|
| `product.program_gallery` | 1st (curator) | 12 | ✅ (F1 aggregated) |
| Child `main_image` per itinerary item | 2nd | 12 | ✅ (F1 aggregated) |
| `images` table by `entity_id` | 3rd | 12 | ✅ (F1 aggregated) |
| `product.image` | Final fallback | 1 | ✅ |

Requires ≥2 images to render lightbox UI. With 1 image: hero only, no gallery section.

### 1.6 Description

| Data field | Fallback | Status |
|-----------|----------|--------|
| `product.description` (if ≥80 chars) | `buildPackageDescriptionFallback()` — synthesizes from location + duration | ✅ |
| `product.description` (if <80 chars and not locked) | F3 AI generates and persists to DB | ✅ (F3) |

**Hygiene note:** Check `description_ai_generated` flag in Flutter admin. If `false`, field was manually edited and AI won't overwrite.

### 1.7 Circuit Map ("Ruta del paquete")

Renders when `itinerary_items` contain cities matchable to known coordinates.

| Data field | Status |
|-----------|--------|
| `itinerary_items[].destination` | Geo-lookup via `lookupCityCoords()` |
| `itinerary_items[].title` | Used for marker labels |

**Fallback:** If <2 stops can be geo-resolved → renders badge list of stop names instead of map.
**Component:** `components/site/package-circuit-map.tsx`
**Cities covered:** `lib/products/city-coords.ts` (17 Colombian cities). Extend to add more.

Status: ✅ (with 17-city limit — see gap G3)

### 1.8 Day-by-Day Itinerary ("Día a día")

Renders from `itinerary_items` sorted by `day_number`.

Each day rendered by `<ItineraryItemRenderer>` which dispatches to variants:

| `product_type` value | Variant renders | Status |
|---------------------|----------------|--------|
| `Hoteles` | Star rating + amenity badges (max 6) + link to `/hoteles/{slug}` | ✅ |
| `Actividades` | Title + description + expandable `schedule_data` (max 5 steps) + link to `/actividades/{slug}` | ✅ |
| `Transporte` | `{from} → {to} · {duration}` | ✅ |
| `Vuelos` | `{carrier} {flight_number} · {departure} → {arrival}` | ✅ |
| Any other | Title + description (generic fallback) | ✅ |

Day numbers renumber consecutively 1..N regardless of `itinerary_items.day_number` gaps.

**Hygiene note:** Itinerary only renders if `itinerary_items` are linked via `source_itinerary_id` or via `itineraries.source_package_id`. If empty, "Día a día" section is hidden.

### 1.9 Includes & Excludes

| Data field | Precedence | Fallback | Cap |
|-----------|-----------|----------|-----|
| `product.program_inclusions` | 1st (kit-level or F1 aggregated) | — | 15 |
| `product.inclusions` | 2nd (legacy) | — | — |
| Hardcoded defaults | Final | Always shown if all above empty | 3 items |
| `product.program_exclusions` | 1st | — | 15 |
| `product.exclusions` | 2nd | — | — |
| Hardcoded defaults | Final (merged) | Always 3 items appended | — |

**Component:** `components/site/include-exclude-section.tsx` (`isPackage={true}`)

**Hygiene note:** If `program_inclusions` is empty, the section shows generic defaults. Trigger F1 aggregation (or populate via Flutter admin) to surface real child-product inclusions.

Status: ✅ (data-dependent — see F1)

### 1.10 Meeting Point Map

Only renders if circuit map is unavailable. Shows `product.meeting_point` location.

Most packages are multi-city → circuit map takes precedence. Meeting point map is primarily for single-destination packages with a defined start point.

Status: ✅ (conditional)

### 1.11 Options Table

Renders `product.options` (activity pricing model). **Not typically used for packages.** Appears only if options data is present — which should be rare for `package_kits`.

Status: ⚠️ Included but rarely relevant — see gap G5.

### 1.12 FAQ Section

| Data field | Fallback | Status |
|-----------|----------|--------|
| `pageCustomization.custom_faq` | `PACKAGE_FAQS_DEFAULT` (6 questions) | ✅ |

Default questions cover: flights, cancellation policy, customization, booking, family travel, payment.

**Hygiene note:** `PACKAGE_FAQS_DEFAULT` answers are generic. For better conversion, override via `custom_faq` in Flutter page editor.

Component: `components/site/product-faq.tsx`
Defaults: `lib/products/package-faqs-default.ts`

### 1.13 Trust Badges

| Data field | Fallback | Status |
|-----------|----------|--------|
| `website.content.trust` (TrustContent schema) | 3 generic defaults | ✅ |

Shows: RNT number, years active, traveler count, certifications, insurance badges.

Component: `components/site/trust-badges.tsx`

### 1.14 Google Reviews

| Data field | Condition | Status |
|-----------|-----------|--------|
| `googleReviews[]` | Only if `website.content.account.google_reviews_enabled === true` | ✅ |

Fetched server-side (max 3 reviews). Integrates with rating badge in Hero.

### 1.15 Sidebar (Desktop)

| Sub-element | Data field | Status |
|------------|------------|--------|
| Product type | Hardcoded "Paquete" | ✅ |
| Location | `product.location` | ✅ |
| Duration | `resolvePackageDuration()` | ✅ |
| Rating | `effectiveRating` (same as Hero) | ✅ |
| Price | Same as Hero | ✅ |
| CTAs | WhatsApp + Phone | ✅ |

### 1.16 Final CTA Section

"¿Listo para vivir esta experiencia?" — static WhatsApp + Phone buttons.

Status: ✅

### 1.17 Similar Packages Carousel

| Logic | Status |
|-------|--------|
| Fetch 3 packages with same `location` | ✅ |
| Fallback: top 3 packages by account | ✅ |
| Excludes current package | ✅ |

Component: inline in `product-landing-page.tsx`.

---

## 2. Data Flow Diagram

```
Flutter Admin → package_kits (DB)
                    │
                    ├── direct fields (name, description, price, location, slug…)
                    │
                    ├── source_itinerary_id
                    │       └── itinerary_items (day_number, product_type, id_product)
                    │               ├── hotels (main_image, inclutions, exclutions, amenities, star_rating)
                    │               ├── activities (main_image, inclutions, exclutions, schedule_data, slug)
                    │               └── transfers (main_image, inclutions, exclutions)
                    │
                    └── program_* fields (inclusions, exclusions, gallery, highlights)
                            └── if empty → get_package_aggregated_data() RPC (F1)
                                          fills from child products on-demand

Next.js SSR (get_website_product_page RPC)
  │
  ├── F1: get_package_aggregated_data() → merges aggregated fields
  ├── F3: /api/ai/generate-package-content → fills highlights + description if absent
  │
  └── ProductLandingPage
        ├── Hero (name, image, price, location, duration, rating)
        ├── Highlights Grid (program_highlights → F3 AI)
        ├── Gallery (program_gallery → F1 aggregated)
        ├── Description (description → F3 AI fallback)
        ├── Circuit Map (itinerary_items.destination → city-coords lookup)
        ├── Day-by-Day (itinerary_items → ItineraryItemRenderer per type)
        ├── Includes/Excludes (program_inclusions/exclusions → F1 aggregated)
        ├── FAQ (custom_faq → PACKAGE_FAQS_DEFAULT)
        └── Trust Badges (website.content.trust)
```

---

## 3. Operator Hygiene Checklist

For a package to render at full quality, verify in Flutter admin:

### Required (landing breaks or falls back without these)

- [ ] `name` — not empty, ≤80 chars recommended
- [ ] `description` — ≥80 chars OR F3 AI generation enabled
- [ ] `price` — set in primary currency
- [ ] `location` — city or destination name (used in Hero + breadcrumb + circuit)
- [ ] `image` — at least 1 cover image (hero background)
- [ ] `slug` — set, URL-safe, unique per account
- [ ] `source_itinerary_id` — linked itinerary (powers circuit map + day-by-day + F1 aggregation)

### Recommended (improves conversion)

- [ ] `duration_days` + `duration_nights` — explicit fields, don't rely on text parsing
- [ ] `program_highlights` — 3–5 bullets OR trigger F3 AI generation
- [ ] `program_inclusions` / `program_exclusions` — OR ensure itinerary child products have `inclutions`/`exclutions` data (F1 aggregation)
- [ ] `program_gallery` — OR ensure child products have `main_image` (F1 aggregation)
- [ ] Each `itinerary_item` linked to a product with `product_type` set correctly
- [ ] Each hotel in itinerary has `star_rating` + `amenities`
- [ ] Each activity in itinerary has `schedule_data` (for expandable program)
- [ ] `user_rating` — or Google Reviews enabled for account

### Optional (per-page overrides — Studio editable bajo `studio_editor_v2`)

- [ ] `pageCustomization.custom_hero` — custom title/subtitle/image per page (`HeroOverrideEditor`)
- [ ] `pageCustomization.custom_highlights` — override auto-highlights (`HighlightsEditor`)
- [ ] `pageCustomization.custom_faq` — custom FAQ answers
- [ ] `pageCustomization.custom_seo_title` / `custom_seo_description`
- [ ] `pageCustomization.custom_sections[]` / `sections_order[]` / `hidden_sections[]` — layout control (`CustomSectionsEditor` / `SectionsReorderEditor` / `SectionVisibilityToggle`)
- [ ] `video_url` (hero video) — `VideoUrlEditor`
- [ ] `gallery` / `photos` curation — `GalleryCurator`
- [ ] `description` (marketing) / `inclusions` / `exclusions` / `social_image` — `DescriptionEditor` / `InclusionsExclusionsEditor` / `SocialImagePicker`

---

## 4. Known Gaps (Open)

### G1 — Group size badge uses regex (fragile)

**Problem:** `resolveGroupSizeLabel()` parses `"10-15 pax"` pattern from `product.name` / `description`. If no match, badge is hidden.
**Fix:** Add explicit `min_group_size` / `max_group_size` integer fields to `package_kits`. Surface in Hero badge.
**Impact:** Low — cosmetic. Badge silently absent.
**Tracking:** No issue yet — open one if regression reported.

### G2 — Cancellation policy is hardcoded

**Problem:** FAQ answer for "¿Puedo cancelar?" is generic static text in `PACKAGE_FAQS_DEFAULT`. No actual policy data stored per package.
**Fix:** Add `cancellation_policy_text` or link to `CancellationPolicySchema` (already in `@bukeer/website-contract`). Surface in FAQ.
**Impact:** Medium — operators can work around via `custom_faq` override.
**Tracking:** See `@bukeer/website-contract` `CancellationPolicySchema` — contract exists, wiring missing.

### G3 — Circuit map covers only 17 Colombian cities

**Problem:** `lib/products/city-coords.ts` has 17 hardcoded cities. International packages or Colombian cities outside the list fall back to badge list.
**Fix:** Integrate Google Places geocoding API or expand the city list.
**Impact:** Medium — international agencies affected.
**Tracking:** No issue yet.

### G4 — F3 AI highlights require explicit trigger

**Problem:** `program_highlights` is not auto-populated on first deploy — requires explicit POST to `/api/ai/generate-package-content`. No cron or webhook triggers this automatically.
**Fix:** Add webhook from Flutter admin on package_kit publish event → trigger generation.
**Impact:** Low — operator can trigger manually. Affects zero-highlights packages.
**Tracking:** [[#174]] (Fase 3b — optional trigger from Flutter).

### G5 — Options table renders for packages if options data present

**Problem:** `<OptionsTable>` renders for all non-transfer products. If a `package_kit` has `options[]` data (unusual but possible), the activity pricing table appears in the package landing.
**Fix:** Guard `<OptionsTable>` with `productType !== 'package'`.
**Impact:** Low — unlikely to occur; cosmetic if it does.
**Tracking:** No issue yet — trivial fix.

### G6 — `schedule` field normalized but not rendered for packages

**Problem:** `normalizeProduct()` processes `schedule` (ScheduleEntry[]) from all product types, but `<ProgramTimeline>` is explicitly excluded for packages (`productType !== 'package'` guard). The normalized data is discarded.
**Behavior:** Intentional — packages use `itinerary_items` (day-by-day), not `schedule` (activity timeline).
**Risk:** Zero — correct behavior, just undocumented.

---

## 5. Component Registry

All components used or available for the package landing:

| Component | Path | Package? | Source |
|-----------|------|---------|--------|
| `ProductLandingPage` | `components/pages/product-landing-page.tsx` | ✅ | Core |
| `PackageCircuitMap` | `components/site/package-circuit-map.tsx` | ✅ | [[#127]] |
| `ItineraryItemRenderer` | `components/site/itinerary-item-renderer.tsx` | ✅ | [[#173]] |
| `ActivityScheduleInline` | `components/site/activity-schedule-inline.tsx` | via renderer | [[#173]] |
| `HighlightsGrid` | `components/site/highlights-grid.tsx` | ✅ | Core |
| `TrustBadges` | `components/site/trust-badges.tsx` | ✅ | Core |
| `StickyCTABar` | `components/site/sticky-cta-bar.tsx` | ✅ | Core |
| `ProductFAQ` | `components/site/product-faq.tsx` | ✅ | Core |
| `MeetingPointMap` | `components/site/meeting-point-map.tsx` | conditional | Core |
| `OptionsTable` | `components/site/options-table.tsx` | ⚠️ see G5 | Core |
| `ProgramTimeline` | `components/site/program-timeline.tsx` | ❌ excluded | Core |
| `SectionErrorBoundary` | `components/site/section-error-boundary.tsx` | ✅ (wraps all) | Core |

---

## 6. RPC & API Surface

| Endpoint | Scope | Triggers |
|---------|-------|---------|
| `get_website_product_page(p_subdomain, p_product_type, p_product_slug)` | SSR page load | Always |
| `get_package_aggregated_data(p_package_id)` | SSR, inside get_website_product_page | When program_* fields empty |
| `POST /api/ai/generate-package-content` | On-demand | Flutter admin trigger / manual |
| `POST /api/revalidate` | Post-AI-generation | Called by F3 route after DB update |

---

## 7. Related Specs & Issues

| Issue | Topic |
|-------|-------|
| [[#127]] `Package Detail Conversion v2` | Hero chips, WhatsApp CTA, circuit map, trust badges |
| [[#171]] `Package Content Population` | Parent spec for F1/F2/F3 |
| [[#172]] `F1 — SQL aggregation` | `get_package_aggregated_data` RPC |
| [[#173]] `F2 — Renderer per type` | `ItineraryItemRenderer` variants |
| [[#174]] `F3 — AI highlights` | `/api/ai/generate-package-content` |
| `bukeer-flutter#757` | Flutter UI for AI flags |
