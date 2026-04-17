-- Media alt batch job tracking (#177)

create table if not exists public.media_alt_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  entity_type text not null default 'all',
  locales text[] not null default array['es']::text[],
  dry_run boolean not null default false,
  limit_count integer not null default 50,
  status text not null default 'queued',
  total integer not null default 0,
  processed integer not null default 0,
  failed integer not null default 0,
  broken_urls jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_alt_jobs_entity_type_check
    check (entity_type in ('all', 'blog_post', 'package', 'activity')),
  constraint media_alt_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'failed')),
  constraint media_alt_jobs_limit_check
    check (limit_count > 0 and limit_count <= 50)
);

create index if not exists media_alt_jobs_account_idx
  on public.media_alt_jobs(account_id, created_at desc);

create index if not exists media_alt_jobs_website_idx
  on public.media_alt_jobs(website_id, created_at desc);

create index if not exists media_alt_jobs_status_idx
  on public.media_alt_jobs(status, created_at desc);

alter table public.media_alt_jobs enable row level security;

do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'media_alt_jobs'
  loop
    execute format('drop policy if exists %I on public.media_alt_jobs', rec.policyname);
  end loop;

  create policy "Users can select media_alt_jobs"
    on public.media_alt_jobs
    for select
    using (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_alt_jobs.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    );

  create policy "Users can manage media_alt_jobs"
    on public.media_alt_jobs
    for all
    using (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_alt_jobs.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    )
    with check (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = media_alt_jobs.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    );
end $$;
