# T4 DATA AUDIT DRY-RUN — ColombiaTours Source Ref Resolution Feasibility

Date: 2026-05-18
Pipeline: `growth-control-plane-phase2-source-refs-safe-qa`
Task: `t_119d2649`
Tenant beta: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Verdict

`PASS_WITH_DATA_NEED`

The Phase 2 resolver classification confirms the Phase 1 finding: ColombiaTours still does not have enough verified fact-level source refs for autonomous `pt-BR / BR` ContextPacket execution.

## Method

Read-only Supabase MCP queries only. No writes, no backfill, no providers, no secret access, no publish.

## Profile fact refs by locale/market

- `de-DE / EU`
  - profiles: 6
  - profiles without source refs: 6
  - profiles with source refs: 0
  - total profile fact refs: 0

- `en-US / US`
  - profiles: 12
  - profiles without source refs: 12
  - profiles with source refs: 0
  - total profile fact refs: 0

- `es-CO / CO`
  - profiles: 19
  - profiles without source refs: 12
  - profiles with source refs: 7
  - total profile fact refs: 700

- `fr-FR / EU`
  - profiles: 6
  - profiles without source refs: 6
  - profiles with source refs: 0
  - total profile fact refs: 0

- `pt-BR / BR`
  - profiles: 6
  - profiles without source refs: 6
  - profiles with source refs: 0
  - total profile fact refs: 0

## Run source refs by locale/market

Only `es-CO / CO` has run-level refs:

- total run refs: 43
- uuid-like refs: 0
- `growth_signal_facts:*` refs: 0
- provider refs: 23
- cache refs: 8
- null/empty refs: 5
- runs with refs: 31

Resolver classification:

- provider/cache strings: `UNRESOLVED_PROVIDER_CACHE_REF` unless separately mapped.
- no `growth_signal_facts:*` refs were found in run-level source refs.
- no uuid-like fact refs were found in run-level source refs.

## Signal facts availability

For ColombiaTours website:

- total `growth_signal_facts`: 4,355
- website-matching facts: 4,355
- `pt-BR` facts: 0
- `BR` market facts: 0

## Decision

T4 remains `PASS_WITH_DATA_NEED`.

There is enough evidence to say:

1. `es-CO / CO` has some profile-level fact refs.
2. `pt-BR / BR` has no fact refs and no matching facts.
3. run-level refs are provider/cache strings, not fact-level refs.
4. No safe automatic backfill exists yet for `pt-BR / BR`.

## Required before autonomy

Before ColombiaTours `pt-BR / BR` transcreation can move from blocked canary to autonomous execution, one of these must happen:

1. Provider/cache refs are normalized into `growth_signal_facts` with locale/market/freshness/policy metadata; or
2. New provider runs are executed by an approved provider-runner lane that writes normalized facts; or
3. A human-approved migration/backfill maps refs to verified facts with auditable evidence.

Until then, the correct canary result is still `PASS_BLOCKED_EXPECTED`.
