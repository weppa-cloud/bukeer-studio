-- ============================================================================
-- F3 Studio side -- itineraries.status='Confirmado' AFTER UPDATE trigger
-- emits canonical crm_booking_confirmed funnel event (value=total_markup)
-- ============================================================================
-- Tracking: Issue #422 (F3 Studio) · Epic #419 · ADR-029 · SPEC_FUNNEL_EVENTS_SOT
--
-- Purpose:
--   Replace the legacy trigger introduced in
--   `20260428161000_itinerary_confirmed_funnel_event.sql` (which emitted the
--   pre-SOT alias `booking_confirmed` with `total_amount` revenue) with the
--   canonical ADR-029 `crm_booking_confirmed` event whose `value_amount` is
--   `itineraries.total_markup` (gross profit) per sign-off 2026-05-03.
--
-- Relationship to prior migration (idempotent supersede):
--   * The legacy migration created `public.emit_itinerary_booking_confirmed`
--     and trigger `trg_itinerary_booking_confirmed_funnel_event`. We DROP the
--     trigger (the old function stays as a no-op safety net but is not
--     re-attached) and re-create the trigger to call the new function
--     `fn_emit_crm_booking_confirmed` so we never have two writers competing
--     for the same DB transition.
--   * Idempotency: every CREATE/DROP uses IF EXISTS so the migration is
--     safe to re-apply.
--
-- Sign-off 2026-05-03 (Option A):
--   * value_amount = itineraries.total_markup (gross profit, NOT revenue).
--   * value_currency = itineraries.currency_type.
--   * Fires when itineraries.status transitions Presupuesto -> Confirmado
--     (auto-flip on first deposit via fn_payment_confirms_request -- see
--     bukeer-flutter/supabase/migrations/20260326190001_fix_trigger_filter_deleted.sql).
--   * payment_received was REMOVED from scope -- would fire at the same
--     instant as crm_booking_confirmed, redundant.
--
-- Dependency on F1 (#420):
--   * Calls `public.record_funnel_event(payload jsonb)` -- created in
--     `20260503130000_record_funnel_event_rpc.sql`.
--   * If F1 has not landed yet, this migration will FAIL on the function
--     not existing. Apply order MUST be F1 -> F2 -> F3.
--   * Uses the canonical event name `crm_booking_confirmed` which is in the
--     widened CHECK constraint added by `20260503120000_funnel_events_reconcile_adr029.sql`.
--
-- Total markup null handling (~1.2% historical):
--   * If NEW.total_markup IS NULL we still emit (with value_amount=0 and a
--     `total_markup_missing=true` flag in raw_payload) so reporting stays
--     complete; a `RAISE NOTICE` makes the gap visible in DB logs.
-- ============================================================================

drop trigger if exists trg_itinerary_booking_confirmed_funnel_event
  on public.itineraries;

drop trigger if exists trg_itinerary_emit_crm_booking_confirmed
  on public.itineraries;

create or replace function public.fn_emit_crm_booking_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $func$
declare
  v_event_id          text;
  v_pixel_event_id    text;
  v_event_time        timestamptz;
  v_website_id        uuid;
  v_reference_code    text;
  v_locale            text;
  v_market            text;
  v_value_amount      numeric;
  v_total_markup_missing boolean := false;
  v_raw_payload       jsonb;
  v_payload           jsonb;
begin
  if NEW.status is null or NEW.status <> 'Confirmado' then
    return NEW;
  end if;
  if OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  if NEW.account_id is null then
    return NEW;
  end if;

  select w.id
  into v_website_id
  from public.websites w
  where w.account_id = NEW.account_id
    and w.status = 'published'
  order by
    case when w.subdomain = 'colombiatours' then 0 else 1 end,
    w.updated_at desc nulls last
  limit 1;

  if v_website_id is null then
    return NEW;
  end if;

  v_reference_code := coalesce(
    nullif(NEW.custom_fields->>'growth_reference_code', ''),
    nullif(NEW.custom_fields->>'reference_code', ''),
    case
      when NEW.id_fm is not null and length(NEW.id_fm) >= 8
        then NEW.id_fm
      else 'ITN-' || left(replace(NEW.id::text, '-', ''), 28)
    end
  );

  v_event_time := coalesce(
    NEW.confirmed_at,
    NEW.confirmation_date::timestamptz,
    NEW.updated_at,
    now()
  );

  v_locale := case
    when lower(coalesce(NEW.language, '')) in ('en', 'en-us', 'english', 'ingles') then 'en-US'
    else 'es-CO'
  end;

  v_market := coalesce(
    nullif(upper(NEW.custom_fields->>'market'), ''),
    case upper(coalesce(NEW.currency_type, ''))
      when 'MXN' then 'MX'
      when 'USD' then 'US'
      else 'CO'
    end
  );
  if v_market not in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER') then
    v_market := 'OTHER';
  end if;

  if NEW.total_markup is null then
    v_total_markup_missing := true;
    v_value_amount := 0;
    raise notice
      'fn_emit_crm_booking_confirmed: itinerary % has NULL total_markup -- emitting with value_amount=0 and total_markup_missing=true flag (historical ~1.2%% gap).',
      NEW.id;
  else
    v_value_amount := NEW.total_markup;
  end if;

  v_event_id := encode(
    digest(
      NEW.id::text || ':crm_booking_confirmed:' || floor(extract(epoch from v_event_time))::bigint::text,
      'sha256'
    ),
    'hex'
  );

  v_pixel_event_id := gen_random_uuid()::text;

  v_raw_payload := jsonb_build_object(
    'itinerary_id',          NEW.id,
    'total_amount',          NEW.total_amount,
    'total_cost',            NEW.total_cost,
    'total_markup',          NEW.total_markup,
    'status_was',            OLD.status,
    'status_is',             NEW.status,
    'total_markup_missing',  v_total_markup_missing,
    'source',                'itinerary_status_confirmed_trigger'
  );

  v_payload := jsonb_build_object(
    'event_id',        v_event_id,
    'pixel_event_id',  v_pixel_event_id,
    'event_name',      'crm_booking_confirmed',
    'event_time',      v_event_time,
    'source',          'db_trigger',
    'reference_code',  v_reference_code,
    'account_id',      NEW.account_id,
    'website_id',      v_website_id,
    'locale',          v_locale,
    'market',          v_market,
    'stage',           'realized',
    'channel',         'unknown',
    'external_id',     NEW.id::text,
    'value_amount',    v_value_amount,
    'value_currency',  coalesce(NEW.currency_type, 'COP'),
    'raw_payload',     v_raw_payload
  );

  perform public.record_funnel_event(v_payload);

  return NEW;
exception
  when others then
    raise warning
      'fn_emit_crm_booking_confirmed: emission failed for itinerary %: % (%)',
      NEW.id, SQLERRM, SQLSTATE;
    return NEW;
end;
$func$;

revoke all on function public.fn_emit_crm_booking_confirmed() from public;

comment on function public.fn_emit_crm_booking_confirmed() is
  'F3 (#422). AFTER UPDATE trigger function on itineraries: when status flips '
  'to Confirmado, calls record_funnel_event with crm_booking_confirmed and '
  'value_amount = total_markup (sign-off 2026-05-03 Option A). '
  'NEVER raises -- failures are warnings so the user UPDATE never blocks.';

create trigger trg_itinerary_emit_crm_booking_confirmed
after update of status on public.itineraries
for each row
when (
  OLD.status is distinct from NEW.status
  and NEW.status = 'Confirmado'
)
execute function public.fn_emit_crm_booking_confirmed();

comment on trigger trg_itinerary_emit_crm_booking_confirmed on public.itineraries is
  'F3 (#422). Emits canonical crm_booking_confirmed funnel event when '
  'itineraries.status transitions to Confirmado (auto-flip via '
  'fn_payment_confirms_request on first deposit). Supersedes legacy '
  'trg_itinerary_booking_confirmed_funnel_event from migration 20260428161000.';
