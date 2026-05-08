-- ============================================================================
-- #204 F2 — activities/hotels account_id tightening
-- ADR-005 RLS tenancy relies on account_id IS NOT NULL. Enforce on both legacy
-- entities. Fail-safe: if any row has account_id IS NULL the migration aborts
-- so the data owner can backfill first.
-- ============================================================================

do $$
declare
  v_null_activities int;
  v_null_hotels int;
begin
  select count(*) into v_null_activities from public.activities where account_id is null;
  select count(*) into v_null_hotels from public.hotels where account_id is null;

  if v_null_activities > 0 or v_null_hotels > 0 then
    raise exception
      'ACCOUNT_ID_NULL_ROWS_FOUND: activities=%, hotels=%. Backfill before applying migration.',
      v_null_activities, v_null_hotels;
  end if;
end $$;

alter table public.activities
  alter column account_id set not null;

alter table public.hotels
  alter column account_id set not null;

-- Rollback:
-- alter table public.activities alter column account_id drop not null;
-- alter table public.hotels alter column account_id drop not null;
