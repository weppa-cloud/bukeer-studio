# GitHub EPIC: SEO Content Intelligence Platform

Use this file as the canonical body for the EPIC issue.

---

## Suggested Title

`EPIC: SEO Content Intelligence Platform (Audit -> Research -> Clusters -> Brief -> Optimize -> Translate -> Track)`

---

## EPIC Body (ready to paste)

### Problem statement

Bukeer Studio has a functional SEO base, but execution is fragmented across partial dashboards and checklist-oriented flows.  
The product needs a decision-grade, flow-complete SEO + AI system that supports audit, research, planning, optimization, translation/transcreation, and tracking by locale and cluster.

### Objectives

1. Deliver a full SEO operating loop by flow, not by disconnected tools.
2. Enable locale-native execution and measurement.
3. Keep product truth safe with strict SEO-layer guardrails for transactional pages.
4. Make all implementation tasks agent-delegable without open decisions.

### Non-objectives

1. Build a generic all-in-one SEO suite.
2. Replace external backlink authority tooling in this EPIC.
3. Ship autonomous publish-without-review behavior.

### Target architecture (UI/API/Data)

1. UI:
   - Analytics -> Content Intelligence
   - Analytics -> Keywords
   - Analytics -> Clusters
   - SEO Item Detail tabs: Brief/Optimize/Translate/Track
   - Flujo SEO parity for page/landing
2. API:
   - `/api/seo/content-intelligence/{audit,research,clusters,briefs,optimize,transcreate,track}`
3. Data:
   - snapshots, findings, clusters, briefs, optimizer actions, transcreation jobs, localized variants, rollups

### Dependencies

1. Existing Google integrations and sync pipeline.
2. Existing SEO item detail and workflow components.
3. DataForSEO integration for V1 research enrichment.

### Risks

1. Mixing exploratory panels with decision-grade reporting.
2. Incomplete guardrails allowing transactional truth edits.
3. Locale leakage across clusters and translated variants.
4. Translation implemented as literal copy instead of transcreation.

### Global acceptance gates (phase go/no-go)

1. V1 gate:
   - decision-grade rendered audit by locale
   - research by type/country/language/locale
2. V2 gate:
   - cluster + brief + optimizer loop works end-to-end
   - page/landing workflow parity is shipped
3. V3 gate:
   - transcreation flow with review/apply linkage
   - track panel shows authoritative page/cluster/locale metrics
4. Cross-cut gate:
   - no placeholder/derived metrics exposed as authoritative in decision-grade views

### Child issue checklist (ordered sequence)

- [ ] V1-FLOW-A — Site-wide rendered audit by locale
- [ ] V1-FLOW-B — Keyword research by type/locale/market
- [ ] V2-FLOW-C — Cluster planner + assignments
- [ ] V2-FLOW-D — Brief + SERP review + approval
- [ ] V2-FLOW-E1 — Optimizer asistido (blog/destination)
- [ ] V2-FLOW-E2 — Optimizer controlado (package/activity SEO layer)
- [ ] V2-FLOW-E3 — Paridad Flujo SEO para page/landing
- [ ] V3-FLOW-F1 — Transcreation model + APIs
- [ ] V3-FLOW-F2 — Translate UI workspace + source-target linkage
- [ ] V3-FLOW-G — Tracking por page/cluster/locale
- [ ] CROSS-CUT — Data integrity + trust-state labels

### Execution sequence

1. Sprint 0: spec hardening + issue hardening.
2. V1: audit/research foundation.
3. V2: planning + optimizer + page parity.
4. V3: transcreation + tracking.
5. Hardening: observability, documentation, reliability polish.

### Source docs

1. [Integral spec](./SPEC_SEO_CONTENT_INTELLIGENCE_INTEGRAL.md)
2. [Issue map](./ISSUE_MAP_SEO_CONTENT_INTELLIGENCE.md)
3. [Roadmap](./ROADMAP_SEO_CONTENT_INTELLIGENCE.md)

