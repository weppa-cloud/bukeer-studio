# T4 DATA AUDIT — ColombiaTours source_refs backfill dry-run

**Task:** `t_ed8ba9c7` — `[growth-control-plane-phase1] T4 DATA AUDIT — ColombiaTours source_refs backfill dry-run`
**Date:** 2026-05-18
**Mode:** read-only / dry-run
**Tenant:** ColombiaTours
**website_id:** `894545b7-73ca-4dae-b76a-da5b6a3f8441`
**Verdict:** PASS_WITH_DATA_NEED

## Safety envelope

- No writes executed.
- No provider calls executed.
- No production migration applied.
- No publish / no transcreation run.
- Supabase API-key reveal path was explicitly stopped by Neo/operator; audit continued via safe MCP `execute_sql` read-only queries.

## Existing `growth_profiles` source-ref coverage

- `de-DE / EU`: 6 profiles; 6 without source refs; 0 with refs; 0 links.
- `en-US / US`: 12 profiles; 12 without source refs; 0 with refs; 0 links.
- `es-CO / CO`: 19 profiles; 12 without source refs; 7 with refs; 700 links.
- `fr-FR / EU`: 6 profiles; 6 without source refs; 0 with refs; 0 links.
- `pt-BR / BR`: 6 profiles; 6 without source refs; 0 with refs; 0 links.

## Existing `growth_profile_runs` source-ref coverage

For ColombiaTours, `growth_profile_runs` currently has only `es-CO / CO` rows:

- Total runs: 175
- `locale` null: 0
- `market` null: 0
- Runs without `source_refs`: 144
- Runs with `source_refs`: 31
- Total source-ref strings in run-level `source_refs`: 43

Sample run refs are string refs, not direct `fact_id` JSON objects:

- `provider:dataforseo:dfs_authority_fallback_v1`
- `cache:growth_dataforseo_cache:<hash>`
- `provider:dataforseo:dfs_onpage_full_comparable_v3`

Dry-run candidate query for `ref.value ? 'fact_id'` returned:

- candidate_run_refs: 0
- candidate_runs: 0
- distinct_fact_ids_from_run_source_refs: 0

## Backfill conclusion

The proposed M1 table `growth_source_refs` is structurally useful, but ColombiaTours cannot be safely backfilled into fact-level `fact_id` refs from current `growth_profile_runs.source_refs`, because run refs are provider/cache string identifiers, not fact-id objects.

Therefore:

1. Do **not** invent `fact_id` links.
2. Do **not** mass-fill `growth_source_refs` from string refs without a resolver.
3. Mark non-`es-CO/CO` locales as `DATA_NEED` for source refs.
4. For `es-CO/CO`, preserve existing string refs as provenance only if the migration supports `ref_kind='provider'|'cache'` or an intermediate resolver maps cache/provider refs to `growth_signal_facts.id`.
5. T5 canary should remain dry-run and should be expected to block if it requires fact-level source refs for `pt-BR/BR`.

## Gate result for T5

T5 can proceed only as a controlled block-path canary:

- Expected successful behavior: ContextPacket gate blocks `pt-BR/BR` when required source refs/freshness/policy are missing.
- Not allowed: publishing, provider calls, invented refs, implicit fallback to `es-CO/CO`.

## Recommended follow-up for implementation

Add/keep support for provenance refs that distinguish:

- `fact_id` refs: verified links to `growth_signal_facts.id`.
- `provider_ref` refs: e.g. `provider:dataforseo:*`.
- `cache_ref` refs: e.g. `cache:growth_dataforseo_cache:*`.
- `data_need` refs: explicit missing-data marker for gates.

This keeps the control plane honest: the worker can consume provenance, but only fact-level refs satisfy strict autonomy gates.
