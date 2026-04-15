create table if not exists public.seo_workflow_baselines (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  item_type text not null check (item_type in ('hotel', 'activity', 'package', 'destination', 'blog')),
  item_id uuid not null,
  url text not null,
  locale text not null,
  position numeric(8,2) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_seo_workflow_baselines_lookup
  on public.seo_workflow_baselines(website_id, item_type, item_id, locale, recorded_at desc);

alter table public.seo_workflow_baselines enable row level security;

create policy "Users can select seo_workflow_baselines"
  on public.seo_workflow_baselines
  for select
  using (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_workflow_baselines.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create policy "Users can insert seo_workflow_baselines"
  on public.seo_workflow_baselines
  for insert
  with check (
    exists (
      select 1
      from public.websites w
      join public.user_roles ur on ur.account_id = w.account_id
      where w.id = seo_workflow_baselines.website_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );
