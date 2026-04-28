-- ============================================================================
-- funnel_events — backfill last 30 days of WAFlow + Chatwoot history
-- ============================================================================
-- Idempotent: every INSERT uses ON CONFLICT (event_id) DO NOTHING.
--
-- Strategy:
--   event_id is computed inside SQL as encode(extensions.digest(payload, 'sha256'), 'hex')
--   to mirror the browser/server contract:
--     event_id = lowercase(sha256(reference_code:event_name:occurred_at_s))
--
--   pgcrypto must be enabled (Supabase enables it by default in `extensions`).
--
--   Sources:
--     - waflow_leads (`submitted_at IS NOT NULL` within 30 days) → waflow_submit
--     - meta_conversion_events (`provider='meta'` chatwoot lifecycle in 30 days)
--         where event_id matches `<ref>:chatwoot:QualifiedLead:<conv>` etc.
--
--   Tenant scope: only rows with non-null account_id + website_id are seeded.
--   locale/market default to 'es-CO' / 'CO' (ColombiaTours primary). Once the
--   Phase 1 Edge ingestion publishes per-row locale/market we will rewrite the
--   row in place via UPDATE … FROM (separate migration).
-- ============================================================================

-- Build a CTE of WAFlow submissions over the last 30 days and insert.
with waflow_source as (
  select
    wl.reference_code,
    wl.account_id,
    wl.website_id,
    coalesce(wl.submitted_at, wl.created_at) as occurred_at,
    coalesce(wl.payload, '{}'::jsonb) as payload,
    wl.session_key,
    wl.variant,
    wl.subdomain
  from public.waflow_leads wl
  where wl.submitted_at is not null
    and wl.submitted_at >= now() - interval '30 days'
    and wl.account_id is not null
    and wl.website_id is not null
    and wl.reference_code is not null
    and char_length(wl.reference_code) between 8 and 64
)
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
select
  encode(
    extensions.digest(
      ws.reference_code || ':waflow_submit:' || floor(extract(epoch from ws.occurred_at))::bigint,
      'sha256'
    ),
    'hex'
  ) as event_id,
  'waflow_submit' as event_name,
  'activation' as stage,
  'waflow' as channel,
  ws.reference_code,
  ws.account_id,
  ws.website_id,
  coalesce(nullif(ws.payload->>'locale', ''), 'es-CO') as locale,
  coalesce(
    case
      when upper(coalesce(ws.payload->>'country', ws.payload->>'market')) in ('CO','MX','US','CA','EU')
        then upper(coalesce(ws.payload->>'country', ws.payload->>'market'))
      else 'CO'
    end,
    'CO'
  ) as market,
  ws.occurred_at,
  case
    when ws.payload ? 'attribution' then ws.payload->'attribution'
    else null
  end as attribution,
  jsonb_build_object(
    'session_key', ws.session_key,
    'variant', ws.variant,
    'subdomain', ws.subdomain,
    'package_slug', ws.payload->>'packageSlug',
    'destination_slug', ws.payload->>'destinationSlug',
    'package_tier', ws.payload->>'packageTier',
    'backfill', true
  ) as payload,
  '[]'::jsonb as provider_status,
  nullif(ws.payload->'attribution'->>'source_url', '') as source_url,
  nullif(ws.payload->'attribution'->>'page_path', '') as page_path
from waflow_source ws
on conflict (event_id) do nothing;

-- Chatwoot lifecycle backfill (qualified_lead, quote_sent) over last 30 days
-- using meta_conversion_events as the canonical source: every server-emitted
-- lifecycle conversion already wrote a row there, with reference_code present
-- in trace.
with chatwoot_source as (
  select
    mce.event_name as lifecycle_event,
    case mce.event_name
      when 'QualifiedLead' then 'qualified_lead'
      when 'QuoteSent' then 'quote_sent'
    end as funnel_event_name,
    nullif(mce.trace->>'reference_code', '') as reference_code,
    mce.chatwoot_conversation_id,
    mce.account_id,
    mce.website_id,
    mce.event_time as occurred_at,
    mce.event_source_url,
    mce.waflow_lead_id,
    mce.event_id as meta_event_id
  from public.meta_conversion_events mce
  where mce.provider = 'meta'
    and mce.event_name in ('QualifiedLead', 'QuoteSent')
    and mce.created_at >= now() - interval '30 days'
    and mce.account_id is not null
    and mce.website_id is not null
    and nullif(mce.trace->>'reference_code', '') is not null
)
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
select
  encode(
    extensions.digest(
      cs.reference_code || ':' || cs.funnel_event_name || ':' || floor(extract(epoch from cs.occurred_at))::bigint,
      'sha256'
    ),
    'hex'
  ) as event_id,
  cs.funnel_event_name as event_name,
  case cs.funnel_event_name
    when 'qualified_lead' then 'qualified_lead'
    when 'quote_sent' then 'quote_sent'
  end as stage,
  'chatwoot' as channel,
  cs.reference_code,
  cs.account_id,
  cs.website_id,
  'es-CO' as locale,
  'CO' as market,
  cs.occurred_at,
  null as attribution,
  jsonb_build_object(
    'lifecycle_event', cs.lifecycle_event,
    'chatwoot_conversation_id', cs.chatwoot_conversation_id,
    'waflow_lead_id', cs.waflow_lead_id,
    'meta_event_id', cs.meta_event_id,
    'backfill', true
  ) as payload,
  '[]'::jsonb as provider_status,
  cs.event_source_url as source_url,
  null as page_path
from chatwoot_source cs
where cs.reference_code is not null
  and char_length(cs.reference_code) between 8 and 64
on conflict (event_id) do nothing;
