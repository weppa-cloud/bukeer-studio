-- ============================================================================
-- Funnel Events governance reconciliation — #419 / #452 / #429
-- ============================================================================
-- Additive production-safe migration. Keeps funnel_events.event_id as unique
-- text for compatibility; pixel_event_id remains the platform dedupe id.

create table if not exists public.event_destination_mapping (
  funnel_event_name text not null,
  destination text not null,
  destination_event_name text not null,
  value_field text,
  enabled boolean not null default true,
  tenant_overrides jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (funnel_event_name, destination)
);

alter table public.event_destination_mapping
  drop constraint if exists event_destination_mapping_destination_chk;
alter table public.event_destination_mapping
  add constraint event_destination_mapping_destination_chk
    check (destination in ('meta', 'meta_messaging', 'google_ads', 'ga4', 'tiktok'));

alter table public.event_destination_mapping
  drop constraint if exists event_destination_mapping_value_field_chk;
alter table public.event_destination_mapping
  add constraint event_destination_mapping_value_field_chk
    check (value_field is null or value_field in ('value_amount'));

alter table public.event_destination_mapping enable row level security;

drop policy if exists event_destination_mapping_read_all
  on public.event_destination_mapping;
create policy event_destination_mapping_read_all
  on public.event_destination_mapping
  for select
  using (true);

drop policy if exists event_destination_mapping_service_write
  on public.event_destination_mapping;
create policy event_destination_mapping_service_write
  on public.event_destination_mapping
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.funnel_events
  add column if not exists event_version integer not null default 1,
  add column if not exists source_system text not null default 'unknown',
  add column if not exists business_stage text not null default 'lead',
  add column if not exists owner text not null default 'growth_ops',
  add column if not exists optimization_policy text not null default 'observation_only',
  add column if not exists identity_confidence text not null default 'unknown',
  add column if not exists attribution_confidence text not null default 'unknown';

alter table public.funnel_events
  drop constraint if exists funnel_events_event_id_format_chk;
alter table public.funnel_events
  drop constraint if exists funnel_events_event_id_nonempty_chk;
alter table public.funnel_events
  add constraint funnel_events_event_id_nonempty_chk
    check (event_id is not null and btrim(event_id) <> '' and char_length(event_id) <= 200);

create unique index if not exists funnel_events_event_id_unique_idx
  on public.funnel_events (event_id);

drop index if exists public.funnel_events_pixel_event_id_unique_idx;

create index if not exists funnel_events_pixel_event_id_idx
  on public.funnel_events (pixel_event_id)
  where pixel_event_id is not null;

alter table public.funnel_events
  drop constraint if exists funnel_events_event_name_chk;
alter table public.funnel_events
  add constraint funnel_events_event_name_chk
    check (event_name in (
      'pageview',
      'phone_cta_click',
      'email_cta_click',
      'cal_booking_click',
      'quote_form_submit',
      'chatwoot_conversation_started',
      'chatwoot_message_received',
      'chatwoot_label_qualified',
      'crm_lead_stage_qualified',
      'crm_quote_sent',
      'crm_booking_confirmed',
      'crm_booking_cancelled',
      'crm_lead_dropped',
      'waflow_open',
      'waflow_step_next',
      'waflow_submit',
      'whatsapp_cta_click',
      'qualified_lead',
      'quote_sent',
      'booking_confirmed',
      'review_submitted',
      'referral_lead'
    ));

alter table public.funnel_events
  drop constraint if exists funnel_events_event_version_chk;
alter table public.funnel_events
  add constraint funnel_events_event_version_chk
    check (event_version > 0);

alter table public.funnel_events
  drop constraint if exists funnel_events_source_system_chk;
alter table public.funnel_events
  add constraint funnel_events_source_system_chk
    check (source_system in ('studio_web', 'waflow', 'chatwoot', 'flutter_crm', 'db_trigger', 'unknown'));

alter table public.funnel_events
  drop constraint if exists funnel_events_source_chk;
alter table public.funnel_events
  add constraint funnel_events_source_chk
    check (source is null or source in ('studio_web', 'waflow', 'chatwoot', 'flutter_crm', 'db_trigger', 'unknown'));

alter table public.funnel_events
  drop constraint if exists funnel_events_business_stage_chk;
alter table public.funnel_events
  add constraint funnel_events_business_stage_chk
    check (business_stage in ('awareness', 'intent', 'lead', 'engagement', 'qualify', 'quote', 'booking', 'review_referral', 'dropped'));

alter table public.funnel_events
  drop constraint if exists funnel_events_owner_chk;
alter table public.funnel_events
  add constraint funnel_events_owner_chk
    check (owner in ('studio', 'chatwoot', 'crm', 'booking', 'growth_ops'));

alter table public.funnel_events
  drop constraint if exists funnel_events_optimization_policy_chk;
alter table public.funnel_events
  add constraint funnel_events_optimization_policy_chk
    check (optimization_policy in ('primary_conversion', 'secondary_conversion', 'observation_only', 'internal_only', 'do_not_dispatch'));

alter table public.funnel_events
  drop constraint if exists funnel_events_identity_confidence_chk;
alter table public.funnel_events
  add constraint funnel_events_identity_confidence_chk
    check (identity_confidence in ('high', 'medium', 'low', 'unknown'));

alter table public.funnel_events
  drop constraint if exists funnel_events_attribution_confidence_chk;
alter table public.funnel_events
  add constraint funnel_events_attribution_confidence_chk
    check (attribution_confidence in ('high', 'medium', 'low', 'unknown'));

create table if not exists public.funnel_event_optimization_policy (
  event_name text primary key,
  event_version integer not null default 1,
  business_stage text not null,
  source_owner text not null,
  optimization_policy text not null,
  identity_requirement text not null default 'recommended',
  attribution_requirement text not null default 'recommended',
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funnel_event_optimization_policy_version_chk check (event_version > 0),
  constraint funnel_event_optimization_policy_stage_chk
    check (business_stage in ('awareness', 'intent', 'lead', 'engagement', 'qualify', 'quote', 'booking', 'review_referral', 'dropped')),
  constraint funnel_event_optimization_policy_owner_chk
    check (source_owner in ('studio', 'chatwoot', 'crm', 'booking', 'growth_ops')),
  constraint funnel_event_optimization_policy_policy_chk
    check (optimization_policy in ('primary_conversion', 'secondary_conversion', 'observation_only', 'internal_only', 'do_not_dispatch'))
);

alter table public.funnel_event_optimization_policy enable row level security;

drop policy if exists funnel_event_optimization_policy_read_all
  on public.funnel_event_optimization_policy;
create policy funnel_event_optimization_policy_read_all
  on public.funnel_event_optimization_policy
  for select
  using (true);

drop policy if exists funnel_event_optimization_policy_service_write
  on public.funnel_event_optimization_policy;
create policy funnel_event_optimization_policy_service_write
  on public.funnel_event_optimization_policy
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.funnel_event_optimization_policy
  (event_name, business_stage, source_owner, optimization_policy, notes)
values
  ('pageview', 'awareness', 'studio', 'observation_only', 'Awareness diagnostic; not a bidding event.'),
  ('whatsapp_cta_click', 'intent', 'studio', 'secondary_conversion', 'Intent signal; useful for remarketing/reporting.'),
  ('phone_cta_click', 'intent', 'studio', 'secondary_conversion', null),
  ('email_cta_click', 'intent', 'studio', 'secondary_conversion', null),
  ('cal_booking_click', 'intent', 'studio', 'secondary_conversion', null),
  ('waflow_open', 'awareness', 'studio', 'observation_only', 'Legacy Studio event.'),
  ('waflow_step_next', 'intent', 'studio', 'observation_only', 'Legacy Studio event.'),
  ('waflow_submit', 'lead', 'studio', 'primary_conversion', 'Initial primary lead event while booking volume is sparse.'),
  ('quote_form_submit', 'lead', 'studio', 'primary_conversion', null),
  ('chatwoot_conversation_started', 'lead', 'chatwoot', 'secondary_conversion', 'Messaging start is not automatically qualified.'),
  ('chatwoot_message_received', 'engagement', 'chatwoot', 'observation_only', 'High-volume engagement signal.'),
  ('chatwoot_label_qualified', 'qualify', 'chatwoot', 'primary_conversion', 'Qualification only when Chatwoot label/stage marks it.'),
  ('crm_lead_stage_qualified', 'qualify', 'crm', 'primary_conversion', null),
  ('qualified_lead', 'qualify', 'crm', 'primary_conversion', 'Legacy alias; remove via #425.'),
  ('crm_quote_sent', 'quote', 'crm', 'primary_conversion', null),
  ('quote_sent', 'quote', 'crm', 'primary_conversion', 'Legacy alias; remove via #425.'),
  ('crm_booking_confirmed', 'booking', 'booking', 'primary_conversion', 'DB trigger is principal owner; value is markup for ColombiaTours.'),
  ('booking_confirmed', 'booking', 'booking', 'primary_conversion', 'Legacy alias; remove via #425.'),
  ('crm_booking_cancelled', 'booking', 'booking', 'internal_only', null),
  ('crm_lead_dropped', 'dropped', 'crm', 'internal_only', null),
  ('review_submitted', 'review_referral', 'growth_ops', 'observation_only', null),
  ('referral_lead', 'review_referral', 'growth_ops', 'secondary_conversion', null)
on conflict (event_name) do update
set event_version = excluded.event_version,
    business_stage = excluded.business_stage,
    source_owner = excluded.source_owner,
    optimization_policy = excluded.optimization_policy,
    notes = excluded.notes,
    updated_at = now();

insert into public.event_destination_mapping
  (funnel_event_name, destination, destination_event_name, value_field, enabled, notes)
values
  ('pageview', 'ga4', 'page_view', null, true, 'Awareness diagnostic.'),
  ('whatsapp_cta_click', 'meta', 'Contact', null, true, 'Secondary intent signal.'),
  ('whatsapp_cta_click', 'ga4', 'cta_whatsapp', null, true, null),
  ('phone_cta_click', 'meta', 'Contact', null, true, null),
  ('phone_cta_click', 'ga4', 'cta_phone', null, true, null),
  ('email_cta_click', 'meta', 'Contact', null, true, null),
  ('email_cta_click', 'ga4', 'cta_email', null, true, null),
  ('cal_booking_click', 'meta', 'Schedule', null, true, null),
  ('cal_booking_click', 'ga4', 'cta_calendar', null, true, null),
  ('waflow_submit', 'meta', 'Lead', null, true, 'Initial lead conversion.'),
  ('waflow_submit', 'google_ads', 'waflow_submit', null, true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('waflow_submit', 'ga4', 'generate_lead', null, true, null),
  ('quote_form_submit', 'meta', 'Lead', null, true, null),
  ('quote_form_submit', 'google_ads', 'quote_form_submit', null, true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('quote_form_submit', 'ga4', 'generate_lead', null, true, null),
  ('chatwoot_conversation_started', 'meta_messaging', 'Contact', null, true, null),
  ('chatwoot_message_received', 'meta_messaging', 'Subscribe', null, true, 'High-volume engagement signal.'),
  ('chatwoot_label_qualified', 'meta_messaging', 'Lead', null, true, null),
  ('chatwoot_label_qualified', 'google_ads', 'qualified_lead', null, true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('chatwoot_label_qualified', 'ga4', 'qualify_lead', null, true, null),
  ('crm_lead_stage_qualified', 'meta', 'Lead', null, true, null),
  ('crm_lead_stage_qualified', 'google_ads', 'qualified_lead', null, true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('crm_lead_stage_qualified', 'ga4', 'qualify_lead', null, true, null),
  ('crm_quote_sent', 'meta', 'InitiateCheckout', null, true, null),
  ('crm_quote_sent', 'google_ads', 'quote_sent', null, true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('crm_quote_sent', 'ga4', 'begin_checkout', null, true, null),
  ('crm_booking_confirmed', 'meta', 'Purchase', 'value_amount', true, 'DB trigger is principal owner; value is total_markup.'),
  ('crm_booking_confirmed', 'google_ads', 'booking_confirmed', 'value_amount', true, 'Requires tenant_overrides conversion_action_id before dispatch.'),
  ('crm_booking_confirmed', 'ga4', 'purchase', 'value_amount', true, null),
  ('crm_booking_cancelled', 'ga4', 'booking_cancelled', null, false, 'Internal correction event; disabled by default.'),
  ('crm_lead_dropped', 'ga4', 'lead_dropped', null, false, 'Internal correction event; disabled by default.'),
  ('qualified_lead', 'ga4', 'qualify_lead', null, false, 'Legacy alias accepted only for compatibility.'),
  ('quote_sent', 'ga4', 'begin_checkout', null, false, 'Legacy alias accepted only for compatibility.'),
  ('booking_confirmed', 'ga4', 'purchase', 'value_amount', false, 'Legacy alias accepted only for compatibility.')
on conflict (funnel_event_name, destination) do nothing;

create or replace function public.fn_funnel_events_apply_governance_defaults()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_policy record;
begin
  select *
    into v_policy
    from public.funnel_event_optimization_policy
   where event_name = new.event_name
     and enabled = true
   limit 1;

  new.event_version = coalesce(nullif(new.event_version, 0), coalesce(v_policy.event_version, 1));
  if new.source_system is null or new.source_system in ('', 'unknown') then
    new.source_system = coalesce(nullif(new.source, ''), 'unknown');
  end if;
  new.business_stage = coalesce(nullif(new.business_stage, ''), v_policy.business_stage, 'lead');
  new.owner = coalesce(nullif(new.owner, ''), v_policy.source_owner, 'growth_ops');
  new.optimization_policy = coalesce(nullif(new.optimization_policy, ''), v_policy.optimization_policy, 'observation_only');

  if new.user_email is not null or new.user_phone is not null or new.external_id is not null then
    if new.identity_confidence is null or new.identity_confidence in ('', 'unknown') then
      new.identity_confidence = 'high';
    end if;
  elsif new.fbp is not null or new.fbc is not null or new.ctwa_clid is not null then
    if new.identity_confidence is null or new.identity_confidence in ('', 'unknown') then
      new.identity_confidence = 'medium';
    end if;
  else
    new.identity_confidence = coalesce(nullif(new.identity_confidence, ''), 'unknown');
  end if;

  if new.gclid is not null or new.gbraid is not null or new.wbraid is not null then
    if new.attribution_confidence is null or new.attribution_confidence in ('', 'unknown') then
      new.attribution_confidence = 'high';
    end if;
  elsif new.utm_source is not null or new.utm_campaign is not null or new.fbc is not null then
    if new.attribution_confidence is null or new.attribution_confidence in ('', 'unknown') then
      new.attribution_confidence = 'medium';
    end if;
  elsif new.reference_code is not null then
    if new.attribution_confidence is null or new.attribution_confidence in ('', 'unknown') then
      new.attribution_confidence = 'low';
    end if;
  else
    new.attribution_confidence = coalesce(nullif(new.attribution_confidence, ''), 'unknown');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_funnel_events_apply_governance_defaults
  on public.funnel_events;
create trigger trg_funnel_events_apply_governance_defaults
before insert or update on public.funnel_events
for each row
execute function public.fn_funnel_events_apply_governance_defaults();

update public.funnel_events
   set event_version = event_version
 where event_version = 1;

comment on column public.funnel_events.event_version is
  'Canonical event contract version. Defaults to 1; increment only through reviewed governance changes.';
comment on column public.funnel_events.source_system is
  'System that emitted the event: studio_web, waflow, chatwoot, flutter_crm, db_trigger, unknown.';
comment on column public.funnel_events.optimization_policy is
  'Bidding/reporting policy. Delivery remains controlled separately by event_destination_mapping.';
comment on table public.funnel_event_optimization_policy is
  'Canonical event governance: business stage, owner, and optimization intent. Separate from event_destination_mapping delivery config.';

create or replace function public.record_funnel_event(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id text;
  v_existing_event_id text;
  v_pixel_event_id text;
  v_event_name text;
  v_event_time timestamptz;
  v_source text;
  v_source_system text;
  v_reference_code text;
  v_account_id uuid;
  v_website_id uuid;
  v_locale text;
  v_market text;
  v_policy record;
  v_stage text;
  v_inserted boolean;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'record_funnel_event: payload must be a jsonb object'
      using errcode = 'P0001';
  end if;

  v_event_id := nullif(payload->>'event_id', '');
  v_pixel_event_id := nullif(payload->>'pixel_event_id', '');
  v_event_name := nullif(payload->>'event_name', '');
  v_event_time := coalesce(nullif(payload->>'event_time', ''), nullif(payload->>'occurred_at', ''))::timestamptz;
  v_source_system := coalesce(nullif(payload->>'source_system', ''), nullif(payload->>'source', ''), 'unknown');
  v_source := coalesce(nullif(payload->>'source', ''), v_source_system);
  v_reference_code := coalesce(
    nullif(payload->>'reference_code', ''),
    nullif(payload->>'external_id', ''),
    nullif(payload #>> '{raw_payload,itinerary_id}', ''),
    nullif(payload #>> '{payload,itinerary_id}', ''),
    left(coalesce(v_pixel_event_id, v_event_id), 64)
  );
  v_account_id := nullif(payload->>'account_id', '')::uuid;
  v_website_id := nullif(payload->>'website_id', '')::uuid;
  v_locale := coalesce(nullif(payload->>'locale', ''), 'es-CO');
  v_market := coalesce(nullif(payload->>'market', ''), 'CO');

  if v_event_id is null then
    raise exception 'record_funnel_event: missing key: event_id'
      using errcode = 'P0001';
  end if;
  if v_event_name is null then
    raise exception 'record_funnel_event: missing key: event_name'
      using errcode = 'P0001';
  end if;
  if v_event_time is null then
    raise exception 'record_funnel_event: missing key: event_time'
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

  select *
    into v_policy
    from public.funnel_event_optimization_policy
   where event_name = v_event_name
     and enabled = true
   limit 1;

  if not found then
    if not exists (
      select 1 from public.event_destination_mapping
       where funnel_event_name = v_event_name
    ) then
      raise exception 'record_funnel_event: unknown event_name: %', v_event_name
        using errcode = 'P0001';
    end if;
  end if;

  select fe.event_id
    into v_existing_event_id
    from public.funnel_events fe
   where fe.event_id = v_event_id
   limit 1;

  if v_existing_event_id is not null then
    return jsonb_build_object('inserted', false, 'deduped', true, 'dedupe_key', 'event_id', 'event_id', v_existing_event_id);
  end if;

  if v_pixel_event_id is not null then
    select fe.event_id
      into v_existing_event_id
      from public.funnel_events fe
     where fe.pixel_event_id = v_pixel_event_id
     limit 1;

    if v_existing_event_id is not null then
      return jsonb_build_object('inserted', false, 'deduped', true, 'dedupe_key', 'pixel_event_id', 'event_id', v_existing_event_id);
    end if;
  end if;

  v_stage := coalesce(
    nullif(payload->>'stage', ''),
    case coalesce(nullif(payload->>'business_stage', ''), v_policy.business_stage, 'lead')
      when 'awareness' then 'acquisition'
      when 'intent' then 'activation'
      when 'lead' then 'activation'
      when 'engagement' then 'activation'
      when 'qualify' then 'qualified_lead'
      when 'quote' then 'quote_sent'
      when 'booking' then 'booking'
      when 'review_referral' then 'review_referral'
      when 'dropped' then 'qualified_lead'
      else 'activation'
    end
  );

  insert into public.funnel_events (
    event_id,
    pixel_event_id,
    event_name,
    event_version,
    stage,
    business_stage,
    channel,
    reference_code,
    account_id,
    website_id,
    locale,
    market,
    occurred_at,
    source,
    source_system,
    owner,
    optimization_policy,
    identity_confidence,
    attribution_confidence,
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
    v_pixel_event_id,
    v_event_name,
    coalesce(nullif(payload->>'event_version', '')::integer, v_policy.event_version, 1),
    v_stage,
    coalesce(nullif(payload->>'business_stage', ''), v_policy.business_stage, 'lead'),
    coalesce(nullif(payload->>'channel', ''), 'unknown'),
    v_reference_code,
    v_account_id,
    v_website_id,
    v_locale,
    v_market,
    v_event_time,
    v_source,
    v_source_system,
    coalesce(nullif(payload->>'owner', ''), v_policy.source_owner, 'growth_ops'),
    coalesce(nullif(payload->>'optimization_policy', ''), v_policy.optimization_policy, 'observation_only'),
    coalesce(nullif(payload->>'identity_confidence', ''), 'unknown'),
    coalesce(nullif(payload->>'attribution_confidence', ''), 'unknown'),
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
    return jsonb_build_object('inserted', true, 'event_id', v_event_id, 'dispatch_status', 'pending');
  end if;

  select fe.event_id
    into v_existing_event_id
    from public.funnel_events fe
   where fe.event_id = v_event_id
      or (v_pixel_event_id is not null and fe.pixel_event_id = v_pixel_event_id)
   order by case when fe.event_id = v_event_id then 0 else 1 end
   limit 1;

  if v_existing_event_id is not null then
    return jsonb_build_object('inserted', false, 'deduped', true, 'event_id', v_existing_event_id);
  end if;

  raise exception 'record_funnel_event: insert returned no row but no dedupe row was found (%)', v_event_id
    using errcode = 'P0001';
end;
$$;

revoke all on function public.record_funnel_event(jsonb) from public;
revoke all on function public.record_funnel_event(jsonb) from anon;
revoke all on function public.record_funnel_event(jsonb) from authenticated;
grant execute on function public.record_funnel_event(jsonb) to service_role;

comment on function public.record_funnel_event(jsonb) is
  'Canonical Funnel Events SOT writer. SECURITY DEFINER; service-role only. Validates event_name by governance/mapping, accepts unique text event_id, dedupes by event_id and pixel_event_id, returns jsonb.';
