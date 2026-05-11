# Growth OS Effectiveness Benchmark - Human Codex Baseline

Date: 2026-05-11
Tenant: ColombiaTours
Account: `9fc24733-b127-4184-aa22-12f03b98927a`
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Objective

Measure whether Growth OS + Hermes isolated agents outperform a human/Codex
growth operator while every public mutation still goes through the same
live-gated Growth OS executor.

The comparison groups are:

- `baseline_human_codex`: human/Codex creates evidence-backed packets manually.
- `growth_os_deterministic`: existing deterministic discovery/runtime.
- `growth_os_hermes_isolated`: Hermes Chief of Staff + isolated lane agents.

## Contract Implemented

- New ledger tables:
  - `growth_effectiveness_experiments`
  - `growth_effectiveness_observations`
- New contract schemas:
  - `GrowthEffectivenessExperiment`
  - `GrowthEffectivenessObservation`
- New UI surface:
  - `/dashboard/[websiteId]/growth/experiments`
  - section: `growth-effectiveness-benchmark`
- New scoring service:
  - speed, gate pass, smoke pass, rollback rate, duplicate noise, missing
    evidence, safety violations, cost/action, outcomes and learning citations.
- New script:
  - `npm run growth:effectiveness-experiment -- --apply --account-id=... --website-id=...`

## Mutation Boundary

The benchmark does not publish, merge or patch anything directly. It only
records experiment metadata and links to existing Growth OS artifacts,
candidates, work items, publication jobs and outcomes.

Production mutations remain owned by:

`candidate -> work item -> gate -> publication job -> smoke -> rollback/outcome`

## Initial Certification Status

Status: `READY_FOR_PRODUCTION_BATCH`

Completed:

- Database contract is additive-only and RLS tenant scoped through `user_roles`.
- Service role owns writes.
- Authenticated users get tenant-scoped reads.
- UI exposes the benchmark and scorecard.
- Unit/schema tests cover contract validation and winner logic.
- E2E contract updated to require the benchmark surface under session pool.
- Production read-only dry-run captured a ColombiaTours evidence snapshot:
  - `profile_runs`: 171
  - `ready_candidates`: 158
  - `ready_work_items`: 55
  - `publication_jobs`: 583
  - `smoke_passed_jobs`: 578
  - `outcomes`: 1446
  - `orchestrator_decisions`: 219
  - `agent_artifacts`: 19

Pending production evidence:

- Apply migration `20260511213000_growth_effectiveness_experiments.sql`.
- Create first real experiment row in production after migration apply.
- Freeze evidence snapshot for ColombiaTours.
- Record at least one observation per comparison group.
- Execute first safe technical batch through the existing executor.
- Attach `candidate_id`, `work_item_id`, `publication_job_id` and `outcome_id`.
- Emit initial operational verdict.
- Emit final SEO verdict after day 21/day 45 windows for content/transcreation.
