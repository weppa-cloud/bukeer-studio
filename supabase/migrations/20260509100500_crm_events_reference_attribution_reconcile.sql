-- Reconcile CRM funnel event writers for production validation.
--
-- Fixes:
-- - record_lead_stage_change was absent in production.
-- - fn_emit_crm_booking_confirmed referenced itineraries.website_id, which does
--   not exist in the live schema.
-- - CRM events must inherit attribution/click IDs from the WAFlow lead matched
--   by growth_reference_code.

create or replace function public.record_lead_stage_change(
  p_lead_id uuid,
  p_new_stage text,
  p_agent_id uuid default null,
  p_locale text default null,
  p_market text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_request record;
  v_website_id uuid;
  v_lead record;
  v_event_name text;
  v_stage text;
  v_event_time timestamptz := now();
  v_event_id text;
  v_reference_code text;
  v_attribution jsonb := '{}'::jsonb;
  v_click_ids jsonb := '{}'::jsonb;
  v_utm jsonb := '{}'::jsonb;
  v_payload jsonb;
begin
  if p_lead_id is null then
    raise exception 'record_lead_stage_change: p_lead_id is required'
      using errcode = '22023';
  end if;

  v_stage := lower(trim(coalesce(p_new_stage, '')));
  v_event_name := case v_stage
    when 'qualified' then 'crm_lead_stage_qualified'
    when 'qualified_lead' then 'crm_lead_stage_qualified'
    when 'crm_lead_stage_qualified' then 'crm_lead_stage_qualified'
    when 'quote_sent' then 'crm_quote_sent'
    when 'quoted' then 'crm_quote_sent'
    when 'crm_quote_sent' then 'crm_quote_sent'
    when 'lead_dropped' then null
    else null
  end;

  if v_event_name is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped', true,
      'reason', 'stage_not_mapped',
      'stage_received', p_new_stage
    );
  end if;

  select
    r.id,
    r.account_id,
    r.short_id,
    r.chatwoot_conversation_id,
    r.traveler_phone,
    r.traveler_email,
    coalesce(r.custom_fields, '{}'::jsonb) as custom_fields,
    coalesce(r.updated_at, r.created_at, now()) as row_time
  into v_request
  from public.requests r
  where r.id = p_lead_id
  limit 1;

  if not found then
    raise exception 'record_lead_stage_change: request % not found', p_lead_id
      using errcode = 'P0002';
  end if;

  if v_request.account_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped', true,
      'reason', 'no_account_id_for_request',
      'lead_id', p_lead_id
    );
  end if;

  select w.id
  into v_website_id
  from public.websites w
  where w.account_id = v_request.account_id
    and w.status = 'published'
  order by case when w.subdomain = 'colombiatours' then 0 else 1 end,
           w.updated_at desc nulls last
  limit 1;

  if v_website_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped', true,
      'reason', 'no_published_website_for_account',
      'account_id', v_request.account_id
    );
  end if;

  v_reference_code := coalesce(
    nullif(v_request.custom_fields->>'growth_reference_code', ''),
    nullif(v_request.custom_fields->>'reference_code', ''),
    case when v_request.short_id is not null and length(v_request.short_id) >= 8
      then v_request.short_id
      else null
    end,
    'REQ-' || left(replace(v_request.id::text, '-', ''), 28)
  );

  select wl.*
  into v_lead
  from public.waflow_leads wl
  where wl.account_id = v_request.account_id
    and wl.reference_code = v_reference_code
  order by wl.created_at desc
  limit 1;

  if found then
    v_attribution := coalesce(v_lead.payload->'attribution', '{}'::jsonb);
    v_click_ids := coalesce(v_attribution->'click_ids', '{}'::jsonb);
    v_utm := coalesce(v_attribution->'utm', '{}'::jsonb);
  end if;

  v_event_time := coalesce(v_request.row_time, now());
  v_event_id := encode(
    digest(
      v_request.id::text || ':' || v_event_name || ':' || floor(extract(epoch from v_event_time))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  v_payload := jsonb_build_object(
    'event_id', v_event_id,
    'pixel_event_id', gen_random_uuid()::text,
    'event_name', v_event_name,
    'event_time', v_event_time,
    'source', 'flutter_crm',
    'source_system', 'flutter_crm',
    'reference_code', v_reference_code,
    'account_id', v_request.account_id,
    'website_id', v_website_id,
    'locale', coalesce(p_locale, v_attribution->>'locale', 'es-CO'),
    'market', coalesce(p_market, v_attribution->>'market', 'CO'),
    'business_stage', case when v_event_name = 'crm_quote_sent' then 'quote' else 'qualify' end,
    'channel', case when v_lead.id is not null then 'chatwoot' else 'unknown' end,
    'external_id', v_request.id::text,
    'user_phone', coalesce(v_request.traveler_phone, v_lead.payload->>'phone'),
    'user_email', coalesce(v_request.traveler_email, v_lead.payload->>'email'),
    'fbp', coalesce(v_attribution->>'fbp', v_click_ids->>'fbp'),
    'fbc', coalesce(v_attribution->>'fbc', v_click_ids->>'fbc'),
    'ctwa_clid', coalesce(v_attribution->>'ctwa_clid', v_click_ids->>'ctwa_clid'),
    'gclid', v_click_ids->>'gclid',
    'gbraid', v_click_ids->>'gbraid',
    'wbraid', v_click_ids->>'wbraid',
    'utm_source', coalesce(v_utm->>'utm_source', v_attribution->>'utm_source'),
    'utm_medium', coalesce(v_utm->>'utm_medium', v_attribution->>'utm_medium'),
    'utm_campaign', coalesce(v_utm->>'utm_campaign', v_attribution->>'utm_campaign'),
    'utm_term', coalesce(v_utm->>'utm_term', v_attribution->>'utm_term'),
    'utm_content', coalesce(v_utm->>'utm_content', v_attribution->>'utm_content'),
    'source_url', v_attribution->>'source_url',
    'page_path', v_attribution->>'page_path',
    'ip_address', v_lead.source_ip,
    'user_agent', v_lead.source_user_agent,
    'attribution', nullif(v_attribution, '{}'::jsonb),
    'identity_confidence', case when v_lead.id is not null then 'high' else 'medium' end,
    'attribution_confidence', case when v_lead.id is not null then 'high' else 'low' end,
    'raw_payload', jsonb_build_object(
      'request_id', v_request.id,
      'agent_id', p_agent_id,
      'new_stage', p_new_stage,
      'chatwoot_conversation_id', v_request.chatwoot_conversation_id,
      'waflow_lead_id', v_lead.id,
      'source', 'record_lead_stage_change_rpc'
    )
  );

  return public.record_funnel_event(v_payload);
end;
$$;

revoke all on function public.record_lead_stage_change(uuid, text, uuid, text, text) from public;
grant execute on function public.record_lead_stage_change(uuid, text, uuid, text, text) to service_role, authenticated;

create or replace function public.record_booking_confirmed(p_itinerary_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_itinerary record;
  v_website_id uuid;
  v_lead record;
  v_reference_code text;
  v_event_time timestamptz;
  v_value_amount numeric;
  v_attribution jsonb := '{}'::jsonb;
  v_click_ids jsonb := '{}'::jsonb;
  v_utm jsonb := '{}'::jsonb;
  v_event_id text;
begin
  select
    i.*,
    coalesce(i.custom_fields, '{}'::jsonb) as safe_custom_fields
  into v_itinerary
  from public.itineraries i
  where i.id = p_itinerary_id;

  if not found then
    raise exception 'record_booking_confirmed: itinerary % not found', p_itinerary_id
      using errcode = 'P0002';
  end if;

  if v_itinerary.status is distinct from 'Confirmado' then
    return jsonb_build_object(
      'inserted', false,
      'skipped', true,
      'reason', 'itinerary_not_confirmed',
      'status', v_itinerary.status
    );
  end if;

  select w.id
  into v_website_id
  from public.websites w
  where w.account_id = v_itinerary.account_id
    and w.status = 'published'
  order by case when w.subdomain = 'colombiatours' then 0 else 1 end,
           w.updated_at desc nulls last
  limit 1;

  if v_website_id is null then
    return jsonb_build_object(
      'inserted', false,
      'skipped', true,
      'reason', 'no_published_website_for_account',
      'account_id', v_itinerary.account_id
    );
  end if;

  v_reference_code := coalesce(
    nullif(v_itinerary.safe_custom_fields->>'growth_reference_code', ''),
    nullif(v_itinerary.safe_custom_fields->>'reference_code', ''),
    case when v_itinerary.id_fm is not null and length(v_itinerary.id_fm) >= 8
      then v_itinerary.id_fm
      else null
    end,
    'ITN-' || left(replace(v_itinerary.id::text, '-', ''), 28)
  );

  select wl.*
  into v_lead
  from public.waflow_leads wl
  where wl.account_id = v_itinerary.account_id
    and wl.reference_code = v_reference_code
  order by wl.created_at desc
  limit 1;

  if found then
    v_attribution := coalesce(v_lead.payload->'attribution', '{}'::jsonb);
    v_click_ids := coalesce(v_attribution->'click_ids', '{}'::jsonb);
    v_utm := coalesce(v_attribution->'utm', '{}'::jsonb);
  end if;

  v_event_time := coalesce(v_itinerary.confirmed_at, v_itinerary.confirmation_date::timestamptz, v_itinerary.updated_at, now());
  v_value_amount := coalesce(v_itinerary.total_markup, 0);
  v_event_id := encode(
    digest(
      v_itinerary.id::text || ':crm_booking_confirmed:' || floor(extract(epoch from v_event_time))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  return public.record_funnel_event(jsonb_build_object(
    'event_id', v_event_id,
    'pixel_event_id', gen_random_uuid()::text,
    'event_name', 'crm_booking_confirmed',
    'event_time', v_event_time,
    'source', 'record_booking_confirmed_rpc',
    'source_system', 'db_trigger',
    'reference_code', v_reference_code,
    'account_id', v_itinerary.account_id,
    'website_id', v_website_id,
    'locale', coalesce(v_attribution->>'locale', case when lower(coalesce(v_itinerary.language, '')) in ('en', 'en-us', 'english', 'ingles') then 'en-US' else 'es-CO' end),
    'market', coalesce(v_attribution->>'market', nullif(upper(v_itinerary.safe_custom_fields->>'market'), ''), 'CO'),
    'business_stage', 'booking',
    'channel', case when v_lead.id is not null then 'chatwoot' else 'unknown' end,
    'external_id', v_itinerary.id::text,
    'user_phone', v_lead.payload->>'phone',
    'user_email', v_lead.payload->>'email',
    'fbp', coalesce(v_attribution->>'fbp', v_click_ids->>'fbp'),
    'fbc', coalesce(v_attribution->>'fbc', v_click_ids->>'fbc'),
    'ctwa_clid', coalesce(v_attribution->>'ctwa_clid', v_click_ids->>'ctwa_clid'),
    'gclid', v_click_ids->>'gclid',
    'gbraid', v_click_ids->>'gbraid',
    'wbraid', v_click_ids->>'wbraid',
    'utm_source', coalesce(v_utm->>'utm_source', v_attribution->>'utm_source'),
    'utm_medium', coalesce(v_utm->>'utm_medium', v_attribution->>'utm_medium'),
    'utm_campaign', coalesce(v_utm->>'utm_campaign', v_attribution->>'utm_campaign'),
    'utm_term', coalesce(v_utm->>'utm_term', v_attribution->>'utm_term'),
    'utm_content', coalesce(v_utm->>'utm_content', v_attribution->>'utm_content'),
    'source_url', v_attribution->>'source_url',
    'page_path', v_attribution->>'page_path',
    'ip_address', v_lead.source_ip,
    'user_agent', v_lead.source_user_agent,
    'value_amount', v_value_amount,
    'value_currency', coalesce(v_itinerary.currency_type, 'COP'),
    'attribution', nullif(v_attribution, '{}'::jsonb),
    'identity_confidence', case when v_lead.id is not null then 'high' else 'medium' end,
    'attribution_confidence', case when v_lead.id is not null then 'high' else 'low' end,
    'raw_payload', jsonb_build_object(
      'itinerary_id', v_itinerary.id,
      'request_id', v_itinerary.request_id,
      'waflow_lead_id', v_lead.id,
      'total_amount', v_itinerary.total_amount,
      'total_cost', v_itinerary.total_cost,
      'total_markup', v_itinerary.total_markup,
      'total_markup_missing', v_itinerary.total_markup is null,
      'source', 'record_booking_confirmed_rpc'
    )
  ));
end;
$$;

revoke all on function public.record_booking_confirmed(uuid) from public;
grant execute on function public.record_booking_confirmed(uuid) to service_role, authenticated;

create or replace function public.fn_emit_crm_booking_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'Confirmado' then
    perform public.record_booking_confirmed(new.id);
  end if;
  return new;
exception
  when others then
    raise warning 'fn_emit_crm_booking_confirmed: emission failed for itinerary %: % (%)', new.id, sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_itinerary_emit_crm_booking_confirmed on public.itineraries;
create trigger trg_itinerary_emit_crm_booking_confirmed
after update of status on public.itineraries
for each row
when (old.status is distinct from new.status and new.status = 'Confirmado')
execute function public.fn_emit_crm_booking_confirmed();
