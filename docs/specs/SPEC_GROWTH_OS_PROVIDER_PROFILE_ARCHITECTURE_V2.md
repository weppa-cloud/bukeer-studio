# SPEC: Growth OS Provider Profile Architecture v2 — Neo/Hermes Beta

## Status
Draft for technical validation.

## GitHub Tracking
- Primary epic: #521 Hermes Primary Runtime MVE v0 for Growth OS
- Parent epics: #310, #441, #460
- Precedent epics: #471, #502
- Related specs: SPEC_GROWTH_OS_HERMES_PRIMARY_RUNTIME_MVE_V0, SPEC_GROWTH_OS_PROVIDER_EXTRACTION_PROFILES, SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER, SPEC_GROWTH_OS_PAID_MEDIA_INTEGRATION, SPEC_GROWTH_OS_SSOT_MODEL, SPEC_GLOBAL_MULTILOCALE_TRANSCREATION_SEO

## Purpose
Redirect the Growth OS beta from a separate bespoke VPS runtime toward a Neo/Hermes-orchestrated provider profile system.

This is not a rewrite. It recognizes existing epics, migrations, scripts, provider registries and historical runs, then defines the optimal architecture for using them without duplicated API calls, duplicated work, or conflicting sources of truth.

Core rule:

> Growth OS is not a set of workers that call APIs. Growth OS is a provider profile intelligence system that produces fresh, normalized, auditable facts for workers to act on through explicit contracts.

## Direction Change
The previous Hermes MVE spec correctly identified Hermes as the primary execution runtime, but it over-indexed on Hermes Kanban as the canonical queue. This v2 narrows the beta:

- GitHub issues/specs/commits remain the planning and implementation SSOT.
- Supabase remains the operational data SSOT: provider runs, caches, facts, backlog, work items, publication jobs, outcomes and snapshots.
- Hermes/Neo becomes the architect, orchestrator and optimizer layer.
- Existing provider profiles, scripts and migrations are reused first.
- Workers consume context packets and normalized facts, not raw provider APIs.
- Paid media profiles are part of the architecture from day one, but first beta implementation stays read-only/design-only for Meta/TikTok/LinkedIn unless separately approved.

## Non-Negotiable Principles
| ID | Principle | Contract |
| --- | --- | --- |
| P1 | GitHub is planning SSOT | Epics/issues/specs/commits define scope, acceptance, validation and history. |
| P2 | Supabase is operational SSOT | Runtime evidence and outcomes live in DB, not Neo memory/artifacts. |
| P3 | Provider profiles own API access | Workers do not call DataForSEO, GSC, GA4, Ads, Meta or TikTok APIs directly. |
| P4 | Context packets feed workers | Workers receive scoped, fresh, deduped facts and allowed actions. |
| P5 | Freshness before cost | A run checks cache/freshness/budget before any paid provider call. |
| P6 | Anti-rework before action | A worker must skip/coalesce if equivalent work already exists or is in measurement. |
| P7 | Human gates remain for risky actions | Publishing, campaign mutations and expensive/broad provider runs require explicit governance. |
| P8 | Neo does not become a production worker | Neo audits, designs, creates/updates issues, assigns tasks, validates and optimizes. |
| P9 | Multi-tenant by design | Every operational query and run is scoped by website_id and, where available, account_id. |
| P10 | Paid media is not separate | Ads data enters the same provider -> facts -> backlog -> outcomes loop as SEO. |

## Existing System Recognized
| Epic/spec | Existing intent | v2 relationship |
| --- | --- | --- |
| #310 | ColombiaTours Growth OS business umbrella. | Remains canonical business epic. |
| #441 | Production autonomy, scheduler, gates and outcomes. | Provides autonomy/governance patterns. |
| #460 | Brain/orchestrator, lanes, learning loop. | Provides orchestration model. |
| #471 | SEO provider profiles for DataForSEO/GSC/GA4/Clarity. | Becomes SEO implementation map under generic v2 architecture. |
| #502 | Multilingual transcreation pipeline and quality gates. | Worker consumer of provider context packets. |
| #521 | Hermes primary runtime and MCP tool safety layer. | Reframed: Hermes/Neo orchestrates; Supabase remains operational SSOT. |

Known implementation surfaces to audit/reuse first:
- scripts/seo/growth-provider-profile-registry.mjs
- scripts/seo/dataforseo-onpage-crawl.mjs
- scripts/seo/populate-growth-google-cache.ts
- scripts/seo/normalize-dataforseo-onpage.mjs
- scripts/seo/normalize-growth-gsc-cache.mjs
- scripts/seo/normalize-growth-ga4-cache.mjs
- scripts/seo/run-growth-joint-normalizers.mjs
- scripts/seo/triage-dataforseo-findings.mjs
- scripts/seo/generate-growth-council-packet.mjs
- scripts/google-ads/*
- growth cache/profile/context/funnel/google-ads migrations.

## Target Architecture
```text
Provider APIs
  -> Provider Profile Registry
  -> Provider Runner with freshness/budget/approval/circuit-breaker gates
  -> Provider Cache
  -> Normalizers
  -> Joint Intelligence Layer
  -> Candidates / Backlog
  -> Context Builder
  -> Workers
  -> Outputs / Outcomes / Learning Loop
```

## Provider Profile Contract
A provider profile is the only authorized production path for provider API reads. Minimum fields:
- profile_id
- domain: seo, analytics, paid_media, ux, crm, market_intelligence, content_brand
- provider: gsc, ga4, dataforseo, clarity, google_ads, meta_ads, tiktok_ads, linkedin_ads, chatwoot, bukeer_db
- priority
- cadence
- cost_policy
- approval_policy
- freshness_ttl_hours
- cache_target
- normalizer
- fact_outputs
- consumer_workers
- blocked_direct_consumers
- dedup_keys
- required_identifiers
- pii_policy
- mutation_allowed: false for this beta

## Profile Families
### SEO / Analytics — V1 implementation focus
| Family | Examples | Cadence | Mode | Consumers |
| --- | --- | --- | --- | --- |
| GSC demand/indexability | gsc_search_demand_daily, gsc_indexability_daily | daily/weekly | automatic | content, transcreation, technical |
| GA4 performance/funnel | ga4_page_performance_daily, ga4_conversion_paths_weekly | daily/weekly | automatic | content, CRO, campaign optimizer |
| DataForSEO OnPage | dataforseo_onpage_biweekly | biweekly | approval/cost gated | technical remediation |
| DataForSEO SERP/Labs | dataforseo_serp_labs_biweekly | biweekly/monthly | budget gated | content, transcreation, market intelligence |
| Clarity UX | clarity_ux_friction_daily | daily/weekly | automatic | CRO, technical, content |

### Paid Media — design now, read-only first
| Provider | P0 profiles | Initial posture |
| --- | --- | --- |
| Google Ads | campaign daily, search terms, landing page, conversion import status | read-only reporting + conversion smoke |
| Meta Ads | campaign daily, adset audience, creative, CAPI quality | read-only reporting + CAPI quality |
| TikTok Ads | campaign daily, creative performance, landing page | design-only until credentials/scope confirmed |
| LinkedIn Ads | campaign daily, lead quality | design-only |

No campaign mutation, launch, pause, budget change or creative activation is allowed in this beta.

## Context Packet Contract
Workers receive context packets. They do not assemble truth independently.

Required packet sections:
- packet_version
- website_id / account_id
- worker_lane / work_type
- entity: type, id, canonical_url, locale, market
- freshness map by profile_id
- source_profiles: profile_id, run_id, window
- facts: search_demand, technical_issues, market_terms, conversion_signals, paid_signals, ux_friction
- previous_actions: work items, publication jobs, pending outcomes
- dedupe_verdict: proceed, skip, coalesce, reopen, request_refresh
- allowed_actions
- blocked_actions, always including call_provider_api_directly where relevant

## Worker Contracts
Universal rules:
- Read from context packet + approved product tables only.
- Write to Supabase operational tables required by the task.
- Link actions to source_profiles, source_fact_refs, profile_run_ids, evidence_fingerprint and owner_issue when available.
- Use dual-write to legacy Hermes/Kanban only during transition, never as SSOT.
- Never call paid providers directly.

### Transcreation worker
Consumes GSC demand, DataForSEO SERP/Labs/content quality, GA4 page/event facts, existing page/product content, translation memory and locale policy.

Blocked: direct DataForSEO calls, publish/hreflang/sitemap exposure without verification gate, repeated locale/entity work already in measurement without materially new evidence.

### Campaign optimizer worker
Consumes Google Ads/Meta/TikTok read-only paid facts, GA4 conversion/path facts, funnel/CRM facts, landing page facts and SEO vs paid overlap facts.

Blocked: direct provider API mutations, budget changes, campaign launch/pause/edit and conversion upload without approved conversion contract.

### Technical remediation worker
Consumes DataForSEO OnPage facts, GSC indexability facts, Clarity UX friction facts, site inventory and route metadata.

Blocked: live mutation if required profile is BLOCKED, changes without rollback/snapshot path, repeated fix after smoke failure until root cause is corrected.

## Anti-Rework Gate
- same evidence_fingerprint + same action_key -> coalesce/skip
- published and still in measurement window -> skip
- outcome won -> do not repeat; create scale candidate only
- outcome lost -> block pattern until skill/facts changed
- rollback/smoke failed -> block until root cause fixed
- materially new provider evidence -> reopen linked to prior item

## Beta Runtime
```text
pg_cron / scheduled job / Neo-triggered approved task
  -> Bukeer Studio internal provider-run endpoint or Node runner
  -> registry lookup
  -> freshness/budget/approval gate
  -> existing provider script
  -> provider cache
  -> normalizer(s)
  -> growth_profile_runs ledger
  -> context packet builder
  -> worker task assignment
```

Implementation notes:
- Do not rewrite existing Node/TS provider scripts into Supabase Edge Functions in first beta unless audit proves it is cheaper.
- Cloudflare Workers should not host long-running provider jobs in request lifecycle.
- Use internal Node runner, job endpoint, GitHub Action, or Hermes tool host with Supabase ledger writes.
- Hermes can trigger/supervise approved tasks, but operational result must land in Supabase and GitHub issues.

## Acceptance Criteria
- [ ] Audit document maps epics, migrations, scripts, tables, workers and gaps.
- [ ] Spec v2 is linked from docs/INDEX.md.
- [ ] #521 has direction-change comment linking spec and beta plan.
- [ ] #471/#310/#460/#441/#502 receive traceability comments where relevant.
- [ ] Provider profile contract covers SEO, analytics, UX and paid media.
- [ ] Context packet contract defines freshness, facts, previous actions and blocked actions.
- [ ] Worker contracts explicitly block direct provider API calls.
- [ ] Runtime plan reuses existing scripts first and documents Cloudflare/Node constraints.
- [ ] Technical validation reports PASS/WATCH/BLOCKED.
- [ ] No secrets or raw PII are committed.

## Open Questions
1. Should #521 be renamed to Neo/Hermes Provider Profile Beta or should a new child epic own this v2 scope?
2. Should growth_google_ads_cache / growth_meta_ads_cache be created in bukeer-flutter first, or can beta start with read-only artifacts + growth_profile_runs rows?
3. Which runner host is preferred for beta: Hermes tool host, Bukeer Studio internal Node runner, GitHub Actions scheduled job, or Supabase-triggered endpoint?
4. Which first worker is certified against context packets: transcreation, technical remediation, or campaign optimizer read-only?
