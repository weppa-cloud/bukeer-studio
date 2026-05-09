-- Temporary delivery mappings for legacy event_name aliases during the #419
-- production validation window.
--
-- New writers must emit canonical names:
--   qualified_lead    -> chatwoot_label_qualified
--   quote_sent        -> crm_quote_sent
--   booking_confirmed -> crm_booking_confirmed
--
-- These rows prevent stale/lagging writers from being marked dispatched with
-- no destination delivery before #425 removes aliases after the 7-day gate.

insert into public.event_destination_mapping
  (funnel_event_name, destination, destination_event_name, value_field, enabled, notes)
values
  ('qualified_lead', 'meta', 'Lead', null, true,
   'TEMP #425: legacy alias website Lead fallback until tenant page_id/waba_id is configured for business_messaging.'),
  ('qualified_lead', 'meta_messaging', 'LeadSubmitted', null, false,
   'TEMP #425: disabled until tenant page_id/waba_id is configured for business_messaging.'),
  ('qualified_lead', 'google_ads', 'qualified_lead', null, true,
   'TEMP #425: legacy alias for chatwoot_label_qualified during production validation.'),
  ('qualified_lead', 'ga4', 'qualify_lead', null, true,
   'TEMP #425: legacy alias for chatwoot_label_qualified during production validation.'),

  ('quote_sent', 'meta', 'InitiateCheckout', null, true,
   'TEMP #425: legacy alias for crm_quote_sent during production validation.'),
  ('quote_sent', 'google_ads', 'quote_sent', null, true,
   'TEMP #425: legacy alias for crm_quote_sent during production validation.'),
  ('quote_sent', 'ga4', 'begin_checkout', null, true,
   'TEMP #425: legacy alias for crm_quote_sent during production validation.'),

  ('booking_confirmed', 'meta', 'Purchase', 'value_amount', true,
   'TEMP #425: legacy alias for crm_booking_confirmed during production validation.'),
  ('booking_confirmed', 'google_ads', 'booking_confirmed', 'value_amount', true,
   'TEMP #425: legacy alias for crm_booking_confirmed during production validation.'),
  ('booking_confirmed', 'ga4', 'purchase', 'value_amount', true,
   'TEMP #425: legacy alias for crm_booking_confirmed during production validation.')
on conflict (funnel_event_name, destination) do update set
  destination_event_name = excluded.destination_event_name,
  value_field = excluded.value_field,
  enabled = excluded.enabled,
  notes = excluded.notes,
  updated_at = now();
