# SPEC — Growth Provider Normalization ColombiaTours pt-BR Slice 1

Status: `PASS_SPEC_READY`
Date: `2026-05-18`
Sprint: `growth-provider-normalization-colombiatours-ptbr-slice1`
Tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Route: `es-CO/CO → pt-BR/BR`
Slice entity: `/tour-colombia-10-dias`

## Objective

Produce a bounded provider-normalization slice that can eventually create one verified chain:

```text
governed provider-runner
→ raw/cache evidence
→ normalized growth_signal_facts
→ reviewed growth_source_refs candidates
→ controlled write gate
→ one-entity ContextPacket dry-run
```

## Out of scope

- mass transcreation
- publish
- provider calls from transcreation/context workers
- service_role/API-key access for QA workers
- production writes without a controlled write gate and explicit human approval
- upgrading provider/cache lineage to fact refs without a verified `growth_signal_facts.id`

## Selected slice

`/tour-colombia-10-dias` was selected because existing `es-CO/CO` read-only evidence shows 269 normalized facts for this entity, while `pt-BR/BR` has 0 facts. This makes it a good canary for localization/market source-truth creation.

## Acceptance criteria

1. T0 SPEC defines one entity, provider-normalization contract and gates.
2. T1 plan gate validates policy/data boundaries.
3. T2 builds dry-run evidence/candidate packet without provider calls or writes.
4. T3 creates candidate fact shape only; no DB insert.
5. T4 reviews source_refs candidates and blocks provider/cache-only refs.
6. T5 controlled write gate blocks without explicit write approval.
7. T6 ContextPacket canary stays blocked until fact-level refs exist.
8. T7 materializes learning and next required sprint.
