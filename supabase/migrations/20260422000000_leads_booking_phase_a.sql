-- SPEC #168 Phase A — leads extensions + product_availability + public_rate_limits
--
-- Parent epic: #166 (online booking). Phase A captures date + lead only — no
-- payment, no cupo hold. Cupo hold lives in Phase B (#169); cancellation in
-- Phase C (#170).
--
-- RLS philosophy:
--   - leads           → anon INSERT (rate-limited at API layer, see comment),
--                       tenant-scoped SELECT, service_role UPDATE/DELETE.
--   - product_availability → public SELECT (datepicker needs disabled dates
--                            for SEO/RSC); writes service_role-only.
--   - public_rate_limits   → service_role-only on both sides (internal table).

-- ---------------------------------------------------------------------------
-- (a) leads extensions
--
-- The `leads` table is owned by the Flutter admin surface. We add columns
-- with `if not exists` and guard the CHECK constraint addition so re-running
-- the migration is safe across environments with drift.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists product_id uuid references public.products(id);

alter table public.leads
  add column if not exists tenant_id uuid;

alter table public.leads
  add column if not exists source text;

-- Backfill legacy rows so the NOT NULL + CHECK constraints below can apply.
update public.leads
   set source = coalesce(source, 'manual')
 where source is null;

alter table public.leads
  alter column source set default 'manual';

alter table public.leads
  alter column source set not null;

do $$
begin
  if not exists (
    select 1
      from information_schema.table_constraints
     where table_schema = 'public'
       and table_name = 'leads'
       and constraint_name = 'leads_source_check'
  ) then
    alter table public.leads
      add constraint leads_source_check
      check (source in (
        'website_booking_form',
        'website_contact_form',
        'whatsapp_inbound',
        'manual'
      ));
  end if;
end$$;

alter table public.leads
  add column if not exists consent_given_at timestamptz;

-- GDPR retention — 18 months. Phase C ships a scrub CRON; Phase A just
-- records the deadline so there is data to act on later.
alter table public.leads
  add column if not exists expires_at timestamptz
  default (now() + interval '18 months');

alter table public.leads
  add column if not exists date date;

alter table public.leads
  add column if not exists pax int;

alter table public.leads
  add column if not exists option_id uuid;

alter table public.leads
  add column if not exists locale text;

alter table public.leads
  add column if not exists utm jsonb;

-- Pax sanity — align with LeadInputSchema (1..50).
do $$
begin
  if not exists (
    select 1
      from information_schema.table_constraints
     where table_schema = 'public'
       and table_name = 'leads'
       and constraint_name = 'leads_pax_range_check'
  ) then
    alter table public.leads
      add constraint leads_pax_range_check
      check (pax is null or (pax >= 1 and pax <= 50));
  end if;
end$$;

create index if not exists leads_product_date_idx
  on public.leads(product_id, date);

create index if not exists leads_expires_at_idx
  on public.leads(expires_at);

comment on column public.leads.product_id is
  'SPEC #168: product the lead was submitted for (null for legacy contact-form leads).';
comment on column public.leads.source is
  'SPEC #168: where the lead originated. Enum enforced by leads_source_check.';
comment on column public.leads.consent_given_at is
  'SPEC #168: server-recorded timestamp of the explicit T&C + privacy checkbox click.';
comment on column public.leads.expires_at is
  'SPEC #168 / ADR-005: GDPR 18-month retention deadline. Phase C scrub CRON consumes this.';
comment on column public.leads.date is 'SPEC #168: requested booking date (ISO).';
comment on column public.leads.pax is 'SPEC #168: number of travelers (1..50).';
comment on column public.leads.option_id is
  'SPEC #168: selected activity/package option when the product has options.';
comment on column public.leads.locale is 'SPEC #168: BCP-47 locale of the submitting page.';
comment on column public.leads.utm is 'SPEC #168: captured UTM params from the landing URL.';
comment on column public.leads.tenant_id is
  'SPEC #168: tenant owner (propagated from website.account_id at insert time for RLS).';

-- ---------------------------------------------------------------------------
-- (b) product_availability — capacity ledger, Phase A read-only in the UI.
-- ---------------------------------------------------------------------------

create table if not exists public.product_availability (
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null,
  capacity int not null check (capacity >= 0),
  reserved int not null default 0 check (reserved >= 0),
  version int not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, date)
);

create index if not exists product_availability_date_idx
  on public.product_availability(date);

comment on table public.product_availability is
  'SPEC #168: Per-date cupo ledger. Missing row = all dates open in Phase A.';

-- ---------------------------------------------------------------------------
-- (c) public_rate_limits — shared anon endpoint rate-limiter.
-- ---------------------------------------------------------------------------

create table if not exists public.public_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  window_start timestamptz not null,
  request_count int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists public_rate_limits_lookup_idx
  on public.public_rate_limits(scope, key, window_start desc);

comment on table public.public_rate_limits is
  'SPEC #168: Shared counter for anon endpoints (leads, contact). Nightly CRON '
  'purges windows older than 1 hour (not deployed in Phase A).';

-- ---------------------------------------------------------------------------
-- (d) RLS policies
-- ---------------------------------------------------------------------------

alter table public.leads enable row level security;
alter table public.product_availability enable row level security;
alter table public.public_rate_limits enable row level security;

-- leads_select_tenant — authenticated users only see leads for their tenant.
-- Falls back to account_id via user_roles when tenant_id is not yet populated
-- (legacy rows) so operators keep visibility during the rollout.
drop policy if exists leads_select_tenant on public.leads;
create policy leads_select_tenant
  on public.leads
  for select
  to authenticated
  using (
    (tenant_id is not null
      and tenant_id::text = coalesce(auth.jwt() ->> 'tenant_id', ''))
    or exists (
      select 1
        from public.user_roles ur
       where ur.user_id = auth.uid()
         and ur.is_active = true
         and ur.account_id = public.leads.account_id
    )
  );

-- leads_insert_anon_rate_limited — anon can insert, but the INSERT is only
-- allowed through `/api/leads` where the route enforces 5 req/min/IP via
-- `public_rate_limits`. Tradeoff: we keep the DB policy permissive on INSERT
-- (with_check true) so the Edge route handler can use the anon key; the
-- real throttle lives in Agent B's `lib/booking/rate-limit.ts`. Abuse
-- mitigation at the DB layer would require a PL/pgSQL trigger that reads
-- `public_rate_limits`, which adds latency on hot path and duplicates the
-- API-level check. Revisit if abuse is observed post-launch.
drop policy if exists leads_insert_anon_rate_limited on public.leads;
create policy leads_insert_anon_rate_limited
  on public.leads
  for insert
  to anon, authenticated
  with check (
    source in (
      'website_booking_form',
      'website_contact_form',
      'whatsapp_inbound',
      'manual'
    )
    and consent_given_at is not null
  );

-- leads_update_service / leads_delete_service — service_role only.
drop policy if exists leads_update_service on public.leads;
create policy leads_update_service
  on public.leads
  for update
  to service_role
  using (true)
  with check (true);

drop policy if exists leads_delete_service on public.leads;
create policy leads_delete_service
  on public.leads
  for delete
  to service_role
  using (true);

-- product_availability — public read (needed for SSR/datepicker), service writes.
drop policy if exists product_availability_select_public on public.product_availability;
create policy product_availability_select_public
  on public.product_availability
  for select
  to anon, authenticated
  using (true);

drop policy if exists product_availability_write_service on public.product_availability;
create policy product_availability_write_service
  on public.product_availability
  for all
  to service_role
  using (true)
  with check (true);

-- public_rate_limits — service_role only (no public surface).
drop policy if exists public_rate_limits_all_service on public.public_rate_limits;
create policy public_rate_limits_all_service
  on public.public_rate_limits
  for all
  to service_role
  using (true)
  with check (true);
