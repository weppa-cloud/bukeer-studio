# T3 Phase3 — DB Validation Evidence

Date: 2026-05-18T19:37:35Z
Task: `t_e4e28e49`
Verdict: `PASS_DB_VALIDATION`

## Validated after production apply

Migration applied:

- `growth_control_plane_governance_tables_prod_compat_20260518`
- Supabase version: `20260518193555`

## Tables

All expected Control Plane tables are present:

- `growth_account_plans`
- `growth_capabilities`
- `growth_provider_policies`
- `growth_agent_definitions`
- `growth_source_refs`
- `growth_context_packet_log`

## RLS and policies

All six tables have RLS enabled.

Each table has exactly the expected policy pair:

- `*_service_all`: service-role full access
- `*_tenant_read`: authenticated tenant-scoped SELECT via `user_roles`

## Constraints

Validated critical constraints:

- `growth_account_plans_name_version_uniq`
  - `UNIQUE (account_id, website_id, plan_name, plan_version)`
- `growth_capabilities_scope_uniq`
  - `UNIQUE (website_id, locale, market, lane, capability)`
- `growth_provider_policies_scope_uniq`
  - `UNIQUE (website_id, provider, provider_profile_type, locale, market)`
- `growth_context_packet_log_verdict_chk`
  - permits `PASS_AUTONOMOUS`, `PASS_WITH_WATCH`, `BLOCKED`
- `growth_source_refs_run_fact_uniq`
  - `UNIQUE (run_id, source, fact_id) DEFERRABLE INITIALLY DEFERRED`

## Triggers

Validated updated_at triggers exist for mutable tables:

- `trg_growth_account_plans_touch`
- `trg_growth_capabilities_touch`
- `trg_growth_provider_policies_touch`
- `trg_growth_agent_definitions_touch`

## Indexes

Validated expected lookup indexes:

- `growth_account_plans_tenant_idx`
- `growth_capabilities_tenant_idx`
- `growth_provider_policies_tenant_idx`
- `growth_agent_definitions_tenant_idx`
- `growth_source_refs_scope_idx`
- `growth_source_refs_run_idx`
- `growth_source_refs_fact_idx`
- `growth_source_refs_freshness_idx`
- `growth_context_packet_log_scope_idx`
- `growth_context_packet_log_snapshot_idx`
- `growth_context_packet_log_verdict_idx`

## Existing runtime compatibility

Existing `growth_agent_definitions` production rows were preserved and enriched:

- total rows: `25`
- with `agent_name`: `25`
- with `profile_type`: `25`
- with direct provider calls blocked: `25`

## Out of scope

No data backfill was performed during T3.
No provider calls were made.
No publish/transcreation actions were made.
