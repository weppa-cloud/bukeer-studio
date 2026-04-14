-- Reconcile legacy SEO tables to E2E contract without data loss (staging hotfix)

-- Credentials: add required columns
alter table if exists public.seo_gsc_credentials
  add column if not exists provider text,
  add column if not exists property_id text,
  add column if not exists scopes text[] default '{}',
  add column if not exists last_error text,
  add column if not exists connected_at timestamptz;

-- Drop legacy one-row-per-website unique constraint
alter table if exists public.seo_gsc_credentials
  drop constraint if exists seo_gsc_credentials_website_id_key;

update public.seo_gsc_credentials
set provider = coalesce(provider, 'gsc')
where provider is null;

update public.seo_gsc_credentials
set property_id = coalesce(property_id, ga4_property_id)
where property_id is null and ga4_property_id is not null;

-- Create ga4 provider rows from legacy mixed-row shape if missing
insert into public.seo_gsc_credentials (
  website_id, provider, access_token, refresh_token, token_expiry, site_url, property_id, scopes, last_error, connected_at
)
select
  c.website_id,
  'ga4',
  c.access_token,
  c.refresh_token,
  c.token_expiry,
  c.site_url,
  c.ga4_property_id,
  coalesce(c.scopes, '{}'),
  c.last_error,
  coalesce(c.connected_at, c.updated_at, now())
from public.seo_gsc_credentials c
where c.ga4_property_id is not null
  and not exists (
    select 1 from public.seo_gsc_credentials x
    where x.website_id = c.website_id and x.provider = 'ga4'
  );

with ranked as (
  select id,
         row_number() over (
           partition by website_id, provider
           order by coalesce(updated_at, created_at, now()) desc, id desc
         ) rn
  from public.seo_gsc_credentials
)
delete from public.seo_gsc_credentials t
using ranked r
where t.id=r.id and r.rn>1;

-- GA4 metrics compatibility columns
alter table if exists public.seo_ga4_page_metrics
  add column if not exists users integer,
  add column if not exists pageviews integer,
  add column if not exists source text,
  add column if not exists updated_at timestamptz default now();

update public.seo_ga4_page_metrics
set users = coalesce(users, new_users, sessions, 0)
where users is null;

update public.seo_ga4_page_metrics
set pageviews = coalesce(pageviews, page_views, sessions, 0)
where pageviews is null;

update public.seo_ga4_page_metrics
set updated_at = coalesce(updated_at, fetched_at, now())
where updated_at is null;

with ranked as (
  select id,
         row_number() over (
           partition by website_id, metric_date, page_path
           order by coalesce(updated_at, fetched_at, now()) desc, id desc
         ) rn
  from public.seo_ga4_page_metrics
)
delete from public.seo_ga4_page_metrics t
using ranked r
where t.id=r.id and r.rn>1;

-- Competitors compatibility columns
alter table if exists public.seo_competitors
  add column if not exists source text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.seo_competitors set source=coalesce(source,'manual') where source is null;
update public.seo_competitors set created_at=coalesce(created_at,now()) where created_at is null;
update public.seo_competitors set updated_at=coalesce(updated_at,now()) where updated_at is null;

with ranked as (
  select id,
         row_number() over (
           partition by website_id, snapshot_date, domain
           order by coalesce(updated_at, created_at, now()) desc, id desc
         ) rn
  from public.seo_competitors
)
delete from public.seo_competitors t
using ranked r
where t.id=r.id and r.rn>1;

-- API calls compatibility columns
alter table if exists public.seo_api_calls
  add column if not exists provider text,
  add column if not exists status text,
  add column if not exists request_id text,
  add column if not exists latency_ms integer,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.seo_api_calls set provider=coalesce(provider,'google') where provider is null;
update public.seo_api_calls set status=coalesce(status,'success') where status is null;
update public.seo_api_calls set metadata=coalesce(metadata,'{}'::jsonb) where metadata is null;

-- Enforce non-null defaults where required by app
alter table public.seo_api_calls alter column provider set not null;
alter table public.seo_api_calls alter column status set not null;
alter table public.seo_gsc_credentials alter column provider set not null;

-- Unique indexes / read indexes
create unique index if not exists ux_seo_gsc_credentials_website_provider
  on public.seo_gsc_credentials(website_id, provider);

create unique index if not exists ux_seo_ga4_metrics_website_date_page
  on public.seo_ga4_page_metrics(website_id, metric_date, page_path);

create unique index if not exists ux_seo_competitors_website_snapshot_domain
  on public.seo_competitors(website_id, snapshot_date, domain);

create index if not exists idx_seo_gsc_credentials_website_provider
  on public.seo_gsc_credentials(website_id, provider);

create index if not exists idx_seo_gsc_credentials_expiry
  on public.seo_gsc_credentials(token_expiry);

create index if not exists idx_seo_ga4_metrics_website_date
  on public.seo_ga4_page_metrics(website_id, metric_date desc);

create index if not exists idx_seo_ga4_metrics_website_page
  on public.seo_ga4_page_metrics(website_id, page_path);

create index if not exists idx_seo_competitors_website_snapshot
  on public.seo_competitors(website_id, snapshot_date desc);

create index if not exists idx_seo_api_calls_website_called_at
  on public.seo_api_calls(website_id, called_at desc);

create index if not exists idx_seo_api_calls_request_id
  on public.seo_api_calls(request_id);

create index if not exists idx_seo_keywords_website_keyword
  on public.seo_keywords(website_id, keyword);

create index if not exists idx_seo_keyword_snapshots_keyword_date
  on public.seo_keyword_snapshots(keyword_id, snapshot_date desc);

-- Enable RLS and enforce scoped policies
alter table public.seo_gsc_credentials enable row level security;
alter table public.seo_ga4_page_metrics enable row level security;
alter table public.seo_competitors enable row level security;
alter table public.seo_api_calls enable row level security;

do $$
declare
  r record;
  tbl text;
begin
  foreach tbl in array array['seo_gsc_credentials','seo_ga4_page_metrics','seo_competitors','seo_api_calls'] loop
    for r in
      select policyname
      from pg_policies
      where schemaname='public' and tablename=tbl
    loop
      execute format('drop policy if exists %I on public.%I', r.policyname, tbl);
    end loop;
  end loop;
end $$;

create policy "Users can select seo_gsc_credentials"
  on public.seo_gsc_credentials
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_gsc_credentials"
  on public.seo_gsc_credentials
  for all
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_ga4_page_metrics"
  on public.seo_ga4_page_metrics
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_ga4_page_metrics"
  on public.seo_ga4_page_metrics
  for all
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_competitors"
  on public.seo_competitors
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_competitors"
  on public.seo_competitors
  for all
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_api_calls"
  on public.seo_api_calls
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_api_calls"
  on public.seo_api_calls
  for all
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );
