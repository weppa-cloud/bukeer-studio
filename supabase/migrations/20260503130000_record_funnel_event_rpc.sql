-- ============================================================================
-- record_funnel_event RPC — canonical writer entry point per ADR-029 / SPEC F1
-- ============================================================================
-- Purpose:
--   Single SECURITY DEFINER function that all writers (Studio worker,
--   Flutter CRM, future db_trigger callers) invoke to persist a funnel
--   event. Idempotent on `event_id` PK (sha256-derived).
--
-- Contract (matches lib/funnel/dispatch.ts payload shape):
--   payload (jsonb) MUST include:
--     - event_id        text   (sha256 64-hex, becomes the PK)
--     - event_name      text   (validated against funnel_events_event_name_chk)
--     - event_time      timestamptz (canonical ADR-029 name; mapped to
--                        funnel_events.occurred_at)
--     - source          text   (studio_web|chatwoot|flutter_crm|db_trigger)
--     - reference_code  text   (8..64 chars; load-bearing dedup correlator)
--     - account_id      uuid
--     - website_id      uuid
--     - locale          text
--     - market          text
--   Optional keys:
--     pixel_event_id, stage, channel, attribution, payload (jsonb),
--     source_url, page_path, user_email, user_phone, user_id, external_id,
--     fbp, fbc, ctwa_clid, gclid, gbraid, wbraid,
--     utm_source, utm_medium, utm_campaign, utm_term, utm_content,
--     ip_address (text/inet), user_agent, value_amount (numeric),
--     value_currency.
--
-- Returns (jsonb):
--   { inserted: true,  event_id, dispatch_status: 'pending' }   on insert
--   { inserted: false, deduped: true,  event_id }               on PK conflict
--
-- Errors (raised as PostgreSQL exceptions, surfaced to caller):
--   - Missing required key → P0001 with detail "missing key: <name>"
--   - Invalid event_name   → naturally raised by CHECK constraint (23514)
--
-- Security:
--   SECURITY DEFINER (executes as owner) so service-role callers can write
--   without per-row RLS friction. EXECUTE granted ONLY to service_role —
--   anon/authenticated cannot reach it directly. Browser code MUST go through
--   a Studio worker route which then calls this RPC server-side.
-- ============================================================================

create or replace function public.record_funnel_event(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id          text;
  v_event_name        text;
  v_event_time        timestamptz;
  v_source            text;
  v_reference_code    text;
  v_account_id        uuid;
  v_website_id        uuid;
  v_locale            text;
  v_market            text;
  v_inserted          boolean;
  v_existing          boolean;
begin
  -- --- Required-key validation ---------------------------------------------
  v_event_id       := payload->>'event_id';
  v_event_name     := payload->>'event_name';
  v_event_time     := nullif(payload->>'event_time', '')::timestamptz;
  v_source         := payload->>'source';
  v_reference_code := payload->>'reference_code';
  v_account_id     := nullif(payload->>'account_id', '')::uuid;
  v_website_id     := nullif(payload->>'website_id', '')::uuid;
  v_locale         := payload->>'locale';
  v_market         := payload->>'market';

  if v_event_id is null or v_event_id = '' then
    raise exception 'record_funnel_event: missing key: event_id'
      using errcode = 'P0001';
  end if;
  if v_event_name is null or v_event_name = '' then
    raise exception 'record_funnel_event: missing key: event_name'
      using errcode = 'P0001';
  end if;
  if v_event_time is null then
    raise exception 'record_funnel_event: missing key: event_time'
      using errcode = 'P0001';
  end if;
  if v_source is null or v_source = '' then
    raise exception 'record_funnel_event: missing key: source'
      using errcode = 'P0001';
  end if;
  if v_reference_code is null or v_reference_code = '' then
    raise exception 'record_funnel_event: missing key: reference_code'
      using errcode = 'P0001';
  end if;
  if v_account_id is null then
    raise exception 'record_funnel_event: missing key: account_id'
      using errcode = 'P0001';
  end if;
  if v_website_id is null then
    raise exception 'record_funnel_event: missing key: website_id'
      using errcode = 'P0001';
  end if;
  if v_locale is null or v_locale = '' then
    raise exception 'record_funnel_event: missing key: locale'
      using errcode = 'P0001';
  end if;
  if v_market is null or v_market = '' then
    raise exception 'record_funnel_event: missing key: market'
      using errcode = 'P0001';
  end if;

  -- --- Friendly pre-check on event_name (defence in depth; CHECK is SOT) ---
  -- The CHECK constraint enforces the canonical set; we do not duplicate the
  -- enum here (avoids drift). If invalid, the INSERT below will raise 23514
  -- and the caller sees the constraint name.

  -- --- Idempotent insert ----------------------------------------------------
  insert into public.funnel_events as fe (
    event_id,
    pixel_event_id,
    event_name,
    stage,
    channel,
    reference_code,
    account_id,
    website_id,
    locale,
    market,
    occurred_at,
    source,
    user_email,
    user_phone,
    user_id,
    external_id,
    fbp,
    fbc,
    ctwa_clid,
    gclid,
    gbraid,
    wbraid,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    ip_address,
    user_agent,
    value_amount,
    value_currency,
    attribution,
    payload,
    source_url,
    page_path
  )
  values (
    v_event_id,
    nullif(payload->>'pixel_event_id', ''),
    v_event_name,
    coalesce(payload->>'stage', 'lead'),
    coalesce(payload->>'channel', 'unknown'),
    v_reference_code,
    v_account_id,
    v_website_id,
    v_locale,
    v_market,
    v_event_time,
    v_source,
    nullif(payload->>'user_email', ''),
    nullif(payload->>'user_phone', ''),
    nullif(payload->>'user_id', '')::uuid,
    nullif(payload->>'external_id', ''),
    nullif(payload->>'fbp', ''),
    nullif(payload->>'fbc', ''),
    nullif(payload->>'ctwa_clid', ''),
    nullif(payload->>'gclid', ''),
    nullif(payload->>'gbraid', ''),
    nullif(payload->>'wbraid', ''),
    nullif(payload->>'utm_source', ''),
    nullif(payload->>'utm_medium', ''),
    nullif(payload->>'utm_campaign', ''),
    nullif(payload->>'utm_term', ''),
    nullif(payload->>'utm_content', ''),
    nullif(payload->>'ip_address', '')::inet,
    nullif(payload->>'user_agent', ''),
    nullif(payload->>'value_amount', '')::numeric,
    nullif(payload->>'value_currency', ''),
    case when payload ? 'attribution' then payload->'attribution' else null end,
    coalesce(payload->'raw_payload', payload->'payload', '{}'::jsonb),
    nullif(payload->>'source_url', ''),
    nullif(payload->>'page_path', '')
  )
  on conflict (event_id) do nothing
  returning true into v_inserted;

  if v_inserted is true then
    return jsonb_build_object(
      'inserted',        true,
      'event_id',        v_event_id,
      'dispatch_status', 'pending'
    );
  end if;

  -- ON CONFLICT path: row already exists. Confirm it does (paranoia: surface
  -- a friendlier error if conflict happened on a different unique constraint).
  select true into v_existing
    from public.funnel_events
   where event_id = v_event_id
   limit 1;

  if v_existing is true then
    return jsonb_build_object(
      'inserted', false,
      'deduped',  true,
      'event_id', v_event_id
    );
  end if;

  raise exception 'record_funnel_event: insert returned no row but event_id not found (%)', v_event_id
    using errcode = 'P0001';
end;
$$;

revoke all on function public.record_funnel_event(jsonb) from public;
revoke all on function public.record_funnel_event(jsonb) from anon;
revoke all on function public.record_funnel_event(jsonb) from authenticated;
grant execute on function public.record_funnel_event(jsonb) to service_role;

comment on function public.record_funnel_event(jsonb) is
  'Canonical funnel-event writer (ADR-029, SPEC F1 #420). SECURITY DEFINER; '
  'service-role-only. Idempotent on event_id PK. Returns jsonb '
  '{inserted, deduped?, event_id, dispatch_status?}. event_name validated by '
  'funnel_events_event_name_chk CHECK constraint (constraint name surfaces in '
  'errors).';
