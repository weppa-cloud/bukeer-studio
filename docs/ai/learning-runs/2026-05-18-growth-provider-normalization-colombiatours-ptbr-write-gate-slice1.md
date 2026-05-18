# Learning Run — ColombiaTours pt-BR Write Gate Slice1

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice1`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Entity: `/tour-colombia-10-dias`
Target: `pt-BR/BR`
Scope: one-entity production DML only; no provider calls, no publish, no mass transcreation.

Outcome: `PASS_WITH_WATCH_ONE_ENTITY`

## What changed

The system now has one actual fact-level source truth chain for ColombiaTours pt-BR/BR.

```text
manual/operator policy
→ growth_profile_runs evidence row
→ growth_signal_facts pt-BR fact
→ growth_source_refs fact-level ref
→ growth_profiles.source_signal_fact_ids
→ ContextPacket log PASS_WITH_WATCH
```

## Key lesson

A source-truth chain can be safely bootstrapped without provider calls if it is explicitly labelled as manual/operator seed, tightly scoped, rate-limited, and not treated as mass-autonomy.

## Durable guardrail

`PASS_WITH_WATCH_ONE_ENTITY` is not `PASS_AUTONOMOUS_MASS`. The system must keep requiring fact-level refs per entity/profile before scaled transcreation.
