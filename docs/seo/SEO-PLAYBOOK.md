# SEO Playbook — Target Operating Model for Bukeer Studio

**Status**: Target system and implementation guide
**Last updated**: 2026-04-15
**Audience**: Product, SEO strategy, engineering

---

## Purpose

This document describes the **target SEO operating model** for Bukeer Studio.

It is not a statement of what is fully shipped today.
It defines the system Bukeer should build to operate SEO for travel agencies across:

- blog
- destinations
- packages
- activities

This playbook is intentionally focused on the flows with the highest leverage for the product roadmap.

---

## Strategic Position

Bukeer should not try to become a generic SEO suite.
It should become a **travel-specific SEO content intelligence system**.

The differentiator is not dashboards alone. The differentiator is this loop:

`Rendered site -> keyword intelligence -> content planning -> assisted optimization -> locale-aware transcreation -> cluster tracking -> revenue`

---

## What We Optimize For

### Primary outcomes

1. qualified non-brand organic traffic
2. cluster-level topical coverage
3. page-level conversion readiness
4. faster content production with SEO guardrails
5. locale-aware growth across languages and markets

### Secondary outcomes

1. cleaner technical SEO operations
2. reusable briefs by content type
3. stronger internal linking architecture
4. better editorial consistency across templates

---

## Product Principles

1. `SERP-first`
Every optimization begins with the actual search result shape.

2. `Rendered-content-first`
The system must read what the user and Google actually receive, not only CMS fields.

3. `Locale-native, not translated-later`
Keyword research must happen for the target market and language before content is written or localized.

4. `Revenue over vanity`
Clusters and pages are prioritized by business value, not by search volume alone.

5. `Editorial where possible, controlled where necessary`
Blogs and destination pages can be optimized more freely. Product pages require stricter boundaries.

---

## Priority Product Flows

### Flow A — Site-Wide Audit by Locale

**Goal**
Read the rendered site by locale and map:

- current topical coverage
- missing topics
- duplicate intent
- content quality gaps
- internal links
- metadata quality
- schema and canonical consistency

**Target output**
A site-wide intelligence layer that answers:

- what the site already covers
- what it partially covers
- what it does not cover
- which pages compete with each other
- which pages are weak relative to the SERP

### Flow B — Keyword Research by Type, Locale, and Market

**Goal**
Generate a usable keyword universe for:

- blog
- destination
- package
- activity

based on:

- target country
- target language
- current site coverage
- real rendered content
- search intent
- SERP type
- business value

**Target output**
A prioritized keyword model by type:

- primary keyword
- secondary keywords
- search intent
- SERP classification
- cluster assignment
- target template
- creation vs update recommendation

### Flow C — Cluster Planner and Cluster Tracking

**Goal**
Turn keywords into clusters that can be tracked over time.

**Target output**
For each cluster:

- parent topic
- supporting pages
- target queries
- current coverage
- pages created
- pages updated
- internal links completed
- ranking / clicks / CTR trend
- conversion contribution

### Flow D — Content Brief and SERP Review

**Goal**
For a selected page or keyword, generate a brief that includes:

- SERP type
- PAA questions
- competing content patterns
- recommended structure
- missing entities
- internal linking recommendations
- conversion recommendations

### Flow E — Assisted Optimizer by Template

**Goal**
Provide a guided optimizer for blog, destination, package, and activity pages.

**Important design decision**
This should not start as a freeform AI rewrite system.
It should start as an **assisted optimizer** with scoped edits.

### Flow F — Translation SEO / Transcreation

**Goal**
When a page is localized, the system should:

1. research target keywords in the destination locale
2. compare them against the source page intent
3. rewrite headings, metadata, summaries, FAQs, and anchors accordingly
4. avoid literal translation when it weakens search demand alignment

### Flow G — Measurement and Tracking

**Goal**
Track progress by:

- page
- cluster
- locale
- content type

with true SEO metrics and business metrics.

---

## Content-Type Strategy

### Blog

Use cases:

- discovery traffic
- informational intent
- long-tail expansion
- cluster support for destinations and products

Target capabilities:

- create / update / merge / prune recommendation
- blog brief generation
- FAQ and PAA extraction
- cluster assignment
- freshness monitoring

### Destination

Use cases:

- pillar pages
- cluster hubs
- internal linking hubs
- mixed informational + commercial intent

Target capabilities:

- hub coverage analysis
- section recommendations by destination intent
- links to related products
- FAQ and seasonal guidance

### Package

Use cases:

- commercial pages
- comparison and booking intent
- itinerary-led demand capture

Target capabilities:

- SEO layer over structured package data
- controlled enrichment without altering product truth
- transactional snippet optimization

### Activity

Use cases:

- local commercial intent
- day-trip and attraction demand
- support for destination clusters

Target capabilities:

- activity-specific SERP review
- product-intent optimization
- destination linkage
- FAQ and logistics enrichment

---

## Product Editing Model

This is the right boundary for editing.

### Allow freer optimization for

- blog
- destination
- editorial sections
- FAQs
- summaries
- headings
- meta tags

### Use controlled optimization for

- package
- activity
- other transaccional product surfaces

### Product rule

The system should preserve the product source of truth and add a separate **SEO layer**.

That SEO layer can include:

- `seo_title`
- `seo_description`
- `target_keyword`
- `seo_intro`
- `seo_highlights`
- `faq`
- `supplemental_copy`
- `internal_link_suggestions`
- `schema_enrichment`

This keeps product data stable while allowing SEO optimization.

---

## What The Playbook Assumes From The Product

The target system should be able to inspect:

- rendered HTML
- visible text blocks
- headings
- metadata
- canonical
- hreflang
- schema
- internal links
- language / locale served
- page type
- related inventory

Without that, the optimizer will stay blind to what actually ranks.

---

## Measurement Requirements

The target system must use real sources of truth for:

- GSC clicks, impressions, CTR, average position
- field CWV where relevant
- page-level and cluster-level trends
- locale-specific performance
- conversion and revenue attribution where available

It should not infer SEO KPIs from GA4-only proxies when GSC metrics are the real source.

---

## Roadmap Order

Recommended build order:

1. site-wide rendered-content audit by locale
2. keyword research by type / locale / market
3. cluster planner and cluster tracking
4. content brief generator and SERP review
5. assisted optimizer by template
6. translation SEO / transcreation
7. deeper technical and authority layers

---

## Relationship To Current Product Docs

- [SEO Implementation Reference](./SEO-IMPLEMENTATION.md) describes current shipped reality.
- [SEO Flows in Studio](./SEO-FLUJOS-STUDIO.md) documents current user-facing flows.
- [SEO Content Intelligence Spec](../specs/SPEC_SEO_CONTENT_INTELLIGENCE.md) converts this playbook into an executable product spec.
- [SEO Content Intelligence Roadmap](../specs/ROADMAP_SEO_CONTENT_INTELLIGENCE.md) defines phased implementation and issue-level execution.
