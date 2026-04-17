# Product Detail — Inventory & Data Ownership

**Last updated:** 2026-04-17
**Scope:** Activity landing (`/actividades/[slug]`) + Package landing (`/paquetes/[slug]`)
**Entry point:** `components/pages/product-landing-page.tsx`
**Related:** [[package-detail-anatomy]] (deeper package-only breakdown)

---

## 0. Source-of-Truth Legend

Every field renders on the public site. Each field has exactly one authoritative writer. This doc maps field → writer → component.

| Code | Source | Surface |
|------|--------|---------|
| **F** | Flutter admin (product catalog) | `bukeer-flutter` — writes to `products` / `package_kits` / `hotels` / `activities` / `transfers` DB tables |
| **S** | Studio dashboard (page customization) | `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx` — writes to `product_page_customizations` DB table |
| **AI** | AI-generated | `POST /api/ai/generate-package-content` ([[#174]]) — writes to `package_kits.program_*` |
| **C** | Computed at render (SSR) | Not stored — derived from other fields or external APIs |
| **H** | Hardcoded in Studio code | Fallback when all writable sources empty |
| **🚫** | **Gap** — schema exists but no UI writer | Field is readable in renderer but no way to set it |

---

## 1. Activity Landing Inventory

Entry point: `/actividades/[slug]` — `productType === 'activity'`.
Renders: Hero → Breadcrumb → Highlights → Gallery → Description → Activity sections → Program timeline → Includes/Excludes → Circuit/Meeting map → Options table → FAQ → Trust → Final CTA → Similar.

### 1.1 Hero

| Field | Source | Component | Notes |
|-------|--------|-----------|-------|
| Background image | F (`product.image`) → F (`gallery[0]`) | inline `<Image>` | fallback cascade |
| Title | S (`custom_hero.title`) → F (`product.name`) | inline `<h1>` | 🚫 `custom_hero.title` has NO Studio editor yet |
| Location subtitle | S (`custom_hero.subtitle`) → F (`product.location`) → C (`city+country`) | inline | 🚫 same |
| Type chip ("Actividades") | H | inline | always |
| Duration chip | F (`product.duration`) | inline | |
| Location chip | F (`product.location`) | inline | |
| Rating chip | F (`user_rating`) → F (`rating`) → C (avg Google reviews) | inline | |
| Inclusion highlights chips | C (`detectInclusionHighlights`) derived from F (`inclusions`) | inline | regex-based; max 3 |
| Price "Desde" | C (min of F `options[].prices[]`) → F (`product.price`) | inline | multi-currency config |
| WhatsApp CTA | F (`website.content.whatsapp`) | inline | |
| Phone CTA | F (`website.content.phone`) | inline | |
| Video CTA ([[#165]]) | F (`product.video_url`) | `<ProductVideoHero>` | lazy iframe in `<MediaLightbox>` |

### 1.2 Sticky CTA Bar

| Field | Source | Component |
|-------|--------|-----------|
| Price | same as Hero | `<StickyCTABar>` |
| WhatsApp | F (`website.content.whatsapp`) | `<StickyCTABar>` |
| Phone | F (`website.content.phone`) | `<StickyCTABar>` |

### 1.3 Breadcrumb

`Inicio / Actividades / [product.name]` — C.

### 1.4 Highlights Grid

| Source | Component |
|--------|-----------|
| S (`custom_highlights`) → F (`product.highlights`) → null | `<HighlightsGrid>` |

No AI generator for activity highlights (only packages — [[#174]]).

### 1.5 Gallery

| Source | Precedence | Cap |
|--------|-----------|-----|
| F (`product.photos` — urls or `{url}` objects) | 1 | — |
| F (`product.images`) | 2 | — |
| F (`product.image`) | 3 (single) | — |

Activities do **not** use `program_gallery` (that is package-only via F1 [[#172]]).

### 1.6 Description

| Source | Component |
|--------|-----------|
| F (`product.description`) | inline prose |

No fallback synthesis for activities. Empty description = empty section.

### 1.7 Activity-Specific Sections (`<ActivitySections>`)

| Sub-section | Source | Component |
|-------------|--------|-----------|
| Recommendations list | F (`product.recommendations`) split by newline/comma | inline `<ul>` |
| Tarifa base panel | C (min option price) | inline panel |

### 1.8 Program Timeline

| Source | Component |
|--------|-----------|
| F (`product.schedule` — ScheduleEntry[]) | `<ProgramTimeline>` |

Renders only for non-transfer, non-package. Shows time + title + description + image per step.

### 1.9 Includes & Excludes

| Source | Precedence | Component |
|--------|-----------|-----------|
| F (`product.inclusions`) | 1 | `<IncludeExcludeSection isPackage={false}>` |
| F (`product.exclusions`) | 1 | |

Splits string-form legacy data via `normalizeProduct` (newline/comma delimiters).

### 1.10 Circuit Map (activities with multi-stop route)

| Source | Condition | Component |
|--------|-----------|-----------|
| C (derived from F `schedule[].title` + `description` via `extractActivityCircuit`) | ≥2 stops geocode-resolvable | `<ActivityCircuitMap>` |

If <2 stops → falls through to Meeting Point Map.

### 1.11 Meeting Point Map

| Source | Condition | Component |
|--------|-----------|-----------|
| F (`product.meeting_point`) → F (`meeting_point_location` legacy) | activity has no multi-stop circuit | `<MeetingPointMap>` |

### 1.12 Options Table

| Source | Component |
|--------|-----------|
| F (`product.options` — ActivityOption[] with `prices`, `unit_type_code`, `start_times`, …) | `<OptionsTable>` |

Primary pricing surface for activities. Multi-currency aware.

### 1.13 FAQ

| Source | Precedence | Component |
|--------|-----------|-----------|
| S (`custom_faq` — max 10) | 1 | `<ProductFAQ>` |
| F (`custom_faq` on product page override) | 2 | |
| H (`ACTIVITY_FAQS_DEFAULT`) | 3 | |

### 1.14 Trust Badges

| Source | Component |
|--------|-----------|
| F (`website.content.trust` — TrustContent schema) | `<TrustBadges>` |

### 1.15 Google Reviews

| Source | Condition | Component |
|--------|-----------|-----------|
| C (Google Places API) | F (`account.google_reviews_enabled === true`) | inline reviews section |

### 1.16 Sidebar (Desktop)

| Sub-element | Source |
|------------|--------|
| Rating | same as Hero |
| Location | F (`product.location`) |
| Duration | F (`product.duration`) |
| Price | same as Hero |
| WhatsApp + Phone | F (`website.content`) |

### 1.17 Final CTA

"¿Listo para vivir esta experiencia?" — static + WhatsApp + Phone. H + F.

### 1.18 Similar Activities Carousel

| Source | Condition |
|--------|-----------|
| C (SSR query: activities with same `location`) | always try |
| C (fallback: top 3 activities in account) | if <3 matches |

---

## 2. Package Landing Inventory

Full per-section breakdown: [[package-detail-anatomy]] (Section 1).
Below: editability overlay on the existing anatomy.

### 2.1 Overlay — Source-of-Truth per Section

| Section | Primary source(s) | Writable from | Component |
|---------|-------------------|---------------|-----------|
| Hero bg image | F (`image`) → F (`gallery[0]` via program_gallery) | Flutter + AI (F1 aggregates) | inline |
| Hero title | S → F (`name`) | 🚫 S editor missing | inline |
| Hero subtitle | S → F (`location`) | 🚫 S editor missing | inline |
| Duration badge | F (`duration_days`, `duration_nights`) → F (`duration`) | Flutter | inline |
| Group size badge | C (regex on name/description) | derived — no editor | inline |
| Rating badge | F (`user_rating`) → C (Google reviews) | Flutter / Google | inline |
| Price "Desde" | F (`price`) | Flutter | inline |
| Video CTA ([[#165]]) | F (`video_url`) | Flutter | `<ProductVideoHero>` |
| Highlights Grid | S (`custom_highlights`) → AI (`program_highlights`) → F (`highlights`) | Studio + AI + Flutter | `<HighlightsGrid>` |
| Gallery | AI/F1 (`program_gallery`) → F (child products) → F (`images`) | Flutter (indirect via children) + F1 | inline lightbox |
| Description | F (`description`) → AI (if `description_ai_generated=true`) | Flutter + AI | inline prose |
| Circuit Map | C (derived from `itinerary_items.destination` + city-coords) | via Flutter itinerary | `<PackageCircuitMap>` |
| Day-by-Day | F (`itinerary_items` through `source_itinerary_id`) | Flutter | `<ItineraryItemRenderer>` |
| Includes/Excludes | F/F1 (`program_inclusions`, `program_exclusions`) → F (`inclusions`) → H | Flutter + F1 + hardcoded | `<IncludeExcludeSection isPackage>` |
| Meeting Point Map | F (`meeting_point`) — only if no circuit map | Flutter | `<MeetingPointMap>` |
| Options Table | F (`options`) — rare for packages | Flutter | `<OptionsTable>` ⚠️ G5 |
| FAQ | S (`custom_faq`) → H (`PACKAGE_FAQS_DEFAULT`) | Studio + hardcoded | `<ProductFAQ>` |
| Trust Badges | F (`website.content.trust`) | Flutter | `<TrustBadges>` |
| Google Reviews | C (Google Places API, gated by account flag) | Google | inline |
| Sidebar | mirror of Hero | — | inline |
| Final CTA | H + F (contact info) | hardcoded + Flutter | inline |
| Similar Packages | C (SSR query) | — | inline |

---

## 3. Cross-Page Editability Matrix

Fields aggregated across BOTH activity + package landings. Answers: "who can change X?"

### 3.1 Content editable via Flutter admin (product catalog)

| DB field | Activity | Package | Writer UI |
|----------|:--------:|:-------:|-----------|
| `name` | ✅ | ✅ | Flutter product editor |
| `slug` | ✅ | ✅ | Flutter |
| `description` | ✅ | ✅ | Flutter (AI can overwrite if unlocked) |
| `image` / `photos` / `images` | ✅ | ✅ | Flutter media picker |
| `location` / `city` / `country` | ✅ | ✅ | Flutter |
| `price` / `currency` | ✅ | ✅ | Flutter pricing panel |
| `duration` / `duration_days` / `duration_nights` | ✅ | ✅ | Flutter |
| `options[]` (ActivityOption) | ✅ | rare | Flutter pricing panel |
| `inclusions` / `exclusions` | ✅ | ✅ | Flutter rich-text |
| `highlights` (legacy) | ✅ | ✅ | Flutter rich-text |
| `meeting_point` | ✅ | ✅ | Flutter map picker |
| `schedule[]` (ScheduleEntry) | ✅ | ❌ not rendered | Flutter itinerary editor |
| `itinerary_items[]` | ❌ | ✅ | Flutter itinerary editor |
| `user_rating` / `review_count` | ✅ | ✅ | Flutter (usually Google-synced) |
| `video_url` / `video_caption` ([[#165]]) | ✅ | ✅ | 🚫 Flutter UI pending |
| `recommendations` | ✅ | — | Flutter |
| `amenities` / `star_rating` | hotel only | — | Flutter (hotel editor) |

### 3.2 Content editable via Studio dashboard (page customization)

Writer: `app/dashboard/[websiteId]/seo/[itemType]/[itemId]/page.tsx`.
Table: `product_page_customizations`.

| DB field | Activity | Package | Writer UI status |
|----------|:--------:|:-------:|------------------|
| `custom_seo_title` | ✅ | ✅ | ✅ Studio SEO editor |
| `custom_seo_description` | ✅ | ✅ | ✅ Studio SEO editor |
| `robots_noindex` | ✅ | ✅ | ✅ Studio SEO editor |
| `custom_faq[]` (≤10) | ✅ | ✅ | ✅ Studio SEO editor |
| `custom_highlights[]` (≤6) | ✅ | ✅ | ✅ Studio SEO editor |
| `custom_hero.title` | ✅ | ✅ | 🚫 **schema exists, editor missing** |
| `custom_hero.subtitle` | ✅ | ✅ | 🚫 **editor missing** |
| `custom_hero.backgroundImage` | ✅ | ✅ | 🚫 **editor missing** |
| `custom_sections[]` | ✅ | ✅ | 🚫 **editor missing** |
| `sections_order[]` | ✅ | ✅ | 🚫 **editor missing** |
| `hidden_sections[]` | ✅ | ✅ | 🚫 **editor missing** |
| `is_published` | ✅ | ✅ | implicit via SEO editor save |

### 3.3 AI-Generated (and writable from Studio/Flutter trigger)

Writer: `POST /api/ai/generate-package-content` ([[#174]] F3 route).
Table: `package_kits`.

| DB field | Activity | Package | Trigger |
|----------|:--------:|:-------:|---------|
| `program_highlights[]` | ❌ | ✅ | Manual POST — 🚫 no auto-trigger (G4) |
| `description` (when `description_ai_generated=true`) | ❌ | ✅ | Same POST, only if locked flag is false |
| `highlights_ai_generated` flag | ❌ | ✅ | Auto-set by F3 |
| `description_ai_generated` flag | ❌ | ✅ | Manual via Flutter UI (🚫 pending `bukeer-flutter#757`) |
| `last_ai_hash` | ❌ | ✅ | Auto-set by F3 (dedup) |

Activity equivalent does **not** exist yet — [[#174]] scoped to packages only.

### 3.4 F1-Aggregated (packages only)

Writer: `get_package_aggregated_data` RPC ([[#172]]). No direct write — RPC recomputes every read when kit `program_*` empty.

| DB field | Source |
|----------|--------|
| `program_inclusions[]` | union of child products' `inclutions`, dedup + cap 15 |
| `program_exclusions[]` | union of child products' `exclutions`, dedup + cap 15 |
| `program_gallery[]` | kit override → child `main_image` → `images` table, cap 12 |

Curator can override any of these by writing directly to `package_kits.program_*` (highest precedence).

### 3.5 Computed at render (not stored)

| Field | Activity | Package | How |
|-------|:--------:|:-------:|-----|
| Breadcrumb | ✅ | ✅ | from `productType` + name |
| Activity circuit stops | ✅ | — | `extractActivityCircuit(schedule, meeting_point)` |
| Package circuit stops | — | ✅ | `getPackageCircuitStops(itinerary_items)` via city-coords |
| Min option price | ✅ | rare | `minActivityOptionPrice(options)` |
| Group size label | — | ✅ | regex on `name` + `description` (G1 fragile) |
| Rating badge | ✅ | ✅ | avg of `user_rating` + Google reviews |
| Similar products carousel | ✅ | ✅ | SSR query by `location` + fallback |
| Google Reviews | ✅ | ✅ | Google Places API, gated by account flag |

---

## 4. Consistency Rules (Source-of-Truth Policy)

### 4.1 Priority when multiple sources set the same field

1. **Studio page customization (`custom_*`)** always wins — operator overrode intentionally per-page.
2. **AI-generated (`program_*`)** — wins over bare Flutter fields when present.
3. **F1 aggregation (`program_*` from RPC)** — wins over bare Flutter fields when kit `program_*` empty.
4. **Flutter product catalog (`inclusions`, `highlights`, …)** — baseline.
5. **Hardcoded defaults (`PACKAGE_FAQS_DEFAULT`, …)** — last resort.

### 4.2 Locking mechanism

- `description_ai_generated = false` → AI will **not** regenerate (operator edited manually).
- `description_ai_generated = true` → AI may overwrite on next regeneration request.
- Same pattern applies to `highlights_ai_generated`.

### 4.3 What public users see

The rendered value is always the highest-precedence non-empty source. No hybrid or merged content. Example:

```
program_highlights = ['A', 'B', 'C']   # AI-generated
highlights         = ['X']             # legacy Flutter field

# Public site renders: ['A', 'B', 'C'] (AI wins)
```

---

## 5. Gaps in Editability (open work)

| # | Gap | Field | Priority |
|---|-----|-------|:--------:|
| E1 | No Studio editor for `custom_hero.title/subtitle/backgroundImage` | page-level hero override | P2 |
| E2 | No Studio editor for `custom_sections[]` / `sections_order[]` / `hidden_sections[]` | section reordering/hiding | P3 |
| E3 | No auto-trigger for F3 AI on package publish | `program_highlights`, AI description | P2 (G4) |
| E4 | Flutter UI for `*_ai_generated` + `last_ai_hash` flags not shipped | AI lock control | P1 — `bukeer-flutter#757` |
| E5 | No Flutter UI for `video_url` / `video_caption` ([[#165]]) | hero video | P1 — spec open |
| E6 | Group size has no explicit field (regex-only) | package hero badge | P3 (G1) |
| E7 | Cancellation policy hardcoded in `PACKAGE_FAQS_DEFAULT` | FAQ answer | P2 (G2) |
| E8 | No AI generator for activity highlights (package-only scope) | `program_highlights` for activities | P3 |

---

## 6. Cross-repo workflow (who does what)

```
┌─────────────────────────────────────────────────────────────┐
│ Flutter admin (product + package catalog)                   │
│ — writes products, package_kits, itinerary_items, prices    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase DB — shared source of truth                        │
└──────────────┬──────────────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────────┐    ┌──────────────────────────────────────┐
│ Studio SSR  │    │ Studio dashboard (site operator)     │
│ (public)    │    │ — writes product_page_customizations │
│             │    │   (FAQ, highlights, SEO)             │
│ — reads     │    │ — triggers AI generation via F3      │
│   all       │    └──────────────────────────────────────┘
│   sources   │
│ — applies   │
│   precedence│
└─────────────┘
```

Rule of thumb:
- **Data about the product** → Flutter. (name, price, duration, itinerary, media)
- **How the landing page presents it** → Studio. (SEO meta, FAQ overrides, highlights curation, future hero override)
- **AI enrichment** → triggered from either Flutter or Studio, writes back to catalog DB.

---

## 7. Component Registry (cross-page)

| Component | Activity | Package | Path |
|-----------|:--------:|:-------:|------|
| `ProductLandingPage` | ✅ | ✅ | `components/pages/product-landing-page.tsx` |
| `HighlightsGrid` | ✅ | ✅ | `components/site/highlights-grid.tsx` |
| `MediaLightbox` ([[#165]]) | ✅ | ✅ | `components/site/media-lightbox.tsx` |
| `ProductVideoHero` ([[#165]]) | ✅ | ✅ | `components/site/product-video-hero.tsx` |
| `StickyCTABar` | ✅ | ✅ | `components/site/sticky-cta-bar.tsx` |
| `ProductFAQ` | ✅ | ✅ | `components/site/product-faq.tsx` |
| `TrustBadges` | ✅ | ✅ | `components/site/trust-badges.tsx` |
| `ProgramTimeline` | ✅ | ❌ (see G6) | `components/site/program-timeline.tsx` |
| `ActivityCircuitMap` | ✅ | — | `components/site/activity-circuit-map.tsx` |
| `PackageCircuitMap` | — | ✅ | `components/site/package-circuit-map.tsx` |
| `MeetingPointMap` | conditional | conditional | `components/site/meeting-point-map.tsx` |
| `OptionsTable` | ✅ | ⚠️ G5 | `components/site/options-table.tsx` |
| `ItineraryItemRenderer` | — | ✅ | `components/site/itinerary-item-renderer.tsx` |
| `ActivityScheduleInline` | — | via renderer | `components/site/activity-schedule-inline.tsx` |
| `IncludeExcludeSection` | ✅ | ✅ | `components/site/include-exclude-section.tsx` |
| `HotelSections` | hotel only | — | inline in product-landing-page |
| `ActivitySections` | ✅ | — | inline in product-landing-page |
| `PackageSections` | — | ✅ | inline in product-landing-page |
| `TransferSections` | — | — | inline (transfers only) |

---

## 8. Related specs & ADRs

| Ref | Topic |
|-----|-------|
| [[#127]] | Package Detail Conversion v2 (hero chips, WhatsApp CTA) |
| [[#165]] | Product Video Field — video_url + hero lightbox |
| [[#171]] | Package Content Population (epic) |
| [[#172]] | F1 SQL aggregation RPC |
| [[#173]] | F2 Itinerary item renderer |
| [[#174]] | F3 AI highlights + description |
| `bukeer-flutter#757` | Flutter UI for AI flags |
| [[ADR-003]] | Contract-First Validation |
| [[ADR-015]] | AppServices pattern |
