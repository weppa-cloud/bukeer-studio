-- EPIC #128 / Issue #130
-- Growth-ops persistence layer (TM, glossary, SERP, QA, topical, forbidden words, provider usage)

create extension if not exists pg_trgm;

create table if not exists public.seo_translation_memory (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  source_locale text not null,
  target_locale text not null,
  page_type text not null,
  source_text text not null,
  target_text text not null,
  similarity_score numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  usage_count integer not null default 0,
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_translation_glossary (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  term text not null,
  translation text not null,
  notes text,
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'live',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, locale, term)
);

create table if not exists public.seo_market_serp_snapshots (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  keyword text not null,
  locale text not null,
  country text not null,
  language text not null,
  top10 jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  people_also_ask jsonb not null default '[]'::jsonb,
  source text not null default 'dataforseo',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, keyword, locale)
);

create table if not exists public.seo_translation_qa_findings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  page_type text not null,
  page_id uuid not null,
  locale text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  finding_type text not null,
  message text not null,
  evidence jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_topical_authority_snapshots (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  score numeric(8,2) not null default 0,
  coverage jsonb not null default '{}'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  source text not null default 'mixed',
  fetched_at timestamptz not null default now(),
  confidence public.seo_confidence not null default 'partial',
  created_at timestamptz not null default now()
);

create table if not exists public.seo_market_forbidden_words (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  term text not null,
  reason text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, locale, term)
);

create table if not exists public.seo_provider_usage (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  provider text not null,
  endpoint text not null,
  billing_month date not null,
  request_count integer not null default 0,
  total_cost_usd numeric(12,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  first_called_at timestamptz,
  last_called_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, provider, endpoint, billing_month)
);

create index if not exists idx_tm_lookup
  on public.seo_translation_memory(website_id, source_locale, target_locale, page_type);

create index if not exists idx_tm_lookup_source_text_trgm
  on public.seo_translation_memory using gin(source_text gin_trgm_ops);

create index if not exists idx_glossary_term
  on public.seo_translation_glossary(website_id, locale, term);

create index if not exists idx_serp_lookup
  on public.seo_market_serp_snapshots(website_id, locale, keyword, fetched_at desc);

create index if not exists idx_translation_qa_lookup
  on public.seo_translation_qa_findings(website_id, locale, severity, resolved, updated_at desc);

create index if not exists idx_topical_snapshot
  on public.seo_topical_authority_snapshots(website_id, locale, fetched_at desc);

create index if not exists idx_forbidden_words
  on public.seo_market_forbidden_words(website_id, locale, is_active, term);

create index if not exists idx_provider_usage_billing
  on public.seo_provider_usage(website_id, provider, billing_month desc);

alter table if exists public.seo_transcreation_jobs
  drop constraint if exists seo_transcreation_jobs_page_type_check;

alter table if exists public.seo_transcreation_jobs
  add constraint seo_transcreation_jobs_page_type_check
  check (page_type in ('blog', 'page', 'destination', 'hotel', 'activity', 'package', 'transfer'));

alter table if exists public.seo_localized_variants
  drop constraint if exists seo_localized_variants_page_type_check;

alter table if exists public.seo_localized_variants
  add constraint seo_localized_variants_page_type_check
  check (page_type in ('blog', 'page', 'destination', 'hotel', 'activity', 'package', 'transfer'));

-- RLS follows existing seo_* account-based patterns

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'seo_translation_memory',
    'seo_translation_glossary',
    'seo_market_serp_snapshots',
    'seo_translation_qa_findings',
    'seo_topical_authority_snapshots',
    'seo_market_forbidden_words',
    'seo_provider_usage'
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
    'seo_translation_memory',
    'seo_translation_glossary',
    'seo_market_serp_snapshots',
    'seo_translation_qa_findings',
    'seo_topical_authority_snapshots',
    'seo_market_forbidden_words',
    'seo_provider_usage'
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

