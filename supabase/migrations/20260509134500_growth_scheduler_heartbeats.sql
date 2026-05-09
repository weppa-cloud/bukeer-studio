-- ============================================================================
-- Growth OS Scheduler Heartbeats — Agentic 9+ UI/Ops closure
-- ============================================================================
-- Purpose:
--   Add a small tenant-scoped heartbeat ledger so the CEO cockpit can prove
--   the production scheduler is alive independently from completed cycle rows.
--
-- Safety:
--   - Additive and idempotent.
--   - Runtime writes are service_role only.
--   - Authenticated reads are tenant-scoped through user_roles.
-- ============================================================================

create table if not exists public.growth_scheduler_heartbeats (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  scheduler_name text not null default 'growth-os-production-cycle',
  status text not null default 'healthy',
  health_status text not null default 'healthy',
  heartbeat_at timestamptz not null default now(),
  last_cycle_id uuid references public.growth_runtime_cycles(id) on delete set null,
  last_cycle_status text,
  last_message text,
  git_sha text,
  interval_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_scheduler_heartbeats_uniq
    unique (website_id, scheduler_name),
  constraint growth_scheduler_heartbeats_status_chk
    check (status in ('healthy', 'stale', 'degraded', 'failed', 'paused')),
  constraint growth_scheduler_heartbeats_health_chk
    check (health_status in ('healthy', 'stale', 'degraded', 'failed', 'paused')),
  constraint growth_scheduler_heartbeats_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_scheduler_heartbeats_interval_chk
    check (interval_ms is null or interval_ms > 0),
  constraint growth_scheduler_heartbeats_metadata_chk
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists growth_scheduler_heartbeats_lookup_idx
  on public.growth_scheduler_heartbeats(website_id, scheduler_name, heartbeat_at desc);

drop trigger if exists trg_growth_scheduler_heartbeats_touch
  on public.growth_scheduler_heartbeats;
create trigger trg_growth_scheduler_heartbeats_touch
  before update on public.growth_scheduler_heartbeats
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_scheduler_heartbeats enable row level security;

do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'growth_scheduler_heartbeats'
  loop
    execute format(
      'drop policy if exists %I on public.growth_scheduler_heartbeats',
      rec.policyname
    );
  end loop;
end $$;

create policy growth_scheduler_heartbeats_service_all
  on public.growth_scheduler_heartbeats
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy growth_scheduler_heartbeats_tenant_read
  on public.growth_scheduler_heartbeats
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_scheduler_heartbeats.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

grant select on public.growth_scheduler_heartbeats to authenticated;
grant all on public.growth_scheduler_heartbeats to service_role;

comment on table public.growth_scheduler_heartbeats is
  'Tenant-scoped Growth OS scheduler heartbeat for production daemon health in the CEO cockpit.';
