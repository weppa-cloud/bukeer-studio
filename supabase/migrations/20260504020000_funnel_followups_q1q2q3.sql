-- Follow-up improvements addressing 5 PR review questions resolved 2026-05-03
-- Posted as comments on PRs #426 (F1), #427 (F3), #428 (F2). All 5 are
-- additive — no destructive changes to the merged migrations.
--
-- Q1.2 (PR #426): assertion check for pg_net + pg_cron extensions on top of
--                 the existing idempotent CREATE EXTENSION lines so new envs
--                 fail loud if either extension is unavailable.
-- Q3.1 (PR #427): record_lead_stage_change accepts optional p_locale + p_market
--                 parameters with NULL → fallback to lead's account locale (if
--                 carried) or es-CO/CO. Avoids breaking change when
--                 bukeer-flutter#797 ships with mixed-market leads.
-- Q3.3 (PR #427): funnel_events_emission_errors sentinel table + updated
--                 fn_emit_crm_booking_confirmed exception handler that records
--                 a row when the trigger swallows an error. Closes the
--                 visibility gap where SQL-level emission failures never
--                 reached the AC1.9 dashboard.
-- Q2.1 (PR #428): FOREIGN KEY ON DELETE CASCADE on
--                 google_ads_offline_uploads.funnel_event_id → funnel_events.event_id.
--                 Restores referential integrity that the original migration
--                 omitted to allow lossy concurrent inserts (mitigated via
--                 unique key + ON CONFLICT DO NOTHING in the dispatcher).
--
-- (Q2.3 lives in middleware.ts, not this migration.)

-- ============================================================================
-- Q1.2 — Assertion check for required extensions
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception
      'Required extension pg_net is not installed. Contact DBA — funnel_events dispatch trigger depends on pg_net.http_post.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception
      'Required extension pg_cron is not installed. Contact DBA — funnel_events re-dispatch loop depends on pg_cron.';
  end if;
end $$;

-- ============================================================================
-- Q3.3 — funnel_events_emission_errors sentinel table
-- ============================================================================

create table if not exists public.funnel_events_emission_errors (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  source_table text not null,
  source_id uuid,
  intended_event_name text,
  error_message text,
  error_sqlstate text,
  raw_context jsonb,
  resolved_at timestamptz,
  resolved_note text
);

comment on table public.funnel_events_emission_errors is
  'Sentinel log for SQL-level funnel event emission failures (e.g. trigger exception). Read by AC1.9 monitoring dashboard alongside funnel_events.dispatch_status. Q3.3 of PR #427 review.';

create index if not exists funnel_events_emission_errors_unresolved_idx
  on public.funnel_events_emission_errors (occurred_at desc)
  where resolved_at is null;

create index if not exists funnel_events_emission_errors_source_idx
  on public.funnel_events_emission_errors (source_table, source_id);

alter table public.funnel_events_emission_errors enable row level security;

drop policy if exists "service-role manages emission errors"
  on public.funnel_events_emission_errors;
create policy "service-role manages emission errors"
  on public.funnel_events_emission_errors
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "tenant read emission errors"
  on public.funnel_events_emission_errors;
create policy "tenant read emission errors"
  on public.funnel_events_emission_errors
  for select
  to authenticated
  using (true);
-- NB: tenant scoping not enforced here because this is operational telemetry,
-- not customer data. Authenticated dashboard users see all emission errors.

-- ============================================================================
-- Q3.3 — Updated fn_emit_crm_booking_confirmed handler that ALSO writes to
--        the sentinel table when an exception occurs.
-- ============================================================================

create or replace function public.fn_emit_crm_booking_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event_id text;
  v_pixel_event_id text;
  v_event_time timestamptz;
  v_value_amount numeric;
  v_value_currency text;
  v_total_markup_missing boolean := false;
  v_payload jsonb;
  v_rpc_result jsonb;
begin
  -- Guard: only fire when status flips to 'Confirmado'
  if not (coalesce(old.status, '') <> 'Confirmado'
          and new.status = 'Confirmado') then
    return new;
  end if;

  v_event_time := coalesce(new.updated_at, now());

  -- Deterministic event_id (matches record_booking_confirmed RPC formula)
  v_event_id := encode(
    digest(
      new.id::text || ':crm_booking_confirmed:' || v_event_time::text,
      'sha256'
    ),
    'hex'
  );
  v_pixel_event_id := gen_random_uuid()::text;

  -- Value derivation (per 2026-05-03 sign-off Option A: total_markup, NOT total_amount)
  if new.total_markup is null then
    v_value_amount := 0;
    v_total_markup_missing := true;
    raise notice
      'fn_emit_crm_booking_confirmed: itinerary % has NULL total_markup -- emitting with value_amount=0 and total_markup_missing=true flag (historical ~1.2%% gap).',
      new.id;
  else
    v_value_amount := new.total_markup;
  end if;

  v_value_currency := coalesce(new.currency_type, 'COP');

  v_payload := jsonb_build_object(
    'event_id',         v_event_id,
    'pixel_event_id',   v_pixel_event_id,
    'event_name',       'crm_booking_confirmed',
    'event_time',       v_event_time,
    'source',           'db_trigger',
    'account_id',       new.account_id,
    'website_id',       new.website_id,
    'external_id',      new.id::text,
    'value_amount',     v_value_amount,
    'value_currency',   v_value_currency,
    'raw_payload',      jsonb_build_object(
      'itinerary_id',           new.id,
      'total_amount',           new.total_amount,
      'total_cost',             new.total_cost,
      'total_markup',           new.total_markup,
      'total_markup_missing',   v_total_markup_missing,
      'status_was',             old.status,
      'status_now',             new.status,
      'currency_type',          new.currency_type
    )
  );

  begin
    v_rpc_result := public.record_funnel_event(v_payload);
  exception
    when others then
      raise warning
        'fn_emit_crm_booking_confirmed: emission failed for itinerary %: % (%)',
        new.id, sqlerrm, sqlstate;
      -- Q3.3: also write a sentinel row so AC1.9 dashboard sees this
      begin
        insert into public.funnel_events_emission_errors (
          source_table,
          source_id,
          intended_event_name,
          error_message,
          error_sqlstate,
          raw_context
        ) values (
          'itineraries',
          new.id,
          'crm_booking_confirmed',
          sqlerrm,
          sqlstate,
          jsonb_build_object(
            'itinerary_id',         new.id,
            'total_markup',         new.total_markup,
            'total_amount',         new.total_amount,
            'currency_type',        new.currency_type,
            'status_was',           old.status,
            'status_now',           new.status,
            'attempted_event_id',   v_event_id,
            'attempted_payload',    v_payload
          )
        );
      exception
        when others then
          -- Final fallback: never block the user UPDATE even if the sentinel
          -- INSERT itself fails (e.g. table missing, RLS misconfig).
          raise warning
            'fn_emit_crm_booking_confirmed: sentinel insert ALSO failed for itinerary %: % (%). User UPDATE preserved.',
            new.id, sqlerrm, sqlstate;
      end;
  end;

  return new;
end;
$$;

comment on function public.fn_emit_crm_booking_confirmed() is
  'AFTER UPDATE trigger on itineraries that emits crm_booking_confirmed funnel event when status flips to Confirmado. Updated 2026-05-04 (Q3.3 of PR #427) to also record exceptions in funnel_events_emission_errors so AC1.9 dashboard catches SQL-level failures.';

-- ============================================================================
-- Q3.1 — record_lead_stage_change accepts optional p_locale + p_market
-- ============================================================================
-- Strategy: drop the original 3-arg signature (no callers yet — bukeer-flutter#797
-- hasn't shipped) and recreate with 5 args (3 required + 2 optional with NULL
-- defaults). When NULL, fall back to lead's account locale/market if carried,
-- else hardcoded es-CO / CO.

drop function if exists public.record_lead_stage_change(uuid, text, uuid);

create or replace function public.record_lead_stage_change(
  p_lead_id uuid,
  p_new_stage text,
  p_agent_id uuid,
  p_locale text default null,
  p_market text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request record;
  v_event_name text;
  v_event_id text;
  v_event_time timestamptz := now();
  v_stage text;
  v_account_locale text;
  v_account_market text;
  v_resolved_locale text;
  v_resolved_market text;
  v_payload jsonb;
  v_result jsonb;
begin
  if p_lead_id is null then
    raise exception 'record_lead_stage_change: p_lead_id is required'
      using errcode = '22023';
  end if;
  if p_new_stage is null then
    raise exception 'record_lead_stage_change: p_new_stage is required'
      using errcode = '22023';
  end if;

  -- Stage → canonical event_name map. Returns NULL for stages with no event
  -- (e.g. 'lead_dropped' tracked internally but not propagated to Ads/Meta).
  v_stage := lower(trim(p_new_stage));
  v_event_name := case v_stage
    when 'qualified'     then 'crm_lead_stage_qualified'
    when 'qualified_lead' then 'crm_lead_stage_qualified'
    when 'quote_sent'    then 'crm_quote_sent'
    when 'quoted'        then 'crm_quote_sent'
    when 'lead_dropped'  then null
    else null
  end;

  if v_event_name is null then
    return jsonb_build_object(
      'recorded',       false,
      'reason',         'stage_not_mapped',
      'stage_received', p_new_stage
    );
  end if;

  -- Lookup the request row (Bukeer's lead-equivalent table)
  select id, account_id, website_id, custom_fields, lead_source
    into v_request
    from public.requests
    where id = p_lead_id
    limit 1;

  if not found then
    raise exception 'record_lead_stage_change: request % not found', p_lead_id
      using errcode = 'P0002';
  end if;

  -- Resolve locale/market with priority:
  --   1. Explicit p_locale / p_market (Flutter caller knows the lead's market)
  --   2. Account-level default (if accounts table carries it)
  --   3. Hardcoded es-CO / CO (single-tenant ColombiaTours fallback)
  begin
    select default_locale, default_market
      into v_account_locale, v_account_market
      from public.accounts
      where id = v_request.account_id
      limit 1;
  exception
    when undefined_column then
      -- accounts table doesn't expose default_locale/default_market columns
      v_account_locale := null;
      v_account_market := null;
    when others then
      v_account_locale := null;
      v_account_market := null;
  end;

  v_resolved_locale := coalesce(p_locale, v_account_locale, 'es-CO');
  v_resolved_market := coalesce(p_market, v_account_market, 'CO');

  -- Deterministic event_id (idempotent: same lead + stage + minute → same id)
  v_event_id := encode(
    digest(
      v_request.id::text || ':' || v_event_name || ':' || v_event_time::text,
      'sha256'
    ),
    'hex'
  );

  v_payload := jsonb_build_object(
    'event_id',       v_event_id,
    'pixel_event_id', gen_random_uuid()::text,
    'event_name',     v_event_name,
    'event_time',     v_event_time,
    'source',         'flutter_crm',
    'account_id',     v_request.account_id,
    'website_id',     v_request.website_id,
    'external_id',    v_request.id::text,
    'locale',         v_resolved_locale,
    'market',         v_resolved_market,
    'raw_payload',    jsonb_build_object(
      'request_id',          v_request.id,
      'agent_id',            p_agent_id,
      'stage_received',      p_new_stage,
      'stage_canonical',     v_stage,
      'locale_source',       case
        when p_locale is not null then 'caller'
        when v_account_locale is not null then 'account_default'
        else 'fallback_es-CO'
      end,
      'market_source',       case
        when p_market is not null then 'caller'
        when v_account_market is not null then 'account_default'
        else 'fallback_CO'
      end,
      'lead_source',         v_request.lead_source,
      'source',              'record_lead_stage_change_rpc'
    )
  );

  v_result := public.record_funnel_event(v_payload);
  return v_result;
end;
$$;

revoke all on function public.record_lead_stage_change(uuid, text, uuid, text, text) from public;
grant execute on function public.record_lead_stage_change(uuid, text, uuid, text, text) to service_role, authenticated;

comment on function public.record_lead_stage_change(uuid, text, uuid, text, text) is
  'CRM stage-change RPC for Flutter callers. p_locale/p_market optional (NULL = fallback to account default → es-CO/CO). Maps p_new_stage to canonical event_name; returns {recorded: false, reason: stage_not_mapped} for stages that intentionally have no Ads/Meta event (e.g. lead_dropped). Updated 2026-05-04 (Q3.1 of PR #427).';

-- ============================================================================
-- Q2.1 — FK with ON DELETE CASCADE on google_ads_offline_uploads
-- ============================================================================
-- Original migration left the column FK-less to allow concurrent inserts.
-- That's better solved by the existing UNIQUE (funnel_event_id, conversion_action_id)
-- + ON CONFLICT DO NOTHING in the dispatcher. With the FK + CASCADE we get:
--   * Referential integrity (no orphan upload rows)
--   * Automatic cleanup on funnel_events row deletion (GDPR / LFPDPPP requests)
--
-- IF NOT EXISTS guard so this migration is idempotent if rerun.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'google_ads_offline_uploads_funnel_event_fk'
      and conrelid = 'public.google_ads_offline_uploads'::regclass
  ) then
    -- Drop any orphan rows first (defensive — should be empty in fresh prod)
    delete from public.google_ads_offline_uploads u
    where funnel_event_id is not null
      and not exists (
        select 1 from public.funnel_events e
        where e.event_id = u.funnel_event_id
      );

    alter table public.google_ads_offline_uploads
      add constraint google_ads_offline_uploads_funnel_event_fk
      foreign key (funnel_event_id)
      references public.funnel_events(event_id)
      on delete cascade;
  end if;
end $$;

comment on constraint google_ads_offline_uploads_funnel_event_fk
  on public.google_ads_offline_uploads is
  'FK with CASCADE so deletion of a funnel_event (e.g. via GDPR/LFPDPPP request handling) automatically removes the corresponding offline upload log row. Q2.1 of PR #428 review.';
