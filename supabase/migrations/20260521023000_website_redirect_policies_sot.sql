-- Multitenant redirect source of truth (SoT)
-- Unifies redirect and bypass behavior per website/path.

create table if not exists public.website_redirect_policies (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  old_path text not null,
  action text not null default 'redirect' check (action in ('redirect', 'bypass')),
  new_path text,
  status_code integer not null default 301 check (status_code in (301, 302, 307, 308)),
  preserve_query boolean not null default true,
  priority integer not null default 100,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_redirect_policies_new_path_required
    check ((action = 'bypass' and new_path is null) or (action = 'redirect' and new_path is not null))
);

create unique index if not exists website_redirect_policies_unique_path
  on public.website_redirect_policies (website_id, old_path);

create index if not exists website_redirect_policies_lookup_idx
  on public.website_redirect_policies (website_id, is_active, priority);

drop trigger if exists website_redirect_policies_set_updated_at on public.website_redirect_policies;
create trigger website_redirect_policies_set_updated_at
before update on public.website_redirect_policies
for each row execute function public.update_updated_at_column();

alter table public.website_redirect_policies enable row level security;

drop policy if exists website_redirect_policies_service_all on public.website_redirect_policies;
create policy website_redirect_policies_service_all
  on public.website_redirect_policies
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists website_redirect_policies_tenant_read on public.website_redirect_policies;
create policy website_redirect_policies_tenant_read
  on public.website_redirect_policies
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.websites w on w.account_id = ur.account_id
      where ur.user_id = auth.uid()
        and w.id = website_redirect_policies.website_id
    )
  );

-- Seed: paid-media landing aliases for ColombiaTours should resolve with 200
-- instead of middleware legacy 301 redirects.
insert into public.website_redirect_policies (
  website_id,
  old_path,
  action,
  new_path,
  status_code,
  preserve_query,
  priority,
  is_active,
  notes
)
select
  w.id as website_id,
  p.old_path,
  'bypass' as action,
  null as new_path,
  301 as status_code,
  true as preserve_query,
  10 as priority,
  true as is_active,
  'Paid media landing path should render directly (no legacy redirect).'
from public.websites w
cross join (
  values
    ('/agencia-de-viajes-a-colombia-para-mexicanos'),
    ('/agencia-de-viajes-a-colombia-para-espanoles'),
    ('/viajes-a-colombia-desde-chile'),
    ('/pt/pacotes-colombia')
) as p(old_path)
where w.subdomain = 'colombiatours'
on conflict (website_id, old_path) do update
set
  action = excluded.action,
  new_path = excluded.new_path,
  preserve_query = excluded.preserve_query,
  priority = excluded.priority,
  is_active = excluded.is_active,
  notes = excluded.notes,
  updated_at = now();
