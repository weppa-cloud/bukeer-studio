# T1 — Write Gate Plan / Production DML Preflight

Sprint: `growth-provider-normalization-colombiatours-ptbr-write-gate-slice1`
Tenant: ColombiaTours
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Entity: `/tour-colombia-10-dias`
Target: `pt-BR/BR`
Scope: one-entity production DML only; no provider calls, no publish, no mass transcreation.

Status: `PASS_PREWRITE`

## Preflight findings

- Existing source side: `/tour-colombia-10-dias` had 269 `es-CO/CO` facts.
- Target side before write: `pt-BR/BR` had 0 facts for the entity.
- `growth_source_refs` before this lane had no ColombiaTours pt-BR fact-level refs.
- Provider policies for ColombiaTours were not enabled for target scope.

## DML strategy

Use idempotency key:

`ct-ptbr-tour-colombia-10-dias-write-gate-v1`

The write is intentionally a manual/operator seed, not a provider-generated claim.
