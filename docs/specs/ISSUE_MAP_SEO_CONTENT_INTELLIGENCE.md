# Issue Map: SEO Content Intelligence (Agent-ready)

This file provides the 11 ordered child issues with a fixed template.

Template sections used in every issue:

1. Goal
2. In scope / Out of scope
3. UI contract
4. API contract
5. Data model changes
6. Rules/guardrails
7. Acceptance criteria
8. Test scenarios
9. Rollback/fallback

---

## V1-FLOW-A — Site-wide rendered audit by locale

### Goal
Ship a decision-grade rendered-content audit by locale.

### In scope / Out of scope
In:
1. Locale selector and audit execution.
2. Render snapshots + findings persistence.
3. Actionable findings UI.

Out:
1. Cluster assignment actions.
2. Backlinks intelligence.

### UI contract
1. New panel in `Analytics -> Content Intelligence`.
2. Required controls: locale, content type filter, run audit.
3. Findings table with severity and freshness.

### API contract
1. `POST /api/seo/content-intelligence/audit`
2. `GET /api/seo/content-intelligence/audit`

### Data model changes
1. `seo_render_snapshots`
2. `seo_audit_findings`

### Rules/guardrails
1. Findings marked exploratory cannot appear as decision-grade.

### Acceptance criteria
1. Audit runs by locale and stores snapshots.
2. Findings include headings/meta/schema/internal links context.
3. UI exposes source and fetched timestamp.

### Test scenarios
1. Audit ES locale only.
2. Audit EN locale only.
3. Re-run audit idempotency.

### Rollback/fallback
1. Keep existing health view as fallback if new panel fails.

---

## V1-FLOW-B — Keyword research by type/locale/market

### Goal
Replace single-seed ideation with locale-native typed research.

### In scope / Out of scope
In:
1. Inputs: content type, country, language, locale, multi-seed.
2. Candidate output with intent and create/update recommendation.

Out:
1. Cluster persistence.

### UI contract
1. Upgrade `Analytics -> Keywords` form and results grid.

### API contract
1. `POST /api/seo/content-intelligence/research`

### Data model changes
1. `seo_keyword_research_runs`
2. `seo_keyword_candidates`
3. Fix locale persistence in keyword sync.

### Rules/guardrails
1. Request without country/language/locale is invalid.

### Acceptance criteria
1. Multi-seed input is honored.
2. Locale is persisted explicitly.
3. Difficulty/SERP features have source attribution.

### Test scenarios
1. Same seeds across two locales produce independent runs.
2. Validation failure on missing market fields.

### Rollback/fallback
1. Keep legacy `/api/seo/keywords/research` behind fallback toggle.

---

## V2-FLOW-C — Cluster planner + assignments

### Goal
Enable cluster-first planning and assignment by locale.

### In scope / Out of scope
In:
1. Cluster CRUD.
2. Keyword and page assignments.
3. Hub/spoke role assignment.

Out:
1. Performance rollups.

### UI contract
1. `Analytics -> Clusters` board with status columns.

### API contract
1. `POST /api/seo/content-intelligence/clusters`
2. `GET /api/seo/content-intelligence/clusters`

### Data model changes
1. `seo_clusters`
2. `seo_cluster_keywords`
3. `seo_cluster_pages`

### Rules/guardrails
1. Cluster locale must be explicit and immutable after activation.

### Acceptance criteria
1. Planner supports create/assign/update lifecycle.
2. Duplicate keyword conflict surfaces are shown.

### Test scenarios
1. Assign same page to two clusters.
2. Mixed-locale cluster validation error.

### Rollback/fallback
1. Disable new board and preserve legacy keyword workflows.

---

## V2-FLOW-D — Brief + SERP review + approval

### Goal
Make briefs first-class and approval-driven.

### In scope / Out of scope
In:
1. Brief generation and versioning.
2. Approval and archive transitions.

Out:
1. Direct content apply actions.

### UI contract
1. `SEO Item Detail -> Brief` tab with version history and status.

### API contract
1. `POST /api/seo/content-intelligence/briefs`
2. `GET /api/seo/content-intelligence/briefs`

### Data model changes
1. `seo_briefs`
2. `seo_brief_versions`

### Rules/guardrails
1. Optimize flow can only consume approved briefs.

### Acceptance criteria
1. Brief state transitions are auditable.
2. Approved brief is addressable by item and locale.

### Test scenarios
1. Draft -> approved -> archived path.
2. Version rollback test.

### Rollback/fallback
1. Keep recommendation-only UI if brief APIs fail.

---

## V2-FLOW-E1 — Optimizer asistido (blog/destination)

### Goal
Ship assisted optimizer for editorial-rich types.

### In scope / Out of scope
In:
1. Suggestions from snapshot + approved brief.
2. Scoped apply actions for blog/destination.

Out:
1. Transactional guardrails for package/activity.

### UI contract
1. `SEO Item Detail -> Optimize` for blog/destination.

### API contract
1. `POST /api/seo/content-intelligence/optimize`

### Data model changes
1. `seo_optimizer_actions`

### Rules/guardrails
1. Before/after scoring shown for every apply action.

### Acceptance criteria
1. Suggestion cards are actionable and persisted.
2. Applied actions are traceable.

### Test scenarios
1. Apply single suggestion.
2. Apply batch suggestions.

### Rollback/fallback
1. Disable apply actions, keep read-only recommendations.

---

## V2-FLOW-E2 — Optimizer controlado (package/activity SEO layer)

### Goal
Enforce controlled optimization for transactional products.

### In scope / Out of scope
In:
1. SEO-layer-only writable actions for package/activity.
2. Explicit block on truth fields.

Out:
1. Business catalog edits.

### UI contract
1. Optimizer UI hides/disables restricted fields for these types.

### API contract
1. `POST /api/seo/content-intelligence/optimize` policy path for transactional types.

### Data model changes
1. Extend/normalize SEO overlay persistence.

### Rules/guardrails
1. Block writes to pricing/availability/itinerary/policies.

### Acceptance criteria
1. Restricted edits are rejected with explicit error codes.
2. Allowed SEO-layer edits persist correctly.

### Test scenarios
1. Attempt blocked price change.
2. Allowed FAQ/highlights update.

### Rollback/fallback
1. Hard-disable optimizer apply for transactional types.

---

## V2-FLOW-E3 — Paridad Flujo SEO para page/landing

### Goal
Provide workflow side panel parity for `page`.

### In scope / Out of scope
In:
1. Enable `Flujo SEO` action for page rows.
2. Baseline registration for page type.

Out:
1. Transcreation-specific controls.

### UI contract
1. `Contenido` shows `Flujo SEO` for page.
2. Same stepper/checklist/baseline behavior as other supported types.

### API contract
1. Extend baseline route to accept `itemType=page`.

### Data model changes
1. Reuse `seo_workflow_baselines` with page type support.

### Rules/guardrails
1. Keep existing `Open SEO` detail unchanged.

### Acceptance criteria
1. Page rows support guided workflow + baseline.

### Test scenarios
1. Register/reload baseline for page.
2. Validate page workflow status persistence.

### Rollback/fallback
1. Keep page as `Open SEO`-only if regression appears.

---

## V3-FLOW-F1 — Transcreation model + APIs

### Goal
Implement transcreation data and orchestration backend.

### In scope / Out of scope
In:
1. Jobs table and state machine.
2. Target-market keyword re-research requirement.
3. Draft/review/apply endpoint orchestration.

Out:
1. Full UI review workflow.

### UI contract
1. None required beyond API consumers in this issue.

### API contract
1. `POST /api/seo/content-intelligence/transcreate`
2. supporting orchestration endpoints as needed.

### Data model changes
1. `seo_transcreation_jobs`
2. `seo_localized_variants`

### Rules/guardrails
1. Apply is blocked unless job is reviewed.

### Acceptance criteria
1. Source-target linkage is persisted.
2. Re-research metadata is stored in job payload.

### Test scenarios
1. Create draft from source blog.
2. Reject apply on non-reviewed draft.

### Rollback/fallback
1. Keep manual translation workaround operational.

---

## V3-FLOW-F2 — Translate UI workspace + source-target linkage

### Goal
Ship first-class translation UI flow.

### In scope / Out of scope
In:
1. `Translate` entrypoint from item detail.
2. Source-target selector and draft review/apply screens.
3. Variant status chips.

Out:
1. Cluster rollup charts.

### UI contract
1. `SEO Item Detail -> Translate` tab for blog/page/destination.

### API contract
1. Consume transcreate orchestration APIs from F1.

### Data model changes
1. Consume `seo_localized_variants`.

### Rules/guardrails
1. Explicit approval required before apply.

### Acceptance criteria
1. User can execute full source->target transcreation from UI.

### Test scenarios
1. ES source -> EN target with apply.
2. Update existing EN variant from ES source.

### Rollback/fallback
1. Route users back to manual editor workflow.

---

## V3-FLOW-G — Tracking por page/cluster/locale

### Goal
Deliver authoritative tracking by page/cluster/locale.

### In scope / Out of scope
In:
1. Daily rollups.
2. Tracking dashboards and filters.
3. Milestone comparison.

Out:
1. Backlink authority analytics.

### UI contract
1. `Track` tab and cluster tracking dashboards.

### API contract
1. `GET /api/seo/content-intelligence/track`

### Data model changes
1. `seo_page_metrics_daily`
2. `seo_cluster_metrics_daily`

### Rules/guardrails
1. Derived placeholders cannot be displayed as real metrics.

### Acceptance criteria
1. Page and cluster trends work with locale breakdown.

### Test scenarios
1. Before/after milestone comparison.
2. Locale filter consistency.

### Rollback/fallback
1. Hide track dashboard behind feature flag.

---

## CROSS-CUT — Data integrity + trust-state labels

### Goal
Enforce product integrity across all phases.

### In scope / Out of scope
In:
1. Unified source/confidence/freshness labeling.
2. Blocking of exploratory data in decision-grade surfaces.
3. Observability and integrity checks.

Out:
1. New user-facing feature scope.

### UI contract
1. Standard trust-state component across SEO panels.

### API contract
1. Every response includes source + fetchedAt + confidence where applicable.

### Data model changes
1. Minimal metadata extension as needed for confidence tagging.

### Rules/guardrails
1. Decision-grade views require authoritative sources.

### Acceptance criteria
1. No panel shows ambiguous data origin.

### Test scenarios
1. Simulate provider unavailable.
2. Validate fallback labeling.

### Rollback/fallback
1. Degrade to read-only with warning badge.

