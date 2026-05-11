-- ============================================================================
-- WAFlow diagnostic events — GA4/server-side observability (#491 / #419)
-- ============================================================================
-- Adds observation-only WAFlow events needed to measure open -> validation
-- error -> abandon outside browser-only analytics.

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
      'waflow_validation_error',
      'waflow_abandon',
      'waflow_submit',
      'whatsapp_cta_click',
      'qualified_lead',
      'quote_sent',
      'booking_confirmed',
      'review_submitted',
      'referral_lead'
    ));

insert into public.funnel_event_optimization_policy
  (event_name, business_stage, source_owner, optimization_policy, notes)
values
  ('waflow_validation_error', 'intent', 'studio', 'observation_only', 'WAFlow form validation diagnostic; not a bidding event.'),
  ('waflow_abandon', 'dropped', 'studio', 'observation_only', 'WAFlow abandonment diagnostic; not a bidding event.')
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
  ('waflow_open', 'ga4', 'waflow_open', null, true, 'WAFlow open diagnostic for abandonment funnel.'),
  ('waflow_validation_error', 'ga4', 'waflow_validation_error', null, true, 'WAFlow validation diagnostic for abandonment funnel.'),
  ('waflow_abandon', 'ga4', 'waflow_abandon', null, true, 'WAFlow abandonment diagnostic.')
on conflict (funnel_event_name, destination) do update
set destination_event_name = excluded.destination_event_name,
    value_field = excluded.value_field,
    enabled = excluded.enabled,
    notes = excluded.notes,
    updated_at = now();
