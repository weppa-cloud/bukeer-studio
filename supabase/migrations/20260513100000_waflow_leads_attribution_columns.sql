-- ============================================================================
-- WAFlow attribution columns for operational paid-growth analysis
-- ============================================================================
-- Purpose:
--   Keep paid click ids and UTM fields queryable without relying on JSON payload
--   extraction. funnel_events remains the SOT for dispatch, while waflow_leads
--   is used by CRM/growth operators to reconcile form starts/submits.
-- ============================================================================

alter table public.waflow_leads
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists gad_campaignid text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists source_url text,
  add column if not exists page_path text;

comment on column public.waflow_leads.gclid is
  'Google Ads click id captured from WAFlow attribution/source_url.';
comment on column public.waflow_leads.gad_campaignid is
  'Google Ads campaign id captured from gad_campaignid/campaignid. Also used as utm_campaign fallback.';
comment on column public.waflow_leads.source_url is
  'Landing URL where the WAFlow lead was captured, including campaign query parameters when present.';

update public.waflow_leads wl
set
  gclid = coalesce(
    wl.gclid,
    nullif(wl.payload #>> '{attribution,gclid}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]gclid=([^&#]+)'), '')
  ),
  gbraid = coalesce(
    wl.gbraid,
    nullif(wl.payload #>> '{attribution,gbraid}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]gbraid=([^&#]+)'), '')
  ),
  wbraid = coalesce(
    wl.wbraid,
    nullif(wl.payload #>> '{attribution,wbraid}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]wbraid=([^&#]+)'), '')
  ),
  gad_campaignid = coalesce(
    wl.gad_campaignid,
    nullif(wl.payload #>> '{attribution,gad_campaignid}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]gad_campaignid=([^&#]+)'), ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]campaignid=([^&#]+)'), '')
  ),
  utm_source = coalesce(
    wl.utm_source,
    nullif(wl.payload #>> '{attribution,utm_source}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]utm_source=([^&#]+)'), '')
  ),
  utm_medium = coalesce(
    wl.utm_medium,
    nullif(wl.payload #>> '{attribution,utm_medium}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]utm_medium=([^&#]+)'), '')
  ),
  utm_campaign = coalesce(
    wl.utm_campaign,
    nullif(wl.payload #>> '{attribution,utm_campaign}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]utm_campaign=([^&#]+)'), ''),
    nullif(wl.payload #>> '{attribution,gad_campaignid}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]gad_campaignid=([^&#]+)'), ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]campaignid=([^&#]+)'), '')
  ),
  utm_content = coalesce(
    wl.utm_content,
    nullif(wl.payload #>> '{attribution,utm_content}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]utm_content=([^&#]+)'), '')
  ),
  utm_term = coalesce(
    wl.utm_term,
    nullif(wl.payload #>> '{attribution,utm_term}', ''),
    nullif(substring(wl.payload #>> '{attribution,source_url}' from '[?&]utm_term=([^&#]+)'), '')
  ),
  source_url = coalesce(
    wl.source_url,
    nullif(wl.payload #>> '{attribution,source_url}', ''),
    nullif(wl.payload ->> 'sourceUrl', '')
  ),
  page_path = coalesce(
    wl.page_path,
    nullif(wl.payload #>> '{attribution,page_path}', '')
  )
where
  wl.gclid is null
  or wl.gbraid is null
  or wl.wbraid is null
  or wl.gad_campaignid is null
  or wl.utm_campaign is null
  or wl.source_url is null
  or wl.page_path is null;

create index if not exists waflow_leads_gclid_idx
  on public.waflow_leads(gclid)
  where gclid is not null;

create index if not exists waflow_leads_gad_campaignid_created_idx
  on public.waflow_leads(gad_campaignid, created_at desc)
  where gad_campaignid is not null;

create index if not exists waflow_leads_utm_campaign_created_idx
  on public.waflow_leads(utm_campaign, created_at desc)
  where utm_campaign is not null;

-- Rollback:
-- drop index if exists public.waflow_leads_utm_campaign_created_idx;
-- drop index if exists public.waflow_leads_gad_campaignid_created_idx;
-- drop index if exists public.waflow_leads_gclid_idx;
-- alter table public.waflow_leads
--   drop column if exists page_path,
--   drop column if exists source_url,
--   drop column if exists utm_term,
--   drop column if exists utm_content,
--   drop column if exists utm_campaign,
--   drop column if exists utm_medium,
--   drop column if exists utm_source,
--   drop column if exists gad_campaignid,
--   drop column if exists wbraid,
--   drop column if exists gbraid,
--   drop column if exists gclid;
