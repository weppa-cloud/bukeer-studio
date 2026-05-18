# Learning Run — Growth Source Truth ColombiaTours pt-BR/BR

Date: `2026-05-18`
Sprint: `growth-source-truth-colombiatours-ptbr`
Branch: `feat/growth-source-truth-colombiatours-ptbr`
Tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Target: `pt-BR / BR`

## Outcome

`PASS_WITH_PRECISE_DATA_NEED`

The sprint converted the ColombiaTours `pt-BR/BR` blocker from a generic “missing source refs” into an operationally precise source-truth diagnosis.

## What shipped

- Source Truth SPEC.
- T1 plan gate.
- Dry-run source truth normalizer:
  - `lib/growth/agentic/source-truth-normalizer.ts`
  - `__tests__/lib/growth/agentic/source-truth-normalizer.test.ts`
- T2/T3/T4/T5/T6 validation evidence.
- Kanban T0→T7 materialized.

## Key implementation lesson

A safe Growth Agent must not treat provider/cache refs as source truth. The normalizer must classify them as unresolved until there is a verified mapping:

```text
provider/live/cache ref → growth_signal_facts.id → growth_source_refs
```

This keeps transcreation/context workers from inventing data lineage.

## Important operator fix

The generated T2 implementation initially hardcoded `pt-BR/BR` inside `buildResolutionOptions`. Neo/operator fixed it to use caller-provided target locale/market, preserving the rule:

```text
exact match → explicit allowed fallback → BLOCKED
```

## Data finding

Read-only audit confirmed:

- `growth_source_refs`: 0 total.
- ColombiaTours source refs: 0.
- ColombiaTours `pt-BR/BR` source refs: 0.
- ColombiaTours `pt-BR/BR` facts: 0.
- ColombiaTours `pt-BR/BR` profiles: 6.
- ColombiaTours `pt-BR/BR` profiles missing `source_signal_fact_ids`: 6/6.
- Existing `growth_profile_runs.source_refs` are provider/live/cache lineage, not fact-level refs.

## Correct product behavior

The ContextPacket canary must block with:

```text
BLOCKED_WITH_PRECISE_DATA_NEED
```

It should not publish, transcreate, backfill, or call providers from the worker.

## Recommended next sprint

`growth-provider-normalization-colombiatours-ptbr-slice1`

Goal: generate one verified fact/source-ref chain for one bounded ColombiaTours entity.

Required flow:

```text
governed provider-runner
→ raw/cache evidence
→ normalized growth_signal_facts
→ reviewed growth_source_refs candidates
→ controlled write gate
→ one-entity ContextPacket dry-run
```

## Guardrail to carry forward

A blocked canary is success when it prevents unsupported autonomy and produces an exact data need.
