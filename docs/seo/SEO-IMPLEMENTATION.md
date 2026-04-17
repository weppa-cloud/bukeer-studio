# SEO Implementation Reference — Current Product State

**Status**: Partially shipped
**Last updated**: 2026-04-17
**Audience**: Product, engineering, SEO operations

---

## Purpose

This document describes what the SEO module in Bukeer Studio actually does today.
It is the source of truth for shipped capabilities, partial implementations, mocked views, and known gaps.

It does **not** describe the target 2026 SEO system. For that, see:

- [SEO Playbook](./SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec](../specs/SPEC_SEO_CONTENT_INTELLIGENCE.md)

---

## Product Positioning

Bukeer Studio currently provides a **hybrid SEO module**:

- Some capabilities are real and production-usable.
- Some capabilities are scaffolded but limited.
- Some views still depend on derived or example data.

The product should be described as:

> An SEO operations workspace for travel sites with real Google integrations, checklist workflows, and partial analysis dashboards.

It should **not** be described today as:

- a complete enterprise SEO suite
- a full replacement for Ahrefs / Semrush / Surfer / Screaming Frog
- a system that can guarantee top rankings

---

## Capability Matrix

| Area | Status | Notes |
|---|---|---|
| Google OAuth integrations | Shipped | GSC and GA4 connect / refresh / configure are implemented |
| SEO dashboard routes and tabs | Shipped | Dashboard pages and admin components exist |
| GSC sync | Partial | Sync stores keyword snapshots, but locale handling is still simplified |
| GA4 sync | Shipped | Page-level GA4 metrics are stored and reused |
| Overview KPIs | Partial | Uses GA4-heavy metrics; does not yet expose full GSC SEO KPIs faithfully |
| Keyword research | Partial | AI-assisted, single-seed workflow with optional GSC context |
| Workflow panels by type | Shipped | Checklists and baseline capture exist |
| SEO score endpoint | Shipped | Unified scorer endpoint exists |
| Site architecture view | Shipped | Internal graph / click depth support exists |
| Hreflang utilities | Shipped | `lib/seo/hreflang.ts` + `lib/seo/locale-routing.ts` + `lib/seo/slug-locale.ts` merged 2026-04-17 |
| Schema manager | Partial | Editing / validation UI exists, but not all checks are runtime-backed |
| Technical audit | Partial | Health tab exists, but PageSpeed route currently returns derived values |
| Backlinks dashboard | Exploratory | UI exists, but current summary is derived from stored API-call history |
| AI visibility dashboard | Exploratory | UI and persistence hooks exist, but current tracking is not a reliable source of truth |
| Cluster tracking | Not shipped | No persistent cluster model yet |
| Locale-specific keyword research | Not shipped | Inputs exist, but research is not locale-native end to end |
| Translation SEO / transcreation | Partial | `lib/seo/transcreate-workflow.ts` + `app/api/seo/content-intelligence/transcreate/route.ts` shipped 2026-04-17; keyword re-research not yet locale-native |
| In-editor content optimizer | Not shipped | Current workflows are checklist-driven, not content-editor-driven |

---

## Shipped Surface

### Pages

Current SEO pages in the dashboard:

- `/dashboard/[websiteId]/analytics`
- `/dashboard/[websiteId]/seo`
- `/dashboard/[websiteId]/seo/[itemType]/[itemId]`
- `/dashboard/[websiteId]/seo/architecture`

### Admin Components

Current SEO UI includes:

- overview cards and tables
- keyword research panel
- technical audit panel
- competitors panel
- backlinks panel
- AI visibility panel
- locale settings panel
- schema manager
- workflow panels for hotel, activity, package, destination, blog

### API Surface

Current API routes under `app/api/seo/**` include:

- Google integration connect / callback / refresh / options / configure / status
- Google integration connect / callback / refresh / options / configure / status
- analytics overview / keywords / competitors / health / striking-distance
- `app/api/seo/analytics/serp-snapshot/route.ts` — SERP snapshot (shipped 2026-04-17)
- architecture
- backlinks summary / intersection
- AI visibility overview / referrals
- `app/api/seo/content-intelligence/nlp-score/route.ts` — NLP score (shipped 2026-04-17)
- `app/api/seo/content-intelligence/transcreate/route.ts` — transcreation workflow (shipped 2026-04-17)
- keyword research
- `app/api/seo/objectives-90d/route.ts` + `[id]/route.ts` — 90-day objectives CRUD (shipped 2026-04-17)
- `app/api/seo/okrs/route.ts` + `[id]/route.ts` — OKR CRUD (shipped 2026-04-17)
- score
- sync
- `app/api/seo/translations/route.ts` + `bulk/route.ts` — translation management (shipped 2026-04-17)
- `app/api/seo/weekly-tasks/route.ts` + `[id]/route.ts` + `generate/route.ts` — weekly task generator (shipped 2026-04-17)
- workflow baseline

---

## What Is Real Today

### 1. Google Integrations

These flows are real:

- connect GSC
- connect GA4
- configure selected property / site URL
- refresh OAuth tokens
- check integration status

The auth boundary uses website-scoped access control in the SEO API routes.

### 2. Sync and Storage

Current sync behavior:

- GSC query data is fetched and persisted into SEO keyword tables
- GA4 page metrics are fetched and persisted into `seo_ga4_page_metrics`
- sync logs are recorded

Important limitation:

- keyword persistence currently hardcodes locale as `es` during upsert, so multi-locale support is not complete yet

### 3. Keyword Research

Current keyword research is real but narrow:

- input is one primary seed keyword
- optional context is passed to AI
- if GSC is connected, the route enriches the prompt with matching queries and basic query metrics
- response returns:
  - primary keyword
  - secondary keywords
  - brief bullets
  - reasoning

Important limitations:

- it is not a full keyword universe builder
- it is not cluster-aware
- it is not locale-native beyond passing `country` / `language` context
- it does not currently integrate true difficulty, SERP features, PAA mining, or competitive gap data

### 4. Workflow Panels

The workflow panels are real and useful as execution scaffolding:

- they provide per-type checklists
- they support baseline registration
- they link to Google SERP manually
- they provide a repeatable editorial review routine

Important limitation:

- they are checklist workflows, not optimizer workflows driven by rendered content analysis

### 5. SEO Scoring

The score endpoint and unified scorer exist and are usable for item-level evaluation.

The scorer already covers areas such as:

- on-page signals
- schema presence
- conversion-related checks
- technical checks like hreflang / OG / geo when available

Important limitation:

- score quality is bounded by the data passed into it
- some competitive inputs are unavailable when GSC is not connected

### 6. Schema and Public SEO Utilities

These are implemented:

- sitemap generation
- robots generation
- hreflang utility helpers
- `llms.txt` route per tenant
- JSON-LD generators and SEO schema helpers

Important limitation:

- `llms.txt` exists as a product asset, but should not be documented as a Google ranking requirement or AI Overview requirement

---

## What Is Partial or Derived Today

### 1. Overview Dashboard

The overview page is not yet a faithful SEO KPI dashboard.

Current behavior:

- clicks are represented with session-driven data
- CTR is proxied from bounce rate in the UI
- impressions and average position are not fully surfaced
- brand / non-brand toggle is UI-only and not connected to a query segmentation pipeline

Product implication:

- this tab is useful as a directional activity view
- it is not yet a source-of-truth SEO reporting layer

### 2. Technical Audit / Health

The health surface exists, but the PageSpeed audit route currently returns **derived template values**, not live PageSpeed Insights or CrUX field data.

Product implication:

- the current health tab is useful as a placeholder workflow and implementation target
- it should not be presented as a real performance audit until replaced with live measurements

### 3. Schema Manager

The schema manager is partially real:

- it provides editing and validation affordances
- it helps visualize schema payloads

Important limitation:

- not every validation shown in the UI is backed by a live, runtime verification pipeline
- some checklist states remain hardcoded or pending

### 4. Locale Settings

Locale settings and hreflang preview exist, but the end-to-end locale model is incomplete.

Important limitations:

- keyword locale persistence is simplified
- hreflang is not fully activated across all workflows
- translation SEO workflows are not implemented

---

## What Is Exploratory Today

### 1. Backlinks

The backlinks dashboard should currently be treated as exploratory.

Current behavior:

- summary values are derived from stored API-call history
- DR is estimated
- new/lost link trends are not yet real
- parts of the UI use example rows and example distributions

Product implication:

- the current screen is a scaffold for the eventual backlink intelligence feature
- it is not yet suitable for high-confidence link building decisions

### 2. AI Visibility

The AI visibility dashboard should also be treated as exploratory.

Current behavior:

- overview data may fall back to stored keywords or example rows
- referral cards may remain empty or example-based
- GEO checklist items are static guidance, not a dynamic audit engine

Product implication:

- it is acceptable as a monitoring prototype
- it is not a reliable measurement system for AI Overviews, ChatGPT, Perplexity, or Gemini performance

Documentation rule:

- do not claim that Bukeer currently provides authoritative AI visibility tracking
- do not claim that `llms.txt` is required for Google AI features

---

## Known Gaps Against the Target System

The most important missing capabilities are:

1. site-wide rendered-content audit by locale
2. cluster model and cluster tracking
3. multi-seed, locale-native keyword research by content type
4. SERP feature classification per keyword
5. rendered-content optimizer with before/after scoring
6. translation SEO / transcreation workflow
7. real field-measured CWV reporting
8. real backlink intelligence
9. local SEO / GBP operating model for travel SERPs dominated by Maps / Hotel Pack / Things to Do

---

## Documentation Contract

From this point forward, product and documentation should use the following labels consistently:

- `Shipped`: production capability with real data path
- `Partial`: implemented but incomplete or constrained
- `Exploratory`: visible in product but not decision-grade
- `Planned`: not yet implemented

This file should always describe **today**.

For future product design and implementation direction, use:

- [SEO Playbook](./SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec](../specs/SPEC_SEO_CONTENT_INTELLIGENCE.md)

