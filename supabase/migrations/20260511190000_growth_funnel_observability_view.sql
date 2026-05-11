-- ============================================================================
-- Growth funnel observability view — #419 / #491 AC6.6
-- ============================================================================
-- Agent/Growth OS read model. `funnel_events` remains conversion truth; GA4
-- and Clarity are diagnostic/provider evidence.

create or replace view public.growth_funnel_observability_v1
with (security_invoker = true)
as
select
  fe.event_id,
  fe.pixel_event_id,
  fe.event_name,
  fe.event_version,
  fe.source_system,
  fe.business_stage,
  fe.owner,
  fe.optimization_policy,
  fe.identity_confidence,
  fe.attribution_confidence,
  fe.stage,
  fe.channel,
  fe.account_id,
  fe.website_id,
  fe.reference_code,
  fe.locale,
  fe.market,
  fe.occurred_at,
  fe.created_at,
  fe.dispatch_status,
  fe.dispatch_attempt_count,
  fe.dispatch_attempted_at,
  fe.gclid,
  fe.gbraid,
  fe.wbraid,
  fe.fbp is not null as has_fbp,
  fe.fbc is not null as has_fbc,
  fe.utm_source,
  fe.utm_medium,
  fe.utm_campaign,
  fe.utm_term,
  fe.utm_content,
  fe.source_url,
  fe.page_path,
  fe.value_amount,
  fe.value_currency,
  fe.payload,
  wl.id as waflow_lead_id,
  wl.variant as waflow_variant,
  wl.step as waflow_step,
  wl.submitted_at as waflow_submitted_at,
  wl.whatsapp_redirected_at as waflow_whatsapp_redirected_at,
  req.id as request_id,
  req.short_id as request_short_id,
  req.chatwoot_conversation_id,
  req.created_at as request_created_at,
  req.updated_at as request_updated_at,
  itin.id as itinerary_id,
  itin.status as itinerary_status,
  itin.total_amount as itinerary_total_amount,
  itin.total_markup as itinerary_total_markup,
  itin.currency_type as itinerary_currency,
  itin.confirmed_at as itinerary_confirmed_at,
  itin.confirmation_date as itinerary_confirmation_date,
  meta.status as meta_status,
  meta.event_name as meta_event_name,
  meta.sent_at as meta_sent_at,
  meta.error as meta_error,
  google.status as google_ads_status,
  google.conversion_action_id as google_ads_conversion_action_id,
  google.sent_at as google_ads_sent_at,
  google.error as google_ads_error,
  ga4.status as ga4_status,
  ga4.event_name as ga4_event_name,
  ga4.measurement_id as ga4_measurement_id,
  ga4.property_id as ga4_property_id,
  ga4.sent_at as ga4_sent_at,
  ga4.error as ga4_error,
  clarity.id as clarity_profile_run_id,
  clarity.run_status as clarity_run_status,
  clarity.freshness_status as clarity_freshness_status,
  clarity.quality_status as clarity_quality_status,
  clarity.completed_at as clarity_completed_at,
  case
    when jsonb_typeof(clarity.payload->'rows') = 'array'
      then jsonb_array_length(clarity.payload->'rows')
    else null
  end as clarity_row_count
from public.funnel_events fe
left join public.waflow_leads wl
  on wl.reference_code = fe.reference_code
  and wl.website_id = fe.website_id
left join public.requests req
  on req.account_id = fe.account_id
  and (
    req.short_id = fe.reference_code
    or req.chatwoot_conversation_id::text = (fe.payload->>'chatwoot_conversation_id')
    or coalesce(req.custom_fields, '{}'::jsonb)->>'reference_code' = fe.reference_code
    or coalesce(req.custom_fields, '{}'::jsonb)->>'growth_reference_code' = fe.reference_code
  )
left join lateral (
  select i.*
  from public.itineraries i
  where i.account_id = fe.account_id
    and (
      i.request_id = req.id
      or coalesce(i.custom_fields, '{}'::jsonb)->>'reference_code' = fe.reference_code
      or coalesce(i.custom_fields, '{}'::jsonb)->>'growth_reference_code' = fe.reference_code
    )
  order by i.confirmed_at desc nulls last, i.updated_at desc nulls last, i.created_at desc
  limit 1
) itin on true
left join lateral (
  select m.*
  from public.meta_conversion_events m
  where m.account_id = fe.account_id
    and m.website_id = fe.website_id
    and (
      m.event_id = coalesce(fe.pixel_event_id, fe.event_id)
      or m.trace->>'funnel_event_id' = fe.event_id
    )
  order by m.created_at desc
  limit 1
) meta on true
left join lateral (
  select g.*
  from public.google_ads_offline_uploads g
  where g.account_id = fe.account_id
    and g.website_id = fe.website_id
    and g.funnel_event_id = fe.event_id
  order by g.created_at desc
  limit 1
) google on true
left join lateral (
  select ge.*
  from public.ga4_measurement_protocol_events ge
  where ge.account_id = fe.account_id
    and ge.website_id = fe.website_id
    and ge.funnel_event_id = fe.event_id
  order by ge.created_at desc
  limit 1
) ga4 on true
left join lateral (
  select gp.*
  from public.growth_profile_runs gp
  where gp.account_id = fe.account_id
    and gp.website_id = fe.website_id
    and gp.provider = 'clarity'
    and gp.profile_id = 'clarity_ux_friction_v1'
  order by gp.completed_at desc nulls last, gp.created_at desc
  limit 1
) clarity on true;

comment on view public.growth_funnel_observability_v1 is
  'Agent/Growth OS read model joining funnel_events SOT to WAFlow, CRM, booking, Meta, Google Ads, GA4 MP, and latest Clarity aggregate freshness. #491 AC6.6.';

grant select on public.growth_funnel_observability_v1 to authenticated;
