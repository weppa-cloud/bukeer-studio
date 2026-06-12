# Learning Run — Growth Control Plane Phase 1

**Pipeline ID:** `growth-control-plane-phase1`
**Date:** 2026-05-18
**Branch:** `feat/growth-control-plane-phase0-v1`
**PR:** https://github.com/weppa-cloud/bukeer-studio/pull/570
**Outcome:** PASS_WITH_DATA_NEED / PASS_BLOCKED_EXPECTED

## Scope

Advance Growth Control Plane from Phase 0/1 product contracts into Phase 1 migration/backfill/canary readiness without applying production migrations or triggering mass transcreation.

## Tasks closed

- `t_791390a9` — T0 SPEC: Supabase migrations/backfill/canary plan — done.
- `t_56655041` — T1 PLAN GATE — PASS_WITH_MINOR.
- `t_636eb959` — T2 IMPLEMENT — M1 migration + scripts + context-builder integration.
- `t_54672c3b` — T3 CODE GATE — gate-chain tests and validation.
- `t_ed8ba9c7` — T4 DATA AUDIT — PASS_WITH_DATA_NEED.
- `t_b39604af` — T5 CANARY — PASS_BLOCKED_EXPECTED.
- `t_4d15a5d0` — T6 OPS — branch pushed, PR open/clean, no deploy.
- `t_1ae666e9` — T7 LEARNING — this materialization.

## Key commits

- `6e763e22` — Phase 1b migration M1 + context-builder integration.
- `df0e7203` — Phase 1d context-builder gate-chain tests.
- `8fe1f598` — ColombiaTours dry-run audit + canary evidence.

## Artifacts

- `supabase/migrations/20260518160000_growth_control_plane_governance_tables.sql`
- `scripts/sql/growth-source-refs-backfill-colombiatours.sql`
- `scripts/sql/growth-canary-seed-colombiatours-ptbr.sql`
- `scripts/sql/growth-control-plane-rollback.sql`
- `lib/growth/agentic/context-builder.ts`
- `__tests__/lib/growth/agentic/context-builder.test.ts`
- `docs/validation/t4-colombiatours-source-refs-audit-2026-05-18.md`
- `docs/validation/t5-colombiatours-ptbr-contextpacket-canary-2026-05-18.md`

## Validation

- `npm run ai:check` — PASS.
- `npm run test -- --testPathPattern="context-builder" --no-coverage --runInBand` — PASS, 21/21.
- T3 broader growth suite — PASS, 37 suites / 160 tests.
- Public GitHub PR API — PR #570 open, `mergeable=true`, `mergeable_state=clean`, head `8fe1f598` before this T7 commit.

## Data findings

ColombiaTours has real governance data, but not enough verified source refs for autonomous `pt-BR/BR` transcreation.

- `pt-BR / BR`: 6 profiles, 6 without source refs.
- Non-ES locales are missing fact-level source refs.
- `growth_profile_runs` has 175 `es-CO/CO` rows.
- 31 runs have `source_refs`, but those are provider/cache string refs.
- Candidate direct `fact_id` refs from current run source_refs: 0.

## Canary finding

`es-CO -> pt-BR/BR` canary result is `PASS_BLOCKED_EXPECTED`.

That is the desired behavior: the system blocks/non-autonomizes the worker path instead of inventing data, calling providers directly, or silently falling back to `es-CO/CO`.

## Safety incidents / operator interventions

1. `developer` profile could not start due missing Codex credentials; T2 was reassigned to tool-capable `tech-validator`.
2. Manual Hermes workers often completed work without claiming Kanban (`status` remained `ready`); Neo reconciled task status manually with evidence.
3. T4 worker attempted Supabase API key reveal path. Neo killed the process and continued through MCP read-only SQL only.
4. T5 worker probed env files and did not claim Kanban; Neo killed the process and completed the dry-run from verified T4 data + focused tests.
5. GitHub PR comment failed via API/gh auth, but branch push succeeded and PR API status is public/clean. Handoff is recorded in Kanban.

## Decisions reinforced

- Supabase/Bukeer Studio remains the operational SSOT and control plane.
- Workers consume ContextPacket only; no direct provider access.
- Exact locale/market is mandatory; no implicit `es-CO/CO` fallback.
- Source refs/freshness/policy gates should block when facts are insufficient.
- Provider/cache provenance refs are useful, but should not be treated as verified fact-level refs unless resolved.

## Follow-ups

1. Add a resolver from provider/cache refs to `growth_signal_facts.id`, or explicitly classify refs by kind (`fact_id`, `provider_ref`, `cache_ref`, `data_need`).
2. Before applying M1 migration to production, review SQL/RLS with a DB gate and backup/rollback plan.
3. After migration apply, run backfill in dry-run first; do not insert invented fact refs.
4. Keep canary as block-path until `pt-BR/BR` has verified source refs/freshness/policy coverage.
5. Fix GitHub auth path for PR comments if OPS must write comments from this environment.

## Materialized learning

- Repo learning run: this file.
- Validation docs: T4 and T5 files under `docs/validation/`.
- Kanban: T0–T7 completion summaries.
- Fact store: durable fact added by Neo.
- Skill patch: Bukeer development pipeline updated with provider/API-key reveal guardrail.
