# T2 — Growth Source Truth Dry-Run Implementation

Status: `PASS_WITH_OPERATOR_FIX`
Date: `2026-05-18`
Sprint: `growth-source-truth-colombiatours-ptbr`
Task: `t_3163a39f`
Tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Verdict

`PASS_WITH_OPERATOR_FIX`

T2 produced the dry-run source-truth normalizer and focused tests. The worker process exited `0` but left the Kanban task in `running` and left implementation files uncommitted. Neo/operator performed a bounded recovery:

1. inspected the generated files,
2. fixed one hardcoded `pt-BR/BR` target bug so the normalizer uses caller-provided target locale/market,
3. ran focused tests, existing source-ref resolver tests, root typecheck and AI sync,
4. committed/pushed the implementation evidence,
5. completed T2 in Kanban.

No provider calls, DB writes, publish actions, transcreation, or secrets access occurred.

## Implementation files

- `lib/growth/agentic/source-truth-normalizer.ts`
- `__tests__/lib/growth/agentic/source-truth-normalizer.test.ts`

## What the normalizer does

The new dry-run normalizer evaluates a bounded set of profile run samples and emits a `SourceTruthReadinessReport` with:

- profiles evaluated,
- total source refs,
- verified fact refs,
- verified external refs,
- unresolved provider/cache refs,
- invalid/stale refs,
- missing fact mapping candidates,
- exact blockers,
- readiness boolean.

It does **not** write to Supabase and does **not** call providers.

## Safety correction applied by Neo/operator

The generated implementation initially hardcoded `pt-BR/BR` inside `buildResolutionOptions`. That would have made the function less reusable and could hide future locale/market mistakes.

Correction:

```ts
target_locale: sample.locale,
market: sample.market,
expected_target_locale: targetLocale,
expected_market: targetMarket,
```

This preserves the rule:

```text
exact match → explicit allowed fallback → BLOCKED
```

## Validation commands

```bash
npm run test -- --testPathPattern="source-truth-normalizer" --no-coverage --runInBand
npm run test -- --testPathPattern="source-ref-resolver" --no-coverage --runInBand
NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck
npm run ai:check
```

## Validation results

- `source-truth-normalizer`: `9 passed / 0 failed`
- `source-ref-resolver`: `7 passed / 0 failed`
- root typecheck: `PASS`
- `ai:check`: `PASS`

## Current data interpretation

The implementation can distinguish:

- `VERIFIED_FACT_REF` — usable only when the fact ID is known and gates are fresh/policy-allowed/exact locale-market.
- `VERIFIED_EXTERNAL_REF` — verified external evidence but not autonomous fact-level truth.
- `UNRESOLVED_PROVIDER_CACHE_REF` — provider/cache lineage that still needs mapping to a normalized fact.
- `INVALID_OR_STALE_REF` — unusable source ref.

This gives T4/T5 the required vocabulary to stop generic `BLOCKED` and instead produce `BLOCKED_WITH_PRECISE_DATA_NEED`.

## Next gate

T3 must review the diff independently for:

- idempotency,
- source-ref semantics,
- locale/market exactness,
- no provider calls,
- no writes,
- no secrets,
- compatibility with the Phase3 production control-plane schema.
