# SEO Flows in Studio — Shipped User Guide

**Status**: Shipped and partial flows only
**Last updated**: 2026-04-15
**Audience**: Agency operators using Bukeer Studio

---

## Purpose

This guide documents only the flows that a user can execute **today** in Studio.

It excludes:

- future workflows
- non-shipped intelligence systems
- external-tool processes from the strategic playbook

For the target SEO operating model, see:

- [SEO Playbook](./SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec](../specs/SPEC_SEO_CONTENT_INTELLIGENCE.md)

---

## How To Read This Guide

Each flow is labeled as one of:

- `Shipped`: usable with real product behavior
- `Shipped with limitations`: usable, but data or decisions are incomplete
- `Exploratory`: visible in product but not yet decision-grade

---

## Flow Index

| Flow | Status | Goal |
|---|---|---|
| 0. Initial setup | Shipped | Connect Google integrations and basic SEO settings |
| 1. Overview review | Shipped with limitations | Check directional traffic and dashboard state |
| 2. Keyword research | Shipped with limitations | Generate AI-assisted keyword ideas from one seed |
| 3. Item workflow review | Shipped | Review SEO checklist per item type |
| 4. Save baseline position | Shipped | Register a baseline before optimization |
| 5. Schema and locale review | Shipped with limitations | Inspect schema / locale UI and previews |
| 6. Site architecture view | Shipped | Inspect structure and internal SEO architecture |
| 7. Backlinks review | Exploratory | Inspect scaffolded backlinks surface |
| 8. AI visibility review | Exploratory | Inspect scaffolded AI visibility surface |

---

## Flow 0 — Initial Setup

**Status**: Shipped

### Goal

Connect Google Search Console and GA4, then confirm the website has SEO integrations configured.

### Route

`Dashboard -> Analytics -> Config`

### What the user can do today

1. Connect Google Search Console.
2. Connect Google Analytics 4.
3. Load available properties / sites.
4. Select the site URL and property ID.
5. Confirm integration status.

### Expected result

- GSC shows as connected and configured.
- GA4 shows as connected and configured.
- SEO sync can run against the connected site.

### Limitations

- DataForSEO enablement is environment-dependent.
- This step does not validate the quality of the downstream SEO dashboards.

---

## Flow 1 — Overview Review

**Status**: Shipped with limitations

### Goal

Use the Analytics overview tab as a directional summary of activity.

### Route

`Dashboard -> Analytics -> Overview`

### What the user can do today

1. Review top KPI cards.
2. Toggle `All / Non-brand` in the UI.
3. Review trend badge.
4. Open the backlog and OKR widgets.

### What this tab is good for today

- confirming the dashboard is populated
- checking trend direction
- navigating to supporting SEO surfaces

### What it is **not** good for yet

- authoritative SEO clicks / impressions / CTR / average position reporting
- real brand vs non-brand segmentation
- country and device SEO segmentation

### Operator note

Treat this tab as a directional workspace, not as the final SEO reporting layer.

---

## Flow 2 — Keyword Research

**Status**: Shipped with limitations

### Goal

Generate AI-assisted keyword suggestions and a basic brief using one seed keyword.

### Route

`Dashboard -> Analytics -> Keywords`

### What the user can do today

1. Choose a content type.
2. Enter country and language context.
3. Enter one or more seed phrases.
4. Run generation.
5. Review:
   - primary keyword
   - secondary keywords
   - reasoning
   - brief bullets
   - related GSC queries when GSC is connected

### Expected result

The user gets an assisted starting point for ideation.

### Limitations

Current keyword research is not yet:

- multi-keyword universe building
- cluster planning
- locale-native research by market
- SERP feature classification
- difficulty analysis
- PAA mining
- competitor gap analysis

### Operator note

Use it as a first-pass ideation assistant, not as a full keyword intelligence engine.

---

## Flow 3 — Item Workflow Review

**Status**: Shipped

### Goal

Run a structured SEO checklist for a specific item:

- blog
- destination
- hotel
- activity
- package

### Routes

- `Dashboard -> Contenido -> item -> Flujo SEO`
- `Dashboard -> SEO -> item detail`

### What the user can do today

1. Open the workflow panel for the item.
2. Review the stepper.
3. Review type-specific checklist items.
4. Mark checklist items as complete.
5. Jump to Google search manually.
6. Open the SEO detail page for the item.

### Expected result

The user gets a repeatable review routine by content type.

### Limitations

These workflows are not yet:

- rendered-content analyzers
- Surfer-style optimizers
- SERP-diff engines
- cluster-aware content workflows

They are execution scaffolding, not content intelligence.

---

## Flow 4 — Save Baseline Position

**Status**: Shipped

### Goal

Register a baseline ranking position before an optimization pass.

### Route

Inside the workflow panel for a specific item.

### What the user can do today

1. Enter baseline position.
2. Save baseline.
3. Re-open later to compare manually after changes.

### Expected result

The team preserves a before-state for the optimization cycle.

### Limitations

- no full automatic ranking timeline yet
- no cluster rollup yet
- no automatic post-change evaluation loop yet

---

## Flow 5 — Schema and Locale Review

**Status**: Shipped with limitations

### Goal

Inspect schema payloads and locale previews in the current UI.

### Routes

- `Dashboard -> Analytics -> Health`
- `Dashboard -> Analytics -> Config -> Locale settings`

### What the user can do today

1. Open the schema manager.
2. Review example / current schema payloads.
3. Use locale settings and hreflang preview.
4. Review technical checklist states.

### Limitations

- not all schema checks are runtime-backed
- technical checklist includes pending items
- hreflang activation is incomplete
- locale-aware SEO workflows are not complete yet

### Operator note

Useful for inspection and configuration previews, not yet a full international SEO operating surface.

---

## Flow 6 — Site Architecture View

**Status**: Shipped

### Goal

Inspect site structure and internal SEO architecture.

### Route

`Dashboard -> SEO -> Architecture`

### What the user can do today

1. Review available items by category.
2. Inspect structure and naming patterns.
3. Use architecture output as input for SEO planning.

### Expected result

The team gets a structural view of the site that helps with information architecture and internal linking decisions.

---

## Flow 7 — Backlinks Review

**Status**: Exploratory

### Goal

Inspect the current backlinks surface as a product preview.

### Route

`Dashboard -> Analytics -> Backlinks`

### What the user can see today

- summary cards
- anchor distribution view
- opportunity table scaffolding

### Important warning

This screen is **not** a decision-grade backlinks intelligence system yet.

Current limitations include:

- derived summary values
- estimated DR
- placeholder distributions and sample rows in parts of the UI
- incomplete lost/new link tracking

### Operator note

Do not use this screen alone to run outreach or authority forecasting.

---

## Flow 8 — AI Visibility Review

**Status**: Exploratory

### Goal

Inspect the current AI visibility surface as a product preview.

### Route

`Dashboard -> Analytics -> AI Visibility`

### What the user can see today

- AI Overview presence table
- LLM referral cards
- GEO guidance checklist

### Important warning

This screen is **not** yet a reliable measurement layer for:

- Google AI Overviews
- ChatGPT referrals
- Perplexity visibility
- Gemini visibility

### Operator note

Use it only as exploratory guidance. For the target product in this area, see the Content Intelligence spec.

---

## What Is Not Yet A Shipped Flow

The following workflows are intentionally excluded from this guide because they are not fully shipped:

- site-wide rendered content audit by locale
- cluster planning and cluster tracking
- locale-native keyword research by market
- translation SEO / transcreation
- in-editor optimizer for blog, destination, package, activity
- local SEO / GBP operating flow
- real field-based performance audit
- real backlink intelligence

These belong to the target system described in:

- [SEO Playbook](./SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec](../specs/SPEC_SEO_CONTENT_INTELLIGENCE.md)

