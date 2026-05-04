-- ============================================================================
-- funnel_events dispatcher trigger + pg_cron re-dispatch loop
--   ADR-029 §"Delivery semantics" + SPEC F1 AC1.7 / AC1.7b (#420)
-- ============================================================================
-- Purpose:
--   1. AFTER INSERT trigger on public.funnel_events that asynchronously
--      invokes the dispatch-funnel-event Edge Function via pg_net.http_post.
--      This is the happy-path dispatch (best case ~50-200ms latency).
--
--   2. pg_cron job that runs every 60s and re-dispatches any row stuck in
--      dispatch_status='pending' for >30s. Closes the pg_net no-retry gap
--      called out in ADR-029 §"Delivery semantics — pg_net is fire-and-forget".
--
-- Configuration:
--   The Edge Function URL is read from the GUC `app.dispatch_function_url`.
--   If unset (e.g. local dev without Edge Functions deployed), the trigger
--   silently no-ops; the row stays at dispatch_status='pending' and the
--   pg_cron loop will keep retrying until the URL is configured (or the
--   row hits dispatch_attempt_count=5 → 'failed').
--
--   The service-role key is read from `app.dispatch_service_role_key`. Same
--   no-op behaviour if absent.
--
--   Configure both via:
--     ALTER DATABASE postgres SET app.dispatch_function_url =
--       'https://<project-ref>.functions.supabase.co/dispatch-funnel-event';
--     ALTER DATABASE postgres SET app.dispatch_service_role_key = '<key>';
--
-- Safety:
--   - Trigger never raises (catches all errors → just leaves status='pending').
--   - pg_cron job uses CTE-then-update pattern so two concurrent runs don't
--     double-dispatch the same row (atomic increment of attempt_count under
--     row lock).
--   - Both extensions (pg_net, pg_cron) confirmed enabled per ADR-029.
-- ============================================================================

-- Defensive: ensure required extensions are present. These are platform-level
-- extensions on Supabase; CREATE EXTENSION IF NOT EXISTS is the canonical
-- idempotent guard. They live in the `extensions` schema on Supabase managed
-- databases — we don't reference them by schema since pg_cron exposes
-- cron.schedule() in a default-on-search-path location.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ----------------------------------------------------------------------------
-- 1. Helper: invoke the Edge Function for a single funnel_event row.
-- ----------------------------------------------------------------------------
-- Returns true if the http_post call was issued (regardless of HTTP outcome —
-- pg_net is fire-and-forget). False if the function URL/key is not configured
-- (caller should leave the row 'pending' for the next cron pass).
create or replace function public.fn_invoke_dispatch_funnel_event(
  p_event_id text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url     text := current_setting('app.dispatch_function_url', true);
  v_key     text := current_setting('app.dispatch_service_role_key', true);
  v_request bigint;
begin
  if v_url is null or v_url = '' then
    return false;
  end if;
  if v_key is null or v_key = '' then
    return false;
  end if;

  -- pg_net.http_post is fully async. Returns the request id immediately;
  -- the actual HTTP response is logged by pg_net itself.
  select net.http_post(
    url     := v_url,
    body    := jsonb_build_object('funnel_event_id', p_event_id),
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer ' || v_key
    ),
    timeout_milliseconds := 10000
  )
  into v_request;

  return true;
exception when others then
  -- Never raise from a trigger; the row keeps dispatch_status='pending' and
  -- the cron loop will retry.
  raise warning 'fn_invoke_dispatch_funnel_event(%) failed: %', p_event_id, sqlerrm;
  return false;
end;
$$;

comment on function public.fn_invoke_dispatch_funnel_event(text) is
  'Issues an async pg_net.http_post to the dispatch-funnel-event Edge '
  'Function. Returns false (no-op) if app.dispatch_function_url or '
  'app.dispatch_service_role_key GUCs are unset. ADR-029 §"Delivery '
  'semantics".';

-- ----------------------------------------------------------------------------
-- 2. AFTER INSERT trigger function — happy-path dispatch.
-- ----------------------------------------------------------------------------
create or replace function public.fn_funnel_events_dispatch_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Skip if already marked dispatched/failed (e.g. backfilled rows).
  if new.dispatch_status is distinct from 'pending' then
    return new;
  end if;

  -- Fire and forget. Outcome is logged by the Edge Function itself when it
  -- updates funnel_events.dispatch_status.
  perform public.fn_invoke_dispatch_funnel_event(new.event_id);

  return new;
end;
$$;

comment on function public.fn_funnel_events_dispatch_after_insert() is
  'AFTER INSERT trigger function on funnel_events. Fires the dispatcher '
  'asynchronously via pg_net. Cron loop (fn_funnel_events_redispatch_pending) '
  'handles failures and unconfigured-URL retries. SPEC F1 AC1.7.';

drop trigger if exists trg_funnel_events_dispatch_after_insert
  on public.funnel_events;

create trigger trg_funnel_events_dispatch_after_insert
  after insert on public.funnel_events
  for each row
  execute function public.fn_funnel_events_dispatch_after_insert();

-- ----------------------------------------------------------------------------
-- 3. Re-dispatch loop function — invoked by pg_cron every 60s.
-- ----------------------------------------------------------------------------
-- Strategy:
--   * Select up to 100 rows where:
--       dispatch_status = 'pending'
--       AND (dispatch_attempted_at IS NULL OR dispatch_attempted_at < now() - 30s)
--       AND dispatch_attempt_count < 5
--   * Atomically increment attempt_count and set dispatch_attempted_at = now()
--     in the SAME UPDATE statement (uses FOR UPDATE SKIP LOCKED in the CTE
--     so concurrent cron runs don't double-claim the same row).
--   * For each claimed row, call fn_invoke_dispatch_funnel_event.
--   * Rows that hit attempt_count = 5 are NOT touched here; a separate
--     UPDATE in the same function flips them to 'failed' permanently.
create or replace function public.fn_funnel_events_redispatch_pending()
returns table (claimed integer, exhausted integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claimed   integer := 0;
  v_exhausted integer := 0;
  r           record;
begin
  -- Step A: claim a batch (atomic increment + timestamp under row lock).
  for r in
    with claim as (
      select event_id
        from public.funnel_events
       where dispatch_status = 'pending'
         and dispatch_attempt_count < 5
         and (dispatch_attempted_at is null
              or dispatch_attempted_at < now() - interval '30 seconds')
       order by coalesce(dispatch_attempted_at, created_at) asc
       limit 100
       for update skip locked
    )
    update public.funnel_events fe
       set dispatch_attempt_count = fe.dispatch_attempt_count + 1,
           dispatch_attempted_at  = now()
      from claim
     where fe.event_id = claim.event_id
    returning fe.event_id
  loop
    perform public.fn_invoke_dispatch_funnel_event(r.event_id);
    v_claimed := v_claimed + 1;
  end loop;

  -- Step B: terminal-failure sweep — anything that has been attempted 5
  -- times AND is still 'pending' (i.e. the dispatcher never managed to flip
  -- to 'dispatched') gets marked 'failed' so we stop hammering it.
  update public.funnel_events
     set dispatch_status = 'failed'
   where dispatch_status = 'pending'
     and dispatch_attempt_count >= 5;
  get diagnostics v_exhausted = row_count;

  return query select v_claimed, v_exhausted;
end;
$$;

comment on function public.fn_funnel_events_redispatch_pending() is
  'pg_cron worker (every 60s). Claims up to 100 rows in dispatch_status='
  '''pending'' older than 30s, increments attempt_count atomically, invokes '
  'the dispatcher, then sweeps anything that hit 5 attempts to ''failed''. '
  'SPEC F1 AC1.7b.';

-- ----------------------------------------------------------------------------
-- 4. Schedule the cron job (idempotent — unschedule first if exists).
-- ----------------------------------------------------------------------------
-- We use a DO block so re-running this migration is safe even when the cron
-- job already exists from a previous run.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
    from cron.job
   where jobname = 'funnel_events_redispatch';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'funnel_events_redispatch',
    '* * * * *',  -- every 60s (cron's smallest interval)
    $cron$ select public.fn_funnel_events_redispatch_pending(); $cron$
  );
end$$;

-- ----------------------------------------------------------------------------
-- 5. Permissions
-- ----------------------------------------------------------------------------
revoke all on function public.fn_invoke_dispatch_funnel_event(text) from public;
revoke all on function public.fn_funnel_events_redispatch_pending()    from public;
grant execute on function public.fn_invoke_dispatch_funnel_event(text)
  to service_role;
grant execute on function public.fn_funnel_events_redispatch_pending()
  to service_role;
