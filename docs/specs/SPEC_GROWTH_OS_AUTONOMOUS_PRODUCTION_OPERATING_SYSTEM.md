# SPEC: Growth OS Autonomous Production Operating System

## GitHub Tracking

- **Epic Issue**: [#441](https://github.com/weppa-cloud/bukeer-studio/issues/441)
- **Parent Epic**: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)
- **Control Plane Epic**: [#431](https://github.com/weppa-cloud/bukeer-studio/issues/431)
- **Child Issues**: [#442](https://github.com/weppa-cloud/bukeer-studio/issues/442), [#443](https://github.com/weppa-cloud/bukeer-studio/issues/443), [#444](https://github.com/weppa-cloud/bukeer-studio/issues/444), [#445](https://github.com/weppa-cloud/bukeer-studio/issues/445), [#446](https://github.com/weppa-cloud/bukeer-studio/issues/446), [#447](https://github.com/weppa-cloud/bukeer-studio/issues/447), [#448](https://github.com/weppa-cloud/bukeer-studio/issues/448), [#449](https://github.com/weppa-cloud/bukeer-studio/issues/449), [#450](https://github.com/weppa-cloud/bukeer-studio/issues/450), [#451](https://github.com/weppa-cloud/bukeer-studio/issues/451), [#470](https://github.com/weppa-cloud/bukeer-studio/issues/470)
- **Milestone**: ColombiaTours Growth OS production autonomy
- **Area**: growth + runtime + supabase + studio + ops

## Status

- **Author**: Codex + Growth OS Orchestrator
- **Date**: 2026-05-08
- **Status**: Accepted for execution
- **Related Specs**: [[SPEC_GROWTH_OS_PAPERCLIP_AUTONOMOUS_CEO_COCKPIT]], [[SPEC_GROWTH_OS_RUNTIME_8_5_HERMES_INSPIRED]], [[SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR]], [[SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER]], [[SPEC_GROWTH_OS_SSOT_MODEL]]
- **ADRs referenced**: ADR-003, ADR-005, ADR-007, ADR-009, ADR-010, ADR-013, ADR-018, ADR-021, ADR-029
- **Cross-repo impact**: Supabase remains shared with `weppa-cloud/bukeer-flutter`; schema or RLS migrations must follow [[supabase-migration-governance]]. Runtime writes are service-role only.

## Summary

Close Growth OS as a production autonomous operating system for ColombiaTours. The system must run a real recurrent production cycle:

`refresh profiles -> discover candidates -> promote work items -> claim runs -> create change sets -> gate -> execute adapters -> record outcomes -> learn`

The target state is not another dashboard or dry-run planner. Growth OS must autonomously create content, publish organic work, merge approved transcreations, apply reversible technical SEO fixes, measure outcomes and improve agent skills/tools when all production gates pass. Paid media, pricing, availability, reservations, payments, bulk CRM mutation and outreach sends remain blocked in v1.

## Relationship To #310 And #431

[#310](https://github.com/weppa-cloud/bukeer-studio/issues/310) remains the strategic Growth OS parent: North Star, AARRR model, Growth Council, provider facts, attribution and portfolio governance.

[#431](https://github.com/weppa-cloud/bukeer-studio/issues/431) remains the Paperclip-style CEO cockpit and control plane: CEO visibility, agent company UI, autonomy feed, impact ledger, risk/budget panels, workboard and rollback controls.

This SPEC is the production execution closure. It owns the scheduler, VPS/runtime loop, end-to-end orchestrator, fresh data contracts, outcome evaluator, learning loop, security hardening and certification evidence that make #310/#431 operational in production.

## Product Decisions

| Decision | Rule |
| --- | --- |
| Initial tenant | ColombiaTours only. |
| Runtime posture | Production live-gated, not dry-run-only. |
| Primary queue | `growth_work_items.status='ready'`. |
| Allowed autonomous action classes | `content_publish`, `transcreation_merge`, `safe_apply`. |
| Always blocked action classes | `paid_mutation`, `experiment_activation`, `outreach_send`, pricing, availability, reservations, payments, bulk CRM mutation. |
| Runtime owner | Server/runtime service role. Browser clients never write Growth runtime tables directly. |
| Human role | CEO/admin controls kill switch, caps, rollback, skill/memory activation and final certification sign-off. |
| Learning posture | Runtime can propose memories/skills and replay cases. Human/admin activation remains required in v1. |
| Certification posture | Local QA/E2E plus production execution with real ColombiaTours data is mandatory before closing the epic. |

## Current State

Already shipped by #431 and the live-gated autonomy sprint:

- CEO cockpit, Workboard and Agents surfaces exist.
- `growth_autonomy_policies`, `growth_publication_jobs`, `growth_work_item_outcomes` and `growth_work_items` are available.
- Live-gated adapters can publish/apply organic or reversible technical work with policy, caps, smoke, rollback and outcome ledger.
- Production certification evidence exists for the initial live-gated execution path.

Remaining gap:

- The system still needs a real recurrent scheduler/runtime deployment, closed-loop profile refresh, automated candidate discovery, due outcome evaluation, UI-backed controls, stronger quality gates, skill replay/approval operations, RLS hardening and production certification as a repeatable runbook.

## User Flows

### Flow 1: Production Cycle Runs Without CEO Intervention

1. Scheduler starts a ColombiaTours cycle on the production runtime.
2. Runtime records a cycle ledger entry with SHA, environment, account, website and step timings.
3. Runtime refreshes profiles from GSC, GA4, DataForSEO, public crawl, existing Growth ledgers and funnel events.
4. Runtime discovers opportunity candidates and blocks any candidate with stale profile, missing target, missing metric or missing rollback expectation.
5. Runtime promotes qualified candidates to `growth_work_items.ready`.
6. Orchestrator claims ready work, creates or links `growth_agent_runs`, produces `growth_agent_change_sets`, evaluates autonomy gates and executes adapters only when allowed.
7. Runtime writes publication jobs, outcomes, tool calls, run events and learning candidates.
8. Cycle finishes with counts for discovered, promoted, published/applied, blocked, rolled back, outcomes due and learning proposals.

### Flow 2: CEO Controls Production Risk

1. CEO opens the Growth OS cockpit.
2. CEO sees North Star progress, active runtime cycle, agents, live publications, blocked work, caps, smoke failures, rollback readiness and outcome status.
3. CEO toggles global kill switch, pauses a lane, changes dry-run/live mode for a policy, adjusts caps or launches rollback.
4. New publish-capable work stops immediately when kill switch or caps block execution.
5. UI shows the policy verdict that blocked or allowed each job.

### Flow 3: Organic Publication

1. Content lane receives a ready work item with fresh profile snapshot, target, evidence, baseline, `success_metric` and `evaluation_window`.
2. Agent creates a content change set for `website_blog_posts` or `website_pages`.
3. Gate checks policy, caps, freshness, risk, target allowlist, editorial quality, smoke plan, rollback plan and no-paid invariant.
4. Adapter snapshots target, applies production change, smokes public route, revalidates affected route and creates outcome.
5. Work item becomes `published_applied`; outcome becomes `measuring`.

### Flow 4: Transcreation Merge

1. Transcreation lane claims a localized work item with source locale, target locale, quality evidence and target row.
2. Gate requires locale mismatch, approved glossary/TM context, quality pass, rollback payload, smoke route and no pricing/payment fields.
3. Adapter applies the existing `lib/seo/transcreate-workflow.ts` merge path.
4. Public localized route is smoke-tested and linked to outcome measurement.

### Flow 5: Technical Safe Apply

1. Technical remediation lane claims a work item with a reversible patch and target allowlist.
2. Gate requires `safe_apply`, allowed table, allowed fields, before snapshot, rollback payload, immediate smoke and risk cap.
3. Adapter applies only bounded SEO/renderer/content metadata changes.
4. Smoke pass moves the item to `published_applied`; smoke fail triggers rollback and blocks the item.

### Flow 6: Outcome Evaluator Closes The Loop

1. Scheduler finds due `growth_work_item_outcomes`.
2. Evaluator fetches current metric snapshots from GSC, GA4 and `funnel_events`.
3. Outcome is marked `won`, `lost`, `inconclusive`, `scale` or `stop` with evidence and attribution confidence.
4. Repeated patterns create draft memories, draft skills and replay cases.
5. Skills can become active only after replay agreement is `>=0.90` and admin approval.

### Flow 7: Rollback

1. CEO/admin opens a publication job.
2. UI shows before snapshot, after payload, rollback payload, target locator, smoke evidence and impacted route.
3. Admin triggers rollback.
4. Server action calls the adapter rollback path, revalidates route, writes new smoke result and updates job/work item/outcome.
5. Failed rollback becomes a P0 operational incident with manual instructions in the job evidence.

## Implementation Contract

### Scheduler

Implement a production scheduler entry point:

- `runGrowthOsProductionCycle(accountId, websiteId, options)`
- Must be executable by cron on VPS and manually by an admin-only server action.
- Must be idempotent per `(website_id, cycle_window, lane)` to avoid duplicate publishing.
- Must record cycle start, finish, SHA, environment, step counts and failure evidence.
- Must respect global kill switch before claim and before apply.

Required cycle steps:

1. `refreshGrowthProfiles(accountId, websiteId)`
2. `discoverGrowthOpportunityCandidates(accountId, websiteId)`
3. `promoteGrowthOpportunityCandidates(accountId, websiteId)`
4. `claimGrowthWorkItem(accountId, websiteId, lane)`
5. `runGrowthAgentForWorkItem(workItemId)`
6. `evaluateGrowthAutonomyExecution(input)`
7. `executeGrowthPublicationJob(input)`
8. `recordGrowthOutcomes(publicationJobId)`
9. `evaluateDueGrowthOutcomes(accountId, websiteId)`
10. `summarizeGrowthAgentOptimization(accountId, websiteId)`

### Orchestrator

- `growth_work_items.status='ready'` is the primary claim source.
- Claim changes status `ready -> running`, creates or links `growth_agent_runs`, assigns lane and stores `run_id`.
- Agent output must produce a `growth_agent_change_sets` row before any mutation.
- Work item must store `change_set_id` before gate execution.
- Terminal states are `published_applied`, `blocked`, `rolled_back`, `measuring`, `done`.
- No adapter may apply changes directly from free-form agent text; all writes must use validated payloads.

### Profile Freshness And Candidate Discovery

- Revalidate profile freshness immediately before promotion and immediately before live apply.
- Candidate promotion requires:
  - `candidate_id` in `growth_work_items.evidence`;
  - fresh profile snapshot;
  - target table/id or create target locator;
  - baseline;
  - `success_metric`;
  - `evaluation_window`;
  - expected rollback class;
  - evidence and score.
- Candidate is blocked with a reason when any required field is missing.

#### DataForSEO Provider Profile Bridge

DataForSEO is part of the fresh-data contract for SEO, content and technical lanes. The production runtime must not treat it as a vague external source; it must consume explicit provider evidence from approved profile/cache runs and project it into runtime profiles before candidate creation.

Required runtime projection:

- `seo_market.payload.dataforseo_snapshot`
- `competitor.payload.dataforseo_snapshot`

Each snapshot must include:

- `provider='dataforseo'`;
- `feature_profile` such as `onpage`, `serp`, `labs_keywords`, `content_analysis`, `domain_analytics` or `ai_optimization`;
- `fetched_at` and `expires_at`;
- source `cache_ids` or provider profile run ids;
- endpoint family, market, locale and target URL/query scope;
- row counts and evidence counts;
- access status: `available`, `missing_access`, `cost_gated`, `stale`, `empty` or `blocked`;
- blocker reasons when the snapshot cannot be used.

Runtime rules:

- Technical `safe_apply` work that depends on crawl evidence requires a fresh DataForSEO OnPage snapshot or an equivalent technical crawl fact. Missing or stale crawl evidence blocks promotion or downgrades the item to WATCH.
- `content_publish` work that depends on keyword, SERP or competitor evidence requires a fresh DataForSEO Labs/SERP/Content Analysis snapshot or an explicit strategic exception in candidate evidence.
- `transcreation_merge` work that depends on market-localized keyword or SERP fit requires a target-locale DataForSEO snapshot or an explicit no-go/exception reason.
- Runtime adapters must not make new paid DataForSEO calls during apply. Provider refresh happens before discovery; the live-gated executor consumes cached/profile-run evidence only.
- When DataForSEO access is unavailable, stale, cost-gated or empty, the brain/discovery layer must record a blocked decision, policy recommendation or WATCH candidate instead of inventing evidence.

Freshness defaults:

- OnPage/technical evidence: fresh for 7 days, or immediately stale after a target route changes until a post-change crawl/smoke equivalent exists.
- SERP/Labs/content evidence: fresh for 30 days for planning, but must be refreshed or explicitly excepted when a publication depends on a primary query snapshot older than 72 hours.
- Competitor/domain evidence: fresh for 30 days unless the target query/page is in an active remediation or launch window.
- Cache `expires_at` wins over default TTLs when stricter.

UI and certification requirements:

- Growth cockpit/Data Health must show DataForSEO freshness, access status, feature profile and blocker reason for ColombiaTours.
- Production certification must include at least one ColombiaTours decision, candidate or no-go reason citing DataForSEO evidence.

### Autonomy Gate

One evaluator owns all runtime decisions: `evaluateGrowthAutonomyExecution(input)`.

Gate must block:

- `paid_mutation`, `experiment_activation`, `outreach_send`.
- Pricing, availability, reservation, payment and bulk CRM mutations.
- Stale or missing profiles.
- Missing rollback, smoke plan, baseline, `success_metric` or `evaluation_date`.
- Target table or field outside allowlist.
- Caps exceeded.
- Kill switch or paused lane.
- Editorial quality below threshold.
- Skill activation when replay agreement is `<0.90`.

Gate may allow:

- `content_publish` for `content_creator` or `content_curator` to `website_blog_posts` and `website_pages`.
- `transcreation_merge` for the `transcreation` lane through the existing transcreation workflow.
- `safe_apply` for `technical_remediation` to allowed SEO/content metadata fields on `website_pages`, `website_sections` and `product_seo_overrides`.

### Publisher And Technical Adapters

Every adapter must:

1. Validate typed payload.
2. Snapshot before state.
3. Insert `growth_publication_jobs` in `applying`.
4. Apply production mutation.
5. Revalidate affected route.
6. Run smoke.
7. On pass, mark `published` or `applied` and create/update outcome.
8. On fail, rollback immediately, re-smoke and mark `rolled_back`.

### Outcome Evaluator

Evaluation windows:

- SEO content: day 21 and day 45.
- Technical SEO: immediate smoke, day 7 and day 28.
- CRM/funnel: day 1, day 7 and day 30.

Outcome statuses:

- `measuring`
- `won`
- `lost`
- `inconclusive`
- `scale`
- `stop`

Outcome evidence must include baseline, current metric snapshot, attribution status, confidence and recommendation.

### Agent, Skills And Tools Management

- Runtime logs every tool call with `policy_verdict`, `allowed`, cost, latency, output reference and outcome.
- Optimization loop computes lane health: success rate, smoke failures, blocked tools, stale skills, replay pass/fail, cost and throughput.
- Repeated successful patterns create draft memories/skills.
- Draft skills require replay agreement `>=0.90` and admin approval to become active.
- Admin can activate, deprecate or reject skills and memories from the Agents UI.
- No auto-activation of skills in v1.

### UI Scope

The existing #431 UI remains the base, but this epic must complete production controls:

- CEO cockpit: active cycle, objective, agents, publication feed, outcomes, caps, risk and kill switch.
- Workboard: `ready`, `running`, `published_applied`, `blocked`, `rolled_back`, `measuring`.
- Agents UI: skills active/draft/deprecated, replay cases, blocked tools, costs, throughput and recommendations.
- Policy UI: kill switch, lane pause, dry-run/live toggle, caps and required checks.
- Rollback UI: before/after/rollback/smoke evidence and one-click rollback.

### Data Contracts

Reuse existing tables:

- `growth_autonomy_policies`
- `growth_publication_jobs`
- `growth_work_item_outcomes`
- `growth_work_items`
- `growth_opportunity_candidates`
- `growth_agent_runs`
- `growth_agent_change_sets`
- `growth_agent_memories`
- `growth_agent_skills`
- `growth_agent_tool_calls`
- `growth_agent_replay_cases`

Add only one required runtime ledger table if not already available:

#### `growth_runtime_cycles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key. |
| `account_id` | uuid | Tenant scope. |
| `website_id` | uuid | Website scope. |
| `environment` | text | `local`, `qa`, `staging`, `production`. |
| `git_sha` | text | Runtime version. |
| `started_at` | timestamptz | Required. |
| `finished_at` | timestamptz nullable | Set on terminal state. |
| `status` | text | `running`, `completed`, `completed_with_blocks`, `failed`. |
| `steps` | jsonb | Step timings and per-step status. |
| `counts` | jsonb | discovered/promoted/claimed/published/blocked/rolled_back/outcomes/learning. |
| `failure_evidence` | jsonb nullable | Errors and stack-safe context. |
| `created_at`, `updated_at` | timestamptz | Standard timestamps. |

RLS must use `user_roles` tenant membership for reads and service-role/server-only writes.

## Acceptance Criteria

- [ ] AC1: Production scheduler runs recurrently for ColombiaTours and records a cycle ledger.
- [ ] AC2: Orchestrator claims from `growth_work_items.ready` and links work item -> run -> change set -> publication job -> outcome.
- [ ] AC3: Fresh profiles are revalidated before candidate promotion and before live apply.
- [ ] AC4: Candidate discovery creates scored candidates from fresh data and blocks incomplete candidates with reasons.
- [ ] AC5: Organic content publish runs live only through adapters and creates snapshot, smoke, rollback and outcome.
- [ ] AC6: Transcreation merge runs live only through quality-gated transcreation workflow and creates snapshot, smoke, rollback and outcome.
- [ ] AC7: Technical `safe_apply` runs live only for allowed targets/fields and creates snapshot, smoke, rollback and outcome.
- [ ] AC8: Paid, pricing, availability, reservations, payments, bulk CRM mutation and outreach sends are blocked in all v1 paths.
- [ ] AC9: Outcome evaluator marks due outcomes `won`, `lost`, `inconclusive`, `scale` or `stop` with evidence.
- [ ] AC10: Kill switch, caps, dry-run/live toggle and lane pause are visible and enforce runtime behavior.
- [ ] AC11: Rollback UI restores a real job or verifies dry rollback with production payload evidence.
- [ ] AC12: Editorial quality gates block thin, unsafe, off-brand, duplicate, hallucinated or unsupported content.
- [ ] AC13: Learning loop proposes memories/skills/replay cases and blocks skill activation when replay agreement is `<0.90`.
- [ ] AC14: RLS denies cross-tenant reads and runtime writes require service role.
- [ ] AC15: Production certification report proves at least one organic publish, one transcreation merge, one technical safe apply, one outcome evaluation, one rollback or dry rollback, paid block and RLS tenant isolation.
- [ ] AC16: DataForSEO provider evidence is explicit in runtime profiles, gates stale/missing provider snapshots, and is visible in Growth OS data health.

## Test And Certification Plan

### Unit

- Gates block paid/pricing/payments/reservations/availability/CRM/outreach.
- Stale profiles block promotion and live apply.
- Stale, missing, cost-gated or empty DataForSEO snapshots block provider-dependent promotion and live apply.
- Caps and kill switch block new jobs.
- Editorial gate blocks thin, unsafe and unsupported content.
- Missing baseline, metric, evaluation date, smoke or rollback blocks apply.
- `safe_apply` blocks target tables and fields outside allowlist.
- Replay agreement `<0.90` blocks skill activation.

### Integration

- Candidate -> work item -> run -> change set -> publication job -> outcome.
- DataForSEO cache/profile evidence -> runtime profile snapshot -> candidate -> work item.
- Smoke fail -> rollback -> job `rolled_back` -> work item `blocked`.
- `dry_run_only=true` creates dry-run-ready evidence without public mutation.
- `dry_run_only=false` applies production mutation through adapter and revalidates route.
- Outcome evaluator marks due rows `won`, `lost` or `inconclusive`.
- Skill draft -> replay pass -> admin approve -> active.
- Tool calls are ledgered when allowed and when blocked.

### E2E

Use the session pool only.

- CEO cockpit shows objective, agents, publications, outcomes, caps and risk.
- Growth data health shows DataForSEO feature profile freshness, access status and blockers.
- Workboard shows `published_applied`, `blocked`, `rolled_back` and `measuring`.
- Agents UI approves/rejects skills and memories.
- Kill switch blocks new publication-capable work.
- Rollback UI restores a job or verifies dry rollback with production payload.
- Mobile viewport has no overflow in cockpit, workboard, agents and rollback views.

### Supabase/RLS

- Service role writes runtime, publication, outcome, skill and tool ledgers.
- Authenticated user reads only own tenant via `user_roles`.
- Cross-tenant read fails.
- Browser/client direct writes to Growth runtime tables fail.
- Supabase advisors have no new critical findings for touched Growth tables.

### Production Certification

Create `docs/growth-sessions/<date>-growth-os-autonomous-production-certification.md` with:

- Runtime SHA and environment.
- Production account/website identifiers.
- Cycle ledger id.
- One organic publication visible publicly.
- One transcreation merge visible publicly.
- One technical safe apply visible publicly or with route smoke evidence.
- One immediate outcome evaluated.
- One rollback executed or dry rollback verified with real payload.
- Paid mutation blocked with policy verdict.
- RLS tenant isolation evidence.
- Links to publication jobs, work items, outcomes and screenshots/logs.

## GitHub Issue Breakdown

- Epic: [#441 `Growth OS Autonomous Production Operating System`](https://github.com/weppa-cloud/bukeer-studio/issues/441)
- Child 1: [#442 `Scheduler real and production runtime loop`](https://github.com/weppa-cloud/bukeer-studio/issues/442)
- Child 2: [#443 `Orchestrator end-to-end work item execution`](https://github.com/weppa-cloud/bukeer-studio/issues/443)
- Child 3: [#444 `Fresh profile and data refresh`](https://github.com/weppa-cloud/bukeer-studio/issues/444)
- Child 4: [#445 `Opportunity candidate discovery`](https://github.com/weppa-cloud/bukeer-studio/issues/445)
- Child 5: [#446 `Outcome evaluator and impact ledger automation`](https://github.com/weppa-cloud/bukeer-studio/issues/446)
- Child 6: [#447 `CEO controls: kill switch, caps, dry-run and rollback`](https://github.com/weppa-cloud/bukeer-studio/issues/447)
- Child 7: [#448 `Editorial and product content quality gates`](https://github.com/weppa-cloud/bukeer-studio/issues/448)
- Child 8: [#449 `Learning loop closure: replay, skills and memories`](https://github.com/weppa-cloud/bukeer-studio/issues/449)
- Child 9: [#450 `Growth RLS and service-role hardening`](https://github.com/weppa-cloud/bukeer-studio/issues/450)
- Child 10: [#451 `Production QA/E2E certification with ColombiaTours data`](https://github.com/weppa-cloud/bukeer-studio/issues/451)
- Child 11: [#470 `DataForSEO provider profiles into live-gated runtime context`](https://github.com/weppa-cloud/bukeer-studio/issues/470)

## Non-Goals

- No paid budget/campaign mutation in v1.
- No pricing, availability, reservations, payments or mass CRM writes.
- No generic browser/client writes into runtime tables.
- No automatic activation of skills or memories in v1.
- No multi-tenant rollout before ColombiaTours production certification is complete.

## Open Questions

- Exact VPS scheduler cadence: hourly, twice daily or daily for each lane.
- Whether production certification should require a real rollback or accept dry rollback for newly published organic content that the CEO wants to keep live.
- Whether `growth_runtime_cycles` belongs in Studio migrations or Flutter-owned Supabase migration flow for first application.
