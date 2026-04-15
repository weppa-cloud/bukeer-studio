# Roadmap: SEO Content Intelligence (V1/V2/V3)

**Status**: Proposed execution roadmap  
**Date**: 2026-04-15  
**Owner**: Product + SEO + Engineering  
**Source spec**: [SPEC_SEO_CONTENT_INTELLIGENCE](./SPEC_SEO_CONTENT_INTELLIGENCE.md)

---

## 1. Purpose

This roadmap turns the SEO Content Intelligence spec into an implementation sequence with concrete technical issues across:

- backend
- frontend
- data model

It follows the product rule already agreed:

- freer optimization for `blog` and `destination`
- controlled SEO-layer optimization for `package` and `activity`

---

## 2. Scope Contract

### In scope for this roadmap

- site-wide rendered audit by locale
- keyword research by type, locale, and market
- cluster planner and tracking model
- brief + SERP review workflow
- assisted optimizer by template with editing boundaries
- translation SEO / transcreation
- page and cluster tracking by locale

### Out of scope in V1-V3

- full backlink intelligence platform
- local SEO / GBP operating system
- autonomous publishing without review
- full AI Overview authoritative tracker

---

## 3. Phase Summary

| Phase | Objective | Primary shipped value | Exit gate |
|---|---|---|---|
| V1 | Build decision-grade foundation | Rendered audit + locale keyword research | Audit and research outputs are trusted for planning |
| V2 | Operationalize planning and optimization | Clusters + briefs + assisted optimizer | Teams can execute clusters end-to-end with controlled edits |
| V3 | Scale multi-locale execution and measurement | Transcreation + cluster tracking + rollout controls | Locale and cluster performance can be tracked with real SEO data |

---

## 3.1 Current UI Baseline (Validated)

The current rollout must preserve these realities while moving to the target model:

1. `Flujo SEO` side panel exists for `blog`, `destination`, `hotel`, `package`, `activity`.
2. `page`/landing uses `Open SEO` item detail only (no workflow side panel parity).
3. Translation SEO is currently a manual workaround, not a first-class UI workflow.
4. Backlinks and AI visibility surfaces remain exploratory and must not be promoted as decision-grade.

Implementation consequence:

- V2 must include page/landing workflow parity.
- V3 must include source-target translation orchestration in UI and data model.

---

## 4. V1 — Decision-Grade Foundation

### 4.1 Product scope

- Flow A: site-wide rendered-content audit by locale
- Flow B: keyword research by type / locale / market
- Baseline UI and API contracts for later cluster and optimizer phases

### 4.2 Technical deliverables

| Track | Deliverables | Mapped acceptance criteria |
|---|---|---|
| Data model | Add `seo_render_snapshots` and `seo_audit_findings`; add locale-safe keyword persistence model; add research run history tables | AC-1, AC-2, AC-4 |
| Backend | Implement `/api/seo/content-intelligence/audit` and `/research`; rendered extraction pipeline; provider adapter layer (GSC/DataForSEO/AI) | AC-1, AC-2, AC-3, AC-4 |
| Frontend | Add `Analytics -> Content Intelligence` locale audit screen and decision-grade findings table; update keywords screen for market-aware results by type | AC-3, AC-4, AC-5 |

### 4.3 Exit criteria

1. Audit runs against rendered pages and stores reusable snapshots per locale.
2. Audit findings are grouped by content type and marked actionable.
3. Research requires `content_type + country + language + locale`.
4. Research output supports create vs update recommendation for a page candidate.
5. No derived placeholders are presented as real SEO measurements in this phase.

### 4.4 Issue backlog

| ID | Track | Title | Description | Depends on |
|---|---|---|---|---|
| V1-DM-01 | Data model | Create `seo_render_snapshots` table | Store title, meta, canonical, hreflang, headings, visible text, schema types, internal links by locale and URL | none |
| V1-DM-02 | Data model | Create `seo_audit_findings` table | Persist findings (coverage gaps, duplicate intent, internal-link gaps, template issues) with severity and status | V1-DM-01 |
| V1-DM-03 | Data model | Create research run tables | Add `seo_keyword_research_runs` and `seo_keyword_candidates` with locale and market dimensions | none |
| V1-DM-04 | Data model | Fix locale persistence in SEO keyword sync | Remove hardcoded locale behavior and persist explicit locale in sync/research pipelines | none |
| V1-BE-01 | Backend | Build rendered snapshot service | Resolve public URLs by type and capture rendered HTML inputs for extraction | V1-DM-01 |
| V1-BE-02 | Backend | Build audit extraction and scoring service | Parse snapshot data and generate normalized findings by type and locale | V1-DM-01, V1-DM-02 |
| V1-BE-03 | Backend | Ship audit API routes | Add `POST/GET /api/seo/content-intelligence/audit` with website-scoped auth and pagination | V1-BE-02 |
| V1-BE-04 | Backend | Build keyword research orchestration | Add provider adapter for GSC/DataForSEO/AI synthesis and normalize candidate output | V1-DM-03 |
| V1-BE-05 | Backend | Ship research API route | Add `POST /api/seo/content-intelligence/research` with content-type and locale validation | V1-BE-04 |
| V1-FE-01 | Frontend | Build Content Intelligence audit view | New locale picker, findings table, by-type filters, and action CTA to create planning entities later | V1-BE-03 |
| V1-FE-02 | Frontend | Upgrade Keywords view for locale workflows | Add required market/language/locale controls and typed results grid by content type | V1-BE-05 |
| V1-FE-03 | Frontend | Add trust-state UI | Explicitly label fields as live vs unavailable; remove decision ambiguity from partial panels | V1-FE-01, V1-FE-02 |

---

## 5. V2 — Planning and Controlled Optimization

### 5.1 Product scope

- Flow C: cluster planner and tracking setup
- Flow D: brief + SERP review
- Flow E: assisted optimizer by template with editing boundaries

### 5.2 Technical deliverables

| Track | Deliverables | Mapped acceptance criteria |
|---|---|---|
| Data model | Add `seo_clusters`, `seo_cluster_keywords`, `seo_cluster_pages`, `seo_briefs`, and brief versioning | AC-5, AC-6, AC-7 |
| Backend | Implement clusters and briefs APIs; optimizer suggestion engine; scoped apply actions by page type | AC-6, AC-7, AC-8, AC-9 |
| Frontend | Cluster board, brief detail, template-aware optimizer UI, scoped edit controls for package/activity | AC-8, AC-9, AC-13, AC-15 |

### 5.3 Exit criteria

1. Teams can plan and track execution through clusters.
2. Briefs can be created, approved, and reused by page.
3. Optimizer suggests and applies scoped changes with audit trail.
4. Blog/destination supports richer optimization than package/activity.
5. Package/activity cannot rewrite source-of-truth product fields through SEO actions.

### 5.4 Issue backlog

| ID | Track | Title | Description | Depends on |
|---|---|---|---|---|
| V2-DM-01 | Data model | Create cluster core tables | Add `seo_clusters`, `seo_cluster_keywords`, `seo_cluster_pages` with locale constraints | V1-DM-03 |
| V2-DM-02 | Data model | Create brief and version tables | Add `seo_briefs` and `seo_brief_versions` for approved workflow and history | V2-DM-01 |
| V2-DM-03 | Data model | Create optimizer action log table | Persist suggestion applications, actor, before/after payload, and scope target | none |
| V2-BE-01 | Backend | Ship clusters API routes | Add `POST/GET /api/seo/content-intelligence/clusters` and assignment endpoints | V2-DM-01 |
| V2-BE-02 | Backend | Ship briefs API routes | Add `POST/GET /api/seo/content-intelligence/briefs` with approval state transitions | V2-DM-02 |
| V2-BE-03 | Backend | Build optimizer recommendation service | Compare rendered snapshot vs approved brief and produce scoped suggestions | V1-BE-03, V2-BE-02 |
| V2-BE-04 | Backend | Ship optimize API route | Add `POST /api/seo/content-intelligence/optimize` with policy enforcement by content type | V2-BE-03, V2-DM-03 |
| V2-BE-05 | Backend | Implement SEO-layer write boundary | Route package/activity edits only to SEO overlay fields, not product truth fields | V2-BE-04 |
| V2-FE-01 | Frontend | Build cluster planner board | Add cluster lifecycle UI with keyword/page assignment and hub/spoke role support | V2-BE-01 |
| V2-FE-02 | Frontend | Build brief review UI | Add draft, approve, archive flow and page attachment | V2-BE-02 |
| V2-FE-03 | Frontend | Build assisted optimizer UI | Suggestion cards + scoped apply actions + before/after score feedback | V2-BE-04 |
| V2-FE-04 | Frontend | Add policy-aware editing controls | Freer controls for blog/destination and restricted controls for package/activity | V2-BE-05 |
| V2-BE-06 | Backend | Extend workflow baseline support to `page` | Update baseline route validation and persistence to support `page` item type with the same controls | V1-BE-05 |
| V2-FE-05 | Frontend | Add `Flujo SEO` parity for page/landing | Add workflow side panel parity in `Contenido` for `page`, including checklist and baseline registration | V2-BE-06 |

---

## 6. V3 — Locale Scale, Transcreation, and Tracking

### 6.1 Product scope

- Flow F: translation SEO / transcreation
- Flow G: tracking by page, cluster, locale, content type
- Operational controls for measurement reliability

### 6.2 Technical deliverables

| Track | Deliverables | Mapped acceptance criteria |
|---|---|---|
| Data model | Add `seo_transcreation_jobs` and daily cluster/page metrics rollups | AC-10, AC-11, AC-17 |
| Backend | Transcreation pipeline with target-market re-research; tracking API from real GSC metrics | AC-10, AC-11, AC-16, AC-18 |
| Frontend | Translate tab, review/apply transcreation UI, cluster tracking dashboards with locale filters | AC-10, AC-11, AC-17 |

### 6.3 Exit criteria

1. Transcreation requires target-locale keyword research before copy generation.
2. Page and cluster tracking show locale-aware trends from real data sources.
3. Milestone comparisons are available for before/after optimization periods.
4. Product does not present sample rows or proxies as authoritative SEO reporting.

### 6.4 Issue backlog

| ID | Track | Title | Description | Depends on |
|---|---|---|---|---|
| V3-DM-01 | Data model | Create transcreation jobs table | Add `seo_transcreation_jobs` with source/target locale, keyword mapping, status, and payload | V2-DM-02 |
| V3-DM-02 | Data model | Create SEO metrics rollup tables | Add `seo_page_metrics_daily` and `seo_cluster_metrics_daily` by locale/type | V2-DM-01 |
| V3-DM-03 | Data model | Add localized variant mapping model | Add source-target content linkage (blog/page/destination) to track translation lineage and rollout status | V2-DM-02 |
| V3-BE-01 | Backend | Ship transcreation API route | Add `POST /api/seo/content-intelligence/transcreate` with keyword re-research requirement | V3-DM-01 |
| V3-BE-02 | Backend | Build tracking aggregation service | Join GSC metrics with cluster/page mapping and store daily rollups | V3-DM-02 |
| V3-BE-03 | Backend | Ship tracking API route | Add `GET /api/seo/content-intelligence/track` with filters for locale/type/cluster/date | V3-BE-02 |
| V3-BE-04 | Backend | Add measurement integrity guardrails | Reject/flag views that would fallback to derived placeholders in decision-grade panels | V3-BE-03 |
| V3-BE-05 | Backend | Build translation orchestration endpoints | Add source-target lookup, draft generation, and apply operations with explicit review state transitions | V3-DM-03 |
| V3-FE-01 | Frontend | Build translation SEO workspace | Add source-target locale workflow, review queue, and apply controls | V3-BE-01 |
| V3-FE-02 | Frontend | Build cluster and locale tracking dashboards | Add trend charts, milestone compare, and drill-down to page level | V3-BE-03 |
| V3-FE-03 | Frontend | Add measurement confidence indicators | Show explicit confidence state and data-source badges in tracking surfaces | V3-BE-04 |
| V3-FE-04 | Frontend | Add translation entrypoints from item detail | Add `Translate` action from blog/page/destination detail, including source selector, target locale selector, review/apply, and status chips | V3-BE-05 |

---

## 7. Cross-Phase Decisions To Resolve Early

1. Cluster home: `Analytics` vs `SEO` first-class section.
2. Snapshot cadence: on-demand, on-publish, scheduled, or hybrid.
3. Provider source-of-truth for SERP features and difficulty in V1.
4. SEO-layer storage location for package/activity overlays.
5. Transcreation storage model: draft variants before apply vs direct update.

---

## 8. Suggested Delivery Sequence

1. Execute V1 fully before starting V2 optimizer work.
2. Start V2 with data model and policy boundary enforcement first.
3. Gate V3 tracking release on real GSC-backed metrics integrity.
4. Keep backlinks and AI visibility in exploratory mode until dedicated implementation.

---

## 9. Links

- [SEO Implementation Reference](../seo/SEO-IMPLEMENTATION.md)
- [SEO Flows in Studio](../seo/SEO-FLUJOS-STUDIO.md)
- [SEO Playbook](../seo/SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec](./SPEC_SEO_CONTENT_INTELLIGENCE.md)
