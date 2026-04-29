-- ============================================================================
-- EPIC #310 — AI Search / GEO visibility facts
-- ============================================================================
-- Purpose:
--   Adds the normalized facts layer for DataForSEO AI Optimization runs.
--   Raw provider payloads remain in growth_dataforseo_cache; this migration
--   stores comparable run metadata and prompt/platform facts that can be
--   promoted into growth_inventory as channel = 'ai_search'.
--
-- Governance:
--   Studio may originate this migration, but bukeer-flutter is the operational
--   SSOT for applying shared Supabase migrations.
-- ============================================================================

alter table if exists public.growth_inventory
  drop constraint if exists growth_inventory_channel_chk;

alter table if exists public.growth_inventory
  add constraint growth_inventory_channel_chk
  check (channel in (
    'seo', 'google_ads', 'meta', 'tiktok', 'whatsapp',
    'waflow', 'chatwoot', 'direct', 'referral', 'email',
    'ai_search', 'unknown'
  ));

create table if not exists public.seo_ai_visibility_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null references public.websites(id) on delete cascade,
  provider text not null default 'dataforseo',
  profile text not null default 'geo_ai_visibility_v1',
  run_tag text not null,
  target_domain text not null,
  target_brand text not null,
  locale text not null default 'multi',
  market text not null default 'multi',
  location_code integer,
  language_code text,
  platforms jsonb not null default '[]'::jsonb,
  prompt_set_version text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'complete', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  raw_cache_keys jsonb not null default '[]'::jsonb,
  cost_usd numeric(12,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_ai_visibility_runs_website_tag_uniq unique (website_id, run_tag)
);

create index if not exists seo_ai_visibility_runs_tenant_idx
  on public.seo_ai_visibility_runs(account_id, website_id, profile, started_at desc);

create index if not exists seo_ai_visibility_runs_status_idx
  on public.seo_ai_visibility_runs(website_id, status, started_at desc);

create table if not exists public.seo_ai_visibility_facts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.seo_ai_visibility_runs(id) on delete cascade,
  account_id uuid not null,
  website_id uuid not null references public.websites(id) on delete cascade,
  provider text not null default 'dataforseo',
  platform text not null,
  model_name text,
  endpoint_type text not null,
  prompt_id text not null,
  prompt text not null,
  prompt_intent text,
  keyword_cluster text,
  locale text not null,
  market text not null,
  location_code integer,
  language_code text,
  target_domain text not null,
  target_brand text not null,
  source_url text,
  source_domain text,
  owned_url text,
  mentioned boolean not null default false,
  cited boolean not null default false,
  mentions_count integer not null default 0,
  citations_count integer not null default 0,
  ai_search_volume integer,
  impressions integer,
  visibility_score numeric(7,2),
  rank_position numeric(7,2),
  answer_excerpt text,
  sentiment text not null default 'unknown'
    check (sentiment in ('positive', 'neutral', 'negative', 'mixed', 'unknown')),
  competitor_domains jsonb not null default '[]'::jsonb,
  brand_entities jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  fact_fingerprint text not null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint seo_ai_visibility_facts_run_fingerprint_uniq unique (run_id, fact_fingerprint)
);

create index if not exists seo_ai_visibility_facts_tenant_idx
  on public.seo_ai_visibility_facts(account_id, website_id, locale, market);

create index if not exists seo_ai_visibility_facts_prompt_idx
  on public.seo_ai_visibility_facts(website_id, prompt_id, platform);

create index if not exists seo_ai_visibility_facts_domain_idx
  on public.seo_ai_visibility_facts(website_id, source_domain);

create index if not exists seo_ai_visibility_facts_visibility_idx
  on public.seo_ai_visibility_facts(website_id, mentioned, cited, visibility_score desc);

alter table public.seo_ai_visibility_runs enable row level security;
alter table public.seo_ai_visibility_facts enable row level security;

drop policy if exists seo_ai_visibility_runs_service_all on public.seo_ai_visibility_runs;
create policy seo_ai_visibility_runs_service_all
  on public.seo_ai_visibility_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists seo_ai_visibility_runs_account_read on public.seo_ai_visibility_runs;
create policy seo_ai_visibility_runs_account_read
  on public.seo_ai_visibility_runs
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists seo_ai_visibility_facts_service_all on public.seo_ai_visibility_facts;
create policy seo_ai_visibility_facts_service_all
  on public.seo_ai_visibility_facts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists seo_ai_visibility_facts_account_read on public.seo_ai_visibility_facts;
create policy seo_ai_visibility_facts_account_read
  on public.seo_ai_visibility_facts
  for select
  to authenticated
  using (account_id = auth.uid());

create or replace function public.touch_seo_ai_visibility_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_seo_ai_visibility_runs_updated_at on public.seo_ai_visibility_runs;
create trigger trg_seo_ai_visibility_runs_updated_at
before update on public.seo_ai_visibility_runs
for each row execute function public.touch_seo_ai_visibility_runs_updated_at();

comment on table public.seo_ai_visibility_runs is
  'Comparable AI Search / GEO visibility runs for Epic #310. Raw provider payloads stay in growth_dataforseo_cache.';

comment on table public.seo_ai_visibility_facts is
  'Normalized prompt/platform facts from DataForSEO AI Optimization for promotion into growth_inventory channel ai_search.';
