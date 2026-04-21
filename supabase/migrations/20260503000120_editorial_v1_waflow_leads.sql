-- ============================================================================
-- Editorial v1 — WhatsApp Flow partial-lead persistence
-- ============================================================================
-- Provenance:
--   Ported from `themes/references/claude design 1/project/waflow.jsx`
--   (designer prototype F1 — variants A / B / D). Copy catalog:
--   `docs/editorial-v1/copy-catalog.md` (section "WhatsApp Flow").
--
-- Purpose:
--   The editorial flow persists the wizard state on every step (not just on
--   submit) so operators can see abandoned sessions and so the browser can
--   resume from local storage. The existing `whatsapp_flow_sessions` table
--   (20260502032000) captures only final submissions from the generic P3
--   wizard — we keep that table intact for tenants that use the generic
--   shell and add a sibling table dedicated to the editorial variant.
--
-- Safety:
--   - Additive, idempotent (`create table if not exists`).
--   - RLS: anonymous users may INSERT (needed for drawer step persistence);
--     SELECT and UPDATE are restricted to account members so operators see
--     only their own tenant's leads.
-- ============================================================================

create table if not exists public.waflow_leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  subdomain text,
  variant text not null check (variant in ('A', 'B', 'D')),
  step text not null,
  payload jsonb not null default '{}'::jsonb,
  reference_code text,
  session_key text,
  submitted_at timestamptz,
  whatsapp_redirected_at timestamptz,
  source_ip text,
  source_user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.waflow_leads is
  'Editorial v1 WhatsApp Flow partial leads (variants A/B/D). Rows are upserted on every wizard step; submitted_at is stamped when the user reaches the confirmation step.';

comment on column public.waflow_leads.variant is
  'A = home generic; B = destination-specific; D = package-specific.';
comment on column public.waflow_leads.step is
  'Last wizard step reached: dates|party|interests|country|contact|confirmation.';
comment on column public.waflow_leads.session_key is
  'Client-generated uuid stored in localStorage to allow resume + upsert.';
comment on column public.waflow_leads.reference_code is
  'Short human-readable ref (e.g. HOME-1205-A7F3) rendered in success screen and WhatsApp message.';

create index if not exists waflow_leads_account_idx
  on public.waflow_leads(account_id, created_at desc)
  where account_id is not null;
create index if not exists waflow_leads_website_idx
  on public.waflow_leads(website_id, created_at desc)
  where website_id is not null;
create unique index if not exists waflow_leads_session_key_variant_uidx
  on public.waflow_leads(session_key, variant)
  where session_key is not null;

alter table public.waflow_leads enable row level security;

-- Public (anon) clients need INSERT to persist a partial lead on the first
-- step. We do NOT expose SELECT to anon — that's reserved for account
-- members (read) and super admin (manage).
drop policy if exists waflow_leads_anon_insert on public.waflow_leads;
create policy waflow_leads_anon_insert
  on public.waflow_leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists waflow_leads_anon_update_by_session on public.waflow_leads;
create policy waflow_leads_anon_update_by_session
  on public.waflow_leads
  for update
  to anon, authenticated
  using (session_key is not null)
  with check (session_key is not null);

drop policy if exists waflow_leads_read_account_members on public.waflow_leads;
create policy waflow_leads_read_account_members
  on public.waflow_leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = waflow_leads.account_id
        and ur.is_active = true
    )
  );

drop policy if exists waflow_leads_manage_super_admin on public.waflow_leads;
create policy waflow_leads_manage_super_admin
  on public.waflow_leads
  for all
  to authenticated
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

create or replace function public.touch_waflow_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_waflow_leads_updated_at on public.waflow_leads;
create trigger trg_waflow_leads_updated_at
before update on public.waflow_leads
for each row execute function public.touch_waflow_leads_updated_at();

-- Rollback:
--   drop trigger if exists trg_waflow_leads_updated_at on public.waflow_leads;
--   drop function if exists public.touch_waflow_leads_updated_at();
--   drop table if exists public.waflow_leads;
