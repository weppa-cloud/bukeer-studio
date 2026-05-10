-- ============================================================================
-- Growth OS Provider Intelligence — compatibility indexes
-- ============================================================================
-- Purpose:
--   Existing deployments may already have growth_profile_runs from the unified
--   backlog ledger. Add the provider-intelligence idempotency index outside of
--   the create-table block so pre-existing tables get the same contract.
-- ============================================================================

alter table public.growth_profile_runs
  add column if not exists idempotency_key text;

update public.growth_profile_runs
set idempotency_key = concat('legacy:', website_id::text, ':', run_id)
where idempotency_key is null;

alter table public.growth_profile_runs
  alter column idempotency_key set not null;

create unique index if not exists growth_profile_runs_website_idempotency_idx
  on public.growth_profile_runs(website_id, idempotency_key);
