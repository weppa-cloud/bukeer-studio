-- ============================================================================
-- event_destination_mapping — declarative SOT for event-to-platform routing
-- Per ADR-029 §"Mapping is declarative" + SPEC_FUNNEL_EVENTS_SOT AC1.2 (#420)
-- ============================================================================
-- Purpose:
--   Declares for each canonical funnel_event_name which destination platforms
--   should receive it, under which platform-specific event name, and which
--   funnel_events column (if any) carries the conversion value.
--
--   Adding a new platform = add a column. Adding a new event = add a row.
--   Changing a mapping = git diff + review, not code.
--
-- Read pattern:
--   The dispatcher Edge Function reads this table at boot (or per-event with
--   a short cache) to know where to fan an event out. Service-role bypasses
--   RLS so the dispatcher reads freely; authenticated users get read access
--   for monitoring dashboards.
--
-- Safety:
--   - Additive, idempotent (CREATE TABLE IF NOT EXISTS, ON CONFLICT DO
--     NOTHING on every seed row).
--   - No PII columns. Pure config.
-- ============================================================================

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
  primary key (funnel_event_name, destination),
  constraint event_destination_mapping_destination_chk
    check (destination in ('meta', 'meta_messaging', 'google_ads', 'ga4', 'tiktok')),
  constraint event_destination_mapping_value_field_chk
    check (value_field is null or value_field in ('value_amount'))
);

create index if not exists event_destination_mapping_enabled_idx
  on public.event_destination_mapping (destination, enabled)
  where enabled = true;

alter table public.event_destination_mapping enable row level security;

-- Public read: dashboards + dispatcher Edge Function (when running as
-- anon/authenticated for inspection). Service-role bypasses RLS by default.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_destination_mapping'
      and policyname = 'event_destination_mapping_read_all'
  ) then
    create policy event_destination_mapping_read_all
      on public.event_destination_mapping
      for select
      using (true);
  end if;
end$$;

-- Service-role only for writes. (No additional policy needed — service_role
-- bypasses RLS; the absence of a write policy denies all other roles.)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_destination_mapping'
      and policyname = 'event_destination_mapping_service_write'
  ) then
    create policy event_destination_mapping_service_write
      on public.event_destination_mapping
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Touch updated_at on every UPDATE.
create or replace function public.touch_event_destination_mapping_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_event_destination_mapping_updated_at
  on public.event_destination_mapping;
create trigger trg_event_destination_mapping_updated_at
before update on public.event_destination_mapping
for each row execute function public.touch_event_destination_mapping_updated_at();

-- ----------------------------------------------------------------------------
-- Seed: ADR-029 §"Event matrix" — 14 canonical events × N platforms
-- ----------------------------------------------------------------------------
-- Conventions:
--   - destination='meta' → standard Pixel/CAPI events from website action_source.
--   - destination='meta_messaging' → Pixel/CAPI events from messaging
--     action_source (chatwoot lifecycle). Distinct dispatcher branch because
--     payload shape differs (see #424 fix).
--   - destination='google_ads' → offline conversion upload (Conversions Upload
--     API). Conversion action names listed in destination_event_name match the
--     names that will be created in the Google Ads UI per AC2.2.
--   - destination='ga4' → Measurement Protocol event names.
--   - destination='tiktok' → TikTok Events API standard events.
--   - value_field=NULL → event has no monetary value. value_field='value_amount'
--     → dispatcher reads funnel_events.value_amount + funnel_events.value_currency.
-- ----------------------------------------------------------------------------

insert into public.event_destination_mapping
  (funnel_event_name, destination, destination_event_name, value_field, enabled, notes)
values
  -- pageview (Awareness)
  ('pageview', 'ga4', 'page_view', null, true,
   'Browser-direct via gtag/Measurement Protocol. Dispatcher MAY skip if browser already fires (config flag).'),

  -- whatsapp_cta_click (Intent)
  ('whatsapp_cta_click', 'meta', 'Contact', null, true,
   'Today: routed via app/api/growth/events/whatsapp-cta + lib/meta/conversions-api. F1 cutover migrates this to dispatcher.'),
  ('whatsapp_cta_click', 'ga4', 'cta_whatsapp', null, true, null),
  ('whatsapp_cta_click', 'tiktok', 'Contact', null, false,
   'Disabled until TikTok pixel id is configured per tenant.'),

  -- phone_cta_click (Intent)
  ('phone_cta_click', 'meta', 'Contact', null, true, null),
  ('phone_cta_click', 'ga4', 'cta_phone', null, true, null),

  -- email_cta_click (Intent)
  ('email_cta_click', 'meta', 'Contact', null, true, null),
  ('email_cta_click', 'ga4', 'cta_email', null, true, null),

  -- cal_booking_click (Intent)
  ('cal_booking_click', 'meta', 'Schedule', null, true, null),
  ('cal_booking_click', 'ga4', 'cta_calendar', null, true, null),

  -- waflow_submit (Lead)
  ('waflow_submit', 'meta', 'Lead', null, true,
   'Today: routed via app/api/waflow/lead + lib/meta/conversions-api. F1 cutover migrates this to dispatcher.'),
  ('waflow_submit', 'google_ads', 'waflow_submit', null, true,
   'NEW conversion action — created in Google Ads UI per AC2.2. Phase 2 (#332).'),
  ('waflow_submit', 'ga4', 'generate_lead', null, true, null),
  ('waflow_submit', 'tiktok', 'SubmitForm', null, false,
   'Disabled until TikTok pixel id is configured per tenant.'),

  -- quote_form_submit (Lead)
  ('quote_form_submit', 'meta', 'Lead', null, true, null),
  ('quote_form_submit', 'google_ads', 'quote_form_submit', null, true,
   'NEW conversion action. Phase 2 (#332).'),
  ('quote_form_submit', 'ga4', 'generate_lead', null, true, null),
  ('quote_form_submit', 'tiktok', 'SubmitForm', null, false, null),

  -- chatwoot_conversation_started (Lead)
  ('chatwoot_conversation_started', 'meta_messaging', 'Contact', null, true,
   'Messaging action_source. Today: routed via webhooks/chatwoot. F1 cutover migrates to dispatcher.'),

  -- chatwoot_message_received (Engagement)
  ('chatwoot_message_received', 'meta_messaging', 'Subscribe', null, true,
   'Messaging action_source. Fires per inbound message — high volume; consider sampling in dispatcher config.'),

  -- chatwoot_label_qualified (Qualify)
  ('chatwoot_label_qualified', 'meta_messaging', 'Lead', null, true, null),
  ('chatwoot_label_qualified', 'google_ads', 'qualified_lead', null, true,
   'NEW conversion action. Replaces the broken lead_calificado_form action.'),
  ('chatwoot_label_qualified', 'ga4', 'qualify_lead', null, true, null),

  -- crm_lead_stage_qualified (Qualify) — Flutter-originated
  ('crm_lead_stage_qualified', 'meta', 'Lead', null, true,
   'Custom event: Meta Lead from website action_source even though origin is CRM (no messaging context).'),
  ('crm_lead_stage_qualified', 'google_ads', 'qualified_lead', null, true,
   'Same Google Ads conversion action as chatwoot_label_qualified — Google dedupes by gclid+action+time.'),
  ('crm_lead_stage_qualified', 'ga4', 'qualify_lead', null, true, null),

  -- crm_quote_sent (Quote)
  ('crm_quote_sent', 'meta', 'InitiateCheckout', null, true,
   'Custom event mapped to InitiateCheckout to capture mid-funnel intent in Meta funnel reports.'),
  ('crm_quote_sent', 'google_ads', 'quote_sent', null, true,
   'NEW conversion action. Phase 3 (#327).'),
  ('crm_quote_sent', 'ga4', 'begin_checkout', null, true, null),

  -- crm_booking_confirmed (Booking)
  ('crm_booking_confirmed', 'meta', 'Purchase', 'value_amount', true,
   'Phase 3 (#327). value_amount = itineraries.total_amount, value_currency = itineraries.currency_type. Fires when itineraries.status=Confirmado.'),
  ('crm_booking_confirmed', 'google_ads', 'booking_confirmed', 'value_amount', true,
   'NEW conversion action with value_settings. Phase 3 (#327).'),
  ('crm_booking_confirmed', 'ga4', 'purchase', 'value_amount', true, null),
  ('crm_booking_confirmed', 'tiktok', 'CompletePayment', 'value_amount', false,
   'Disabled until TikTok pixel id is configured per tenant.'),

  -- payment_received (Realized)
  ('payment_received', 'google_ads', 'payment_received', 'value_amount', true,
   'NEW conversion action — revenue reporting only, NOT used for Smart Bidding. Per SPEC §Open Q3.')

on conflict (funnel_event_name, destination) do nothing;

comment on table public.event_destination_mapping is
  'Declarative mapping of canonical funnel_event_name → destination platforms. Dispatcher reads this to fan events out. ADR-029 §"Mapping is declarative".';
comment on column public.event_destination_mapping.destination is
  'Platform: meta | meta_messaging | google_ads | ga4 | tiktok. Add new platforms by extending the CHECK + dispatcher branch.';
comment on column public.event_destination_mapping.value_field is
  'Column from funnel_events to use as conversion value (currently only value_amount supported). NULL = event has no monetary value.';
comment on column public.event_destination_mapping.tenant_overrides is
  'Per-tenant config: { "<account_id>": { "destination_event_name": "...", "enabled": false } }. Phase 4 AC4.4.';
