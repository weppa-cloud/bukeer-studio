# T4 Phase3 — ColombiaTours Backfill Dry-run

Date: 2026-05-18T19:37:35Z
Task: `t_d3110be2`
Verdict: `PASS_WITH_DATA_NEED`

## Purpose

Evaluate whether ColombiaTours can safely backfill fact-level `growth_source_refs` after production Control Plane tables were created.

## Scope

- Read-only audit only.
- No inserts into `growth_source_refs`.
- No provider calls.
- No invented mappings.
- No publish/transcreation.

## Target

- Website: ColombiaTours
- `website_id`: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Canary lane: transcreation
- Canary direction: `es-CO → pt-BR / BR`

## Current ledger state

`growth_source_refs` exists, but is empty:

- total rows: `0`
- ColombiaTours refs: `0`
- ColombiaTours `pt-BR/BR` refs: `0`

## Existing profile/source state

ColombiaTours profiles by locale/market:

- `de-DE / EU`: 6 profiles, 6 missing `source_signal_fact_ids`
- `en-US / US`: 12 profiles, 12 missing `source_signal_fact_ids`
- `es-CO / CO`: 19 profiles, 12 missing `source_signal_fact_ids`
- `fr-FR / EU`: 6 profiles, 6 missing `source_signal_fact_ids`
- `pt-BR / BR`: 6 profiles, 6 missing `source_signal_fact_ids`

ColombiaTours facts by locale/market:

- `es-CO / CO`: 4355 facts
- `pt-BR / BR`: 0 facts

## Finding

Backfill is not safe yet for `pt-BR/BR` because there is no verified mapping:

```text
provider/cache ref -> growth_signal_facts.id -> growth_source_refs.fact_id
```

The new Control Plane ledger is ready, but the normalized truth is not populated for the target market.

## Decision

Do not backfill.
Keep ColombiaTours in `DATA_NEED` for autonomous `pt-BR/BR` transcreation.

Next required lane:

```text
provider-runner/normalizer -> growth_signal_facts -> growth_source_refs -> ContextPacket
```
