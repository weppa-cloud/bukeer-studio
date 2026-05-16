-- ============================================================================
-- Growth market BR for pt-BR transcreation
-- ============================================================================
-- Purpose:
--   Promote Brazil from OTHER to first-class Growth OS market so pt-BR
--   transcreation profiles, candidates, policies and ledgers can be scoped as
--   pt-BR/BR instead of silently falling back to es-CO/CO.
--
-- Safety:
--   - Forward-only and idempotent.
--   - CHECK constraints are added NOT VALID to avoid full-table validation
--     during the production hotfix; new writes are still enforced.
-- ============================================================================

alter table if exists public.funnel_events
  drop constraint if exists funnel_events_market_chk;
alter table if exists public.funnel_events
  add constraint funnel_events_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_inventory
  drop constraint if exists growth_inventory_market_chk;
alter table if exists public.growth_inventory
  add constraint growth_inventory_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_signal_facts
  drop constraint if exists growth_signal_facts_market_chk;
alter table if exists public.growth_signal_facts
  add constraint growth_signal_facts_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_profiles
  drop constraint if exists growth_profiles_market_chk;
alter table if exists public.growth_profiles
  add constraint growth_profiles_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_opportunity_candidates
  drop constraint if exists growth_opportunity_candidates_market_chk;
alter table if exists public.growth_opportunity_candidates
  add constraint growth_opportunity_candidates_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_runtime_cycles
  drop constraint if exists growth_runtime_cycles_market_chk;
alter table if exists public.growth_runtime_cycles
  add constraint growth_runtime_cycles_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_autonomy_policies
  drop constraint if exists growth_autonomy_policies_market_chk;
alter table if exists public.growth_autonomy_policies
  add constraint growth_autonomy_policies_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_publication_jobs
  drop constraint if exists growth_publication_jobs_market_chk;
alter table if exists public.growth_publication_jobs
  add constraint growth_publication_jobs_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_work_item_outcomes
  drop constraint if exists growth_work_item_outcomes_market_chk;
alter table if exists public.growth_work_item_outcomes
  add constraint growth_work_item_outcomes_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_context_snapshots
  drop constraint if exists growth_context_snapshots_market_chk;
alter table if exists public.growth_context_snapshots
  add constraint growth_context_snapshots_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_orchestrator_decisions
  drop constraint if exists growth_orchestrator_decisions_market_chk;
alter table if exists public.growth_orchestrator_decisions
  add constraint growth_orchestrator_decisions_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;

alter table if exists public.growth_scheduler_heartbeats
  drop constraint if exists growth_scheduler_heartbeats_market_chk;
alter table if exists public.growth_scheduler_heartbeats
  add constraint growth_scheduler_heartbeats_market_chk
  check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')) not valid;
