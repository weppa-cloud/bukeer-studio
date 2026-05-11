-- ============================================================================
-- Platform goal provisioning sync — #419 / #493
-- ============================================================================
-- Purpose:
--   Stores tenant-specific bindings between canonical funnel events and
--   platform-side goals/actions. This lets Bukeer Studio dry-run, apply and
--   monitor goal configuration without hardcoding destination ids in code or
--   forcing operators to configure every platform manually.
--
-- Safety:
--   - Additive, forward-only migration.
--   - No raw PII.
--   - External platform mutations are not represented here directly; they are
--     audited through platform_goal_sync_runs.
-- ============================================================================

create table if not exists public.platform_goal_bindings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  canonical_event_name text not null,
  destination text not null,
  platform_account_id text,
  platform_goal_id text,
  platform_goal_name text not null,
  destination_event_name text,
  desired_status text not null default 'observation',
  live_status text not null default 'unknown',
  sync_status text not null default 'unknown',
  drift_reason text,
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_goal_bindings_destination_chk
    check (destination in ('google_ads', 'ga4', 'meta', 'meta_messaging', 'clarity', 'tiktok', 'linkedin')),
  constraint platform_goal_bindings_desired_status_chk
    check (desired_status in ('primary', 'secondary', 'observation', 'diagnostic', 'disabled')),
  constraint platform_goal_bindings_live_status_chk
    check (live_status in ('primary', 'secondary', 'observation', 'diagnostic', 'disabled', 'missing', 'unknown')),
  constraint platform_goal_bindings_sync_status_chk
    check (sync_status in ('healthy', 'watch', 'blocked', 'unknown'))
);

create index if not exists platform_goal_bindings_account_destination_idx
  on public.platform_goal_bindings(account_id, destination, sync_status);

create index if not exists platform_goal_bindings_website_destination_idx
  on public.platform_goal_bindings(website_id, destination, sync_status)
  where website_id is not null;

create unique index if not exists platform_goal_bindings_website_dedupe_idx
  on public.platform_goal_bindings(account_id, website_id, canonical_event_name, destination)
  where website_id is not null;

create unique index if not exists platform_goal_bindings_account_dedupe_idx
  on public.platform_goal_bindings(account_id, canonical_event_name, destination)
  where website_id is null;

create index if not exists platform_goal_bindings_goal_id_idx
  on public.platform_goal_bindings(destination, platform_account_id, platform_goal_id)
  where platform_goal_id is not null;

create index if not exists platform_goal_bindings_config_gin_idx
  on public.platform_goal_bindings using gin(config);

alter table public.platform_goal_bindings enable row level security;

drop policy if exists platform_goal_bindings_service_all on public.platform_goal_bindings;
create policy platform_goal_bindings_service_all
  on public.platform_goal_bindings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists platform_goal_bindings_tenant_read on public.platform_goal_bindings;
create policy platform_goal_bindings_tenant_read
  on public.platform_goal_bindings
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = platform_goal_bindings.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create table if not exists public.platform_goal_sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  run_type text not null,
  status text not null default 'planned',
  platforms text[] not null default '{}',
  plan_hash text,
  actor_user_id uuid,
  dry_run boolean not null default true,
  desired_count integer not null default 0,
  create_count integer not null default 0,
  update_count integer not null default 0,
  keep_count integer not null default 0,
  warning_count integer not null default 0,
  blocked_count integer not null default 0,
  plan jsonb not null default '{}'::jsonb,
  provider_responses jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_goal_sync_runs_run_type_chk
    check (run_type in ('dry_run', 'apply', 'verify')),
  constraint platform_goal_sync_runs_status_chk
    check (status in ('planned', 'running', 'completed', 'failed', 'blocked'))
);

create index if not exists platform_goal_sync_runs_account_created_idx
  on public.platform_goal_sync_runs(account_id, created_at desc);

create index if not exists platform_goal_sync_runs_website_created_idx
  on public.platform_goal_sync_runs(website_id, created_at desc)
  where website_id is not null;

create index if not exists platform_goal_sync_runs_plan_hash_idx
  on public.platform_goal_sync_runs(plan_hash)
  where plan_hash is not null;

create index if not exists platform_goal_sync_runs_plan_gin_idx
  on public.platform_goal_sync_runs using gin(plan);

alter table public.platform_goal_sync_runs enable row level security;

drop policy if exists platform_goal_sync_runs_service_all on public.platform_goal_sync_runs;
create policy platform_goal_sync_runs_service_all
  on public.platform_goal_sync_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists platform_goal_sync_runs_tenant_read on public.platform_goal_sync_runs;
create policy platform_goal_sync_runs_tenant_read
  on public.platform_goal_sync_runs
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = platform_goal_sync_runs.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

create or replace function public.touch_platform_goal_sync_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_platform_goal_bindings_updated_at
  on public.platform_goal_bindings;
create trigger trg_platform_goal_bindings_updated_at
before update on public.platform_goal_bindings
for each row execute function public.touch_platform_goal_sync_updated_at();

drop trigger if exists trg_platform_goal_sync_runs_updated_at
  on public.platform_goal_sync_runs;
create trigger trg_platform_goal_sync_runs_updated_at
before update on public.platform_goal_sync_runs
for each row execute function public.touch_platform_goal_sync_updated_at();

comment on table public.platform_goal_bindings is
  'Tenant-scoped bindings between canonical funnel_events and platform-side goals/actions. F7 / #493.';
comment on column public.platform_goal_bindings.canonical_event_name is
  'Canonical funnel_events.event_name, e.g. waflow_submit or crm_booking_confirmed.';
comment on column public.platform_goal_bindings.platform_goal_id is
  'Provider id: Google Ads conversion action id, GA4 key event name, Meta custom conversion id, Clarity project/tag context id, etc.';
comment on column public.platform_goal_bindings.desired_status is
  'Desired use: primary, secondary, observation, diagnostic, or disabled. Derived from optimization policy and tenant overrides.';
comment on column public.platform_goal_bindings.sync_status is
  'Goal provisioning health for agents/operators: healthy, watch, blocked, unknown.';
comment on table public.platform_goal_sync_runs is
  'Dry-run/apply/verify audit ledger for platform goal provisioning. No provider mutation should happen without a run record.';
