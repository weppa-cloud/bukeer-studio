-- ============================================================================
-- Growth OS Provider Intelligence Runs (#471)
-- ============================================================================
-- Purpose:
--   Add provider profile run ledger metadata for freshness, cost, approval,
--   circuit breakers and evidence correlation.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Runtime/provider writes are service_role only.
--   - Authenticated reads are tenant scoped through user_roles.
-- ============================================================================

create table if not exists public.growth_profile_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  provider text not null,
  profile_id text not null,
  run_status text not null default 'queued',
  freshness_status text not null default 'missing',
  quality_status text not null default 'watch',
  source_refs jsonb not null default '[]'::jsonb,
  cost_usd numeric not null default 0,
  evidence_fingerprint text,
  entity_key text,
  action_key text,
  approval jsonb,
  circuit_breaker jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_profile_runs_provider_chk
    check (provider in ('dataforseo', 'gsc', 'ga4', 'clarity')),
  constraint growth_profile_runs_status_chk
    check (run_status in (
      'queued',
      'running',
      'completed',
      'failed',
      'blocked',
      'cost_gated',
      'quota_exhausted',
      'blocked_provider_error'
    )),
  constraint growth_profile_runs_freshness_chk
    check (freshness_status in (
      'fresh',
      'stale',
      'missing',
      'blocked',
      'approval_required',
      'cost_gated',
      'quota_exhausted'
    )),
  constraint growth_profile_runs_quality_chk
    check (quality_status in ('pass', 'watch', 'blocked')),
  constraint growth_profile_runs_cost_chk
    check (cost_usd >= 0),
  constraint growth_profile_runs_source_refs_chk
    check (jsonb_typeof(source_refs) = 'array'),
  constraint growth_profile_runs_circuit_breaker_chk
    check (jsonb_typeof(circuit_breaker) = 'object'),
  constraint growth_profile_runs_payload_chk
    check (jsonb_typeof(payload) = 'object'),
  constraint growth_profile_runs_window_chk
    check (
      completed_at is null
      or started_at is null
      or completed_at >= started_at
    ),
  constraint growth_profile_runs_idempotency_uniq
    unique (website_id, idempotency_key)
);

alter table public.growth_profile_runs
  add column if not exists locale text not null default 'es-CO',
  add column if not exists market text not null default 'CO',
  add column if not exists run_status text not null default 'queued',
  add column if not exists source_refs jsonb not null default '[]'::jsonb,
  add column if not exists cost_usd numeric not null default 0,
  add column if not exists evidence_fingerprint text,
  add column if not exists entity_key text,
  add column if not exists action_key text,
  add column if not exists approval jsonb,
  add column if not exists circuit_breaker jsonb not null default '{}'::jsonb,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key text,
  add column if not exists error text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'growth_profile_runs'
      and column_name = 'status'
  ) then
    update public.growth_profile_runs
    set run_status = case
      when lower(coalesce(status, 'queued')) in (
        'queued',
        'running',
        'completed',
        'failed',
        'blocked',
        'cost_gated',
        'quota_exhausted',
        'blocked_provider_error'
      )
        then lower(status)
      when lower(coalesce(status, 'queued')) in ('planned', 'watch')
        then 'queued'
      when lower(coalesce(status, 'queued')) in ('pass', 'fresh')
        then 'completed'
      else run_status
    end;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'growth_profile_runs'
      and column_name = 'cost'
  ) then
    update public.growth_profile_runs
    set cost_usd = coalesce(cost_usd, cost, 0);
  end if;

  update public.growth_profile_runs
  set
    idempotency_key = coalesce(
      idempotency_key,
      concat('legacy:', website_id::text, ':', run_id)
    ),
    source_refs = case
      when jsonb_typeof(source_refs) = 'array' then source_refs
      else '[]'::jsonb
    end,
    circuit_breaker = case
      when jsonb_typeof(circuit_breaker) = 'object' then circuit_breaker
      else '{}'::jsonb
    end,
    payload = case
      when jsonb_typeof(payload) = 'object' then payload
      else '{}'::jsonb
    end;
end $$;

alter table public.growth_signal_facts
  add column if not exists provider_profile_id text,
  add column if not exists profile_run_id uuid references public.growth_profile_runs(id) on delete set null;

alter table public.growth_profile_runs
  enable row level security;

do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'growth_profile_runs'
  loop
    execute format('drop policy if exists %I on public.growth_profile_runs', rec.policyname);
  end loop;

  create policy growth_profile_runs_service_all
    on public.growth_profile_runs
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

  create policy growth_profile_runs_tenant_read
    on public.growth_profile_runs
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.user_roles ur
        where ur.account_id = growth_profile_runs.account_id
          and ur.user_id = auth.uid()
          and ur.is_active = true
      )
    );
end $$;

create index if not exists growth_profile_runs_tenant_profile_idx
  on public.growth_profile_runs(account_id, website_id, provider, profile_id, created_at desc);

create index if not exists growth_profile_runs_freshness_idx
  on public.growth_profile_runs(website_id, provider, profile_id, freshness_status, run_status);

create index if not exists growth_profile_runs_correlation_idx
  on public.growth_profile_runs(website_id, entity_key, action_key, evidence_fingerprint);

create index if not exists growth_signal_facts_profile_run_idx
  on public.growth_signal_facts(website_id, provider_profile_id, profile_run_id);

grant select on public.growth_profile_runs to authenticated;
grant all on public.growth_profile_runs to service_role;

comment on table public.growth_profile_runs is
  'Provider profile run ledger for Growth OS provider intelligence, freshness, cost, approval, circuit breaker and evidence correlation.';
comment on column public.growth_profile_runs.evidence_fingerprint is
  'Stable fingerprint of normalized provider evidence, excluding volatile cycle and provider run identifiers.';
comment on column public.growth_signal_facts.provider_profile_id is
  'Stable provider extraction profile id that produced this normalized fact, e.g. dfs_serp_labs_primary_v1.';
