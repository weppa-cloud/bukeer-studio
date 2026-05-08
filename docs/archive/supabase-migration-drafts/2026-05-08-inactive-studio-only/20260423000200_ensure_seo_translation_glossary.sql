-- Ensure glossary storage exists for transcreate prompt enforcement.
-- Some environments drifted and are missing this table from growth-ops rollout.

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

create index if not exists idx_glossary_term
  on public.seo_translation_glossary(website_id, locale, term);

alter table if exists public.seo_translation_glossary enable row level security;

do $$
declare
  rec record;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'seo_translation_glossary'
  ) then
    for rec in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'seo_translation_glossary'
    loop
      execute format(
        'drop policy if exists %I on public.seo_translation_glossary',
        rec.policyname
      );
    end loop;

    create policy "Users can select seo_translation_glossary"
      on public.seo_translation_glossary
      for select
      using (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = seo_translation_glossary.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      );

    create policy "Users can manage seo_translation_glossary"
      on public.seo_translation_glossary
      for all
      using (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = seo_translation_glossary.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      )
      with check (
        exists (
          select 1
          from public.websites w
          join public.user_roles ur on ur.account_id = w.account_id
          where w.id = seo_translation_glossary.website_id
            and ur.user_id = auth.uid()
            and ur.is_active = true
        )
      );
  end if;
end $$;
