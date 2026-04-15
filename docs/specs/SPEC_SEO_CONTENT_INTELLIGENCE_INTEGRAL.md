# SPEC Integral: SEO + AI Content Intelligence (Bukeer Studio)

**Status**: Ready for execution  
**Date**: 2026-04-15  
**Scope**: End-to-end product + backend + frontend + data contracts  
**Primary source**: This document is the single operational source for implementation delegation.

---

## 1. Purpose

Define a decision-complete implementation contract so any team member can assign work to an agent without open technical decisions.

This spec consolidates:

- current validated state
- target objective flows
- UI/API/Data contracts
- guardrails by content type
- testing and Definition of Done
- EPIC execution structure and issue map

---

## 2. Current Validated State (Baseline)

### 2.1 What is currently executable

1. Google integrations + sync from `Analytics -> Config`.
2. Overview and keyword surfaces with partial reliability.
3. `Flujo SEO` panel for:
   - blog
   - destination
   - hotel
   - package
   - activity
4. `Open SEO` item detail for all supported types, including `page`.
5. Baseline registration in workflow panel for supported flow types.

### 2.2 Known gaps that must be closed

1. `page/landing` does not have workflow panel parity.
2. Translation workflow is manual and not first-class.
3. Site-wide rendered audit by locale is not decision-grade yet.
4. Backlinks and AI visibility are exploratory and cannot be treated as authoritative.

---

## 3. Closed Product Decisions

1. **Execution structure**:
   - 1 EPIC master issue + child issues.
   - vertical delivery by flow.
2. **Operational language for issue bodies**: Spanish (technical).
3. **Editing guardrails**:
   - blog/destination: richer editorial optimization.
   - package/activity: controlled SEO layer only.
4. **Cluster product location (default)**: `Analytics -> Clusters`.
5. **Snapshot capture strategy (default)**:
   - on-demand audit run.
   - automatic snapshot on publish.
6. **V1 source of truth for SERP features/difficulty (default)**:
   - DataForSEO primary.
   - GSC for real query/performance context.
7. **Translation model (default)**:
   - draft-first workflow.
   - explicit review and apply.
   - source-target linkage persisted.

---

## 4. Objective User Flows

## 4.1 Flow A — New Site Onboarding (SEO Foundation)

### UI path

`Dashboard -> Analytics -> Config`

### Steps

1. Connect GSC.
2. Connect GA4.
3. Configure property/site mapping.
4. Run initial sync.
5. Validate trust-state banner for each section.

### Done

- Sync runs without ambiguity.
- Initial data populates overview/keywords/health surfaces with source badges.

---

## 4.2 Flow B — Optimization by Content Type

### Supported types

- blog
- destination
- hotel
- package
- activity
- page/landing

### UI path

`Dashboard -> Contenido -> (Open SEO / Flujo SEO)`

### Standard steps (all types)

1. Open item.
2. Run research.
3. Review/approve brief.
4. Apply optimizer suggestions.
5. Save and register milestone.
6. Track impact in `Track`.

### Type-specific rule

1. blog/destination:
   - freer optimization on editorial content.
2. package/activity:
   - scoped SEO layer; no product truth rewrite.
3. page/landing:
   - must have full `Flujo SEO` parity (checklist + baseline + measurement).

---

## 4.3 Flow C — Translation / Transcreation (Blog example)

Example source post: `10 hoteles top para venir a Cartagena`

### UI path (target)

`SEO Item Detail -> Translate`

### Steps

1. Open source blog item.
2. Click `Translate`.
3. Select target locale + market inputs (`country`, `language`).
4. Run target-locale keyword re-research.
5. Generate transcreation draft:
   - title
   - meta description
   - headings
   - summary
   - FAQ
   - anchors
6. Review source-vs-target diff.
7. Approve and apply to target variant.
8. Publish target variant.
9. Record milestone and track by locale/cluster.

### Hard rules

1. No literal translation-only mode for decision-grade flow.
2. Must enforce target-market keyword re-research before generation.
3. Apply requires explicit review state transition.

---

## 5. UI Contract (Target)

## 5.1 New/updated surfaces

1. `Analytics -> Content Intelligence`
   - locale audit
   - actionable findings
2. `Analytics -> Keywords`
   - market-aware research by type
3. `Analytics -> Clusters`
   - planner board
   - status tracking
4. `SEO Item Detail` tabs
   - Overview
   - Research
   - Brief
   - Optimize
   - Translate
   - Track
5. `Contenido`
   - `Flujo SEO` parity for `page`.

## 5.2 Trust-state requirements

Every decision-grade panel must display:

1. data source badge
2. freshness timestamp
3. confidence state (`live`, `partial`, `exploratory`)

Panels with derived/example data cannot be presented as authoritative.

---

## 6. API Contract (Target)

Base family: `/api/seo/content-intelligence/*`

## 6.1 Endpoints

1. `POST /audit`
2. `GET /audit`
3. `POST /research`
4. `POST /clusters`
5. `GET /clusters`
6. `POST /briefs`
7. `GET /briefs`
8. `POST /optimize`
9. `POST /transcreate`
10. `GET /track`

## 6.2 Required request fields by flow

1. Audit:
   - `websiteId`
   - `locale`
   - optional filters by content type
2. Research:
   - `websiteId`
   - `contentType`
   - `country`
   - `language`
   - `locale`
   - seeds
3. Transcreate:
   - `websiteId`
   - `sourceContentId`
   - `sourceLocale`
   - `targetLocale`
   - `country`
   - `language`
   - optional target variant id
4. Track:
   - `websiteId`
   - date range
   - filters (`locale`, `contentType`, `clusterId`)

## 6.3 Response guarantees

1. Include source metadata (`source`, `fetchedAt`, `confidence`).
2. Include deterministic identifiers for entities created (`clusterId`, `briefId`, `jobId`).
3. Return validation errors with explicit missing field paths.

---

## 7. Data Model Contract (Target)

Required entities:

1. `seo_render_snapshots`
2. `seo_audit_findings`
3. `seo_keyword_research_runs`
4. `seo_keyword_candidates`
5. `seo_clusters`
6. `seo_cluster_keywords`
7. `seo_cluster_pages`
8. `seo_briefs`
9. `seo_brief_versions`
10. `seo_optimizer_actions`
11. `seo_transcreation_jobs`
12. `seo_localized_variants` (source-target linkage)
13. `seo_page_metrics_daily`
14. `seo_cluster_metrics_daily`

Core status enums:

1. brief: `draft | approved | archived`
2. cluster: `planned | active | completed | paused`
3. page execution: `planned | draft | optimized | published`
4. transcreation: `draft | reviewed | applied | published`

---

## 8. Guardrails (Non-negotiable)

1. package/activity cannot modify:
   - price
   - availability
   - itinerary truth
   - policy truth
2. optimizer writes for transactional pages must stay in SEO layer fields.
3. translation apply operation must require approved draft state.
4. decision-grade panels must reject placeholder fallbacks.

---

## 9. Definition of Done

A flow is Done only if:

1. UI is complete and discoverable.
2. API contracts are implemented and typed.
3. Data persistence supports retries and idempotency.
4. Trust-state indicators are visible.
5. Acceptance tests pass.
6. Documentation for operators is updated.

---

## 10. Mandatory Test Scenarios

1. New site onboarding:
   - connect/configure/sync fully successful.
2. Blog optimization:
   - research -> brief -> optimize -> save -> score.
3. Blog transcreation:
   - source ES -> target EN with re-research and approval.
4. Page/landing parity:
   - full guided workflow with baseline.
5. Package/activity guardrail:
   - restricted field edit is blocked.
6. Tracking integrity:
   - no derived/example metrics shown as authoritative.

---

## 11. EPIC Execution Model

Master issue title:

`EPIC: SEO Content Intelligence Platform (Audit -> Research -> Clusters -> Brief -> Optimize -> Translate -> Track)`

Child issues:

1. V1-FLOW-A
2. V1-FLOW-B
3. V2-FLOW-C
4. V2-FLOW-D
5. V2-FLOW-E1
6. V2-FLOW-E2
7. V2-FLOW-E3
8. V3-FLOW-F1
9. V3-FLOW-F2
10. V3-FLOW-G
11. CROSS-CUT

Reference pack:

- [EPIC body and sequence](./EPIC_SEO_CONTENT_INTELLIGENCE_GITHUB.md)
- [Issue map with agent-ready tasks](./ISSUE_MAP_SEO_CONTENT_INTELLIGENCE.md)

---

## 12. Agent Delegation Protocol

Every delegated task must include:

1. issue ID
2. expected output artifacts
3. acceptance criteria
4. test scenarios to execute
5. rollback/fallback path

Use the work-item issue template from `.github/ISSUE_TEMPLATE`.

---

## 13. Related Docs

- [SEO Implementation Reference](../seo/SEO-IMPLEMENTATION.md)
- [SEO Flows in Studio](../seo/SEO-FLUJOS-STUDIO.md)
- [SEO Playbook](../seo/SEO-PLAYBOOK.md)
- [SEO Content Intelligence Spec (base)](./SPEC_SEO_CONTENT_INTELLIGENCE.md)
- [SEO Content Intelligence Roadmap](./ROADMAP_SEO_CONTENT_INTELLIGENCE.md)
