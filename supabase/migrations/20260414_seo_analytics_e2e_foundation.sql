-- SEO/Analytics E2E foundation (SPEC-IA-001 v4.1)
-- Creates integration + analytics tables with strict multi-tenant RLS.

create table if not exists seo_gsc_credentials (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  provider text not null check (provider in ('gsc', 'ga4')),
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  site_url text,
  property_id text,
  scopes text[] not null default '{}',
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, provider)
);

create table if not exists seo_ga4_page_metrics (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  metric_date date not null,
  page_path text not null,
  sessions integer not null default 0,
  users integer not null default 0,
  pageviews integer not null default 0,
  conversions integer not null default 0,
  bounce_rate numeric(6,3),
  avg_session_duration numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, metric_date, page_path)
);

create table if not exists seo_competitors (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  snapshot_date date not null,
  domain text not null,
  avg_position numeric(8,2),
  traffic_share numeric(8,4),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, snapshot_date, domain)
);

create table if not exists seo_api_calls (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  provider text not null,
  endpoint text not null,
  request_id text,
  row_count integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  latency_ms integer,
  status text not null check (status in ('success', 'error')),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  called_at timestamptz not null default now()
);

create index if not exists idx_seo_gsc_credentials_website_provider
  on seo_gsc_credentials(website_id, provider);

create index if not exists idx_seo_gsc_credentials_expiry
  on seo_gsc_credentials(token_expiry);

create index if not exists idx_seo_ga4_metrics_website_date
  on seo_ga4_page_metrics(website_id, metric_date desc);

create index if not exists idx_seo_ga4_metrics_website_page
  on seo_ga4_page_metrics(website_id, page_path);

create index if not exists idx_seo_competitors_website_snapshot
  on seo_competitors(website_id, snapshot_date desc);

create index if not exists idx_seo_api_calls_website_called_at
  on seo_api_calls(website_id, called_at desc);

create index if not exists idx_seo_api_calls_request_id
  on seo_api_calls(request_id);

create index if not exists idx_seo_keywords_website_keyword
  on seo_keywords(website_id, keyword);

create index if not exists idx_seo_keyword_snapshots_keyword_date
  on seo_keyword_snapshots(keyword_id, snapshot_date desc);

alter table seo_gsc_credentials enable row level security;
alter table seo_ga4_page_metrics enable row level security;
alter table seo_competitors enable row level security;
alter table seo_api_calls enable row level security;

-- Common predicate: user must belong to website account.
create policy "Users can select seo_gsc_credentials"
  on seo_gsc_credentials
  for select
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_gsc_credentials"
  on seo_gsc_credentials
  for all
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_gsc_credentials.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_ga4_page_metrics"
  on seo_ga4_page_metrics
  for select
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_ga4_page_metrics"
  on seo_ga4_page_metrics
  for all
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_ga4_page_metrics.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_competitors"
  on seo_competitors
  for select
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_competitors"
  on seo_competitors
  for all
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_competitors.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can select seo_api_calls"
  on seo_api_calls
  for select
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can manage seo_api_calls"
  on seo_api_calls
  for all
  using (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from websites w
      join user_roles ur on ur.account_id = w.account_id
      where w.id = seo_api_calls.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );
