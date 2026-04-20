-- ==========================================================================
-- EPIC #250 / Issue #257
-- Adds product page custom tiers and WhatsApp flow session persistence.
-- ==========================================================================

alter table public.website_product_pages
  add column if not exists custom_tiers jsonb;

comment on column public.website_product_pages.custom_tiers is
  'Optional custom pricing tiers for public product detail conversion blocks.';

create table if not exists public.whatsapp_flow_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  subdomain text not null,
  product_id uuid,
  product_type text not null,
  product_name text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  variant text not null check (variant in ('A', 'B', 'D')),
  reference_code text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'created',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_flow_sessions is
  'Public WhatsApp flow sessions persisted from website landing conversion drawer.';

create unique index if not exists whatsapp_flow_sessions_reference_code_idx
  on public.whatsapp_flow_sessions(reference_code);

create index if not exists whatsapp_flow_sessions_website_created_idx
  on public.whatsapp_flow_sessions(website_id, created_at desc);

create index if not exists whatsapp_flow_sessions_account_created_idx
  on public.whatsapp_flow_sessions(account_id, created_at desc)
  where account_id is not null;

alter table public.whatsapp_flow_sessions enable row level security;

create policy whatsapp_flow_sessions_read_account_members
  on public.whatsapp_flow_sessions
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = whatsapp_flow_sessions.account_id
        and ur.is_active = true
    )
  );

create policy whatsapp_flow_sessions_write_super_admin
  on public.whatsapp_flow_sessions
  for all
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid())
        and ur.is_active = true
        and r.role_name = 'super_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid())
        and ur.is_active = true
        and r.role_name = 'super_admin'
    )
  );

create or replace function public.touch_whatsapp_flow_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_flow_sessions_updated_at on public.whatsapp_flow_sessions;
create trigger trg_whatsapp_flow_sessions_updated_at
before update on public.whatsapp_flow_sessions
for each row execute function public.touch_whatsapp_flow_sessions_updated_at();
