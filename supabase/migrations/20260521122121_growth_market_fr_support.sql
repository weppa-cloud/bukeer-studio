-- ============================================================================
-- Growth OS: Add FR (France) market support across all governed tables
-- ============================================================================
-- Purpose:
--   Extends the market check constraint to allow 'FR' (France) alongside the
--   existing CO, MX, US, CA, EU, OTHER. This unblocks the fr-FR/FRANCE source
--   truth data flow (growth_signal_facts, growth_profiles, growth_inventory,
--   work items, runtime cycles, funnel events, etc.) for the ColombiaTours
--   France transcreation wave (t_28df5295 / t_681cfa2b).
--
-- Canonical market codes:
--   CO = Colombia
--   MX = Mexico
--   US = United States
--   CA = Canada
--   EU = European Union (multi-market)
--   OTHER = Any other market not separately governed
--   FR = France (ISO 3166-1 alpha-2, added by this migration)
--
-- Safety:
--   - Additive only (DROP IF EXISTS on constraints, then ADD new constraint)
--   - Each ALTER TABLE is independent — one table failing won't block others
--   - No data migration needed since no FR rows exist yet
--   - Locale pattern 'fr-FR' follows the existing regex: ^[a-z]{2}(-[A-Z]{2})?$
-- ============================================================================

do $$
begin
  -- ─── growth_signal_facts ─────────────────────────────────────────────
  alter table if exists public.growth_signal_facts
    drop constraint if exists growth_signal_facts_market_chk;
  alter table if exists public.growth_signal_facts
    add constraint growth_signal_facts_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_profiles ─────────────────────────────────────────────────
  alter table if exists public.growth_profiles
    drop constraint if exists growth_profiles_market_chk;
  alter table if exists public.growth_profiles
    add constraint growth_profiles_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_opportunity_candidates ───────────────────────────────────
  alter table if exists public.growth_opportunity_candidates
    drop constraint if exists growth_opportunity_candidates_market_chk;
  alter table if exists public.growth_opportunity_candidates
    add constraint growth_opportunity_candidates_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_inventory ────────────────────────────────────────────────
  alter table if exists public.growth_inventory
    drop constraint if exists growth_inventory_market_chk;
  alter table if exists public.growth_inventory
    add constraint growth_inventory_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_scheduler_heartbeats ─────────────────────────────────────
  alter table if exists public.growth_scheduler_heartbeats
    drop constraint if exists growth_scheduler_heartbeats_market_chk;
  alter table if exists public.growth_scheduler_heartbeats
    add constraint growth_scheduler_heartbeats_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_autonomy_policies ────────────────────────────────────────
  alter table if exists public.growth_autonomy_policies
    drop constraint if exists growth_autonomy_policies_market_chk;
  alter table if exists public.growth_autonomy_policies
    add constraint growth_autonomy_policies_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_publication_jobs ─────────────────────────────────────────
  alter table if exists public.growth_publication_jobs
    drop constraint if exists growth_publication_jobs_market_chk;
  alter table if exists public.growth_publication_jobs
    add constraint growth_publication_jobs_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_work_item_outcomes ───────────────────────────────────────
  alter table if exists public.growth_work_item_outcomes
    drop constraint if exists growth_work_item_outcomes_market_chk;
  alter table if exists public.growth_work_item_outcomes
    add constraint growth_work_item_outcomes_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_runtime_cycles ───────────────────────────────────────────
  alter table if exists public.growth_runtime_cycles
    drop constraint if exists growth_runtime_cycles_market_chk;
  alter table if exists public.growth_runtime_cycles
    add constraint growth_runtime_cycles_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_context_snapshots ────────────────────────────────────────
  alter table if exists public.growth_context_snapshots
    drop constraint if exists growth_context_snapshots_market_chk;
  alter table if exists public.growth_context_snapshots
    add constraint growth_context_snapshots_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── growth_orchestrator_decisions ───────────────────────────────────
  alter table if exists public.growth_orchestrator_decisions
    drop constraint if exists growth_orchestrator_decisions_market_chk;
  alter table if exists public.growth_orchestrator_decisions
    add constraint growth_orchestrator_decisions_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  -- ─── funnel_events ───────────────────────────────────────────────────
  alter table if exists public.funnel_events
    drop constraint if exists funnel_events_market_chk;
  alter table if exists public.funnel_events
    add constraint funnel_events_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'));

  raise notice 'Growth OS: All 12 market constraints updated to include FR.';
end $$;

-- ─── Canonical market code / label reference table ───────────────────────
-- Materialized reference for Growth OS workers writing explicit locale/market
-- without fallback. Extend as new markets are governed.
do $$
begin
  create table if not exists public.growth_market_codes (
    market text primary key,
    label text not null,
    iso_alpha2 text not null,
    region text not null,
    is_governed boolean not null default true,
    added_at timestamptz not null default now(),
    constraint growth_market_codes_market_chk
      check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER', 'FR'))
  );

  -- Insert or update canonical entries (idempotent via INSERT ... ON CONFLICT)
  insert into public.growth_market_codes (market, label, iso_alpha2, region)
  values
    ('CO', 'Colombia', 'CO', 'LATAM'),
    ('MX', 'Mexico', 'MX', 'LATAM'),
    ('US', 'United States', 'US', 'NA'),
    ('CA', 'Canada', 'CA', 'NA'),
    ('EU', 'European Union', 'EU', 'EMEA'),
    ('OTHER', 'Other / Unspecified', '--', 'GLOBAL'),
    ('FR', 'France', 'FR', 'EMEA')
  on conflict (market) do update set
    label = excluded.label,
    iso_alpha2 = excluded.iso_alpha2,
    region = excluded.region,
    is_governed = true;

  raise notice 'Growth OS: Canonical market codes table created/updated.';
end $$;

comment on table public.growth_market_codes is
  'Canonical Growth OS market code/label mapping. Workers must read this table to resolve locale-market pairs without fallback.';
comment on column public.growth_market_codes.market is
  'Short market code, e.g. FR for France. Must match check constraints on all growth_* tables.';
comment on column public.growth_market_codes.label is
  'Human-readable market name, e.g. France.';
comment on column public.growth_market_codes.iso_alpha2 is
  'ISO 3166-1 alpha-2 country code or -- for multi-market entries.';
comment on column public.growth_market_codes.region is
  'Geographic region for routing/grouping (LATAM, NA, EMEA, GLOBAL).';
comment on column public.growth_market_codes.is_governed is
  'True = governed market with explicit check constraint support. False = reserved/legacy.';

-- Grant access
alter table public.growth_market_codes enable row level security;

drop policy if exists growth_market_codes_service_all on public.growth_market_codes;
create policy growth_market_codes_service_all
  on public.growth_market_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_market_codes_read_all on public.growth_market_codes;
create policy growth_market_codes_read_all
  on public.growth_market_codes
  for select
  to authenticated
  using (true);

grant select on public.growth_market_codes to authenticated;
grant all on public.growth_market_codes to service_role;