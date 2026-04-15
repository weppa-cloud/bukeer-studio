-- EPIC #86 — SEO Content Intelligence platform data model
-- Covers issues #87..#97 (UI/API/Data contract baseline).

-- ---------------------------------------------------------------------------
-- Shared trust-state domain
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'seo_confidence'
  ) then
    create type public.seo_confidence as enum ('live', 'partial', 'exploratory');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- #87 Audit
-- ---------------------------------------------------------------------------

create table if not exists public.seo_render_snapshots (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  page_type text not null,
  page_id uuid,
  public_url text not null,
  title text,
  meta_description text,
  canonical_url text,
  hreflang jsonb not null default '{}'::jsonb,
  headings jsonb not null default '[]'::jsonb,
  visible_text text,
  internal_links jsonb not null default '[]'::jsonb,
  schema_types jsonb not null default '[]'::jsonb,
  source text not null default 'database-derived',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.seo_audit_findings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  snapshot_id uuid not null references public.seo_render_snapshots(id) on delete cascade,
  locale text not null,
  page_type text not null,
  page_id uuid,
  public_url text not null,
  finding_type text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  status text not null default 'open',
  title text not null,
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  source text not null default 'database-derived',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  decay_signal text not null default 'none' check (decay_signal in ('none', 'low', 'medium', 'high')),
  clicks_90d_current integer not null default 0,
  clicks_90d_previous integer not null default 0,
  decay_delta_pct numeric(8,2) not null default 0,
  cannibalization_group_id uuid,
  cannibalization_recommended_action text not null default 'none'
    check (cannibalization_recommended_action in ('merge', 'redirect', 'differentiate_intent', 'none')),
  priority_score numeric(14,2) not null default 0,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- #88 Research
-- ---------------------------------------------------------------------------

create table if not exists public.seo_keyword_research_runs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  content_type text not null,
  country text not null,
  language text not null,
  locale text not null,
  seeds jsonb not null default '[]'::jsonb,
  status text not null default 'completed',
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.seo_keyword_candidates (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.seo_keyword_research_runs(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  content_type text not null,
  country text not null,
  language text not null,
  locale text not null,
  keyword text not null,
  intent text not null default 'informational',
  serp_type text,
  difficulty numeric(7,2),
  search_volume integer,
  cpc numeric(12,4),
  competition numeric(7,4),
  recommendation_action text not null default 'create',
  serp_top_competitors jsonb not null default '[]'::jsonb,
  seasonality_pattern jsonb,
  seasonality_status text not null default 'unavailable' check (seasonality_status in ('available', 'unavailable')),
  priority_score numeric(14,2) not null default 0,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- #89 Clusters
-- ---------------------------------------------------------------------------

create table if not exists public.seo_clusters (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  content_type text not null,
  name text not null,
  primary_topic text not null,
  target_country text not null,
  target_language text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'paused')),
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'live',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_cluster_keywords (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.seo_clusters(id) on delete cascade,
  keyword text not null,
  intent text not null default 'informational',
  serp_type text,
  difficulty numeric(7,2),
  search_volume integer,
  priority numeric(8,2),
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'live',
  created_at timestamptz not null default now(),
  unique (cluster_id, keyword)
);

create table if not exists public.seo_cluster_pages (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.seo_clusters(id) on delete cascade,
  page_type text not null,
  page_id uuid not null,
  role text not null default 'spoke' check (role in ('hub', 'spoke', 'support')),
  target_keyword text,
  status text not null default 'planned' check (status in ('planned', 'draft', 'optimized', 'published')),
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cluster_id, page_type, page_id)
);

-- ---------------------------------------------------------------------------
-- #90 Briefs
-- ---------------------------------------------------------------------------

create table if not exists public.seo_briefs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  content_type text not null,
  page_type text not null,
  page_id uuid not null,
  cluster_id uuid references public.seo_clusters(id) on delete set null,
  primary_keyword text not null,
  secondary_keywords jsonb not null default '[]'::jsonb,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_brief_versions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.seo_briefs(id) on delete cascade,
  version integer not null,
  brief jsonb not null,
  change_reason text,
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'live',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (brief_id, version)
);

-- ---------------------------------------------------------------------------
-- #91/#92 Optimizer actions (+ transactional overlay persistence)
-- ---------------------------------------------------------------------------

create table if not exists public.seo_optimizer_actions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  locale text not null,
  brief_id uuid references public.seo_briefs(id) on delete set null,
  action_type text not null check (action_type in ('suggest', 'apply', 'blocked')),
  before_payload jsonb not null default '{}'::jsonb,
  after_payload jsonb not null default '{}'::jsonb,
  score_before numeric(8,2),
  score_after numeric(8,2),
  blocked_reason text,
  error_code text,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table if exists public.website_product_pages
  add column if not exists seo_intro text,
  add column if not exists seo_highlights jsonb not null default '[]'::jsonb,
  add column if not exists seo_faq jsonb not null default '[]'::jsonb,
  add column if not exists source text not null default 'manual',
  add column if not exists fetched_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='website_product_pages' and column_name='confidence'
  ) then
    alter table public.website_product_pages add column confidence public.seo_confidence not null default 'live';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- #94/#95 Transcreation
-- ---------------------------------------------------------------------------

create table if not exists public.seo_transcreation_jobs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  page_type text not null,
  page_id uuid not null,
  source_locale text not null,
  target_locale text not null,
  country text not null,
  language text not null,
  source_keyword text,
  target_keyword text,
  keyword_reresearch jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'applied', 'published')),
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  applied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_localized_variants (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  page_type text not null,
  source_entity_id uuid not null,
  target_entity_id uuid,
  source_locale text not null,
  target_locale text not null,
  country text not null,
  language text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'applied', 'published')),
  last_job_id uuid references public.seo_transcreation_jobs(id) on delete set null,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, page_type, source_entity_id, target_locale)
);

-- ---------------------------------------------------------------------------
-- #96 Track
-- ---------------------------------------------------------------------------

create table if not exists public.seo_page_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  metric_date date not null,
  locale text not null,
  page_type text not null,
  page_id uuid not null,
  url text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(8,4) not null default 0,
  avg_position numeric(8,2),
  sessions integer not null default 0,
  conversions integer not null default 0,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now(),
  unique (website_id, metric_date, locale, page_type, page_id)
);

create table if not exists public.seo_cluster_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  metric_date date not null,
  locale text not null,
  cluster_id uuid not null references public.seo_clusters(id) on delete cascade,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(8,4) not null default 0,
  avg_position numeric(8,2),
  pages_tracked integer not null default 0,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now(),
  unique (website_id, metric_date, locale, cluster_id)
);

-- ---------------------------------------------------------------------------
-- #93 page parity in workflow baseline
-- ---------------------------------------------------------------------------

alter table if exists public.seo_workflow_baselines
  drop constraint if exists seo_workflow_baselines_item_type_check;

alter table if exists public.seo_workflow_baselines
  add constraint seo_workflow_baselines_item_type_check
  check (item_type in ('hotel', 'activity', 'package', 'destination', 'blog', 'page'));

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_seo_render_snapshots_lookup
  on public.seo_render_snapshots(website_id, locale, page_type, captured_at desc);
create index if not exists idx_seo_audit_findings_lookup
  on public.seo_audit_findings(website_id, locale, severity, priority_score desc);
create index if not exists idx_seo_keyword_research_runs_lookup
  on public.seo_keyword_research_runs(website_id, locale, created_at desc);
create index if not exists idx_seo_keyword_candidates_lookup
  on public.seo_keyword_candidates(website_id, locale, content_type, priority_score desc);
create index if not exists idx_seo_clusters_lookup
  on public.seo_clusters(website_id, locale, status, updated_at desc);
create index if not exists idx_seo_cluster_keywords_lookup
  on public.seo_cluster_keywords(cluster_id, keyword);
create index if not exists idx_seo_cluster_pages_lookup
  on public.seo_cluster_pages(cluster_id, page_type, page_id);
create index if not exists idx_seo_briefs_lookup
  on public.seo_briefs(website_id, locale, page_type, page_id, updated_at desc);
create index if not exists idx_seo_optimizer_actions_lookup
  on public.seo_optimizer_actions(website_id, item_type, item_id, created_at desc);
create index if not exists idx_seo_transcreation_jobs_lookup
  on public.seo_transcreation_jobs(website_id, source_locale, target_locale, status, updated_at desc);
create index if not exists idx_seo_localized_variants_lookup
  on public.seo_localized_variants(website_id, page_type, source_entity_id, target_locale);
create index if not exists idx_seo_page_metrics_daily_lookup
  on public.seo_page_metrics_daily(website_id, metric_date desc, locale, page_type);
create index if not exists idx_seo_cluster_metrics_daily_lookup
  on public.seo_cluster_metrics_daily(website_id, metric_date desc, locale, cluster_id);

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'seo_render_snapshots',
    'seo_audit_findings',
    'seo_keyword_research_runs',
    'seo_keyword_candidates',
    'seo_clusters',
    'seo_cluster_keywords',
    'seo_cluster_pages',
    'seo_briefs',
    'seo_brief_versions',
    'seo_optimizer_actions',
    'seo_transcreation_jobs',
    'seo_localized_variants',
    'seo_page_metrics_daily',
    'seo_cluster_metrics_daily'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

do $$
declare
  rec record;
  tbl text;
begin
  foreach tbl in array array[
    'seo_render_snapshots',
    'seo_audit_findings',
    'seo_keyword_research_runs',
    'seo_keyword_candidates',
    'seo_clusters',
    'seo_cluster_keywords',
    'seo_cluster_pages',
    'seo_briefs',
    'seo_brief_versions',
    'seo_optimizer_actions',
    'seo_transcreation_jobs',
    'seo_localized_variants',
    'seo_page_metrics_daily',
    'seo_cluster_metrics_daily'
  ] loop
    for rec in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', rec.policyname, tbl);
    end loop;

    execute format($f$
      create policy "Users can select %1$s"
      on public.%1$s
      for select
      using (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = %1$s.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      )
    $f$, tbl);

    execute format($f$
      create policy "Users can manage %1$s"
      on public.%1$s
      for all
      using (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = %1$s.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      )
      with check (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = %1$s.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      )
    $f$, tbl);
  end loop;
end $$;
