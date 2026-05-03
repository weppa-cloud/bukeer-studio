-- ============================================================================
-- SEO integrations — Growth OS provider contract (#310 / #311)
-- ============================================================================
-- Purpose:
--   Creates the provider integration ledger used by Growth OS clients
--   (`lib/growth/gsc-client.ts`, `lib/growth/ga4-client.ts`) for GSC, GA4 and
--   DataForSEO configuration.
--
-- Safety:
--   - Additive, forward-only migration.
--   - Backfills GSC/GA4 rows from the legacy `seo_gsc_credentials` table.
--   - Service-role only for v1 because rows may contain OAuth tokens.
--   - Does not delete or modify legacy credentials; legacy SEO UI can continue
--     reading/writing `seo_gsc_credentials` until a dedicated migration moves it.
-- ============================================================================

create table if not exists public.seo_integrations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  provider text not null,
  status text not null default 'configured',
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  site_url text,
  property_id text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_integrations_provider_chk
    check (provider in ('gsc', 'ga4', 'dataforseo')),
  constraint seo_integrations_status_chk
    check (status in ('configured', 'connected', 'expired', 'error', 'disabled')),
  constraint seo_integrations_website_provider_uniq
    unique (website_id, provider)
);

create index if not exists seo_integrations_account_provider_idx
  on public.seo_integrations(account_id, provider);

create index if not exists seo_integrations_website_provider_idx
  on public.seo_integrations(website_id, provider);

create index if not exists seo_integrations_expiry_idx
  on public.seo_integrations(access_token_expires_at)
  where access_token_expires_at is not null;

create index if not exists seo_integrations_metadata_gin_idx
  on public.seo_integrations using gin(metadata);

alter table public.seo_integrations enable row level security;

drop policy if exists seo_integrations_service_all on public.seo_integrations;
create policy seo_integrations_service_all
  on public.seo_integrations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.touch_seo_integrations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_seo_integrations_updated_at
  on public.seo_integrations;
create trigger trg_seo_integrations_updated_at
before update on public.seo_integrations
for each row execute function public.touch_seo_integrations_updated_at();

insert into public.seo_integrations (
  account_id,
  website_id,
  provider,
  status,
  access_token,
  refresh_token,
  access_token_expires_at,
  site_url,
  property_id,
  scopes,
  metadata,
  last_error,
  connected_at,
  created_at,
  updated_at
)
select
  w.account_id,
  c.website_id,
  c.provider,
  case
    when c.last_error is not null and btrim(c.last_error) <> '' then 'error'
    when c.token_expiry is not null and c.token_expiry <= now() then 'expired'
    when c.refresh_token is not null and btrim(c.refresh_token) <> '' then 'connected'
    else 'configured'
  end as status,
  c.access_token,
  c.refresh_token,
  c.token_expiry,
  c.site_url,
  coalesce(c.property_id, c.ga4_property_id),
  coalesce(c.scopes, '{}'::text[]),
  jsonb_strip_nulls(
    jsonb_build_object(
      'source_table', 'seo_gsc_credentials',
      'legacy_credential_id', c.id,
      'ga4_connected', c.ga4_connected,
      'legacy_updated_at', c.updated_at
    )
  ),
  c.last_error,
  coalesce(c.connected_at, c.updated_at, c.created_at, now()),
  now(),
  now()
from public.seo_gsc_credentials c
join public.websites w on w.id = c.website_id
where c.provider in ('gsc', 'ga4')
on conflict (website_id, provider) do update set
  account_id = excluded.account_id,
  status = excluded.status,
  access_token = excluded.access_token,
  refresh_token = excluded.refresh_token,
  access_token_expires_at = excluded.access_token_expires_at,
  site_url = excluded.site_url,
  property_id = excluded.property_id,
  scopes = excluded.scopes,
  metadata = public.seo_integrations.metadata || excluded.metadata,
  last_error = excluded.last_error,
  connected_at = excluded.connected_at,
  updated_at = now();

comment on table public.seo_integrations is
  'Service-role provider integration ledger for Growth OS and SEO ingestion clients.';
comment on column public.seo_integrations.provider is
  'Provider key: gsc, ga4, or dataforseo.';
comment on column public.seo_integrations.status is
  'Operational status. expired means credentials were mirrored but need reauthorization.';
comment on column public.seo_integrations.metadata is
  'Non-secret provider metadata and migration provenance. Do not store raw provider secrets here.';
