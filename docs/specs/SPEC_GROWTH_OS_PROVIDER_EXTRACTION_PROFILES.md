# Spec: Growth OS Provider Extraction Profiles

## GitHub Tracking
- **Epic Issue**: [#471](https://github.com/weppa-cloud/bukeer-studio/issues/471)
- **Child Issues**: [#472](https://github.com/weppa-cloud/bukeer-studio/issues/472), [#473](https://github.com/weppa-cloud/bukeer-studio/issues/473), [#474](https://github.com/weppa-cloud/bukeer-studio/issues/474), [#475](https://github.com/weppa-cloud/bukeer-studio/issues/475), [#476](https://github.com/weppa-cloud/bukeer-studio/issues/476), [#477](https://github.com/weppa-cloud/bukeer-studio/issues/477), [#478](https://github.com/weppa-cloud/bukeer-studio/issues/478), [#479](https://github.com/weppa-cloud/bukeer-studio/issues/479), [#480](https://github.com/weppa-cloud/bukeer-studio/issues/480)
- **Milestone**: Q2-2026
- **Area**: growth

## Status
- **Author**: Codex
- **Date**: 2026-05-10
- **Status**: Draft for execution
- **ADRs referenced**: ADR-003, ADR-005, ADR-009, ADR-016, ADR-029
- **Cross-repo impact**: Shared Supabase tables are read by bukeer-flutter; runtime writes remain service-role only.

## Summary
Implement a provider-profile layer for Growth OS that extracts, normalizes and scores DataForSEO, Google Analytics 4, Google Search Console and Microsoft Clarity data into versioned, freshness-governed profiles. The Growth CEO Brain and live-gated executor must use these profiles as cited evidence before creating candidates, publishing content, merging transcreations or applying technical remediations.

## Motivation
Growth OS currently uses some provider data, but not at full depth:

- DataForSEO OnPage exists in artifacts and `seo_audit_results` / `seo_audit_findings`, but the runtime `page_product` profile does not consume it.
- DataForSEO SERP/Labs are partially used in `seo_market` and `competitor`, but Backlinks, AI visibility, Business Data and full OnPage feature profiles are not operationalized.
- GA4 uses basic `runReport` shapes, but does not exploit Realtime, Funnel, Pivot, Metadata/Compatibility, or robust event/page/source/campaign profiles.
- GSC uses Search Analytics, but URL Inspection, Sitemaps, Sites and stable `searchAppearance` flows are missing.
- Clarity is configured and documented, but not ingested into Growth profiles or candidate decisions.

The result is that the agent can operate autonomously, but not yet with maximum provider intelligence per URL, market, funnel stage and risk surface.

## User Flows

### Flow 1: CEO Sees Provider Coverage
1. CEO opens Growth OS Data Health.
2. System shows each provider profile with status: `fresh`, `stale`, `missing`, `blocked`, `cost_gated`, or `approval_required`.
3. CEO sees which Growth lanes are blocked by missing provider profiles.
4. CEO can approve an expensive/manual DataForSEO profile run where required.

### Flow 2: Scheduler Refreshes Safe Profiles
1. Scheduler runs `runGrowthProviderRefresh(accountId, websiteId)`.
2. System refreshes read-only, low-cost profiles automatically: GSC, GA4, Clarity aggregate, existing DataForSEO cache health.
3. System writes `growth_profile_runs`, provider cache rows, normalized facts and updated `growth_profiles`.
4. Brain decisions cite profile run ids and source facts.

### Flow 3: Technical Agent Uses OnPage Evidence
1. DataForSEO OnPage crawl or prior normalized OnPage facts exist.
2. System builds `technical_onpage_profile` per URL from `seo_audit_results`, `seo_audit_findings`, `growth_inventory`, and optional DataForSEO cache.
3. `safe_apply` candidates include the exact OnPage task id, finding id, URL, severity, smoke plan and rollback payload.
4. Runtime blocks technical execution if OnPage evidence is required but missing, unless an explicit exception is recorded.

### Flow 4: Content Agent Uses Search + Funnel Evidence
1. Brain builds context from `seo_market`, `page_performance_profile`, `content_inventory_profile`, and `funnel_profile`.
2. It creates content or optimization candidates only when demand, intent, market and conversion fit are supported.
3. Candidates cite GSC query/page, DataForSEO SERP/Labs, GA4 landing/channel and funnel evidence.
4. Executor still applies only through live-gated adapters.

### Flow 5: UX/CRO Agent Uses Clarity
1. Clarity aggregate export runs for the last 1-3 days by URL, device and source/medium.
2. System creates `ux_friction_profile` with scroll depth, engagement time, dead clicks and affected URLs.
3. CRO opportunities are generated only when Clarity friction aligns with GA4/funnel activation gaps.
4. Raw recordings and PII are not stored.

## Provider Profile Matrix

| Provider | Profile | Priority | Source endpoints/data | Cadence | Autonomy |
|---|---|---:|---|---|---|
| DataForSEO | `technical_onpage_profile` | P0 | OnPage task/summary/pages/duplicate tags/instant pages; `seo_audit_results`; `seo_audit_findings` | weekly while technical WATCH; instant per apply | approval-gated start, automatic follow-up |
| DataForSEO | `seo_market_profile` | P0 | SERP organic advanced, Maps/local, Labs keyword/domain/intersection | weekly/monthly by market | cost-gated automatic if approved |
| DataForSEO | `competitor_profile` | P1 | SERP competitors, Labs domain intersection, Domain Analytics | monthly | cost-gated |
| DataForSEO | `authority_profile` | P1 | Backlinks overview, referring domains, backlinks competitors | monthly/quarterly | approval-gated |
| DataForSEO | `content_quality_profile` | P1 | Content Analysis, sentiment, citations | monthly | approval-gated |
| DataForSEO | `ai_visibility_profile` | P1 | SERP `ai_overview`, AI Optimization where access exists | monthly pilot | approval-gated |
| DataForSEO | `local_business_profile` | P1 | Business Data, reviews/local pack evidence | monthly | approval-gated |
| GSC | `search_demand_profile` | P0 | Search Analytics query/page/date | daily/weekly | automatic |
| GSC | `market_device_profile` | P0 | Search Analytics page/country/device/searchAppearance | weekly | automatic |
| GSC | `indexability_profile` | P0 | URL Inspection, Sitemaps, Sites | after publish/apply + weekly samples | automatic read-only, quota aware |
| GA4 | `page_performance_profile` | P0 | Data API runReport landing/channel/source/medium/page | daily/weekly | automatic |
| GA4 | `activation_event_profile` | P0 | eventName/pagePath/key events/custom events | daily/weekly | automatic |
| GA4 | `realtime_smoke_profile` | P1 | Realtime API after publish/apply | immediate | automatic |
| GA4 | `funnel_profile` | P1 | runFunnelReport where available; fallback runReport + `funnel_events` | weekly | automatic |
| Clarity | `ux_friction_profile` | P0 | Export API project-live-insights URL/device/source/medium | daily targeted | automatic within quota |
| Clarity | `session_evidence_profile` | P1 | MCP/session recording summaries only | on demand | human/admin initiated |

## Data Extraction Strategy

### Site-Wide Profiles
- Run complete GSC and GA4 windows over the latest completed 28 days.
- Run DataForSEO OnPage weekly only when technical rows are WATCH/BLOCKED or when a batch of technical changes shipped.
- Run DataForSEO SERP/Labs by approved seed groups: ES core, EN-US, MX-ES, destination clusters, commercial packages.
- Run Clarity daily only for aggregate URL/device/source data, respecting 10 requests/day and 1-3 day limits.
- Store raw provider output in cache tables and normalized facts in provider-specific fact tables.

### Page-Specific Profiles
- Before autonomous content/technical execution, build a URL profile with:
  - public route and canonical mapping;
  - GSC query/page baseline;
  - GA4 landing/channel/source/event baseline;
  - DataForSEO SERP/Labs support;
  - DataForSEO OnPage or explicit exception for technical changes;
  - Clarity friction if recent sessions exist;
  - funnel event attribution if available.
- After execution, schedule:
  - immediate smoke;
  - GA4 realtime/nearline check;
  - Clarity 1-3 day UX read;
  - GSC day 7/21/45 read;
  - DataForSEO OnPage recrawl/instant page when technical.

## Data Model Changes

| Table | Column | Type | Notes |
|---|---|---|---|
| `growth_profile_runs` | `provider` | text | `dataforseo`, `gsc`, `ga4`, `clarity` |
| `growth_profile_runs` | `profile_id` | text | Stable profile id, e.g. `dfs_onpage_full_comparable_v3` |
| `growth_profile_runs` | `run_status` | text | `queued`, `running`, `completed`, `failed`, `blocked`, `cost_gated` |
| `growth_profile_runs` | `freshness_status` | text | `fresh`, `stale`, `missing`, `blocked`, `approval_required` |
| `growth_profile_runs` | `source_refs` | jsonb | Cache rows, provider task ids, artifact paths |
| `growth_profile_runs` | `cost_usd` | numeric | Best-effort provider cost |
| `growth_profiles` | `payload.provider_profile_refs` | jsonb | Profile run ids and fact refs injected into Brain context |
| `growth_signal_facts` | `provider_profile_id` | text | Links fact to extraction profile |
| `growth_work_items.evidence` | `provider_evidence_reads` | jsonb | Provider citations required by executor |

Migration path: additive. If `growth_profile_runs` already exists in target, add missing columns only. Existing provider cache tables stay source-compatible.

## API / Contract Changes

| Service/Schema | Payload | Notes |
|---|---|---|
| `runGrowthProviderRefresh(accountId, websiteId, options)` | provider/profile filters, window, force, dry run | Runs safe profiles and approved follow-ups |
| `buildGrowthProviderProfileMatrix(accountId, websiteId)` | none | Returns profile coverage/status for UI and Brain |
| `buildTechnicalOnPageProfile(accountId, websiteId, url)` | URL/path | Bridges DataForSEO OnPage facts into runtime profile |
| `buildPagePerformanceProfile(accountId, websiteId, url)` | URL/path/window | Joins GSC, GA4 and funnel facts |
| `buildUxFrictionProfile(accountId, websiteId, options)` | numOfDays, dimensions | Clarity aggregate extraction |
| `ProviderProfileRunSchema` | Zod schema | Add to `@bukeer/website-contract` |
| `ProviderEvidenceReadSchema` | Zod schema | Shared evidence object for candidates/work items |

## Permissions (RBAC)

| Role | View profiles | Run safe refresh | Approve paid/expensive run | View raw payload | View Clarity recordings |
|---|---|---|---|---|---|
| owner | yes | yes | yes | redacted | summarized only |
| admin | yes | yes | yes | redacted | summarized only |
| growth_operator | yes | yes | no | no | no |
| curator | yes | no | no | no | no |
| service_role | yes | yes | yes | yes | yes |

Runtime/publication mutations remain service-role only. Browser/client code must not write provider cache, runtime or profile tables directly.

## Affected Files / Packages

| Path | Change | Description |
|---|---|---|
| `lib/growth/providers/` | Create | Provider profile registry, runner and extraction services |
| `lib/growth/autonomy/profile-refresh.ts` | Modify | Include provider profile refs and new profile payloads |
| `lib/growth/agentic/context-builder.ts` | Modify | Inject provider coverage and citations |
| `lib/growth/agentic/orchestrator-brain.ts` | Modify | Require cited provider evidence for provider-dependent decisions |
| `lib/growth/autonomy/production-cycle.ts` | Modify | Block execution when required provider profile is stale/missing |
| `lib/growth/gsc-client.ts` | Modify | Add URL Inspection/Sitemaps support or companion client |
| `lib/growth/ga4-client.ts` | Modify | Add batch, realtime, metadata/checkCompatibility support |
| `lib/growth/dataforseo-client.ts` | Modify | Add typed profile helpers over generic DataForSEO call |
| `lib/growth/clarity-client.ts` | Create | Read-only Clarity Export API client |
| `app/dashboard/[websiteId]/growth/data-health/` | Modify | Provider profile coverage UI |
| `packages/website-contract/src/` | Modify | Provider profile schemas and evidence contracts |
| `supabase/migrations/` | Add | Additive profile run/evidence metadata |

## Acceptance Criteria

- [ ] Data Health shows provider coverage for DataForSEO, GSC, GA4 and Clarity with freshness, cost and blockers.
- [ ] `technical_onpage_profile` can be built from existing DataForSEO OnPage normalized facts for ColombiaTours.
- [ ] `safe_apply` candidates cite OnPage task/finding evidence or a formal exception.
- [ ] Content candidates cite DataForSEO SERP/Labs, GSC demand and GA4/funnel context when available.
- [ ] Clarity aggregate data can create `ux_friction_profile` without storing raw recordings or PII.
- [ ] Brain decisions include `provider_profile_refs` and `provider_evidence_reads`.
- [ ] Executor blocks provider-dependent live work when required profile status is `missing`, `stale`, `blocked` or `cost_gated`.
- [ ] Expensive DataForSEO profiles require approval and cost ledger before live provider calls.
- [ ] GSC URL Inspection is available for newly published/applied URLs where quota allows.
- [ ] GA4 compatibility/metadata checks prevent invalid dimension/metric report definitions.

## Test Plan

### Unit
- Profile registry validates provider, profile id, cadence, cost mode and required outputs.
- DataForSEO evidence maps OnPage, SERP, Labs, Backlinks, Content Analysis and AI visibility features correctly.
- GA4 compatibility gate rejects invalid dimension/metric combinations.
- GSC profile builder handles pagination and empty rows.
- Clarity client enforces 1-3 day window, maximum 3 dimensions and no raw recording persistence.
- Provider-dependent work item is blocked when required evidence is stale/missing.

### Integration
- Existing ColombiaTours OnPage facts produce a `technical_onpage_profile`.
- GSC query/page + GA4 landing/channel + funnel events produce a `page_performance_profile`.
- DataForSEO SERP/Labs + GSC demand produce a content opportunity with cited evidence.
- Clarity URL/device data + GA4 low activation produces a CRO watch candidate.
- Profile run ledger records status, cost, source refs, freshness and artifact path.

### E2E
- Data Health renders provider profile matrix and blockers.
- Workboard shows provider-backed vs provider-blocked badges.
- Brain decision detail shows provider citations.
- Admin approves a cost-gated DataForSEO profile and sees the run transition.
- Mobile has no overflow in Data Health and Decision Detail.

### Production Certification
- ColombiaTours evidence includes:
  - 1 technical candidate backed by DataForSEO OnPage facts;
  - 1 content candidate backed by DataForSEO SERP/Labs + GSC;
  - 1 CRO candidate backed by GA4 + Clarity aggregate;
  - 1 URL Inspection read after publish/apply;
  - 1 blocked provider-dependent candidate caused by stale/missing/cost-gated evidence;
  - 0 live mutations without provider evidence where required.

## Edge Cases & Error Handling

1. Provider credentials missing -> profile status `blocked`, no provider call attempted.
2. DataForSEO access denied/subscription missing -> `cost_gated` or `blocked_no_subscription`; Brain may recommend fallback but not fake evidence.
3. GSC/GA4 data lag -> mark `watch` instead of `blocked` if previous cache is still within tolerated provider delay.
4. Clarity quota exhausted -> profile status `quota_exhausted`; no retry storm.
5. URL canonical mismatch -> create `blocked_decision` until canonical map resolves.
6. Conflicting provider signals -> Brain must cite both and assign lower confidence.
7. Raw recording or PII in Clarity response -> discard/redact before persistence.

## Out of Scope

- Paid campaign mutations.
- CRM bulk mutation or outreach sends.
- Storing raw Clarity session recordings.
- Treating GA4 Measurement Protocol as primary conversion SOT; `funnel_events` remains SOT per ADR-029.
- Running broad DataForSEO expensive profiles without explicit approval.

## Dependencies

- ADR-003 contract-first validation.
- ADR-005 security defense-in-depth.
- ADR-009 tenant isolation.
- ADR-016 SEO intelligence caching.
- ADR-029 funnel events source of truth.
- `SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX`.
- `SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER`.
- `SPEC_GROWTH_OS_DATAFORSEO_EVIDENCE_GOVERNED_BRAIN`.
- Official docs:
  - DataForSEO OnPage: https://docs.dataforseo.com/v3/on_page-task_post/
  - DataForSEO SERP Advanced: https://docs.dataforseo.com/v3/serp-se-type-live-advanced/
  - DataForSEO Labs: https://docs.dataforseo.com/v3/dataforseo_labs/overview/
  - DataForSEO Content Analysis: https://docs.dataforseo.com/v3/content_analysis-overview/
  - DataForSEO Backlinks: https://docs.dataforseo.com/v3/backlinks-overview/
  - GA4 Data API: https://developers.google.com/analytics/devguides/reporting/
  - GA4 Measurement Protocol: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
  - Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index
  - Search Console URL Inspection: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
  - Microsoft Clarity Export API: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api

## Rollout

- Feature flag: `GROWTH_PROVIDER_PROFILE_MATRIX_ENABLED`.
- Initial tenant: ColombiaTours only.
- Phase 1: profile matrix + Data Health UI.
- Phase 2: DataForSEO OnPage bridge into `technical_onpage_profile`.
- Phase 3: expanded GSC/GA4 profiles and Clarity aggregate profile.
- Phase 4: Brain/runtime enforcement and production certification.
- Revalidation: Growth Data Health, Overview, Workboard and public affected routes after live apply.
