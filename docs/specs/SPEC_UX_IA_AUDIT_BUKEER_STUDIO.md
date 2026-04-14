# SPEC: Bukeer Studio — UX/UI & Information Architecture Redesign

| Field | Value |
|---|---|
| **Spec ID** | SPEC-IA-001 |
| **Version** | 4.1 |
| **Date** | 2026-04-14 |
| **Author** | UX/IA Consultant Analysis + Product Owner Review |
| **Status** | Draft — Revised for E2E Delivery Alignment |
| **App** | Bukeer Website Studio (Next.js 15) |
| **Test Website** | colombiatours (colombiatours.bukeer.com) |
| **Screenshots** | `qa-screenshots/ia-audit/` (34 captures) |
| **Related Issues** | weppa-cloud/bukeer-flutter#548 (UX Redesign), #603 (SEO Epic, 54 closed) |
| **Related SPECs** | SPEC-I18N-001 (Markets & Languages — separate) |
| **Migration Source** | weppa-cloud/bukeer-flutter (verified SEO baseline: Overview, Keywords, AI Visibility, Auditoría + analytics config) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Scope](#4-scope)
5. [Competitive Research](#5-competitive-research)
6. [Current State Audit](#6-current-state-audit)
7. [Issue Backlog](#7-issue-backlog)
8. [Proposed IA Redesign](#8-proposed-ia-redesign)
9. [Content Detail Pages — Per Type](#9-content-detail-pages--per-type)
10. [Keyword Research (Surfer Lite)](#10-keyword-research-surfer-lite)
11. [Analytics Integration](#11-analytics-integration)
12. [Existing Infrastructure — Migration Inventory](#12-existing-infrastructure--migration-inventory)
13. [Migration Map](#13-migration-map)
14. [User Flows (Before/After)](#14-user-flows-beforeafter)
15. [Wireframes](#15-wireframes)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Implementation Plan](#17-implementation-plan)
18. [Risks & Dependencies](#18-risks--dependencies)
19. [Out of Scope](#19-out-of-scope)
20. [Appendix](#20-appendix)
21. [E2E Delivery Alignment (v4.1)](#21-e2e-delivery-alignment-v41)

---

## 1. Executive Summary

Bukeer Studio is a website builder for travel agencies with **9 top-level navigation tabs**. A 3-level audit of 34 screens, benchmarked against 12 industry platforms, reveals three structural UX problems:

1. **Redundancy**: Products and SEO Audit list the same ~1,200 items in separate tabs with different actions, forcing context switches.
2. **Fragmentation**: SEO editing is scattered across 3 surfaces (Content & SEO, SEO Audit detail, Page Editor right panel).
3. **Cognitive overload**: 9 tabs exceed the 5-7 industry standard; Analytics occupies an entire tab for 3 input fields.

**Proposed solution**: Reduce 9 tabs to **5** by merging redundant surfaces into a unified "Contenido" tab, building a real Analytics integration with Google Analytics + Search Console, and consolidating global config into Settings. This eliminates context switches, adds actionable analytics data, and introduces Surfer SEO-like keyword research without removing any functionality.

---

## 2. Problem Statement

### 2.1 Core Problem

A travel agency operator wants to **feature a hotel on their public site AND optimize its SEO**. Today this requires:

1. Go to **Products** tab → find hotel → toggle star
2. Go to **SEO Audit** tab → find the same hotel → view score and edit meta tags

The same ~1,200 products appear in two separate tabs. The user must remember which hotel they were looking at and re-find it. Content & SEO adds a third surface for global SEO settings with confusingly similar naming.

```
CURRENT: 6 clicks, 2 context switches
+---------+   +---------+   +---------+   +---------+   +---------+   +---------+
|Products |-->| Find    |-->| Click   |-->| Go back |-->|SEO Audit|-->| Find    |
|  Tab    |   | Hotel   |   |   *     |   | to tabs |   |  Tab    |   | same    |
|         |   | scroll  |   | toggle  |   |         |   |         |   | hotel   |
+---------+   +---------+   +---------+   +---------+   +---------+   +---------+

PROPOSED: 2 clicks, 0 context switches
+--------------+   +--------------+
| Contenido    |-->| Hotel row:   |
|    Tab       |   | * Score C/64 |  <-- Everything in ONE row
|              |   | [Editar SEO] |
+--------------+   +--------------+
```

### 2.2 Supporting Evidence

| Signal | Data |
|--------|------|
| Products with 0 SEO metadata | 696 of 696 activities (100%), 9 of 9 packages (100%) |
| Products tab shows UUID instead of useful info | 100% of rows show raw UUID as secondary text |
| SEO editing surfaces | 3 separate locations for the same data |
| Tabs exceeding industry standard | 9 vs. industry median of 5-7 |
| Analytics tab content | 3 input fields (GTM/GA4/Pixel) — no real analytics data |
| Analytics integration | 0% — no Google Analytics API, no Search Console API, no charts |

---

## 3. Goals & Success Metrics

### 3.1 Goals

| # | Goal | Rationale |
|---|------|-----------|
| G1 | Reduce top-level tabs from 9 to 5 | Align with industry standard, reduce cognitive load |
| G2 | Merge Products + SEO Audit + Blog into unified "Contenido" tab | Eliminate redundant item listings and context switching |
| G3 | Establish clear SEO principle: per-item inline in Contenido, global in Settings | Remove ambiguity about where SEO is edited |
| G4 | Surface Package JSONB data in SEO detail | Unlock premium product scoring potential (C/65 → A/90+) |
| G5 | Prioritize sub-tabs by business value | Packages and Activities first (highest revenue and traffic) |
| G6 | Build real Analytics tab with GA + Search Console integration | Replace 3 empty input fields with actionable traffic/keyword data |
| G7 | Add Surfer SEO-like keyword research in content detail | Give context for keyword selection beyond density check |
| G8 | Advanced filtering in Contenido tab | Published/unpublished, SEO grade, completeness, multi-field search |

### 3.2 Success Metrics

| Metric | Baseline (current) | Target | How to Measure |
|--------|-------------------|--------|----------------|
| Top-level tabs | 9 | 5 | Count in nav bar |
| Context switches: feature + SEO check | 2 | 0 | Task analysis |
| Clicks: feature hotel + view SEO | 6 | 2 | User flow walkthrough |
| Redundant product listings | 2 (Products + SEO Audit) | 1 (Contenido unified) | Count tabs listing same items |
| SEO editing surfaces | 3 | 2 (per-item inline + global in Settings) | Audit of edit points |
| Package SEO score (colombiatours avg) | C / 65 | A / 85+ | Scorer output after JSONB surfacing |
| Activities with SEO Title | 0 / 696 (0%) | 696 / 696 (100%) | DB query on `website_product_pages` |
| Analytics data available | 0 (no integration) | Traffic, keywords, CTR, impressions | GA + Search Console connected |

---

## 4. Scope

### 4.1 In Scope

- Navigation restructuring: 9 tabs → 5 tabs (Pages, Contenido, Design, Analytics, Settings)
- Contenido unified tab (merge Products + SEO Audit + Blog sub-tabs)
- Advanced filtering: SEO grade, published/unpublished, SEO completeness, multi-field text search
- Settings absorbs Content & SEO (site identity, global meta, scripts, tracking IDs)
- SEO detail page restructure (tabbed layout replacing 4916px scroll)
- Package JSONB field surfacing in SEO detail
- Contextual keyword placeholders by product type
- Sub-tab reorder by business priority
- Blog SEO score indicators (in Contenido list and in blog editor)
- Inline AI generate buttons in meta fields
- Analytics tab with real Google Analytics + Search Console integration
- Keyword Research panel (Surfer SEO lite) using AI + Search Console data
- Published/unpublished toggle visible in all content rows

### 4.2 Out of Scope

| Item | Reason | Where It Goes |
|------|--------|---------------|
| Markets & Languages (i18n, multi-market) | Complex feature with partial infrastructure (hreflang exists but no DB support). Needs dedicated spec. | **SPEC-I18N-001** (separate) |
| Leads tab functionality | No quote requests in current test data. Not core to website builder. | Re-evaluate post-launch (>10 leads/month) |
| Page Editor left-panel redesign | Complex editor architecture. Separate spec needed. | Future SPEC |
| Flutter admin modifications | Different repo (bukeer-flutter), different team | Coordinate via dependency D4 |
| Database schema changes (new tables) | No new tables required for IA redesign | N/A |
| Mobile responsive navigation | Current product is desktop-only for admin | When mobile admin is prioritized |
| WCAG AA accessibility audit | Important but orthogonal to IA structure | Separate SPEC |

---

## 5. Competitive Research

### 5.1 Platforms Analyzed

12 platforms across three categories: website builders (Wix, Squarespace, Framer, Webflow, Shopify), CMS+SEO hybrids (WordPress+Yoast, HubSpot CMS), and SEO tools (SEMrush, SurferSEO, Ahrefs).

### 5.2 Key Patterns Identified

| # | Pattern | Best-in-Class | Relevance to Bukeer |
|---|---------|---------------|---------------------|
| P1 | SEO as Companion Panel | SurferSEO, Yoast | Real-time SEO score next to content editor |
| P2 | Dashboard Overview + Inline Detail | HubSpot, WordPress+Yoast | Site-wide health triage → click to fix individual items |
| P3 | Consistent SEO across content types | Shopify, Squarespace | Same SEO editing pattern everywhere |
| P4 | Bulk operations via scored list | SEMrush, Ahrefs | Sortable tables with scores, bulk-fix actions |
| P5 | AI-Assisted SEO Generation | Wix AI, SurferSEO | Auto-generate/suggest meta from content |
| P6 | Keyword Research + Competitor Analysis | SurferSEO, SEMrush | Content brief based on top-ranking competitors |
| P7 | Integrated Analytics Dashboard | HubSpot, Wix | Traffic, keywords, and SEO in one platform |
| P8 | Unified Content+SEO+Analytics | HubSpot | Full optimization loop in one view |

### 5.3 Critical Finding

**No successful platform has both "Products" AND "SEO Audit" as separate tabs.** Every platform follows one of two models:

- **Inline SEO per item** (Shopify, Framer, Webflow): SEO fields are part of each content item's editor. No dedicated audit section.
- **Dedicated SEO dashboard** (HubSpot, WordPress+Yoast): Items link back to their content editor. No separate "Products" page listing the same items.

Bukeer Studio currently has BOTH, creating confusion and redundancy.

### 5.4 Comparison Matrix

| Platform | Nav Items | SEO Location | Bulk SEO | Analytics Integration | Keyword Research |
|----------|-----------|-------------|----------|----------------------|-----------------|
| WordPress+Yoast | ~12 (sidebar) | Metabox + dedicated section | List view scores | Plugin (MonsterInsights) | Yoast Premium (basic) |
| Wix | ~7 (sidebar) | Dashboard + editor panel | Dashboard overview | Built-in analytics | Wix SEO Wiz |
| Squarespace | ~7 (sidebar) | Page settings + Marketing | Site-level only | Built-in analytics | None |
| HubSpot CMS | ~7 (mega-menu) | Dedicated + Optimize tab | Recommendations | Full built-in | Topic clusters |
| SurferSEO | ~4 (top nav) | Editor IS the SEO tool | Content Planner | Google Search Console | **Core feature** |
| **Bukeer Studio** | **9 (tabs)** | **3 places** | **Bulk AI modal** | **0 (3 input fields)** | **Density only** |

---

## 6. Current State Audit

### 6.1 Current Information Architecture (9 tabs)

```
BUKEER STUDIO -- 9 TABS
|
+-- Pages ----------- 13 pages, drag reorder, Page Editor (3-panel)
+-- Blog ------------ 12 posts, grid/list, Blog Editor (TipTap + sidebar)
+-- Design ---------- Theme (8 presets), Brand Kit, Structure
+-- Content & SEO --- Site identity + Global meta/scripts   [!] CONFUSING NAME
+-- Products -------- Hotels/Activities/Transfers/Packages  [!] UUID, no SEO
+-- SEO Audit ------- Same products + scoring + detail      [!] REDUNDANT
+-- Analytics ------- 3 input fields (GTM/GA4/Pixel)        [!] EMPTY TAB
+-- Leads ----------- Pipeline (empty)
+-- Settings -------- Subdomain, Domain, Template, Version
```

### 6.2 Product Inventory (colombiatours)

| Product Type | Volume | Business Value | SEO Readiness | Priority |
|---|---|---|---|---|
| Activities | 696 items | Core product (tourist searches for this) | 0% have SEO meta, but rich inclusion data (851 chars avg) | 2nd (bulk impact) |
| Hotels | 397 items | Complementary (supports activities/packages) | Best equipped: 995 char descriptions, amenities, V2 bridge | 3rd |
| Transfers | 118 items | Logistics (operational support) | Low SEO value | 4th (last) |
| Packages | 9 items | Premium (highest revenue per conversion) | 6 JSONB fields exist but IGNORED by SEO detail | 1st (quick wins) |

### 6.3 Current Technical State

| System | State | Problem |
|---|---|---|
| Pagination | Client-side, 20/page, all data loaded at once | No caching, 7+ DB queries per load |
| Search | Client-side substring on name field only | Doesn't search slug, location, type |
| Scoring | Unified with type-specific variations (7 of 23 checks vary) | Correct architecture |
| Keyword research | Density check only (0.5-2.5%) | No volume, difficulty, competitor analysis |
| Analytics | GTM/GA4/Pixel ID inputs only | No API integration, no data, no charts |
| Hreflang | Implemented (es/en/pt/fr) with slug translations | No DB language field, no multi-market content (see SPEC-I18N-001) |

### 6.4 Scoring System — How It Works Per Type

**Unified scorer** (`lib/seo/unified-scorer.ts`): 3 dimensions, 23 checks, 0-100 score.

| Dimension | Weight | Checks |
|---|---|---|
| **Meta** (40%) | 40pts max | Title length, description length, keyword in title, keyword in desc, OG tags, Twitter card, canonical, title uniqueness |
| **Content** (35%) | 35pts max | Has description, word count, main image, multiple images, content richness, keyword density, image alt texts |
| **Technical** (25%) | 25pts max | JSON-LD, breadcrumbs, hreflang, geo coords, ratings, slug length, keyword in URL, URL depth |

**Type-specific variations:**

| Check | Hotel | Activity | Package | Transfer | Destination | Page | Blog |
|---|---|---|---|---|---|---|---|
| Word count min/optimal | 150/300 | 100/250 | 200/400 | 80/150 | 200/500 | 300/800 | 1500/2100 |
| Content richness (7pts) | 5+ amenities + stars | Duration + 50+ chars inclusions | 3+ itinerary items + 3+ images | Auto full | Enriched desc + coords | Auto full | Auto full |
| Multiple images (3pts) | 3+ required | 3+ required | 3+ required | Auto full | Auto full | Auto full | Auto full |
| Geo coordinates (3pts) | Auto full | Auto full | Auto full | Auto full | Requires lat/lon | Auto full | Auto full |
| AggregateRating (3pts) | Requires rating | Auto full | Auto full | Auto full | Requires rating | Auto full | Auto full |

All other 16 checks apply **identically** across all types.

---

## 7. Issue Backlog

### 7.1 Summary

| Severity | Count | Sprint Target |
|----------|-------|---------------|
| Critical (P0) | 4 | Sprint 0-1 |
| Major (P1) | 14 | Sprint 1-4 |
| Minor (P2) | 9 | Sprint 5 |
| Cosmetic (P3) | 4 | Sprint 5 |
| **Total** | **31** | |

### 7.2 Critical (P0)

| ID | Issue | Description |
|---|---|---|
| C1 | Products + SEO Audit redundancy | Same ~1,200 products in 2 tabs with different actions |
| C2 | UUID displayed instead of useful info | Raw UUIDs as secondary text in Products tab |
| C3 | 3 SEO editing surfaces | Content&SEO + SEO Audit + Editor>SEO — user doesn't know which |
| C4 | Package JSONB data not surfaced | 6 JSONB fields (highlights, inclusions, exclusions, gallery, notes, meeting) exist but ignored |

### 7.3 Major (P1)

| ID | Issue | Description |
|---|---|---|
| M1 | 9 tabs too many | Industry standard is 5-7 |
| M2 | Content & SEO naming confusion | Two tabs with "SEO" in name |
| M3 | Analytics tab is 3 empty inputs | No real analytics data, no GA/Search Console integration |
| M4 | Products tab shows no SEO data | Only name + star toggle |
| M5 | Blog editor lacks SEO score | Page editor shows score (F/35), blog editor doesn't |
| M6 | SEO detail page too long (4916px) | 11 sections in single scroll |
| M7 | Product content read-only without deep link | "Edit in Bukeer Admin" but no link provided |
| M8 | Left panel AI tab is empty redirect | Says "AI available in right panel" — wasted slot |
| M9 | Preview iframe shows 404 | ~82% of hotels without public pages show 404 |
| M10 | Package descriptions are 16 chars avg | Premium product has LESS text than any hotel |
| M11 | 696 activities without SEO meta | Core product (57% of catalog) invisible in Google |
| M12 | Keyword placeholder is hotel-centric | Shows "e.g. hotel boutique cancun" for ALL types |
| M13 | No published/unpublished indicator in content list | Can't filter or see publication status in unified table |
| M14 | No keyword research beyond density | No volume, difficulty, competitor data — just 0.5-2.5% density check |

### 7.4 Minor (P2)

| ID | Issue |
|---|---|
| m1 | No SEO score on blog cards |
| m2 | No search/filter on Pages tab |
| m3 | No bulk actions visible in Blog |
| m4 | Theme duplication: Dashboard + Editor |
| m5 | Empty state in SEO Audit unexplained |
| m6 | Products tab no pagination |
| m7 | No "Generate AI" inline in meta fields |
| m8 | Activity schedule_data not shown |
| m9 | Package program_meeting_info not shown |

### 7.5 Cosmetic (P3)

| ID | Issue |
|---|---|
| c1 | Mixed language subtitles |
| c2 | Missing image placeholders |
| c3 | Edit/Delete inconsistent affordance |
| c4 | Search box too narrow |

---

## 8. Proposed IA Redesign

### 8.1 New Navigation (5 tabs, down from 9)

```
BEFORE (9 tabs):
Pages | Blog | Design | Content & SEO | Products | SEO Audit | Analytics | Leads | Settings

AFTER (5 tabs):
Pages | Contenido | Design | Analytics | Settings
```

### 8.2 Proposed Information Architecture

```
BUKEER STUDIO -- 5 TABS
|
+-- Dashboard (L0)
|   +-- Website Cards --> Select Website
|
+-- Website Admin (L1)
    |
    +-- Pages ----------- Homepage card --> Page Editor
    |                     Pages list [drag, edit, delete]
    |                     Each page: inline SEO score
    |
    +-- Contenido ------- UNIFIED CONTENT HUB (renamed from SEO Audit)
    |   UNIFIED           Sub-tabs by business priority:
    |   ALL CONTENT        [Paquetes] [Actividades] [Hoteles] [Traslados]
    |   + INLINE SEO       [Destinos] [Paginas] [Blog]
    |                     UNIFIED TABLE with advanced filters:
    |                      Published|Img|Name|Location|Type|Score|Issues|Action
    |                     FILTERS:
    |                      Grade (A-F), Published/Unpublished,
    |                      SEO completeness, Multi-field search
    |                     ACTIONS:
    |                      [Export CSV] [Optimizar con IA] [Publicar] [Despublicar]
    |                     Each item --> Content Detail (per-type)
    |                                   +-- Meta & Keywords (editable + AI)
    |                                   +-- Keyword Research (Surfer lite)
    |                                   +-- Content Audit (read-only + checklist)
    |                                   +-- Technical (score + JSON-LD)
    |                                   +-- Preview
    |
    +-- Design ---------- Theme ---- presets, color, typography
    |                     Brand Kit - Logo, brand mood
    |                     Structure - Header, Footer
    |
    +-- Analytics ------- REAL INTEGRATION (Google Analytics + Search Console)
    |   REAL DATA          Traffic overview (sessions, users, pageviews)
    |                      Top pages by traffic
    |                      Search performance (impressions, clicks, CTR, position)
    |                      Top queries from Search Console
    |                      Keyword opportunities
    |                      Core Web Vitals
    |                      Configuration (GTM/GA4/Pixel IDs)
    |
    +-- Settings --------- General ---- Subdomain, Danger Zone
                           Domain ----- Custom domain wizard
                           Template --- Template selection
                           Version ---- Version history
                           Site Info --- Name, Tagline, Contact, Social
                                         (absorbed from Content & SEO > Content)
                           SEO Global -- Meta Title, Meta Desc, Keywords,
                                         Custom Scripts (head/body)
                                         (absorbed from Content & SEO > SEO & Scripts)

    [x] REMOVED: Blog tab (now sub-tab in Contenido)
    [x] REMOVED: Products tab (now sub-tab in Contenido)
    [x] REMOVED: SEO Audit (renamed to Contenido)
    [x] REMOVED: Content & SEO (split into Settings > Site Info + Settings > SEO Global)
    [x] REMOVED: Leads (deferred; re-evaluate when >10 leads/month)
```

### 8.3 Content Principle

> **All content lives in Contenido. All configuration lives in Settings. Analytics shows data, not config.**

| What | Where | Contains |
|---|---|---|
| Per-item content + SEO | **Contenido** tab | Products, destinations, pages, blog — each with inline SEO score, meta editing, AI generation, keyword research |
| Site identity + global SEO | **Settings** tab | Site name, tagline, contact, social links, global meta title/desc, keywords, custom scripts, tracking IDs |
| Traffic and search data | **Analytics** tab | Google Analytics metrics, Search Console data, keyword performance, Core Web Vitals |
| Visual design | **Design** tab | Theme, brand kit, header/footer structure |
| Page layout/sections | **Pages** tab | Section editor, drag reorder, page CRUD |

### 8.4 Sub-tab Order in Contenido (Business Priority)

```
[Paquetes] [Actividades] [Hoteles] [Traslados] [Destinos] [Paginas] [Blog]
 ^^^^^^^^   ^^^^^^^^^^^^
 1st = Premium (9 items, highest revenue, quick wins)
 2nd = Core product (696 items, primary search traffic)
```

### 8.5 Advanced Filtering System for Contenido

```
+----------------------------------------------------------------------+
| [Paquetes] [Actividades] [Hoteles] [Traslados] [Destinos] [Pag] [Blog]
|                                                                       |
| FILTERS:                                                              |
| +----------------+ +------------------+ +--------------------+        |
| | Grado    [v]   | | Estado     [v]   | | SEO          [v]   |       |
| | - Todos        | | - Todos          | | - Todos            |       |
| | - A (90+)      | | - Publicado      | | - Con titulo+desc  |       |
| | - B (75-89)    | | - No publicado   | | - Sin titulo       |       |
| | - C (60-74)    | | - Destacado (*)  | | - Sin descripcion  |       |
| | - D (40-59)    | |                  | | - Sin keyword      |       |
| | - F (<40)      | |                  | | - Sin schema       |       |
| +----------------+ +------------------+ +--------------------+        |
|                                                                       |
| [Search nombre, slug, ubicacion...]                                   |
|                                                                       |
| Ordenar por: [Score v]  [Nombre v]  [Issues v]                       |
|              Default: score ascending (worst first = needs attention)  |
|                                                                       |
| BULK ACTIONS (when items selected):                                   |
| [Publicar] [Despublicar] [Optimizar con IA] [Exportar CSV]          |
+----------------------------------------------------------------------+
```

**Filter behavior:**
- Text search matches against name + slug + location (not just name)
- Search has 300ms debounce to avoid excessive re-renders
- Filters are additive (AND logic): Grade C + Unpublished + Sin titulo = items matching ALL three
- Active sub-tab filters by product type first, then applies additional filters
- Sort default: score ascending (worst first — items needing most attention at top)

---

## 9. Content Detail Pages — Per Type

### 9.1 Universal Sections (all types)

Every content detail page, regardless of type, shows these sections organized in tabs:

**Tab 1 — Meta & Keywords (editable):**
- SEO Title input (70 chars max) + [AI Generate] button inline
- Meta Description textarea (160 chars max) + [AI Generate] button inline
- Target Keyword input (contextual placeholder per type)
- Keyword density metric (ideal 1-3%)
- Keyword presence: in title (yes/no), in meta desc (yes/no), in URL (yes/no)
- Indexation toggle ("Visible en buscadores")
- Google Preview (SERP snippet)
- Social Preview (Open Graph card)

**Tab 2 — Keyword Research (Surfer Lite) — NEW:**
- See [Section 10](#10-keyword-research-surfer-lite) for full detail

**Tab 3 — Content Audit (read-only):**
- Content Available checklist (type-specific checks with green/red indicators)
- Product content fields (read-only, "edit in Bukeer Admin" with deep link)
- Gallery zone
- V2 Enrichment zone (hotels only)

**Tab 4 — Technical:**
- Score breakdown (3 dimension bars + all 23 checks with pass/fail)
- JSON-LD Schema Preview (code block)

**Tab 5 — Preview:**
- Full-height iframe of public site (or informative message if no public page)
- AI Suggestions section

### 9.2 Paquetes — Detail

**What exists today:**

| Field | Source | Rendered | Editable |
|---|---|---|---|
| Descripcion | `package_kits.description` | Yes (read-only) | No (16 chars avg!) |
| Destino | `package_kits.destination` | Yes (badge) | No |
| Duracion | `duration_days` / `duration_nights` | Yes ("5D / 4N") | No |
| Items itinerario | `package_kit_versions` count | Yes (count) | No |
| Cover image | `cover_image_url` | Yes | No |
| `program_highlights` | JSONB in `package_kits` | **Fetched but NOT rendered** | No |
| `program_inclusions` | JSONB in `package_kits` | **Fetched but NOT rendered** | No |
| `program_exclusions` | JSONB in `package_kits` | **Fetched but NOT rendered** | No |
| `program_gallery` | JSONB in `package_kits` | Yes (used as gallery source) | No |
| `program_notes` | JSONB in `package_kits` | **NOT fetched** | No |
| `program_meeting_info` | JSONB in `package_kits` | **NOT fetched** | No |
| SEO Title | `website_product_pages` | Yes | **Yes** |
| Meta Description | `website_product_pages` | Yes | **Yes** |
| Target Keyword | `website_product_pages` | Yes | **Yes** |
| Noindex toggle | `website_product_pages` | Yes | **Yes** |

**What needs to change (Sprint 0):**
- Render `program_highlights` as bulleted list in Content Audit tab
- Render `program_inclusions` as bulleted list (replaces "No disponible")
- Render `program_exclusions` as bulleted list
- Fetch and render `program_notes` as free text
- Fetch and render `program_meeting_info` as structured info
- Feed all JSONB content to AI when generating SEO meta (currently AI only sees 16 chars)
- Keyword placeholder: "e.g. paquete eje cafetero 5 dias"

**Expected impact:** Package score C/65 → A/85+

### 9.3 Actividades — Detail

**What exists today:**

| Field | Source | Rendered | Editable |
|---|---|---|---|
| Descripcion | `activities.description` | Yes (read-only, 185 chars avg) | No |
| Descripcion corta | `activities.description_short` | Yes (334 chars avg) | No |
| Incluye | `activities.inclutions` | Yes (read-only, **851 chars avg** — very rich) | No |
| No incluye | `activities.exclutions` | Yes (102 chars avg) | No |
| Recomendaciones | `activities.recomendations` | Yes | No |
| Instrucciones | `activities.instructions` | Yes | No |
| Tipo experiencia | `activities.experience_type` | Yes (badge) | No |
| Duracion | `activities.duration_minutes` | Yes (minutes) | No |
| `schedule_data` | `activities` | **NOT fetched, NOT rendered** | No |
| Gallery | `item_images` | Yes | No |
| SEO Title | `website_product_pages` | Yes | **Yes** |
| Meta Description | `website_product_pages` | Yes | **Yes** |
| Target Keyword | `website_product_pages` | Yes | **Yes** |

**Key opportunity:** 696 activities have 0% SEO meta but rich inclusion data (851 chars avg). Bulk AI generation using this content can produce high-quality meta tags.

**What needs to change:**
- Fetch and render `schedule_data` (useful for Event rich snippets)
- Keyword placeholder: "e.g. tour cartagena ciudad amurallada"
- Priority target for bulk AI optimization

### 9.4 Hoteles — Detail

**What exists today:**

| Field | Source | Rendered | Editable |
|---|---|---|---|
| Descripcion | `hotels.description` | Yes (995 chars avg — most complete) | No |
| Descripcion corta | `hotels.description_short` | Yes (500 chars) | No |
| Incluye | `hotels.inclutions` | Yes (62 chars) | No |
| No incluye | `hotels.exclutions` | Yes (24 chars) | No |
| Recomendaciones | `hotels.recomendations` | Yes (285 chars) | No |
| Instrucciones | `hotels.instructions` | Yes | No |
| Estrellas | `hotels.star_rating` | Yes (star display) | No |
| Amenidades | `hotels.amenities` | Yes (max 8 visible, "+X" overflow) | No |
| Check-in/out | `hotels.check_in_time` / `check_out_time` | Yes | No |
| Coordenadas | V2 bridge or legacy | Yes | No |
| V2 Enrichment | `account_hotels` → `master_hotels` | Yes (city, country, rating, reviews) | No |
| Gallery | `item_images` | Yes (17 images avg) | No |
| SEO Title | `website_product_pages` | Yes | **Yes** |
| Meta Description | `website_product_pages` | Yes | **Yes** |
| Target Keyword | `website_product_pages` | Yes | **Yes** |

**Hotels are the best-equipped type for SEO.** No major changes needed in detail page.
- Keyword placeholder: "e.g. hotel boutique santa marta"

### 9.5 Transfers — Detail

| Field | Source | Rendered |
|---|---|---|
| Descripcion | `transfers.description` | Yes |
| Incluye / No incluye | `transfers.inclutions/exclutions` | Yes |
| Politicas | `transfers.policies` | Yes |
| Vehiculo | `transfers.vehicle_type` | Yes |
| Max pasajeros | `transfers.max_passengers` | Yes |
| Ruta | `from_location` → `to_location` | Yes |

Lowest SEO priority. Keyword placeholder: "e.g. transfer aeropuerto cartagena"

### 9.6 Blog — Detail

**TWO editors exist today (problem):**

**Blog Editor** (`/dashboard/[websiteId]/blog/[postId]`):
- Title, content (TipTap WYSIWYG), AI quick actions (/draft, /seo, /translate)
- Sidebar: SEO Title (70 chars), SEO Description (160 chars), Excerpt, Featured Image, URL Slug, Status (Draft/Published/Scheduled)
- **Missing: SEO score, AI generate button inline, Google preview**

**SEO Detail** (from Contenido tab):
- Full scoring, checklist, previews, AI generation
- Editable: SEO title, meta description, target keyword, noindex

**Change needed:** Add SEO score display to Blog Editor sidebar (same format as Page Editor: letter grade + numeric score + dimension bars). Keep both editors — blog editor for content writing, SEO detail for optimization.

### 9.7 Paginas — Detail

**Already the best implementation.** Page Editor right panel shows:
- SEO score (grade + number + 3 dimension bars)
- SEO Title input with char counter
- Meta Description input with char counter
- SEO Keywords manager (badges, max 50)
- Issues panel (failing checks)
- Passing panel (passing checks)

**This is the reference model** for what Blog editor should match.

---

## 10. Keyword Research (Surfer Lite)

### 10.1 Problem

Today, when the user selects a target keyword, the system only checks density (0.5-2.5%). There is no context about:
- Is this keyword worth targeting? (search volume)
- How competitive is it? (difficulty)
- What do top-ranking pages include? (content gap)
- What related keywords should I also include? (LSI / semantic)

### 10.2 Proposed Solution

A new **"Investigar Keyword"** panel in the content detail page (Tab 2) that uses AI + Search Console data to provide Surfer SEO-like analysis.

### 10.3 Flow

```
1. User enters target keyword (e.g. "tour cartagena")
        |
        v
2. [Investigar Keyword] button clicked
        |
        v
3. System queries Search Console MCP:
   - Impressions, clicks, CTR, avg position for this keyword
   - Related queries containing similar terms
   - Pages already ranking for this keyword
        |
        v
4. AI analyzes Search Console data + product content:
   - Evaluates keyword viability
   - Suggests primary + secondary keywords
   - Recommends content improvements
   - Identifies content gaps vs what ranks well
        |
        v
5. Panel displays:
   +---------------------------------------------------------------+
   | KEYWORD RESEARCH: "tour cartagena"                             |
   |                                                                |
   | FROM SEARCH CONSOLE:                                           |
   | Impresiones: 2,340/mes | Clics: 89 | CTR: 3.8% | Pos: 12.4  |
   |                                                                |
   | RELATED QUERIES (from Search Console):                         |
   | - "tour cartagena ciudad amurallada" (450 imp, pos 8)         |
   | - "city tour cartagena precio" (320 imp, pos 15)              |
   | - "tour cartagena islas rosario" (280 imp, pos 22)            |
   |                                                                |
   | AI RECOMMENDATION:                                             |
   | Keyword primaria: "tour cartagena ciudad amurallada"           |
   |   (mejor posicion y mas especifico)                            |
   | Keywords secundarias: incluir "islas del rosario",             |
   |   "centro historico", "castillo san felipe"                    |
   |                                                                |
   | CONTENT BRIEF:                                                 |
   | - Tu descripcion: 185 palabras                                |
   | - Incluir: precios desde, duracion, que incluye, horarios     |
   | - Preguntas a responder: "cuanto dura", "que incluye",        |
   |   "donde sale el tour"                                         |
   |                                                                |
   | [Aplicar keyword recomendada] [Regenerar meta con contexto]   |
   +---------------------------------------------------------------+
```

### 10.4 Technical Implementation

| Component | Source | Notes |
|---|---|---|
| Search Console data | `mcp__search-console__analytics_query` | Impressions, clicks, CTR, position for keyword |
| Related queries | `mcp__search-console__analytics_top_queries` | Filtered by keyword term |
| Keyword analysis | AI (OpenRouter) | Analyze SC data + product content to recommend strategy |
| Content brief | AI (OpenRouter) | Based on product type + keyword + existing content |

**Fallback** (if Search Console not connected): AI generates recommendations based on product content alone, without search volume data. Shows message: "Conecta Search Console en Analytics para ver datos reales de busqueda."

---

## 11. Analytics Integration

### 11.1 Current State — INFRASTRUCTURE ALREADY EXISTS

**The Analytics tab in bukeer-studio shows 3 empty input fields, BUT the full SEO Command Center was already built in bukeer-flutter (Epic #603, 54 issues closed) and the data is live in Supabase.** The problem is not missing infrastructure — it's that the frontend code was never migrated when bukeer-studio was split into its own repo.

**Data already in Supabase (colombiatours, verified 2026-04-13):**

| Table | Records | Sample Data |
|---|---|---|
| `seo_keywords` | 483 | "colombia tours" (pos 35, vol 788), "pueblos cerca a bucaramanga" (pos 8, vol 512), "+57 lada" (pos 1, vol 412) |
| `seo_keyword_snapshots` | 483 | Position, search_volume, difficulty, CPC, competition, ai_overview flag, source (gsc/dataforseo) |
| `seo_ga4_page_metrics` | 100 | Top page: /paquetes-a-colombia (2,809 sessions, 268 conversions, 58% bounce) |
| `seo_competitors` | 50 | colombiatours.travel (pos 55.6), youtube.com, instagram.com, tripadvisor.co |
| `seo_gsc_credentials` | 1 | OAuth tokens for GSC + GA4 (property_id: 294486074, ga4_connected: true). **Token expired 2026-04-05 — needs refresh.** |
| `seo_api_calls` | 7 | gsc_import (1000 rows), ga4_import (100 rows), search_volume ($0.50), competitors_domain ($0.005), serp_organic ($0.04), backlinks ($0.02) |
| `seo_audit_results` | 1 | PageSpeed audit for colombiatours.travel |
| `website_legacy_redirects` | 534 | 301 redirects (WordPress → Studio paths, e.g. /lugares-turisticos/ → /blog/lugares-turisticos) |
| `content_translations` | 32 | AI translations (es→en) for products and sections |

**Edge Functions active in Supabase:**
- `seo-site-auditor` — Weekly audit with PageSpeed Insights (ACTIVE)
- `translate-content` — Multi-language translation (ACTIVE)

**DataForSEO integration (built in bukeer-flutter):**
- Endpoints used: `search_volume`, `serp_organic`, `competitors_domain`, `backlinks`
- Cost: ~$1.60/month per agency (200 keywords weekly tracking)
- Credentials: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` in Supabase secrets
- Issues: #624 (cron semanal, CLOSED), #652 (AI Optimization API, CLOSED), #672 (cost dashboard, OPEN)

### 11.2 Proposed Analytics Tab (7 sub-tabs — matching SEO Command Center)

The original SEO Command Center built in bukeer-flutter had 7 tabs. We port this to the Analytics tab in bukeer-studio:

```
+----------------------------------------------------------------------+
| Pages   Contenido   Design   [Analytics]   Settings                   |
+----------------------------------------------------------------------+
|                                                                       |
|  Analytics                                                            |
|  Rendimiento y posicionamiento de tu sitio web                       |
|                                                                       |
|  [Overview] [Keywords] [Competitors] [Health] [AI Visibility]        |
|  [Backlinks] [Config]                                                |
|                                                                       |
|  "Overview" sub-tab:                                                  |
|  +----------+ +----------+ +----------+ +----------+                 |
|  | Sessions | | Users    | | Pageviews| | Bounce   |                 |
|  | 2,809    | | 2,562    | | 2,986    | | 58%      |  <-- FROM DB    |
|  +----------+ +----------+ +----------+ +----------+                 |
|  +----------+ +----------+ +----------+                              |
|  |Conversions| | Avg Time| | New Users|                              |
|  | 268       | | 86.7s   | | 2,562   |                              |
|  +----------+ +----------+ +----------+                              |
|                                                                       |
|  [Traffic chart - recharts line graph]                               |
|                                                                       |
|  Top Pages (from seo_ga4_page_metrics):                              |
|  1. /paquetes-a-colombia-todo-incluido  2,809 sessions  268 conv     |
|  2. /agencia-de-viajes-para-mexicanos   1,197 sessions  130 conv     |
|  3. / (homepage)                          524 sessions   10 conv     |
|                                                                       |
|  "Keywords" sub-tab (3 sections):                                    |
|  [Tracked] [Discover] [Expand]                                       |
|  483 keywords tracked | Position | Volume | Difficulty | CPC        |
|  Rank history chart (recharts area)                                  |
|  Keyword tags: by destination/topic/intent                           |
|  [+ Add keyword] [Enrich with DataForSEO]                           |
|                                                                       |
|  "Competitors" sub-tab:                                              |
|  50 competitor domains | avg_position | traffic_share                |
|  colombiatours.travel vs youtube, instagram, tripadvisor, facebook   |
|  Keyword overlap analysis                                            |
|                                                                       |
|  "Health" sub-tab:                                                   |
|  Core Web Vitals: LCP, CLS, INP (from PageSpeed / seo_audit_results)|
|  Site audit issues: critical / warning / info                        |
|                                                                       |
|  "AI Visibility" sub-tab:                                            |
|  Mention % by model: ChatGPT, Claude, Perplexity, Gemini            |
|  Citation discovery | Brand mentions | Drift alerts                 |
|  (from seo_ai_prompts + seo_ai_visibility_snapshots)                |
|                                                                       |
|  "Backlinks" sub-tab:                                                |
|  Backlinks API data | Disavow tracking                              |
|  (from DataForSEO backlinks endpoint)                                |
|                                                                       |
|  "Config" sub-tab:                                                   |
|  Google Analytics   [Connected - Property 294486074]                 |
|  Search Console     [Connected - colombiatours.travel]               |
|  DataForSEO         [Connected - balance $42.15]                     |
|  GTM ID: [GTM-XXXXXXX]                                              |
|  GA4 ID: [G-XXXXXXXXXX]                                             |
|  Pixel ID: [1234567890]                                              |
|  [Refresh OAuth tokens] [Sync now]                                   |
+----------------------------------------------------------------------+
```

### 11.3 Data Sources — Existing vs New

| Data | Source | Supabase Table | Status |
|---|---|---|---|
| Sessions, users, pageviews, bounce, conversions | GA4 API → DB | `seo_ga4_page_metrics` | **100 rows already in DB** |
| Keywords: position, volume, difficulty | GSC + DataForSEO → DB | `seo_keywords` + `seo_keyword_snapshots` | **483 rows already in DB** |
| Competitors: domains, traffic share | DataForSEO → DB | `seo_competitors` | **50 rows already in DB** |
| OAuth credentials (GSC + GA4) | OAuth flow → DB | `seo_gsc_credentials` | **Connected but token expired** |
| API call log + cost tracking | Automatic logging | `seo_api_calls` | **7 calls logged** |
| Core Web Vitals audit | PageSpeed API → DB | `seo_audit_results` | **1 audit stored** |
| AI Visibility snapshots | AI API probing → DB | `seo_ai_visibility_snapshots` | Table exists, 0 rows |
| Redirects (301) | Migration import | `website_legacy_redirects` | **534 redirects stored** |
| Content translations | AI translation → DB | `content_translations` | **32 translations stored** |

### 11.4 Migration Strategy (Port, Don't Rebuild)

The frontend code for the SEO Command Center exists in bukeer-flutter as Dart widgets + services. Instead of building from scratch, we **port** the existing logic:

| Flutter Source | Port To | Lines |
|---|---|---|
| `lib/services/seo_service.dart` (209 lines) | `lib/seo/seo-service.ts` (Next.js) | ~150 TS |
| `lib/bukeer/websites/tabs/seo_tab.dart` (430 lines) | `components/admin/analytics-dashboard.tsx` (React) | ~350 TSX |
| DataForSEO client (in seo_service.dart) | `lib/seo/dataforseo-client.ts` | ~100 TS |
| GSC OAuth refresh logic | `app/api/seo/gsc-refresh/route.ts` | ~80 TS |
| GA4 import logic | `app/api/seo/ga4-import/route.ts` | ~80 TS |

**What does NOT need porting** (already works or is backend-only):
- Edge Function `seo-site-auditor` — already active in Supabase
- Edge Function `translate-content` — already active
- All DB tables and migrations — already applied
- All 534 redirects — already in DB
- DataForSEO secrets — already in Supabase Vault

---

## 12. Existing Infrastructure — Migration Inventory

### 12.1 What Was Built (Epic #603 — 54 issues closed in bukeer-flutter)

The SEO Command Center was fully implemented in bukeer-flutter across 4 sprints:

| Sprint | Issues | What Was Built |
|---|---|---|
| Sprint 0 (#682) | 8 closed | API routes auth, contract fix, recharts installed, seoFetch auth wrapper |
| Sprint 1 (P0) | 9 closed | Market profiles, keywords discover/expand, hreflang validation, IndexNow, GSC OAuth + import, product detail SEO panel, blog SEO scoring, daily cron (6AM UTC) |
| Sprint 2 (Growth) | 6 closed | GA4 Data API integration, conversion attribution (keyword → quote → booking → revenue), Core Web Vitals (PageSpeed), DataForSEO AI Optimization, AI visibility tracking |
| Sprint 3 (Refinement) | 8 closed | Citation discovery, llms.txt, backlinks API, rank history charts, keyword tags, batch scoring, reputation monitoring, 136 unit tests |
| Pre-sprints | 23 closed | Core infra, DataForSEO 8 endpoints, scoring engine, i18n routing |

### 12.2 Supabase Tables — Live Data

| Table | Records | Key Columns | Source |
|---|---|---|---|
| `seo_keywords` | 483 | keyword, locale, target_url, website_id | GSC import |
| `seo_keyword_snapshots` | 483 | position, search_volume, difficulty, cpc, competition, ai_overview, source | GSC + DataForSEO |
| `seo_ga4_page_metrics` | 100 | page_path, sessions, bounce_rate, avg_session_duration, conversions, page_views, new_users | GA4 API |
| `seo_competitors` | 50 | domain, avg_position, traffic_share, snapshot_date | DataForSEO |
| `seo_gsc_credentials` | 1 | access_token, refresh_token, token_expiry, site_url, ga4_property_id, ga4_connected | OAuth |
| `seo_audit_results` | 1 | page_url, lcp_ms, cls_score, performance_score, issues, issue_counts | PageSpeed API |
| `seo_api_calls` | 7 | endpoint, row_count, estimated_cost, called_at | Auto-logged |
| `website_legacy_redirects` | 534 | old_path, new_path, status_code (301), hit_count | Migration import |
| `content_translations` | 32 | entity_type, entity_id, locale, content (JSONB), source (ai) | AI translation |
| `seo_ai_prompts` | 0 | prompt, intent, locale | Ready, no data |
| `seo_ai_visibility_snapshots` | 0 | model (chatgpt/claude/perplexity/gemini), mentioned, citation_url | Ready, no data |
| `seo_market_profiles` | 0 | Multi-locale SEO targeting | Ready, no data |
| `blog_content_scores` | 0 | overall_score, seo_score, readability_score, grade | Ready, no data |
| `blog_topic_clusters` | 0 | Hub-and-spoke content strategy | Ready, no data |
| `seo_keyword_tags` | 0 | Tag system for keywords | Ready, no data |

### 12.3 Edge Functions — Active in Supabase

| Function | Status | Purpose |
|---|---|---|
| `seo-site-auditor` | ACTIVE | Weekly PageSpeed audit, populates `seo_audit_results` |
| `translate-content` | ACTIVE | Multi-language content translation, populates `content_translations` |

### 12.4 DataForSEO Integration — Endpoints Used

| Endpoint | Cost/call | Data Stored In | Records |
|---|---|---|---|
| `search_volume` | $0.50 / 100 keywords | `seo_keyword_snapshots` (volume, difficulty, CPC) | 483 |
| `serp_organic` | $0.04 / 20 results | `seo_keyword_snapshots` (position, ai_overview) | logged |
| `competitors_domain` | $0.005 / 50 domains | `seo_competitors` | 50 |
| `backlinks` | $0.02 / request | — | logged |
| **Total monthly cost** | **~$1.60/agency** (200 keywords weekly) | | |

Credentials: `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` in Supabase Vault secrets.

### 12.5 Flutter Code to Port (Source → Target)

| Source (bukeer-flutter) | Lines | Target (bukeer-studio) | Effort |
|---|---|---|---|
| `lib/services/seo_service.dart` | 209 | `lib/seo/seo-service.ts` | M |
| `lib/services/website_blog_service.dart` | 738 | Already exists (blog-related queries) | — |
| `lib/services/website_ai_service.dart` | 570 | Already exists (AI generation) | — |
| `lib/bukeer/websites/tabs/seo_tab.dart` | 430 | `components/admin/analytics/` (React) | L |
| `lib/bukeer/websites/tabs/content_seo_tab.dart` | 90 | Not needed (different IA) | — |
| DataForSEO client logic | ~200 | `lib/seo/dataforseo-client.ts` | M |
| GSC OAuth + import logic | ~150 | `app/api/seo/gsc/route.ts` | M |
| GA4 import logic | ~100 | `app/api/seo/ga4/route.ts` | S |

### 12.6 Issues Still Open (P2 — Not Blocking)

| Issue | Title | Priority |
|---|---|---|
| #661 | Content Gap Analysis — competitor keyword opportunities | P2 |
| #659 | Schema Validation UI — test JSON-LD inline | P2 |
| #658 | Competitor Battlecards — side-by-side AI perception | P2 |
| #672 | DataForSEO Cost Dashboard — spend monitoring per agency | P2 |
| #673 | Google Trends integration — seasonal travel demand | P2 |

---

## 13. Migration Map

### 12.1 What Moves Where

```
BEFORE (9 tabs)                      AFTER (5 tabs)
--------------------                 --------------------

Pages --------------------------------> Pages (unchanged)

Products --------+
                 |
SEO Audit -------+--> Contenido (unified content hub)
                 |    Sub-tabs: Paquetes, Actividades, Hoteles,
Blog ------------+    Traslados, Destinos, Paginas, Blog

Design --------------------------------> Design (unchanged)

Content & SEO ---+
  > Content -----+--> Settings > Site Info
  > SEO & Scripts+--> Settings > SEO Global

Analytics ---------> Analytics (real GA + Search Console integration)
                     Config sub-tab keeps GTM/GA4/Pixel inputs

Leads ----------------> DEFERRED (not in MVP)

Settings ---------> Settings (+ Site Info + SEO Global sub-tabs)
```

### 12.2 Route Redirects Required

| Old Route | New Route | Duration |
|---|---|---|
| `/dashboard/[id]/products` | `/dashboard/[id]/contenido` | 6 months |
| `/dashboard/[id]/seo` | `/dashboard/[id]/contenido` | 6 months |
| `/dashboard/[id]/content-seo` | `/dashboard/[id]/settings#site-info` | 6 months |
| `/dashboard/[id]/blog` | `/dashboard/[id]/contenido?tab=blog` | 6 months |

---

## 14. User Flows (Before/After)

### Flow 1: "Feature a hotel AND check its SEO score"

| | Before | After |
|---|---|---|
| Steps | Products > find > star > back > SEO Audit > find same hotel | Contenido > Hoteles > see star + score in same row |
| Clicks | 6 | 2 |
| Context switches | 2 | 0 |

### Flow 2: "Where do I set up tracking codes?"

| | Before | After |
|---|---|---|
| Steps | Try Analytics (GTM here), try Content & SEO (scripts here), try Settings (not here) | Settings > SEO Global (all tracking + scripts) OR Analytics > Config |
| Tabs checked | 3 | 1 |

### Flow 3: "Which products need SEO work?"

| | Before | After |
|---|---|---|
| Steps | SEO Audit > sort by score | Contenido > sort by score (default: worst first) |
| Extra capability | Just score and grade filter | + Filter by published/unpublished, SEO completeness, multi-field search |

### Flow 4: "What keywords should I target for this activity?"

| | Before | After |
|---|---|---|
| Steps | Enter keyword manually, see density % only | Enter keyword > [Investigar] > see Search Console data + AI recommendations + content brief |
| Data available | Density (0.5-2.5%) | Impressions, clicks, CTR, position, related queries, AI recommendations |

### Flow 5: "How is my site performing?"

| | Before | After |
|---|---|---|
| Steps | Can't — no analytics integration | Analytics > Overview: sessions, users, pageviews, trends, top pages |
| Data available | 0 | Full GA + Search Console data |

---

## 15. Wireframes

### 14.1 Contenido Tab (Unified Content Hub)

```
+----------------------------------------------------------------------+
| <- colombiatours                                     Preview  Update  |
+----------------------------------------------------------------------+
| Pages   [Contenido]   Design   Analytics   Settings                   |
+----------------------------------------------------------------------+
|                                                                       |
|  Contenido                                                            |
|  Gestiona todo el contenido y SEO de tu sitio                        |
|                                                                       |
|  +------------+ +------------+ +------------+ +------------+         |
|  |Score prom. | |Publicados  | |Con issues  | |Sin schema  |         |
|  |  C / 58    | |  834/1220  | |    986     | |    892     |         |
|  +------------+ +------------+ +------------+ +------------+         |
|                                                                       |
|  [Paquetes] [Actividades] [Hoteles] [Traslados] [Destinos] [Pag] [Blog]
|                                                                       |
|  FILTERS:                                                             |
|  [Grado: Todos v] [Estado: Todos v] [SEO: Todos v]                  |
|  [Search nombre, slug, ubicacion...]                                  |
|  Ordenar: [Score v] (worst first)                                     |
|                                     [Export CSV] [Optimizar con IA]  |
|                                                                       |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|  |Pub|* | Img | Nombre             | Ubicacion| Tipo |Score|Iss | > |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|  |ON|o |[img]| AC Hotel Marriott  | S. Marta | Hotel| C/64|  3 | > |
|  |  |  |     | /ac-hotel-marriott |          |      |     |    |   |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|  |ON|* |[img]| 4x1 Adventure      | Bogota   | Activ| B/78|  1 | > |
|  |  |  |     | /4x1-adventure     |          |      |     |    |   |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|  |OFF| |[img]| Cartagena 5D/4N    | Cartagen | Paq. | C/65|  5 | > |
|  |  |  |     | /cartagena-5d-4n   |          |      |     |    |   |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|  |ON|  |[img]| Zona Cafetera Blog |    --    | Blog | F/22|  7 | > |
|  |  |  |     | /blog/zona-cafetera|          |      |     |    |   |
|  +--+---+-----+--------------------+----------+------+-----+----+---+
|                                                                       |
|  < Previous                                     1 / 41  Next >      |
+----------------------------------------------------------------------+

COLUMNS:
  Pub = Published toggle (ON/OFF) — visible and filterable
  *   = Featured (star) — shown on public site homepage
  Img = Thumbnail with fallback placeholder
  Score = Color coded: green A/B, yellow C, red D/F
  >   = Navigate to content detail page
```

### 14.2 Content Detail — Meta & Keywords Tab

```
+----------------------------------------------------------------------+
| <- Volver    Dreams Playa Bonita Panama           C -- 64/100        |
|              Hotel                       [Publicado: ON] [Guardar]    |
|                                                                       |
|  [Meta & Keywords]  [Keyword Research]  [Content Audit]              |
|  [Technical]  [Preview]                                               |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |  SEO Title                                           44/70     |  |
|  |  +---------------------------------------------+  [AI gen]    |  |
|  |  | Dreams Playa Bonita Panama - Hotel Todo...   |              |  |
|  |  +---------------------------------------------+              |  |
|  |                                                                 |  |
|  |  Meta Description                                  142/160     |  |
|  |  +---------------------------------------------+  [AI gen]    |  |
|  |  | Hotel familiar con opcion de seleccionar...  |              |  |
|  |  +---------------------------------------------+              |  |
|  |                                                                 |  |
|  |  Target Keyword                                                 |  |
|  |  +---------------------------------------------+              |  |
|  |  | hotel playa bonita panama                    |              |  |
|  |  +---------------------------------------------+              |  |
|  |  Placeholder: "e.g. hotel boutique santa marta"                |  |
|  |                                                                 |  |
|  |  Keyword metrics:                                               |  |
|  |  Densidad: 1.8% (ideal)  |  En titulo: Si  |  En meta: Si    |  |
|  |                                                                 |  |
|  |  Indexacion   [ON]  Visible en buscadores                       |  |
|  |                                                                 |  |
|  |  +-- Google Preview ------------------------------------+      |  |
|  |  | colombiatours.travel/hoteles/dreams-playa-bonita     |      |  |
|  |  | Dreams Playa Bonita Panama - Hotel Todo Incluido     |      |  |
|  |  | Hotel familiar con opcion de seleccionar plan...     |      |  |
|  |  +------------------------------------------------------+      |  |
|  |                                                                 |  |
|  |  +-- Social Preview (OG) --------+                             |  |
|  |  | [Hotel Image]                  |                             |  |
|  |  | COLOMBIATOURS.TRAVEL           |                             |  |
|  |  | Dreams Playa Bonita Panama     |                             |  |
|  |  | Hotel familiar con opcion...   |                             |  |
|  |  +--------------------------------+                             |  |
|  +----------------------------------------------------------------+  |
+----------------------------------------------------------------------+
```

### 14.3 Content Detail — Keyword Research Tab (NEW)

```
+----------------------------------------------------------------------+
| <- Volver    City Tour Medellin               D -- 42/100            |
|              Actividad                                  [Guardar]     |
|                                                                       |
|  [Meta & Keywords]  [Keyword Research]  [Content Audit]              |
|  [Technical]  [Preview]                                               |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |  TARGET KEYWORD: "tour medellin"                                |  |
|  |                                     [Investigar Keyword]        |  |
|  |                                                                 |  |
|  |  +-- SEARCH CONSOLE DATA --------------------------------+     |  |
|  |  |  Impresiones: 2,340/mes  |  Clics: 89  |  CTR: 3.8%  |     |  |
|  |  |  Posicion promedio: 12.4                                |     |  |
|  |  +--------------------------------------------------------+     |  |
|  |                                                                 |  |
|  |  QUERIES RELACIONADAS (Search Console):                         |  |
|  |  +----------------------------------------------------+---+    |  |
|  |  | Query                              | Imp  | Pos    | * |    |  |
|  |  | "tour medellin ciudad"             | 890  | 8.2    |[+]|    |  |
|  |  | "city tour medellin precio"        | 560  | 14.5   |[+]|    |  |
|  |  | "tour medellin pueblito paisa"     | 340  | 19.1   |[+]|    |  |
|  |  | "medellin tour guiado"             | 210  | 22.3   |[+]|    |  |
|  |  +----------------------------------------------------+---+    |  |
|  |  [+] = Apply as target keyword                                  |  |
|  |                                                                 |  |
|  |  AI RECOMMENDATION:                                             |  |
|  |  +--------------------------------------------------------+    |  |
|  |  | Keyword primaria recomendada:                           |    |  |
|  |  | "tour medellin ciudad" (mejor posicion, buen volumen)   |    |  |
|  |  |                                                         |    |  |
|  |  | Keywords secundarias a incluir en contenido:            |    |  |
|  |  | "pueblito paisa", "botero", "guia experto",            |    |  |
|  |  | "transporte incluido"                                   |    |  |
|  |  |                                                         |    |  |
|  |  | Content Brief:                                          |    |  |
|  |  | - Tu contenido: 185 palabras (minimo recomendado: 250) |    |  |
|  |  | - Incluir: duracion del tour, que incluye, horarios    |    |  |
|  |  | - Preguntas a responder:                               |    |  |
|  |  |   "cuanto dura el city tour medellin"                  |    |  |
|  |  |   "que incluye el tour medellin"                       |    |  |
|  |  |   "donde sale el tour"                                 |    |  |
|  |  +--------------------------------------------------------+    |  |
|  |                                                                 |  |
|  |  [Aplicar keyword recomendada]  [Regenerar meta con contexto]  |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
|  * Si Search Console no esta conectado:                               |
|  "Conecta Search Console en Analytics > Config para ver              |
|   datos reales de busqueda."                                          |
+----------------------------------------------------------------------+
```

### 14.4 Settings Tab (Expanded)

```
+----------------------------------------------------------------------+
| Pages   Contenido   Design   Analytics   [Settings]                   |
+----------------------------------------------------------------------+
|                                                                       |
|  Settings                                                             |
|  [General] [Domain] [Site Info] [SEO Global] [Template] [Version]    |
|                                                                       |
|  "Site Info" sub-tab (FROM Content & SEO > Content):                 |
|  +-- IDENTITY --------------------------------------------------+   |
|  |  Site Name     [Colombia Tours Travel                     ]   |   |
|  |  Tagline       [Tu agencia de viajes personalizada        ]   |   |
|  +---------------------------------------------------------------+   |
|  +-- CONTACT ----------------------------------------------------+   |
|  |  Email    [info@colombiatours.travel]                         |   |
|  |  Phone    [+57 300 123 4567]                                  |   |
|  |  Address  [Carrera 7 #45-12, Bogota]                          |   |
|  +---------------------------------------------------------------+   |
|  +-- SOCIAL LINKS -----------------------------------------------+  |
|  |  facebook / instagram / twitter / whatsapp / youtube / tiktok |  |
|  +---------------------------------------------------------------+  |
|                                                                       |
|  "SEO Global" sub-tab (FROM Content & SEO > SEO & Scripts):         |
|  +-- SITE-WIDE META -------------------------------------------+    |
|  |  Meta Title (global)         [Colombia Tours Travel | ...]  |    |
|  |  Meta Description (global)   [Descubre Colombia con...]     |    |
|  |  Keywords                    [travel, colombia, tours]      |    |
|  |  Google Preview              (SERP snippet)                 |    |
|  +-------------------------------------------------------------+    |
|  +-- SCRIPTS & TRACKING ---------------------------------------+    |
|  |  Custom Head Scripts         [<!-- paste here -->]           |    |
|  |  Custom Body Scripts         [<!-- paste here -->]           |    |
|  +-------------------------------------------------------------+    |
+----------------------------------------------------------------------+

NOTE: GTM/GA4/Pixel IDs are in Analytics > Config, not here.
      SEO Global is for meta tags and custom scripts.
      Tracking connection is in Analytics.
```

---

## 16. Acceptance Criteria

### AC-1: Navigation Reduction (G1)

```
GIVEN the user is on any website admin page
WHEN they look at the top navigation
THEN they see exactly 5 tabs: Pages, Contenido, Design, Analytics, Settings
AND no tab labeled "Blog", "Content & SEO", "Products", "SEO Audit", or "Leads" is visible
```

### AC-2: Unified Contenido Tab (G2)

```
GIVEN the user navigates to the Contenido tab
WHEN the page loads
THEN they see a single table with columns: Published, Star, Image, Name, Location, Type, Score, Issues, Action
AND sub-tabs are ordered: [Paquetes] [Actividades] [Hoteles] [Traslados] [Destinos] [Paginas] [Blog]
AND Blog posts appear in the Blog sub-tab (no separate Blog top-level tab)
AND [Export CSV] and [Optimizar con IA] buttons are present
AND the table supports pagination (20 items per page)
```

### AC-3: Advanced Filtering (G8)

```
GIVEN the user is on the Contenido tab
WHEN they interact with filters
THEN they can filter by:
  - SEO Grade: A, B, C, D, F, or All
  - Published status: Published, Unpublished, Featured, or All
  - SEO completeness: Con titulo+desc, Sin titulo, Sin descripcion, Sin keyword, Sin schema, or All
AND text search matches against name + slug + location (not just name)
AND search has 300ms debounce
AND filters are additive (AND logic)
AND default sort is score ascending (worst first)
AND changing any filter resets pagination to page 1
```

### AC-4: Published/Unpublished Toggle (M13)

```
GIVEN a content item in the Contenido table
WHEN the user looks at the row
THEN they see a Published toggle (ON/OFF badge or switch)
AND they can toggle it directly from the table
AND they can filter the table by published/unpublished status

For products: published status maps to featured_products JSON
For blog posts: published status maps to status field (published/draft)
For pages: published status maps to is_published field
For destinations: always shown as published (no toggle)
```

### AC-5: Package JSONB Surfacing (G4)

```
GIVEN a package product is selected in the content detail page
WHEN the "Content Audit" tab is displayed
THEN the following JSONB fields are rendered (when data exists):
  - program_highlights as a bulleted list
  - program_inclusions as a bulleted list (replaces "No disponible")
  - program_exclusions as a bulleted list
  - program_gallery images in the Gallery zone
  - program_notes as free text
  - program_meeting_info as structured info
AND the AI generation receives all JSONB content as context (not just 16-char description)
AND package scores improve from C/65 baseline toward A/85+ target
```

### AC-6: SEO Detail Tabbed Layout

```
GIVEN the user opens a content item's detail page
WHEN the page loads
THEN content is organized in 5 tabs:
  - "Meta & Keywords": SEO Title + AI, Meta Description + AI, Target Keyword (contextual placeholder), Indexation, Google Preview, OG Preview
  - "Keyword Research": Search Console data + AI recommendations + content brief
  - "Content Audit": Checklist, product content (read-only + deep link), gallery
  - "Technical": Score breakdown, JSON-LD Schema Preview
  - "Preview": Iframe preview (or informative message), AI Suggestions
```

### AC-7: Keyword Research (G7)

```
GIVEN the user has entered a target keyword on a content detail page
WHEN they click [Investigar Keyword]
THEN the Keyword Research tab shows:
  - Search Console data for that keyword (impressions, clicks, CTR, avg position) IF connected
  - Related queries from Search Console with their metrics
  - AI recommendation: primary keyword, secondary keywords, content brief
  - [Apply keyword] button to set the recommended keyword as target
IF Search Console is not connected
THEN the panel shows AI-only recommendations based on product content
AND displays: "Conecta Search Console en Analytics > Config para ver datos reales de busqueda."
```

### AC-8: Analytics Integration (G6)

```
GIVEN the user navigates to the Analytics tab
WHEN Google Analytics is connected
THEN the Overview sub-tab shows: sessions, users, pageviews, bounce rate with trend indicators
AND the Search sub-tab shows: impressions, clicks, CTR, avg position from Search Console
AND top queries and top pages are listed with metrics

WHEN Google Analytics is NOT connected
THEN the Config sub-tab shows connection buttons for GA and Search Console
AND the other sub-tabs show empty states with "Connect to see data" messages
AND manual tracking ID inputs (GTM/GA4/Pixel) are always available in Config
```

### AC-9: Settings Consolidation

```
GIVEN the user navigates to Settings
THEN they see sub-tabs: General, Domain, Site Info, SEO Global, Template, Version
AND "Site Info" contains: Site Name, Tagline, Contact Info, Social Links
AND "SEO Global" contains: Global Meta Title, Global Meta Desc, Keywords, Custom Scripts
AND these fields are NOT duplicated anywhere else in the application
```

### AC-10: Blog SEO in Editor (M5)

```
GIVEN the user opens the Blog post editor
WHEN the right sidebar is visible
THEN the SEO section shows:
  - SEO score (letter grade + numeric score) matching the Page Editor format
  - SEO Title with char counter
  - SEO Description with char counter
  - Score updates live as the user edits
```

---

## 17. Implementation Plan

### Sprint 0 — Product Data Quick Wins (P0)

**Goal**: Fix premium product scoring and contextual UX.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 1 | Surface Package JSONB fields: render `program_highlights`, `program_inclusions`, `program_exclusions` in Content Audit; fetch `program_notes`, `program_meeting_info` | C4, M10 | M |
| 2 | Feed all JSONB content to AI generation context (not just 16-char description) | C4 | M |
| 3 | Contextual keyword placeholders by product type | M12 | S |
| 4 | Reorder sub-tabs by business priority: Paquetes > Actividades > Hoteles > Traslados | — | S |

**Exit criteria**: Package avg score C/65 → B/80+. Keyword placeholders are type-specific.

### Sprint 1 — Core Unification: Contenido Tab (P0)

**Goal**: Merge Products + SEO Audit + Blog into unified Contenido tab.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 5 | Create unified Contenido table with columns: Published, Star, Image, Name+Slug, Location, Type, Score, Issues, Action | C1, C2, M4 | L |
| 6 | Add Published/Unpublished toggle column with visual indicator (ON/OFF badge) | M13 | M |
| 7 | Replace UUID with slug/location in all rows | C2 | S |
| 8 | Move Blog sub-tab into Contenido (remove top-level Blog tab) | G2 | M |
| 9 | Remove old Products tab from navigation | C1 | S |
| 10 | Rename route from "seo" to "contenido" + add redirects for old routes | C1 | S |

**Exit criteria**: Single Contenido tab with all content types. Published toggle visible. No UUID shown. Blog accessible via sub-tab.

### Sprint 2 — Advanced Filtering (P1)

**Goal**: Rich filtering experience in Contenido.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 11 | Add Grade filter (A/B/C/D/F) — already exists, verify works | — | S |
| 12 | Add Published/Unpublished/Featured filter | M13 | M |
| 13 | Add SEO completeness filter (sin titulo, sin desc, sin keyword, sin schema) | — | M |
| 14 | Expand text search to match name + slug + location (not just name) | — | S |
| 15 | Add 300ms debounce to search input | — | S |
| 16 | Set default sort to score ascending (worst first) | — | S |
| 17 | Add bulk actions: Publicar/Despublicar multiple items | M13 | M |

**Exit criteria**: All 3 filter dimensions work with AND logic. Search matches multi-field. Default sort shows worst scores first.

### Sprint 3 — Tab Consolidation + Settings (P1)

**Goal**: Reduce from 7 tabs (after Sprint 1) to 5 tabs.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 18 | Create Settings > Site Info sub-tab (absorb Content & SEO > Content: name, tagline, contact, social) | C3, M2 | M |
| 19 | Create Settings > SEO Global sub-tab (absorb Content & SEO > SEO & Scripts: meta title/desc, keywords, scripts) | C3, M2 | M |
| 20 | Remove Content & SEO tab from navigation | M2 | S |
| 21 | Remove Leads tab from navigation (deferred) | — | S |
| 22 | Update all internal links/references to removed tabs | — | S |

**Exit criteria**: 5 tabs visible. Site identity in Settings > Site Info. Global SEO in Settings > SEO Global. No broken links.

### Sprint 4 — Analytics Integration: Port from bukeer-flutter (P1)

**Goal**: Port SEO Command Center from bukeer-flutter to bukeer-studio. Data already exists in Supabase (483 keywords, 100 GA4 metrics, 50 competitors). This is a **port, not a rebuild**.

| # | Task | Issue(s) | Effort | Source |
|---|------|----------|--------|--------|
| 23 | Install recharts + create Analytics layout with 7 sub-tabs (Overview, Keywords, Competitors, Health, AI Visibility, Backlinks, Config) | M3 | M | New (layout) |
| 24 | Port Overview sub-tab: read `seo_ga4_page_metrics` → sessions, users, pageviews, bounce, conversions with charts | M3 | M | `seo_tab.dart` Overview section |
| 25 | Port Keywords sub-tab: read `seo_keywords` + `seo_keyword_snapshots` → tracked keywords with position, volume, difficulty, rank history chart | M3 | L | `seo_tab.dart` Keywords section |
| 26 | Port Competitors sub-tab: read `seo_competitors` → domain table with traffic share, avg position | M3 | M | `seo_tab.dart` Competitors |
| 27 | Port Health sub-tab: read `seo_audit_results` → Core Web Vitals (LCP, CLS, INP), issue breakdown | M3 | S | `seo_tab.dart` Audit section |
| 28 | Create Config sub-tab: GSC/GA4 OAuth status (read `seo_gsc_credentials`), refresh token flow, GTM/GA4/Pixel inputs, DataForSEO balance | M3 | M | OAuth logic from seo_service.dart |
| 29 | Port DataForSEO client: `search_volume`, `serp_organic`, `competitors_domain`, `backlinks` endpoints → `lib/seo/dataforseo-client.ts` | M3 | M | seo_service.dart DataForSEO logic |
| 30 | Create API route `app/api/seo/sync/route.ts`: GSC import + GA4 import + DataForSEO enrich (manual trigger from Config) | M3 | M | Edge Function cron logic |

**Exit criteria**: All 7 sub-tabs render with data from existing Supabase tables. Keywords show position + volume. GA4 metrics show sessions + conversions. Config shows connection status. DataForSEO client functional.

### Sprint 5 — Keyword Research + Inline SEO (P1)

**Goal**: Surfer SEO lite + consistent SEO feedback everywhere.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 31 | Create Keyword Research tab in content detail: read `seo_keyword_snapshots` for target keyword data + AI analysis | M14 | L |
| 32 | Port AI Visibility sub-tab: read `seo_ai_prompts` + `seo_ai_visibility_snapshots` → mention % by model | — | M |
| 33 | Add SEO score to Blog post editor sidebar (match Page Editor format) | M5 | M |
| 34 | Add inline [AI Generate] buttons next to SEO Title and Meta Description fields | m7 | M |
| 35 | Remove or repurpose empty AI tab from Page Editor left panel | M8 | S |
| 36 | Run bulk AI generation for 696 activities using rich inclusion data | M11 | L |

**Exit criteria**: Keyword research panel functional (with or without Search Console). Blog editor shows score. AI generate buttons inline. Activity SEO coverage > 90%.

### Sprint 6 — Detail Page UX + Polish (P2/P3)

**Goal**: Improve detail page experience and fix remaining issues.

| # | Task | Issue(s) | Effort |
|---|------|----------|--------|
| 37 | Restructure SEO detail page into 5-tab layout | M6 | L |
| 38 | Add deep link to Flutter admin for product editing | M7 | S |
| 39 | Fix preview iframe: informative message for products without public pages | M9 | S |
| 40 | Render activity `schedule_data` in Content Audit tab | m8 | M |
| 41 | Render package `program_meeting_info` in Content Audit tab | m9 | S |
| 42 | Fix remaining cosmetic issues (c1-c4) | c1-c4 | M |
| 43 | Add React Query / SWR caching for Contenido data fetch | — | M |

**Exit criteria**: Detail page is tabbed. Deep links work. Preview shows informative message. Client-side caching reduces unnecessary DB queries.

### Sprint Roadmap Summary

```
Sprint 0: Product Data Fix         --> Package C/65 -> A/85+
Sprint 1: Core Unification         --> 9 -> 7 tabs, unified Contenido
Sprint 2: Advanced Filtering        --> Rich filter UX in Contenido
Sprint 3: Tab Consolidation         --> 7 -> 5 tabs, Settings expanded
Sprint 4: Analytics Port            --> Port SEO Command Center from bukeer-flutter
                                        (483 keywords, 100 GA4 metrics, 50 competitors
                                         already in DB — port frontend, not rebuild)
Sprint 5: Keyword Research + SEO    --> Surfer lite, AI visibility, blog score, bulk AI
Sprint 6: Detail Page Polish        --> Tabbed detail, caching, cosmetics
```

---

## 18. Risks & Dependencies

### 18.1 Risks

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | Users bookmarked old tab URLs | Broken bookmarks | Medium | Route redirects for 6 months |
| R2 | Contenido table performance with 1,200+ items | Slow load | Medium | Keep client-side pagination (OK for ~1,200). Add React Query caching (Sprint 6). |
| R3 | GSC OAuth token expired (2026-04-05) | No fresh keyword data | High | Refresh token exists in `seo_gsc_credentials`. Build refresh flow in Sprint 4 Config tab. |
| R4 | Bulk AI generation for 696 activities rate limits | Partial generation | Medium | Batch in groups of 50. Show progress. Allow resume. |
| R5 | Search Console not connected = empty keyword research | Degraded feature | Low | **Already connected** — 483 keywords in DB. Risk is only token expiry. |
| R6 | Published toggle semantics differ by content type | Confusion | Low | Clear mapping: products → featured_products JSON, blog → status field, pages → is_published |
| R7 | DataForSEO API costs if scaled to many agencies | Budget overrun | Low | ~$1.60/month per agency. `seo_api_calls` table logs all costs. Issue #672 (cost dashboard) planned. |
| R8 | Dart→TypeScript port fidelity | Logic drift during port | Medium | Use Flutter source as reference, write tests for ported logic. 136 unit tests exist in bukeer-flutter as specification. |

### 18.2 Dependencies

| # | Dependency | Blocks | Status |
|---|-----------|--------|--------|
| D1 | Package JSONB data in `package_kit_versions.services_snapshot` | Sprint 0 | Available (verified) |
| D2 | V2 bridge tables for location data | Sprint 1 | Available |
| D3 | `seo_gsc_credentials` OAuth tokens | Sprint 4 | **Exists but expired** (2026-04-05). Refresh token available. |
| D4 | `seo_keywords` + `seo_keyword_snapshots` data | Sprint 4 | **483 rows available** |
| D5 | `seo_ga4_page_metrics` data | Sprint 4 | **100 rows available** |
| D6 | `seo_competitors` data | Sprint 4 | **50 rows available** |
| D7 | DataForSEO API credentials | Sprint 4 | **In Supabase Vault** (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD) |
| D8 | Flutter SEO source code for porting | Sprint 4 | **Available** in bukeer-flutter (`lib/services/seo_service.dart`, `lib/bukeer/websites/tabs/seo_tab.dart`) |
| D9 | Chart library (recharts) | Sprint 4 | **Needs install** (was installed in bukeer-flutter) |
| D10 | `website_legacy_redirects` (534 redirects) | Sprint 3 | **Available** — need middleware to serve 301s |
| D11 | Flutter admin deep link URL pattern | Sprint 6 | Needs discovery |
| D12 | Edge Function `seo-site-auditor` | Sprint 4 | **ACTIVE** in Supabase |

---

## 19. Out of Scope

| Item | Reason | Where It Goes |
|------|--------|---------------|
| **Markets & Languages (i18n)** | Complex: needs DB schema changes (`websites.locale`), multi-market content, full hreflang infrastructure. Partial infrastructure exists (hreflang tags, slug translations, AI locale param) but no DB support. | **SPEC-I18N-001** (separate spec) |
| Leads tab | No current usage | Re-evaluate post-launch |
| Page Editor left-panel redesign | Complex editor architecture | Future SPEC |
| Flutter admin modifications | Different repo/team | Coordinate via D5 |
| Mobile responsive navigation | Desktop-only admin | When mobile admin prioritized |
| WCAG AA accessibility | Orthogonal to IA structure | Separate SPEC |
| New SEO features (robots.txt editor, sitemap UI) | Nice-to-have, not IA restructure | Sprint 7+ |

### Markets & Languages — What Exists (for SPEC-I18N-001 reference)

| Component | Status | Notes |
|---|---|---|
| Hreflang tag generation | Implemented (`lib/seo/hreflang.ts`) | Supports es, en, pt, fr |
| Slug translation map | Implemented | destinos→destinations, hoteles→hotels, etc. |
| AI locale parameter | Implemented | `locale` param in seo-prompts.ts (default: 'es') |
| Blog translate quick actions | Implemented | `/translate EN`, `/translate PT` in editor |
| `websites.locale` DB field | **NOT implemented** | No language/market field in websites table |
| Multi-market content | **NOT implemented** | One website = one language, no variants |
| `inLanguage` in JSON-LD | **Hardcoded to 'es'** | Should read from DB (when field exists) |
| Per-language SEO meta | **NOT implemented** | Single title/description, not per language |
| `seo_market_profiles` table | **Created, 0 rows** | Ready for multi-locale keyword tracking |
| `content_translations` table | **32 rows** | AI translations (es→en) for products and sections |

---

## 20. Appendix

### A. Scoring System Reference

```
Input Data                     Scoring Engine           Output
----------                     --------------           ------

META (40%)                                              Overall Score 0-100
- seo_title          ---+
- seo_desc              |     scoreItemSeo()            Grade A-F
- target_keyword     ---+---> lib/seo/
                        |     unified-scorer             Checks[] (23 total)
CONTENT (35%)           |                                - passed / failed
- description        ---+                               - category tag
- word_count            |
- images[]              |     Breakdown:
- amenities             |     - meta: 0-100
- star_rating        ---+     - content: 0-100
                        |     - technical: 0-100
TECHNICAL (25%)         |
- has_jsonld         ---+     Recommendations[]
- has_canonical              (localized Spanish)
- has_hreflang
- has_og_tags
- slug quality
```

### B. Competitive Positioning

```
                        SEO DEPTH
                           ^
           SEMrush *       |      * Ahrefs
                           |
           SurferSEO *     |
                           |
                    +------+------------------+
                    |      |                  |
        HubSpot *  |      |    * Bukeer      |  <-- AFTER redesign
                    |      |      Studio      |  (Surfer lite + Analytics)
                    |      |   (proposed)     |
                    +------+------------------+
                           |
           Yoast *         |        * Bukeer Studio (current)
                           |           ^ scattered but deep
    Squarespace *          |
       Framer *            |      * Shopify
    -----------------------+---------------------->
    Pure SEO Tool                            Full Website Builder
```

### C. Screenshots Index

| File | Level | Screen |
|------|-------|--------|
| `01-dashboard-root.png` | L0 | Website list |
| `02-pages-tab.png` | L1 | Pages tab |
| `03-blog-tab.png` | L1 | Blog tab |
| `04-design-tab.png` | L1 | Design > Theme |
| `05-content-seo-tab.png` | L1 | Content & SEO |
| `06-products-tab.png` | L1 | Products > Hotels |
| `07-seo-audit-tab.png` | L1 | SEO Audit |
| `08-analytics-tab.png` | L1 | Analytics (3 fields) |
| `09-leads-tab.png` | L1 | Leads |
| `10-settings-tab.png` | L1 | Settings |
| `L2-*` | L2 | Sub-tab detail views (17 captures) |
| `L3-*` | L3 | Editor and SEO detail views (7 captures) |

### D. Glossary

| Term | Definition |
|------|-----------|
| Contenido | Unified content management tab replacing Products + SEO Audit + Blog |
| Surfer Lite | Keyword research panel using AI + Search Console data (inspired by SurferSEO) |
| Per-item SEO | SEO metadata for one specific product, page, or blog post |
| Global SEO | Site-wide settings: meta title, description, keywords, scripts |
| V2 bridge | DB join: `account_hotels` → `master_hotels` for enriched data |
| JSONB | PostgreSQL binary JSON column for structured data (package fields) |
| Featured toggle | Star button controlling whether product appears on public site |
| Published toggle | ON/OFF status controlling visibility (maps to different DB fields per type) |

---

## 21. E2E Delivery Alignment (v4.1)

This section supersedes contradictory claims in v4.0 about what is already implemented in `bukeer-flutter` and defines the required scope to deliver the full end-to-end system in `bukeer-studio`.

### 21.1 Verified Baseline from `bukeer-flutter` (as of 2026-04-14)

| Area | Status | Evidence | Decision for Studio |
|---|---|---|---|
| SEO service (`loadOverview`, `loadKeywords`, `loadPrompts`, `loadAuditResults`) | Exists | `lib/services/seo_service.dart` | Port patterns where useful |
| SEO dashboard UI | Exists with 4 sections only | `lib/bukeer/websites/tabs/seo_tab.dart` | Rebuild/extend in React to final IA |
| Analytics tab | Config-only (GTM/GA4/Pixel/scripts) | `lib/bukeer/websites/tabs/analytics_tab.dart` | Keep Config UX, build full analytics data views on top |
| Edge Function `seo-site-auditor` | Exists and active candidate | `supabase/functions/seo-site-auditor/index.ts` | Reuse backend job and adapt to Studio needs |
| SEO core tables | Exists (`seo_keywords`, `seo_keyword_snapshots`, `seo_ai_prompts`, `seo_ai_visibility_snapshots`, `seo_audit_results`) | `supabase/migrations/20260321181000_create_seo_dashboard_tables.sql`, `20260321180000_create_seo_audit_results.sql` | Use as foundation |
| GA4/GSC/DataForSEO operational pipeline | Not verified in Flutter codebase as implemented E2E | No code/migration evidence in repo for `seo_ga4_page_metrics`, `seo_competitors`, `seo_gsc_credentials`, `seo_api_calls` | Build in Studio scope (not “port only”) |

### 21.2 Updated Delivery Principle

Replace the prior assumption of **"port, not rebuild"** with:

> **Hybrid delivery**: port what is proven to exist, and implement missing data pipelines and integrations in `bukeer-studio` to complete E2E.

### 21.3 Full E2E Scope Required in `bukeer-studio`

### 21.3.1 Data Layer (Supabase)

- Ensure/create tables used by Analytics and Keyword Research:
  - `seo_ga4_page_metrics`
  - `seo_gsc_credentials`
  - `seo_competitors`
  - `seo_api_calls`
- Ensure all SEO tables have RLS policies aligned with website/account membership.
- Add migration(s) for missing indexes and retention policies on snapshot tables.

### 21.3.2 Integration Layer (API + Jobs)

- Implement API routes in Studio for integration lifecycle:
  - OAuth connect/callback for Search Console and GA4
  - Token refresh endpoint
  - Manual sync endpoint (GSC + GA4 + optional DataForSEO enrichment)
- Implement idempotent sync jobs:
  - Upsert by deterministic keys (`website_id`, date/time bucket, dimension keys)
  - Record call costs in `seo_api_calls`
  - Rate-limit and retry with backoff

### 21.3.3 Application Layer (UI)

- Analytics tab final sub-tabs:
  - `Overview`, `Keywords`, `Competitors`, `Health`, `AI Visibility`, `Backlinks`, `Config`
- `Config` remains source of truth for integration status and connection controls.
- Non-config tabs must render explicit empty/loading/error states when data is unavailable.

### 21.3.4 Content SEO Layer

- Keyword Research tab uses:
  - Search Console data when connected
  - AI-only fallback when not connected
- Package JSONB context must be included in AI generation payloads.

### 21.4 E2E Acceptance Criteria (Additive to Section 16)

### AC-E2E-1: OAuth Lifecycle

```
GIVEN the user is in Analytics > Config
WHEN they connect Google Search Console and GA4
THEN credentials are persisted with expiry metadata
AND refresh flow can rotate access tokens without re-authentication
AND connection status is visible in Config
```

### AC-E2E-2: Data Sync Idempotency

```
GIVEN the user triggers "Sync now" twice with same date range
WHEN imports complete
THEN no duplicate metric rows are created
AND upserts keep a single canonical row per key
```

### AC-E2E-3: Analytics Data Availability

```
GIVEN integrations are connected and sync has run successfully
WHEN the user opens Analytics
THEN Overview shows GA4 metrics with trend deltas
AND Keywords shows tracked terms with position history
AND Health shows latest audit results from seo-site-auditor
```

### AC-E2E-4: Graceful Degradation

```
GIVEN integrations are not connected or have expired tokens
WHEN the user opens non-Config analytics sub-tabs
THEN they see empty states with recovery actions
AND Config shows the exact integration status/error
```

### AC-E2E-5: Cost and Observability

```
GIVEN external API calls are executed
WHEN a sync/import job runs
THEN each call is logged in seo_api_calls with endpoint, rows, cost estimate, and timestamp
AND failures include actionable error codes/messages
```

### AC-E2E-6: Security

```
GIVEN a user belongs to account A
WHEN they query analytics/seo data
THEN they can only access rows for websites in account A
AND service-role endpoints are protected from public access
```

### AC-E2E-7: Keyword Research Real Data Mode

```
GIVEN a target keyword is entered and Search Console is connected
WHEN [Investigar Keyword] is executed
THEN panel includes impressions, clicks, CTR, avg position, related queries
AND AI recommendations reference this data
```

### AC-E2E-8: Keyword Research Fallback Mode

```
GIVEN Search Console is not connected
WHEN [Investigar Keyword] is executed
THEN panel returns AI recommendations based on item content only
AND clearly indicates that Search Console data is unavailable
```

### 21.5 Revised Implementation Plan for Full E2E

| Phase | Goal | Main Deliverables |
|---|---|---|
| E0 | Baseline hardening | Align spec claims with verified Flutter reality; finalize contracts and table inventory |
| E1 | Data plane | Missing tables/migrations, RLS, indexes, retention, deterministic upserts |
| E2 | Integration plane | OAuth flows, token refresh, sync endpoints, job orchestration, cost logging |
| E3 | Analytics UI | 7 sub-tabs, charts/tables, status-aware states, Config controls |
| E4 | Content SEO intelligence | Keyword Research real-data mode + AI fallback, JSONB context in AI meta generation |
| E5 | Hardening | E2E tests, load tests (1,200+ items), observability dashboards, rollout toggles |

### 21.6 Test Plan (Minimum for Go-Live)

- Contract tests for API routes: OAuth callback, refresh, sync.
- Integration tests for Supabase writes (idempotent upsert keys).
- UI tests for Analytics states:
  - connected + data
  - connected + empty
  - disconnected
  - token expired
- Regression tests for Contenido filters and pagination.
- Security tests for cross-account access denial.

---

*End of specification. Version 4.1 — Updated with verified Flutter baseline and full E2E delivery alignment for bukeer-studio.*
