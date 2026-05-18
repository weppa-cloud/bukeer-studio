# T2 Phase3 — Production Apply Evidence

Date: 2026-05-18T19:37:35Z
Task: `t_0ec329b3`
Verdict: `PASS_PROD_APPLY_CONFIRMED`

## Operator decision

Yeison explicitly confirmed skipping staging for speed:

- User instruction: `confrimado`
- Interpreted as confirmation to apply the Growth Control Plane migration directly in Supabase production.

## Scope applied

Applied via Supabase MCP migration:

- Migration name: `growth_control_plane_governance_tables_prod_compat_20260518`
- Migration version recorded by Supabase: `20260518193555`
- Scope: additive governance/control-plane DDL only.

Included:

- `growth_account_plans`
- `growth_capabilities`
- `growth_provider_policies`
- production-compatible governance columns on existing `growth_agent_definitions`
- `growth_source_refs`
- `growth_context_packet_log`
- RLS enablement
- service-role-only write policy
- authenticated tenant-scoped read policy
- indexes
- updated_at triggers for mutable tables

Explicitly not included:

- no real backfill
- no provider calls
- no publish
- no mass transcreation
- no service-role/API secret inspection or logging

## Pre-apply hotfix

Before production apply, the PR branch migration was patched and pushed:

- Commit: `21c3b419`
- Reason: make M1 compatible with existing production `growth_agent_definitions` runtime registry.

Compatibility changes:

- added `website_id` to `growth_account_plans` contract because `context-builder.ts` queries by website
- kept existing `growth_agent_definitions` runtime shape intact
- added governance columns with `alter table ... add column if not exists`
- backfilled `agent_name = name`, `profile_type = lane`
- defaulted `blocked_actions` to include `call_provider_api_directly`

Local validation before apply:

- `npm ci`: PASS
- `NODE_OPTIONS="--max-old-space-size=4096" npm run typecheck`: PASS
- `npm run ai:check`: PASS

## Post-apply validation summary

Tables present:

- `growth_account_plans`
- `growth_agent_definitions`
- `growth_capabilities`
- `growth_context_packet_log`
- `growth_provider_policies`
- `growth_source_refs`

RLS:

- all six tables have RLS enabled
- all six tables have two policies:
  - `*_service_all`
  - `*_tenant_read`

Constraints validated:

- `growth_account_plans_name_version_uniq`: `UNIQUE (account_id, website_id, plan_name, plan_version)`
- `growth_capabilities_scope_uniq`: `UNIQUE (website_id, locale, market, lane, capability)`
- `growth_provider_policies_scope_uniq`: `UNIQUE (website_id, provider, provider_profile_type, locale, market)`
- `growth_context_packet_log_verdict_chk`: `PASS_AUTONOMOUS | PASS_WITH_WATCH | BLOCKED`
- `growth_source_refs_run_fact_uniq`: `UNIQUE (run_id, source, fact_id) DEFERRABLE INITIALLY DEFERRED`

Triggers validated:

- `trg_growth_account_plans_touch`
- `trg_growth_capabilities_touch`
- `trg_growth_provider_policies_touch`
- `trg_growth_agent_definitions_touch`

Indexes validated:

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

Compatibility validation:

- existing `growth_agent_definitions` rows: `25`
- rows with `agent_name`: `25`
- rows with `profile_type`: `25`
- rows blocking direct provider calls: `25`

## ColombiaTours status after apply

The apply created the ledger but did not invent references.

- `growth_source_refs` total rows: `0`
- ColombiaTours refs: `0`
- ColombiaTours `pt-BR/BR` refs: `0`

Existing ColombiaTours source/fact state remains:

- `pt-BR/BR` profiles: `6`
- `pt-BR/BR` profiles missing `source_signal_fact_ids`: `6`
- `pt-BR/BR` facts in `growth_signal_facts`: `0`
- `es-CO/CO` facts in `growth_signal_facts`: `4355`

Therefore autonomous transcreation remains blocked until fact-level source refs exist.

## Decision

T2 is no longer `BLOCKED_NEEDS_STAGING_TARGET`; it is completed as `PASS_PROD_APPLY_CONFIRMED`.
