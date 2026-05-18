# SPEC — Growth Control Plane Phase 2: Source Refs Resolver + Safe QA Sandbox

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Kanban T0: `t_79b4fc96`
PR: #570
Tenant beta: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Status

`DRAFT_READY_FOR_T1_PLAN_GATE`

This phase is intentionally safe-by-default. It prepares source-reference resolution and QA hardening without production writes, provider calls, publishing, mass transcreation, or PR merge.

## Background

Phase 1 established the Product Control Plane primitives and blocked the ColombiaTours `es-CO -> pt-BR / BR` canary correctly:

- T4 DATA AUDIT: `PASS_WITH_DATA_NEED`.
- T5 CANARY: `PASS_BLOCKED_EXPECTED`.
- Current `growth_profile_runs.source_refs` values are mostly provider/cache string references, for example `provider:dataforseo:*` or `cache:growth_dataforseo_cache:*`.
- Those strings are not fact-level references to `growth_signal_facts.id`.
- Therefore the system must not backfill `growth_source_refs` by guessing.

A second operational issue was also observed: QA workers attempted to inspect Supabase service-role/API-key material from temporary files/env. Phase 2 must prevent that class of behavior before any QA/data audit worker gets privileged context again.

## Non-negotiables

1. No production migration apply in this phase.
2. No production writes or backfills in this phase.
3. No provider calls from workers.
4. No publish or mass transcreation.
5. No direct `.env`, service-role, API key, token, or temp secret-file access by QA/ops/data-audit workers.
6. No invented `source_refs`.
7. Locale/market stays explicit:

```text
exact match -> explicit allowed fallback -> BLOCKED
```

8. A ContextPacket without verifiable source refs, freshness, policy, permissions, exact locale/market, and gate verdict must block.

## Phase 2 objectives

### O1 — Source Refs Resolver

Design and implement a dry-run resolver that classifies existing source references into one of four outcomes:

- `VERIFIED_FACT_REF`: maps to a concrete `growth_signal_facts.id` with tenant/account/website alignment.
- `VERIFIED_EXTERNAL_REF`: maps to a provider/cache row with enough immutable metadata to be promoted to a fact later, but is not yet a fact ref.
- `UNRESOLVED_PROVIDER_CACHE_REF`: provider/cache string exists but cannot be joined to a fact or immutable source record.
- `INVALID_OR_STALE_REF`: ref is malformed, expired, wrong tenant/website/locale/market, or violates policy.

Only `VERIFIED_FACT_REF` can populate `growth_source_refs` for autonomous ContextPacket execution.

### O2 — Data Audit Dry Run

Create a repeatable read-only audit for ColombiaTours that reports:

- total profiles by locale/market,
- profiles with/without fact-level refs,
- runs with source refs,
- resolvable vs unresolved refs,
- freshness/policy readiness,
- explicit `DATA_NEED` reasons.

The audit must produce evidence under `docs/validation/` and must not write to Supabase.

### O3 — Safe QA Sandbox

Define a worker-safety contract for QA/data-audit/canary tasks:

- QA workers must not be launched with full `/opt/data/.env`.
- QA workers must not receive service-role credentials.
- QA workers must not inspect `/tmp/*key*`, `/tmp/*secret*`, `.env`, auth files, git remotes with embedded tokens, or profile auth stores.
- QA workers should run with read-only repo access and explicit MCP/operator-provided query outputs when data evidence is needed.
- Any task requiring privileged DB writes must be routed to a separate approved DB migration/backfill lane, not QA.

### O4 — Canary Re-run Gate

The ColombiaTours `pt-BR / BR` canary may be re-run only in dry-run mode. Expected outcomes:

- `PASS_BLOCKED_EXPECTED` if fact-level refs are still missing.
- `PASS_READY_DRYRUN` only if verified refs, freshness, permissions, policies, and exact locale/market all pass.

## Proposed artifacts

### Docs

- `docs/specs/SPEC_GROWTH_CONTROL_PLANE_PHASE2_SOURCE_REFS_SAFE_QA.md`
- `docs/ops/growth-safe-qa-sandbox.md`
- `docs/validation/t4-colombiatours-source-refs-resolution-dry-run-2026-05-18.md`
- `docs/validation/t5-colombiatours-ptbr-contextpacket-canary-phase2-2026-05-18.md`
- `docs/ai/learning-runs/2026-05-18-growth-control-plane-phase2.md`

### Optional code/tests, only if T1 approves

- A dry-run resolver utility under `lib/growth/agentic/` or `scripts/sql/`.
- Focused tests around resolver classification and no-fallback ContextPacket gating.
- SQL dry-run queries that return candidate mappings without mutation.

## Resolver contract

Input:

```ts
type SourceRefResolutionInput = {
  tenant_id?: string;
  account_id?: string;
  website_id: string;
  profile_id?: string;
  run_id?: string;
  source_ref: string | Record<string, unknown>;
  source_locale: string;
  target_locale?: string;
  market: string;
  observed_at?: string;
};
```

Output:

```ts
type SourceRefResolutionResult = {
  status:
    | "VERIFIED_FACT_REF"
    | "VERIFIED_EXTERNAL_REF"
    | "UNRESOLVED_PROVIDER_CACHE_REF"
    | "INVALID_OR_STALE_REF";
  source_ref_raw: unknown;
  source_fact_id?: string;
  external_ref?: {
    provider?: string;
    cache_table?: string;
    cache_key?: string;
    observed_at?: string;
  };
  freshness_status: "fresh" | "stale" | "unknown";
  policy_status: "allowed" | "blocked" | "unknown";
  locale_market_status: "exact" | "explicit_fallback" | "blocked";
  reasons: string[];
};
```

Rules:

- `source_fact_id` is allowed only when the resolver can prove the fact row exists and belongs to the same tenant/account/website scope.
- Provider/cache strings alone must not be upgraded to `source_fact_id`.
- If freshness/policy/locale-market is unknown, autonomous execution must block.
- Resolver output must be auditable and stable enough to store in `growth_context_packet_log` or validation docs.

## Safe QA sandbox contract

A QA/data-audit/canary worker is allowed to access:

- repo files in the assigned worktree,
- committed docs/specs/tests,
- synthetic fixtures,
- non-sensitive command outputs supplied by operator,
- read-only MCP query summaries, with secrets removed.

It is not allowed to access:

- `/opt/data/.env`,
- Supabase service-role keys,
- API keys/tokens,
- auth files,
- git remote credentials,
- temp files containing keys or tokens,
- production write credentials.

If a worker attempts secret probing, the run must be killed and replaced with an operator gate or a constrained profile.

## T1 gate acceptance criteria

T1 may pass only if:

1. The resolver design cannot invent refs.
2. The canary remains blocked unless fact-level refs are proven.
3. QA sandbox prevents service-role/env probing.
4. Any write/backfill/prod apply is explicitly out of scope.
5. The next implementation step is dry-run/test/doc only.
6. The plan includes rollback/no-op posture.

## Phase 2 success criteria

- A repeatable dry-run can classify ColombiaTours refs without writes.
- The system knows exactly which refs are `VERIFIED_FACT_REF` vs `DATA_NEED`.
- The pt-BR/BR canary outcome is evidence-based, not guessed.
- QA/data-audit workers no longer need or receive privileged secrets.
- PR #570 remains mergeable or receives a clean follow-up PR if Phase2 changes expand scope.

## Explicitly deferred

- Applying migrations to production.
- Writing `growth_source_refs` in production.
- Running provider refreshes.
- Publishing/transcreating content.
- Merging PR #570.
- Building the permanent independent Growth runtime outside Bukeer Studio.
