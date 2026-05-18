# Learning Run — Growth Control Plane Phase3 Production Apply

Date: 2026-05-18T19:37:35Z
Pipeline: `growth-control-plane-phase3-db-staging`
Outcome: `PASS_PROD_APPLY_CONFIRMED / PASS_WITH_DATA_NEED / PASS_BLOCKED_EXPECTED`

## Summary

Phase3 originally blocked at T2 because no Supabase staging/dev target existed. Yeison later confirmed skipping staging for speed. Before applying production DDL, Neo patched the migration for production compatibility and validated locally.

Production apply succeeded through Supabase MCP migration tooling.

## Key artifacts

- PR: `#571`
- Branch: `feat/growth-control-plane-phase3-db-staging`
- Compatibility commit: `21c3b419`
- Applied migration: `growth_control_plane_governance_tables_prod_compat_20260518`
- Supabase migration version: `20260518193555`

## Task outcomes

- T0 `t_6279ee1c`: Phase3 spec created
- T1 `t_d025a79c`: plan gate validated and patched
- T2 `t_0ec329b3`: `PASS_PROD_APPLY_CONFIRMED`
- T3 `t_e4e28e49`: `PASS_DB_VALIDATION`
- T4 `t_d3110be2`: `PASS_WITH_DATA_NEED`
- T5 `t_50c473c7`: `PASS_BLOCKED_EXPECTED`
- T6 `t_079b0361`: `PASS_PROD_APPLY_NO_BACKFILL_NO_PUBLISH`
- T7 `t_e9923223`: learning materialized

## Lessons

1. `create table if not exists` is not enough when production already has an earlier table with the same name.
   - `growth_agent_definitions` already existed.
   - Governance columns had to be added with `alter table ... add column if not exists`.

2. Production compatibility requires checking actual DB shape, not only repo migrations.
   - The repo contract had `agent_name`.
   - Production runtime had `name`.
   - The correct bridge was `agent_name = name`, `profile_type = lane`.

3. Applying the governance layer does not grant autonomy by itself.
   - `growth_source_refs` exists, but is empty.
   - ColombiaTours `pt-BR/BR` still has no normalized facts/source refs.

4. A blocked canary remains the correct safety result when evidence is missing.
   - `PASS_BLOCKED_EXPECTED` is success for the gate.

5. The next value-producing lane is provider normalization, not transcreation.
   - Data truth must exist before worker autonomy.

## Safety notes

No secrets were inspected or logged.
No provider calls were made.
No backfill was performed.
No content was published.
No mass transcreation was executed.
