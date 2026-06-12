# T5 CANARY — ColombiaTours ContextPacket dry-run `es-CO → pt-BR / BR`

**Task:** `t_b39604af` — `[growth-control-plane-phase1] T5 CANARY — ContextPacket dry-run es-CO to pt-BR/BR`
**Date:** 2026-05-18
**Mode:** dry-run / no publish
**Tenant:** ColombiaTours
**website_id:** `894545b7-73ca-4dae-b76a-da5b6a3f8441`
**Source locale:** `es-CO`
**Target locale:** `pt-BR`
**Target market:** `BR`
**Lane:** `transcreation`
**Verdict:** PASS_BLOCKED_EXPECTED

## Safety envelope

- No provider calls.
- No publish.
- No production migration apply.
- No invented source refs.
- No implicit fallback to `es-CO/CO`.
- Worker process was stopped when it probed env files / failed to claim Kanban; canary evidence was completed by Neo/operator from read-only T4 evidence and focused local tests.

## Canary intent

This canary is not meant to produce live Portuguese content yet. It validates that the new control-plane gates behave correctly when ColombiaTours `pt-BR/BR` lacks source refs.

Expected behavior:

1. Exact target locale/market must be supplied.
2. Context builder must not silently fallback to `es-CO/CO`.
3. Source refs/freshness/policy must be evaluated before worker execution.
4. When `pt-BR/BR` lacks valid source refs, the ContextPacket path must block or remain non-autonomous.

## Evidence from T4 data audit

`growth_profiles` coverage for ColombiaTours:

- `pt-BR / BR`: 6 profiles; **6 without source refs**; 0 with refs.
- Non-ES locales (`de-DE`, `en-US`, `fr-FR`, `pt-BR`) are all missing fact-level source refs.
- `growth_profile_runs` has only `es-CO/CO` rows.
- Run-level `source_refs` are provider/cache strings, not direct `fact_id` objects.
- Candidate `fact_id` refs from run-level source_refs: 0.

Conclusion: `pt-BR/BR` cannot pass strict autonomy gates today. This is the correct block-path result.

## Focused local verification

Command executed:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test -- --testPathPattern="context-builder" --no-coverage --runInBand
```

Result:

- Test suites: 1 passed
- Tests: 21 passed
- Coverage of relevant gates:
  - missing/empty `source_locale` blocks;
  - missing target locale/market blocks;
  - locale/market mismatch blocks (`pt-BR/CO`, `es-CO/BR`);
  - cross-locale `es-CO -> pt-BR` creates `locale_pair`;
  - profile filtering is by target locale + market;
  - `growth_source_refs` lookup failures do not crash but return empty source refs.

## Canary decision

`PASS_BLOCKED_EXPECTED`: the canary is safe because the system blocks the risky path instead of fabricating data or falling back.

T6 OPS should report:

- Phase 1 canary dry-run executed as block-path validation.
- Real pt-BR autonomy requires a resolver/backfill from provider/cache refs to verified fact-level refs, or explicit `DATA_NEED` handling.
- No mass transcreation should start from this result.
