# T1 PLAN GATE — Growth Control Plane Phase 2

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Task: `t_21b044fe`
Upstream T0: `t_79b4fc96`
Commit under review: `c66d98ee`

## Verdict

`PASS_WITH_WATCH`

Phase 2 can proceed to dry-run/test/doc implementation only.

## Artifacts reviewed

- `docs/specs/SPEC_GROWTH_CONTROL_PLANE_PHASE2_SOURCE_REFS_SAFE_QA.md`
- `docs/ops/growth-safe-qa-sandbox.md`
- `docs/INDEX.md`
- Phase 1 evidence:
  - `docs/validation/t4-colombiatours-source-refs-audit-2026-05-18.md`
  - `docs/validation/t5-colombiatours-ptbr-contextpacket-canary-2026-05-18.md`

## Gate checks

### 1. No invented refs

PASS.

The resolver contract explicitly separates:

- `VERIFIED_FACT_REF`
- `VERIFIED_EXTERNAL_REF`
- `UNRESOLVED_PROVIDER_CACHE_REF`
- `INVALID_OR_STALE_REF`

Only `VERIFIED_FACT_REF` may populate autonomous `growth_source_refs`. Provider/cache strings alone remain unresolved or external, not fact refs.

### 2. Canary remains blocked unless evidence improves

PASS.

The spec keeps the ColombiaTours `pt-BR / BR` canary in either:

- `PASS_BLOCKED_EXPECTED`, or
- `PASS_READY_DRYRUN` only if refs/freshness/policy/permissions/locale-market all pass.

No publish path exists in this phase.

### 3. QA sandbox prevents secret probing

PASS_WITH_WATCH.

`growth-safe-qa-sandbox.md` defines forbidden inputs and kill criteria, including partial key output such as length, prefixes, suffixes or checksums.

Watch item: this is a runbook/prompt-level guardrail for now. A future profile-level sandbox should remove full `.env` inheritance for QA instead of relying only on instructions.

### 4. No prod write/apply/provider calls

PASS.

T0 scope explicitly defers:

- production migration apply,
- production `growth_source_refs` writes,
- provider refreshes/calls,
- publish/transcreation,
- PR merge.

### 5. Implementable next step

PASS.

T2 can safely implement one or more of:

- dry-run resolver classification utility,
- SQL read-only candidate query,
- tests/fixtures for resolver classification,
- validation docs.

## Required T2 boundaries

T2 must not:

- read `.env` or secret files,
- use service-role keys,
- apply migrations,
- write to production Supabase,
- call DataForSEO/GSC/GA4/providers,
- publish content,
- merge PR #570.

T2 should prefer committed fixtures and read-only/dry-run logic.

## Recommended T2 implementation target

Minimum useful T2:

1. Add a resolver classification module or documented dry-run SQL classification that can distinguish verified fact refs from provider/cache strings.
2. Add focused tests/fixtures showing provider/cache strings remain `UNRESOLVED_PROVIDER_CACHE_REF` unless joined to fact rows.
3. Add/update validation doc for ColombiaTours mapping feasibility.
4. Commit and push.

## Result

T1 is approved for T2 with `PASS_WITH_WATCH`.
