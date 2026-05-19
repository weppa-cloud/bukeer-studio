# SPEC — Growth Provider Policy GSC ColombiaTours pt-BR Write Gate

Date: 2026-05-19
Sprint: `growth-provider-policy-gsc-colombiatours-ptbr-write-gate`
Verdict target: `PASS_WITH_WATCH_GSC_ONE_ENTITY`

## Objective

Convert the previous `PASS_ADAPTER_READY_POLICY_GAP` into a controlled policy-first write gate for ColombiaTours `pt-BR/BR` by enabling an explicit GSC provider policy and writing one first-party GSC evidence chain.

## Scope

- Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`
- Account: `9fc24733-b127-4184-aa22-12f03b98927a`
- Profile: `page_product` / `0b4d0d4c-d293-4214-9bec-cb8113689284`
- Entity: `/tour-colombia-10-dias`
- Locale/market: `pt-BR/BR`
- Provider: `gsc`
- Provider profile type: `search_console_page_query`

## Hard guardrails

- No publish.
- No mass transcreation.
- No provider calls from workers.
- No fallback `es-CO/CO`.
- No secrets printed.
- DML idempotent; use `where not exists` for deferrable constraints.

## Acceptance criteria

1. GSC policy exists with `enabled=true`, `consent_granted=true`, `data_usage_policy='store_normalized'`.
2. A `growth_profile_runs` row records the GSC evidence window.
3. A `growth_signal_facts` row stores normalized GSC page/query performance for `/tour-colombia-10-dias`.
4. A fact-level `growth_source_refs` row points to the fact and is fresh.
5. `growth_profiles.source_signal_fact_ids` links the new GSC fact.
6. `growth_context_packet_log` records `PASS_WITH_WATCH`.
7. Resolver canary returns `VERIFIED_FACT_REF` and `usable=true`.
8. Focused tests, typecheck, and `ai:check` pass.
