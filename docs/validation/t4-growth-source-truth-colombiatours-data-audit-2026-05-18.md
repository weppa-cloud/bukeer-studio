# T4 — ColombiaTours Source Truth Data Audit Dry-run

Status: `PASS_WITH_PRECISE_DATA_NEED`
Date: `2026-05-18`
Sprint: `growth-source-truth-colombiatours-ptbr`
Task: `t_92e2489e`
Tenant: ColombiaTours
Website ID: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
Target: `pt-BR / BR`

## Verdict

`PASS_WITH_PRECISE_DATA_NEED`

The dry-run audit confirms that the new normalizer can explain the block precisely, but production data still does not contain enough verified fact-level truth to unlock autonomous ContextPacket generation for ColombiaTours `pt-BR/BR`.

## Read-only evidence

All evidence was collected read-only through the Supabase MCP/operator path. No provider calls, DB writes, backfill, publish, or secret access occurred.

### `growth_source_refs`

```json
{
  "source_refs_total": 0,
  "colombiatours_refs": 0,
  "colombiatours_ptbr_refs": 0
}
```

### `growth_profiles` by locale/market

```json
[
  { "locale": "de-DE", "market": "EU", "profiles": 6, "without_source_signal_fact_ids": 6 },
  { "locale": "en-US", "market": "US", "profiles": 12, "without_source_signal_fact_ids": 12 },
  { "locale": "es-CO", "market": "CO", "profiles": 19, "without_source_signal_fact_ids": 12 },
  { "locale": "fr-FR", "market": "EU", "profiles": 6, "without_source_signal_fact_ids": 6 },
  { "locale": "pt-BR", "market": "BR", "profiles": 6, "without_source_signal_fact_ids": 6 }
]
```

### `growth_signal_facts` by locale/market

```json
[
  { "locale": "es-CO", "market": "CO", "facts": 4355 }
]
```

There are no `pt-BR/BR` facts yet.

### `growth_profile_runs.source_refs`

Recent profile runs contain `source_refs`, but they are provider/live/cache lineage such as:

```json
[{ "source": "live", "provider": "clarity", "endpoint": "...", "dimensions": ["url", "device", "source"] }]
```

or failure metadata such as:

```json
[{ "source": "live_failed", "provider": "clarity" }]
```

These are not `growth_signal_facts:<id>` fact-level refs and cannot be elevated to autonomous source truth without a verified mapping.

## Precise blockers

1. `growth_source_refs` is empty globally and for ColombiaTours.
2. ColombiaTours `pt-BR/BR` has 6 profiles and all 6 lack `source_signal_fact_ids`.
3. ColombiaTours has 0 `pt-BR/BR` normalized facts.
4. Existing profile run refs are provider/live/cache evidence, not verified fact-level refs.
5. No safe mapping currently proves:

```text
provider/cache/source_ref → growth_signal_facts.id → growth_source_refs candidate
```

## Decision

Do not backfill. Do not publish. Do not run mass transcreation.

The next step is a canary dry-run that should remain blocked with the more precise reason above: `BLOCKED_WITH_PRECISE_DATA_NEED`.
