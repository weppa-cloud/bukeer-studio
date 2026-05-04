-- ============================================================================
-- F3 Studio side -- RPC wrappers exposed to Flutter (#797 cross-repo)
-- ============================================================================
-- Tracking: Issue #422 (F3 Studio) · Cross-repo bukeer-flutter#797 · ADR-029
--
-- Purpose:
--   Two thin SECURITY DEFINER wrappers around `record_funnel_event` that:
--     * Read row state from the canonical entity (itinerary or request)
--     * Build the funnel-event payload server-side (so Flutter never has to
--       know the value_amount/locale/market derivation logic)
--     * Call record_funnel_event with a deterministic event_id (idempotent)
--
-- Functions:
--   1. record_booking_confirmed(p_itinerary_id uuid)
--   2. record_lead_stage_change(p_lead_id uuid, p_new_stage text, p_agent_id uuid)
--
-- Cross-repo dependency: bukeer-flutter#797 wires both wrappers into the CRM UI.
-- Permissions: SECURITY DEFINER. EXECUTE granted to service_role + authenticated.
-- ============================================================================

create or replace function public.record_booking_confirmed(p_itinerary_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $func$
declare
  v_itinerary record;
  v_website_id uuid;
  v_reference_code text;
  v_event_time timestamptz;
  v_locale text;
  v_market text;
  v_value_amount numeric;
  v_total_markup_missing boolean := false;
  v_event_id text;
  v_pixel_event_id text;
  v_payload jsonb;
  v_raw_payload jsonb;
  v_result jsonb;
begin
  if p_itinerary_id is null then
    raise exception 'record_booking_confirmed: p_itinerary_id is required'
      using errcode = 'P0001';
  end if;

  select
    i.id,
    i.account_id,
    i.status,
    i.id_fm,
    i.language,
    i.total_amount,
    i.total_cost,
    i.total_markup,
    i.currency_type,
    i.confirmed_at,
    i.confirmation_date,
    i.updated_at,
    coalesce(i.custom_fields, '{}'::jsonb) as custom_fields
  into v_itinerary
  from public.itineraries i
  where i.id = p_itinerary_id;

  if not found then
    raise exception 'record_booking_confirmed: itinerary % not found', p_itinerary_id
      using errcode = 'P0002';
  end if;

  if v_itinerary.account_id is null then
    raise exception 'record_booking_confirmed: itinerary % has no account_id', p_itinerary_id
      using errcode = 'P0001';
  end if;

  if v_itinerary.status is distinct from 'Confirmado' then
    return jsonb_build_object(
      'inserted',  false,
      'skipped',   true,
      'reason',    'itinerary_not_confirmed',
      'status',    v_itinerary.status
    );
  end if;

  select w.id
  into v_website_id
  from public.websites w
  where w.account_id = v_itinerary.account_id
    and w.status = 'published'
  order by
    case when w.subdomain = 'colombiatours' then 0 else 1 end,
    w.updated_at desc nulls last
  limit 1;

  if v_website_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped',  true,
      'reason',   'no_published_website_for_account',
      'account_id', v_itinerary.account_id
    );
  end if;

  v_reference_code := coalesce(
    nullif(v_itinerary.custom_fields->>'growth_reference_code', ''),
    nullif(v_itinerary.custom_fields->>'reference_code', ''),
    case
      when v_itinerary.id_fm is not null and length(v_itinerary.id_fm) >= 8
        then v_itinerary.id_fm
      else 'ITN-' || left(replace(v_itinerary.id::text, '-', ''), 28)
    end
  );

  v_event_time := coalesce(
    v_itinerary.confirmed_at,
    v_itinerary.confirmation_date::timestamptz,
    v_itinerary.updated_at,
    now()
  );

  v_locale := case
    when lower(coalesce(v_itinerary.language, '')) in ('en', 'en-us', 'english', 'ingles') then 'en-US'
    else 'es-CO'
  end;

  v_market := coalesce(
    nullif(upper(v_itinerary.custom_fields->>'market'), ''),
    case upper(coalesce(v_itinerary.currency_type, ''))
      when 'MXN' then 'MX'
      when 'USD' then 'US'
      else 'CO'
    end
  );
  if v_market not in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER') then
    v_market := 'OTHER';
  end if;

  if v_itinerary.total_markup is null then
    v_total_markup_missing := true;
    v_value_amount := 0;
  else
    v_value_amount := v_itinerary.total_markup;
  end if;

  v_event_id := encode(
    digest(
      v_itinerary.id::text || ':crm_booking_confirmed:' || floor(extract(epoch from v_event_time))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  v_pixel_event_id := gen_random_uuid()::text;

  v_raw_payload := jsonb_build_object(
    'itinerary_id',          v_itinerary.id,
    'total_amount',          v_itinerary.total_amount,
    'total_cost',            v_itinerary.total_cost,
    'total_markup',          v_itinerary.total_markup,
    'total_markup_missing',  v_total_markup_missing,
    'source',                'record_booking_confirmed_rpc'
  );

  v_payload := jsonb_build_object(
    'event_id',        v_event_id,
    'pixel_event_id',  v_pixel_event_id,
    'event_name',      'crm_booking_confirmed',
    'event_time',      v_event_time,
    'source',          'flutter_crm',
    'reference_code',  v_reference_code,
    'account_id',      v_itinerary.account_id,
    'website_id',      v_website_id,
    'locale',          v_locale,
    'market',          v_market,
    'stage',           'realized',
    'channel',         'unknown',
    'external_id',     v_itinerary.id::text,
    'value_amount',    v_value_amount,
    'value_currency',  coalesce(v_itinerary.currency_type, 'COP'),
    'raw_payload',     v_raw_payload
  );

  v_result := public.record_funnel_event(v_payload);
  return v_result;
end;
$func$;

revoke all on function public.record_booking_confirmed(uuid) from public;
revoke all on function public.record_booking_confirmed(uuid) from anon;
grant execute on function public.record_booking_confirmed(uuid) to service_role;
grant execute on function public.record_booking_confirmed(uuid) to authenticated;

comment on function public.record_booking_confirmed(uuid) is
  'F3 (#422). Wrapper for record_funnel_event scoped to a single itinerary. '
  'Builds canonical crm_booking_confirmed payload (value_amount = '
  'itineraries.total_markup, sign-off 2026-05-03 Option A). Idempotent: '
  'shares event_id with trg_itinerary_emit_crm_booking_confirmed, so calling '
  'manually + auto produces a single row. Cross-repo callers: bukeer-flutter#797.';

create or replace function public.record_lead_stage_change(
  p_lead_id uuid,
  p_new_stage text,
  p_agent_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $func$
declare
  v_request record;
  v_website_id uuid;
  v_event_name text;
  v_event_time timestamptz;
  v_event_id text;
  v_pixel_event_id text;
  v_reference_code text;
  v_payload jsonb;
  v_raw_payload jsonb;
  v_result jsonb;
begin
  if p_lead_id is null then
    raise exception 'record_lead_stage_change: p_lead_id is required'
      using errcode = 'P0001';
  end if;
  if p_new_stage is null or p_new_stage = '' then
    raise exception 'record_lead_stage_change: p_new_stage is required'
      using errcode = 'P0001';
  end if;

  v_event_name := case lower(p_new_stage)
    when 'qualified'                  then 'crm_lead_stage_qualified'
    when 'crm_lead_stage_qualified'   then 'crm_lead_stage_qualified'
    when 'quote_sent'                 then 'crm_quote_sent'
    when 'crm_quote_sent'             then 'crm_quote_sent'
    when 'lead_dropped'               then null
    else null
  end;

  if v_event_name is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped',  true,
      'reason',   'no_event_for_stage',
      'stage',    p_new_stage
    );
  end if;

  select
    r.id,
    r.chatwoot_conversation_id,
    coalesce(r.updated_at, r.created_at, now()) as event_time,
    coalesce(i.account_id, c.account_id) as account_id,
    nullif(r.short_id, '') as short_id
  into v_request
  from public.requests r
  left join public.itineraries i on i.request_id = r.id
  left join public.contacts c on c.id = r.contact_id
  where r.id = p_lead_id
  order by i.created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'record_lead_stage_change: request % not found', p_lead_id
      using errcode = 'P0002';
  end if;

  if v_request.account_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped',  true,
      'reason',   'no_account_id_for_request',
      'lead_id',  p_lead_id
    );
  end if;

  select w.id
  into v_website_id
  from public.websites w
  where w.account_id = v_request.account_id
    and w.status = 'published'
  order by
    case when w.subdomain = 'colombiatours' then 0 else 1 end,
    w.updated_at desc nulls last
  limit 1;

  if v_website_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped',  true,
      'reason',   'no_published_website_for_account',
      'account_id', v_request.account_id
    );
  end if;

  v_event_time := v_request.event_time;

  v_reference_code := coalesce(
    case when v_request.short_id is not null and length(v_request.short_id) >= 8
         then v_request.short_id
         else null
    end,
    'REQ-' || left(replace(v_request.id::text, '-', ''), 28)
  );

  v_event_id := encode(
    digest(
      v_request.id::text || ':' || v_event_name || ':' || floor(extract(epoch from v_event_time))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  v_pixel_event_id := gen_random_uuid()::text;

  v_raw_payload := jsonb_build_object(
    'lead_id',                  v_request.id,
    'agent_id',                 p_agent_id,
    'new_stage',                p_new_stage,
    'chatwoot_conversation_id', v_request.chatwoot_conversation_id,
    'source',                   'record_lead_stage_change_rpc'
  );

  v_payload := jsonb_build_object(
    'event_id',        v_event_id,
    'pixel_event_id',  v_pixel_event_id,
    'event_name',      v_event_name,
    'event_time',      v_event_time,
    'source',          'flutter_crm',
    'reference_code',  v_reference_code,
    'account_id',      v_request.account_id,
    'website_id',      v_website_id,
    'locale',          'es-CO',
    'market',          'CO',
    'stage',           case v_event_name
                          when 'crm_lead_stage_qualified' then 'qualify'
                          when 'crm_quote_sent'           then 'lead'
                          else 'lead'
                       end,
    'channel',         'unknown',
    'external_id',     v_request.id::text,
    'raw_payload',     v_raw_payload
  );

  v_result := public.record_funnel_event(v_payload);
  return v_result;
end;
$func$;

revoke all on function public.record_lead_stage_change(uuid, text, uuid) from public;
revoke all on function public.record_lead_stage_change(uuid, text, uuid) from anon;
grant execute on function public.record_lead_stage_change(uuid, text, uuid) to service_role;
grant execute on function public.record_lead_stage_change(uuid, text, uuid) to authenticated;

comment on function public.record_lead_stage_change(uuid, text, uuid) is
  'F3 (#422). Wrapper for record_funnel_event for CRM stage transitions on '
  'requests. Maps qualified/quote_sent/lead_dropped to canonical event names. '
  'Returns {inserted|skipped, reason?} so Flutter can show friendly errors. '
  'Cross-repo callers: bukeer-flutter#797 wires this into the CRM stage UI.';
