-- EPIC #128 / Issue #148
-- Persisted Human Operating Rhythm (OKRs, weekly tasks, 90D objectives)

create table if not exists public.seo_website_okrs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  period text not null check (period in ('7d', '30d', '90d')),
  kpi_key text not null,
  target numeric(14,4) not null,
  current_value numeric(14,4),
  current_source text,
  period_start date not null,
  period_end date not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, period, kpi_key, period_start, period_end)
);

create table if not exists public.seo_weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  week_of date not null,
  task_type text not null check (task_type in ('striking_distance', 'low_ctr', 'drift', 'cannibalization', 'custom')),
  priority text not null check (priority in ('P1', 'P2', 'P3')),
  title text not null,
  description text,
  source_data jsonb not null default '{}'::jsonb,
  related_entity_type text,
  related_entity_id uuid,
  assignee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_website_objectives_90d (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  quarter text not null,
  title text not null,
  description text,
  kpis jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  starts_on date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, quarter, title)
);

create unique index if not exists uq_weekly_task_entity
  on public.seo_weekly_tasks(website_id, week_of, task_type, coalesce(related_entity_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists idx_seo_website_okrs_lookup
  on public.seo_website_okrs(website_id, period, period_start desc, period_end desc);

create index if not exists idx_seo_weekly_tasks_lookup
  on public.seo_weekly_tasks(website_id, week_of desc, status, priority);

create index if not exists idx_seo_website_objectives_90d_lookup
  on public.seo_website_objectives_90d(website_id, quarter desc, status);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'seo_website_okrs',
    'seo_weekly_tasks',
    'seo_website_objectives_90d'
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
    'seo_website_okrs',
    'seo_weekly_tasks',
    'seo_website_objectives_90d'
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

