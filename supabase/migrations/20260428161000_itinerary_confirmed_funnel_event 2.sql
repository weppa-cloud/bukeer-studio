-- Emit Growth OS booking_confirmed when an itinerary is confirmed.
--
-- This deliberately does not depend on Wompi. The operational source of truth
-- for now is Flutter's itinerary lifecycle: itineraries.status = 'Confirmado'.
-- Wompi/Purchase can later reuse the same funnel event contract.

create or replace function public.emit_itinerary_booking_confirmed(p_itinerary_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_itinerary record;
  v_website_id uuid;
  v_reference_code text;
  v_locale text;
  v_market text;
  v_occurred_at timestamptz;
  v_event_id text;
  v_attribution jsonb;
begin
  select
    i.id,
    i.account_id,
    i.status,
    i.id_fm,
    i.language,
    i.total_amount,
    i.total_cost,
    i.currency_type,
    i.confirmed_at,
    i.confirmation_date,
    coalesce(i.custom_fields, '{}'::jsonb) as custom_fields
  into v_itinerary
  from public.itineraries i
  where i.id = p_itinerary_id;

  if not found then
    raise exception 'itinerary % not found', p_itinerary_id using errcode = 'P0002';
  end if;

  if v_itinerary.account_id is null or v_itinerary.status is distinct from 'Confirmado' then
    return null;
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
    return null;
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

  v_locale := case
    when lower(coalesce(v_itinerary.language, '')) in ('en', 'en-us', 'english', 'ingles', 'inglés') then 'en-US'
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

  v_occurred_at := coalesce(
    v_itinerary.confirmed_at,
    v_itinerary.confirmation_date::timestamptz,
    now()
  );

  v_event_id := encode(
    digest(
      v_reference_code || ':booking_confirmed:' || floor(extract(epoch from v_occurred_at))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  select fe.attribution
  into v_attribution
  from public.funnel_events fe
  where fe.reference_code = v_reference_code
    and fe.account_id = v_itinerary.account_id
    and fe.website_id = v_website_id
    and fe.attribution is not null
  order by fe.occurred_at desc
  limit 1;

  insert into public.funnel_events (
    event_id,
    event_name,
    stage,
    channel,
    reference_code,
    account_id,
    website_id,
    locale,
    market,
    occurred_at,
    attribution,
    payload,
    provider_status,
    source_url,
    page_path
  )
  values (
    v_event_id,
    'booking_confirmed',
    'booking',
    'unknown',
    v_reference_code,
    v_itinerary.account_id,
    v_website_id,
    v_locale,
    v_market,
    v_occurred_at,
    v_attribution,
    jsonb_build_object(
      'source', 'itinerary_status_confirmed',
      'itinerary_id', v_itinerary.id,
      'id_fm', v_itinerary.id_fm,
      'amount', v_itinerary.total_amount,
      'currency', v_itinerary.currency_type,
      'gross_margin',
        case
          when v_itinerary.total_amount is not null and v_itinerary.total_cost is not null
            then v_itinerary.total_amount - v_itinerary.total_cost
          else null
        end
    ),
    '[]'::jsonb,
    null,
    null
  )
  on conflict (event_id) do nothing;

  return v_event_id;
end;
$$;

revoke all on function public.emit_itinerary_booking_confirmed(uuid) from public;
grant execute on function public.emit_itinerary_booking_confirmed(uuid) to service_role;

create or replace function public.handle_itinerary_booking_confirmed_funnel_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Confirmado' and old.status is distinct from new.status then
    perform public.emit_itinerary_booking_confirmed(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_itinerary_booking_confirmed_funnel_event on public.itineraries;
create trigger trg_itinerary_booking_confirmed_funnel_event
after update of status on public.itineraries
for each row
execute function public.handle_itinerary_booking_confirmed_funnel_event();

comment on function public.emit_itinerary_booking_confirmed(uuid) is
  'Emits Growth OS funnel_events.booking_confirmed from itineraries.status=Confirmado without Wompi dependency.';
