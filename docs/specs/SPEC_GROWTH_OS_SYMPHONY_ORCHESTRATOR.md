# SPEC: Growth OS Symphony Orchestrator

Status: Draft implementable for EPIC #310 / SPEC #337  
Tenant baseline: ColombiaTours (`colombiatours.travel`)  
Created: 2026-05-01  
Last revised: 2026-05-01 (post-audit — added contract-first gate, SSOT relationship, lane-level autonomy semantics, sprint scope clarification, #256 interlock, ADR matrix)  
Owner: Growth OS Orchestrator + Council  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Child issues: [#402](https://github.com/weppa-cloud/bukeer-studio/issues/402) · [#403](https://github.com/weppa-cloud/bukeer-studio/issues/403) · [#404](https://github.com/weppa-cloud/bukeer-studio/issues/404) · [#405](https://github.com/weppa-cloud/bukeer-studio/issues/405) · [#406](https://github.com/weppa-cloud/bukeer-studio/issues/406) · [#407](https://github.com/weppa-cloud/bukeer-studio/issues/407) · [#408](https://github.com/weppa-cloud/bukeer-studio/issues/408) · [#409](https://github.com/weppa-cloud/bukeer-studio/issues/409)  
Related SPECs: [SPEC_GROWTH_OS_SSOT_MODEL](./SPEC_GROWTH_OS_SSOT_MODEL.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER](./SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md), [SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX](./SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md), [SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md)

## Purpose

Define a Symphony-style autonomous orchestration layer for Growth OS. The
system uses long-running cloud/VPS agents, isolated workspaces, explicit
workflow files, run ledgers, events, and human approval gates.

Official rule:

```text
Supabase/Bukeer Studio = operational control plane
GitHub/#310 = implementation control plane
VPS Docker runtime = agent execution plane
Artifacts = reproducible evidence
Council = experiment approval
```

The design adapts the Symphony concept to Bukeer Studio's multi-tenant Growth
OS: the issue tracker is not the live operational queue. Supabase is the live
queue; GitHub receives implementation summaries and gate decisions.

## Decisions

| Decision | Rule                                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1       | Every run is scoped by `account_id + website_id + agent_lane + source_table + source_id`.                                                                                                             |
| D2       | No tenant scope means no run, no prompt, no tool call, and no artifact.                                                                                                                               |
| D3       | VPS is the initial runtime; Docker is mandatory.                                                                                                                                                      |
| D4       | Bukeer Studio owns the operational UI for agents, tools, reviews, tasks and experiments.                                                                                                              |
| D5       | `auto_apply` is computed and locked **per lane**. A lane unlocks for `auto_apply_safe` only when (a) lane-level evaluator agreement `>= 0.90`, (b) policy version current, (c) smoke contract passes. |
| D6       | Content, transcreation, paid mutation and experiment activation are **always** human/Curator/Council gated, regardless of agreement score.                                                            |
| D7       | Shared DB migrations are traced through `bukeer-flutter` as the operational SSOT for Supabase schema.                                                                                                 |
| D8       | No child issue (#402–#409) moves to `in_progress` until the matching Zod schema in `@bukeer/website-contract/src/growth/agent-*.ts` is published (ADR-003 + ADR-008).                                 |
| D9       | `growth_agent_runs` is the **runtime ledger** for agent execution; `growth_profile_runs` remains the **profile ledger** for Unified Backlog refresh cycles. Both coexist (see SSOT Relationship).     |
| D10      | Sprint completion = Symphony `OPERATIONAL`. It does **not** by itself move #310 to `PASS`; #310 PASS still requires #312/#313/#322/#336 outcomes.                                                     |

## Contract-First Gate (ADR-003 + ADR-008)

Per [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310) Epic acceptance criteria, no child issue moves to `in_progress` until its matching Zod schema is published in `@bukeer/website-contract/src/growth/`. Symphony introduces five new shared schemas:

| Zod schema file                            | Owner issue | Consumers                                               |
| ------------------------------------------ | ----------- | ------------------------------------------------------- |
| `schemas/growth-agent-definitions.ts`      | #403        | Orchestrator (#404), Studio UI Agents tab (#405)        |
| `schemas/growth-agent-tool-permissions.ts` | #403        | Orchestrator (#404), tool wrappers, budget enforcement  |
| `schemas/growth-agent-context-packs.ts`    | #403        | Prompt assembly (#404), Studio context inspector (#405) |
| `schemas/growth-agent-runs.ts`             | #403        | Orchestrator (#404), Studio Reviews & Runs (#407), E2E  |
| `schemas/growth-agent-run-events.ts`       | #403        | Orchestrator (#404), Studio Reviews & Runs (#407), E2E  |

> Path convention: existing growth schemas (`growth-attribution.ts`, `growth-events.ts`, `growth-inventory.ts`) live as flat files under `packages/website-contract/src/schemas/` with a `growth-` prefix. New Symphony schemas follow the same pattern.

Decision rule (ADR-008):

```text
Cross-repo consumers (Studio + bukeer-flutter agents) → schemas live in
@bukeer/website-contract/src/growth/. Studio-only helpers may live in
lib/growth/. Default location is the contract package.
```

This gate is **Day-0** of the implementation sprint. #402–#409 stay in `todo` until the five schema files merge and propagate via `transpilePackages`.

## Runtime Target

Initial runtime: VPS with Docker Compose. Connection details are stored in the operator handbook, **not in this SPEC**, to avoid leaking partial host data into git history. Action item: VPS host + SSH key custody documented in `/opt/growth-os/secrets/` ownership doc and referenced from #402.

Required runtime properties:

- Docker Compose with healthcheck for `app` worker.
- Workspaces and artifacts namespaced by tenant + run id (no shared mount).
- Secrets mounted read-only from `/opt/growth-os/secrets/growth-orchestrator.env` (file mode `0400`).
- Logs ship to centralized observability (provider TBD in #402); no PII or raw provider payload in stdout.
- No raw provider payload, secret, or PII committed to GitHub or repo files.

Recommended layout:

```text
/opt/growth-os/
├── app/bukeer-studio
├── workspaces/{account_id}/{website_id}/{run_id}
├── artifacts/{account_id}/{website_id}/{run_id}
├── logs
├── secrets/growth-orchestrator.env
└── docker-compose.yml
```

## Control Plane Tables

New shared tables, to be migrated from `bukeer-flutter`:

| Table                           | Purpose                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `growth_agent_definitions`      | Agent registry by account, website and lane. Stores enabled state, mode, model, prompt/workflow version, thresholds and concurrency.                       |
| `growth_agent_tool_permissions` | Per-agent tool policy: read/write, approval requirement and budget cap for Supabase, GSC, GA4, DataForSEO, GitHub, Browser/Playwright, CRM and paid tools. |
| `growth_agent_context_packs`    | Versioned tenant context: project preferences, markets, tone, content rules, examples, rejected patterns and learned decisions.                            |
| `growth_agent_runs`             | Durable run ledger with claim, workspace, status, heartbeat, attempts, artifact path, error class and evidence.                                            |
| `growth_agent_run_events`       | Append-only run events for observability and debugging.                                                                                                    |

Existing operational tables remain in use:

- `growth_backlog_candidates`
- `growth_backlog_items`
- `growth_content_briefs`
- `growth_content_tasks`
- `growth_experiments`
- `growth_ai_reviews`
- `growth_human_reviews`
- `growth_profile_runs`

## SSOT Relationship — `growth_agent_runs` vs Unified Backlog

The Unified Backlog workstream ([#394](https://github.com/weppa-cloud/bukeer-studio/issues/394) Profile Run Ledger, [#395](https://github.com/weppa-cloud/bukeer-studio/issues/395), [#396](https://github.com/weppa-cloud/bukeer-studio/issues/396), [#397](https://github.com/weppa-cloud/bukeer-studio/issues/397), [#398](https://github.com/weppa-cloud/bukeer-studio/issues/398), [#399](https://github.com/weppa-cloud/bukeer-studio/issues/399)) already introduces `growth_profile_runs` as a refresh-cycle ledger. To avoid double SSOT, this SPEC fixes the boundary:

| Ledger                    | Records                                                                                          | Granularity                    | Owner                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ | ---------------------- |
| `growth_profile_runs`     | Backlog profile refresh cycles (Generator/Validator passes that materialize backlog candidates). | One row per profile refresh.   | Unified Backlog (#394) |
| `growth_agent_runs`       | Single agent invocation against a source row (claim, workspace, prompt, artifact, status).       | One row per claim by an agent. | Symphony (#403)        |
| `growth_agent_run_events` | Append-only events for one `growth_agent_runs` row.                                              | Many rows per agent run.       | Symphony (#403)        |

Linkage rule:

```text
A profile run can spawn N agent runs (one per claimed candidate).
growth_agent_runs.profile_run_id is nullable FK to growth_profile_runs.id.
A standalone agent run (not from backlog refresh) keeps profile_run_id = NULL.
```

Migration sequencing: #394 lands first (profile ledger exists), then #403 adds agent ledger with the optional FK. If #394 has not landed at sprint Day-0, #403 ships the FK column nullable and the FK constraint follows in a tracer migration once #394 merges.

## Agent Modes

| Mode              | Meaning                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `observe_only`    | Agent can evaluate and emit reviews/artifacts only.                                                                  |
| `prepare_only`    | Agent can prepare drafts, tasks, evidence and handoff, but cannot apply mutations.                                   |
| `auto_apply_safe` | Agent can apply only low-risk, reversible, smoke-verifiable technical actions after agreement and policy gates pass. |

Default for all tenants:

```text
mode = prepare_only
auto_apply_enabled = false
agreement_threshold = 0.90 (per lane, not global)
max_active_experiments = 5
```

## Lane-Level Autonomy Gate (#408)

`auto_apply` is decided per **lane** (per `SPEC_GROWTH_OS_AGENT_LANES.md` V1: five canonical lanes), not globally. Even when a lane reaches `agreement >= 0.90`, only `auto_apply_safe` actions become eligible. Certain **action classes** remain human/Council-gated regardless of lane or agreement score.

### Lanes (canonical, 5)

| Lane                    | At `agreement >= 0.90`                       | Always gated (action classes)                                          |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `orchestrator`          | `observe_only` (routing + gates only)        | All mutations — orchestrator never mutates business surfaces directly. |
| `technical_remediation` | `auto_apply_safe` (reversible, smoke-tested) | Schema/canonical/hreflang batch deletes — Curator required.            |
| `transcreation`         | `prepare_only` only                          | Locale merge / publish — Curator required.                             |
| `content_creator`       | `prepare_only` only                          | Publish — Curator required.                                            |
| `content_curator`       | `prepare_only` only                          | Council promotion / experiment activation — Council required.          |

### Cross-cutting action classes (always Council/Curator gated)

These are **policies**, not lanes. The autonomy gate consults them on every tool call:

- `paid_mutation` (campaign create/edit/budget) — Council required.
- `experiment_activation` (start/stop/scale) — Council required.
- `content_publish` — Curator required.
- `transcreation_merge` — Curator required.
- `outreach_send` (PR/backlinks/GBP edits) — Curator required.

Eligibility for `auto_apply_safe` requires all of:

```text
lane_agreement >= 0.90
AND policy_version == current
AND smoke_contract == PASS
AND action_class IN { reversible, low-risk, observable }
AND tenant.auto_apply_enabled == true (per-tenant kill switch)
```

### Agreement Baseline

Before #408 ships, the evaluator must produce a **lane-level** agreement artifact (file: `agreement-lane-<date>.json`) covering the last N evaluator decisions per lane, signed with policy version. If only a global score exists today, the first deliverable of #408 is to produce the lane breakdown — only then can the gate make sense. Any agreement number cited in #310 / sprint planning must reference a specific artifact path and date; ungrounded percentages are not admissible.

## Orchestration Flow

```text
eligible Supabase row
  -> claim lease
  -> growth_agent_runs row
  -> isolated workspace
  -> prompt from WORKFLOW.md + context pack + source facts
  -> agent execution
  -> run events + artifact
  -> growth_ai_reviews
  -> growth_human_reviews when approval/handoff is needed
  -> source row status update
```

The orchestrator must be fair across tenants:

```text
global concurrency cap
  -> per-tenant concurrency cap
  -> per-lane concurrency cap
  -> priority within tenant
```

## Bukeer Studio UI Scope

The runtime console is the technical substrate. The human-facing product
contract lives in
[SPEC_GROWTH_OS_CONTROL_PLANE_UX](./SPEC_GROWTH_OS_CONTROL_PLANE_UX.md). Studio
must translate agent ledgers and backlog rows into operator language: what needs
attention, why it matters, what evidence exists, who owns the next action and
what is safe to approve.

Route:

```text
/dashboard/[websiteId]/growth
```

**Interlock with [#250](https://github.com/weppa-cloud/bukeer-studio/issues/250) / [#256](https://github.com/weppa-cloud/bukeer-studio/issues/256):** the Growth console ships under the Designer Reference Theme surface. While #256 remains BLOQUEANTE, the Growth console may be developed behind a feature flag (`GROWTH_OS_UI_ENABLED=false` in production) but cannot be exposed on the ColombiaTours pilot UI surface until #256 unblocks. Internal staging access for council/curator/admin roles is allowed.

MVP tabs evolve into human control-plane surfaces:

| Tab            | Reads                                             | Purpose                                                                       |
| -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Command Center | agent definitions, runs, backlog, provider health | Show what needs attention now, blocked work, stale data and Council status.   |
| Agent Team     | definitions, permissions, context packs           | Inspect mission, mode, heartbeat, thresholds, work queue and safety rules.    |
| Opportunities  | backlog items, content tasks, experiments         | Operate reviewed opportunities by lane, status, blocker and next action.      |
| Review Queue   | agent runs/events, AI reviews, human reviews      | Decide review-required runs with explainable evidence and role-gated actions. |
| Experiments    | experiments, Council-ready backlog                | Separate active measured readouts from operational batches.                   |
| Data Health    | provider cache, profile usage, run health         | Inspect freshness, provider status, spend context and access blockers.        |

MVP actions:

- approve/reject AI review when user has role;
- move item to human review;
- mark blocked/watch with reason;
- promote Council-ready item only when gates pass;
- no direct content publish or paid mutation.

## Roles

| Role              | Permission                                          |
| ----------------- | --------------------------------------------------- |
| `viewer`          | Read Growth console.                                |
| `growth_operator` | Execute approved operational batches.               |
| `curator`         | Approve content/transcreation quality gates.        |
| `council_admin`   | Approve experiments and exceptions.                 |
| `account_admin`   | Configure agents, tools, budgets and context packs. |

## Security And Multi-Tenant Rules

- Every query and mutation must filter by `account_id + website_id`.
- Orchestrator uses service role, but application code must enforce tenant
  guards before every tool call.
- Workspaces and artifacts must be namespaced by tenant and run id.
- Prompts must not include cross-tenant examples unless anonymized and approved.
- Secrets live in `/opt/growth-os/secrets/growth-orchestrator.env` on VPS or in
  the future cloud secret manager.
- Logs and GitHub comments must not contain provider secrets, raw PII or raw
  provider payloads.

## E2E Contract

Create Playwright coverage for the future UI with an opt-in flag:

```text
GROWTH_OS_UI_E2E_ENABLED=true
```

The contract validates:

- Growth console route loads for a tenant.
- Overview, Agents, Backlog and Reviews/Runs surfaces are present.
- Rows are scoped to the selected `websiteId`.
- Agent configuration shows mode and agreement threshold.
- Protected actions are hidden or disabled for unauthorized users.
- Content/transcreation and paid actions require human approval.

## ADR Compliance

| ADR                                 | Verdict   | Notes                                                                                                   |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| ADR-001 Server-First Rendering      | PASS      | Growth console uses Server Components for initial reads.                                                |
| ADR-002 Error Handling              | PASS      | Orchestrator errors map to `error.code` envelope; `retryable` honored.                                  |
| ADR-003 Contract-First Validation   | PASS      | Five Zod schemas listed in Contract-First Gate; children blocked until merged.                          |
| ADR-008 Monorepo Packages           | PASS      | Schemas land in `@bukeer/website-contract` per cross-repo decision rule.                                |
| ADR-009 Multi-Tenant Routing        | PASS      | `account_id + website_id` mandatory on every table, query and tool call.                                |
| ADR-010 Observability               | PASS      | `growth_agent_run_events` is the canonical observability stream.                                        |
| ADR-012 API Response Envelope       | PASS      | All Studio API routes for the console use the standard `{ ok, data, meta }` / `{ ok, error }` envelope. |
| ADR-013 Tech Validator Quality Gate | TODO      | TVB (`tech-validator` MODE:TASK) required for #402–#409 before implementation.                          |
| ADR-016 SEO Intelligence Caching    | PASS      | Studio console reads from cache layer; no render-path calls to GSC/GA4/DataForSEO.                      |
| ADR-018 Webhook Idempotency         | PASS      | `growth_agent_runs.claim_id` is idempotency key for orchestrator restarts.                              |
| ADR-022 Auth/JWT                    | PASS      | UI uses Supabase SSR client; no direct JWT access.                                                      |
| ADR-027 Designer Reference Theme    | INTERLOCK | #256 BLOQUEANTE prevents pilot UI exposure; staging-only until unblock.                                 |

## Sprint Scope vs #310 PASS

This SPEC delivers **Symphony OPERATIONAL**: runtime, ledger, orchestrator, autonomy gate, Studio console MVP, E2E tenant-scope. It is necessary infrastructure for Growth OS but **not sufficient** for #310 PASS.

#310 PASS still requires:

- #312 / #313 — Technical SEO gate produces `PASS` or `PASS-WITH-WATCH`.
- #322 / #332 / #333 / #336 — Attribution, Meta + Chatwoot, Google Ads enhanced, TikTok Events API, privacy gate.
- #321 — Weekly Council reports North Star, qualified leads, quote sent, bookings.
- #256 unblock for pilot UI surface.

When the sprint closes, [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310) status update should read `Symphony OPERATIONAL; pilot remains GO-WITH-WATCH; PASS gated on #312/#313/#322/#336`.

## Acceptance Criteria

### Day-0 (before any child issue moves to in_progress)

- [ ] Five Zod schema files merged in `@bukeer/website-contract/src/growth/agent-*.ts`.
- [ ] TVBs (tech-validator MODE:TASK) generated for #402–#409.
- [ ] Labels applied to #402–#409: `epic-child`, `growth-os`, `priority-p1`, `needs-tvb`.
- [ ] SSOT decision documented: `growth_agent_runs.profile_run_id` FK relationship to `growth_profile_runs` (#394) confirmed or sequenced.
- [ ] Lane-level agreement baseline artifact produced; ungrounded percentages removed from planning docs.
- [ ] #310 body updated to enumerate #402–#409 under a "Symphony Runtime" workstream.

### Implementation

- [ ] Shared migrations exist in `bukeer-flutter` before production use; trace commit linked from #403.
- [ ] VPS runtime has Docker Compose, healthcheck, isolated workspaces per `account_id + website_id + run_id`, secrets read-only outside repo.
- [ ] `growth_agent_runs` and `growth_agent_run_events` record at least one dry-run agent task end-to-end with artifact path.
- [ ] Orchestrator respects global / per-tenant / per-lane concurrency caps and tenant fairness.
- [ ] Bukeer Studio Growth UI MVP reads tenant-scoped operational data through Server Components and `@bukeer/website-contract` schemas.
- [ ] Playwright UI contract exists, gated by `GROWTH_OS_UI_E2E_ENABLED=true`, enforces tenant scope and role-based action visibility.
- [ ] `auto_apply` cannot fire on any lane while lane-level agreement `< 0.90`; UI shows lane lock state and reason.
- [ ] Content / transcreation / paid mutation / experiment activation always require human/Curator/Council approval, regardless of agreement.

### Closure

- [ ] [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310) updated with `Symphony OPERATIONAL` status, evidence links and explicit reminder that PASS still depends on #312/#313/#322/#336.
- [ ] Pilot UI exposure on `colombiatours.travel` deferred until [#256](https://github.com/weppa-cloud/bukeer-studio/issues/256) unblocks.
