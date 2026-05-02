# SPEC: Growth OS Symphony Orchestrator

Status: Draft implementable for EPIC #310 / SPEC #337  
Tenant baseline: ColombiaTours (`colombiatours.travel`)  
Created: 2026-05-01  
Owner: Growth OS Orchestrator + Council  
Canonical execution: [#310](https://github.com/weppa-cloud/bukeer-studio/issues/310)  
Related SPECs: [SPEC_GROWTH_OS_SSOT_MODEL](./SPEC_GROWTH_OS_SSOT_MODEL.md), [SPEC_GROWTH_OS_AGENT_LANES](./SPEC_GROWTH_OS_AGENT_LANES.md), [SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER](./SPEC_GROWTH_OS_UNIFIED_BACKLOG_AND_PROFILE_RUN_LEDGER.md), [SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX](./SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md)

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

| Decision | Rule                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| D1       | Every run is scoped by `account_id + website_id + agent_lane + source_table + source_id`.                      |
| D2       | No tenant scope means no run, no prompt, no tool call, and no artifact.                                        |
| D3       | VPS is the initial runtime; Docker is mandatory.                                                               |
| D4       | Bukeer Studio owns the operational UI for agents, tools, reviews, tasks and experiments.                       |
| D5       | `auto_apply` remains disabled until evaluator agreement is `>= 0.90` for the lane.                             |
| D6       | Content, transcreation, paid mutation and experiment activation always require human/Curator/Council approval. |
| D7       | Shared DB migrations are traced through `bukeer-flutter` as the operational SSOT for Supabase schema.          |

## Runtime Target

Initial runtime:

```text
VPS runtime
user: bukeer
ssh key: ~/Documents/Proyectos/ssh/id_rsa1
host: 87.99.153
status: needs validation; the supplied host appears to be an incomplete IPv4 address
```

The VPS runs Docker Compose. It must not store raw provider payloads or secrets
in GitHub or repo files.

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
agreement_threshold = 0.90
max_active_experiments = 5
```

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

Route:

```text
/dashboard/[websiteId]/growth
```

MVP tabs:

| Tab             | Reads                                             | Purpose                                                                          |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Overview        | agent definitions, runs, backlog, provider health | Show operational health, counts, agreement score and blockers.                   |
| Agents          | definitions, permissions, context packs           | Enable/disable agents and inspect mode, tools, thresholds and workflow versions. |
| Backlog by Lane | backlog items, content tasks, experiments         | Operate work by lane, status, next action and Council readiness.                 |
| Reviews & Runs  | agent runs/events, AI reviews, human reviews      | Compare AI vs human decisions and inspect artifacts/logs.                        |

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

## Acceptance Criteria

- #310 links this SPEC and the new child issues.
- Shared migrations exist in `bukeer-flutter` before production use.
- VPS runtime has Docker Compose, health check, logs and secrets outside repo.
- `growth_agent_runs` and `growth_agent_run_events` record a dry-run agent task.
- Bukeer Studio Growth UI MVP reads tenant-scoped operational data.
- Playwright UI contract exists and is enabled only when the UI is shipped.
- No `auto_apply` is possible while agreement remains below `0.90`.
