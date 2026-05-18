-- ============================================================================
-- Growth OS Control Plane Governance Tables — Phase 1b
-- ============================================================================
-- Purpose:
--   Create the six governance tables that form the Control Plane SSOT for
--   Growth OS agent definitions, capability gates, provider policies, account
--   plans, source reference ledger, and context packet audit log.
--
-- Tables:
--   1. growth_account_plans       — Strategic growth plan per account
--   2. growth_capabilities        — What each account/website/locale/market/lane
--                                   is allowed to do
--   3. growth_provider_policies   — Which providers approved per scope
--   4. growth_agent_definitions   — Agent/lane definitions with safety config
--   5. growth_source_refs         — INSERT-ONLY source reference ledger
--   6. growth_context_packet_log  — INSERT-ONLY context packet audit log
--
-- Safety:
--   - Additive, forward-only and idempotent (create if not exists).
--   - Service-role writes only; authenticated users get tenant-scoped reads.
--   - No provider API calls, no secrets stored.
--   - Workers consume ContextPacket only — not these raw tables.
--   - Locale/market resolution: exact match → explicit allowed fallback → BLOCKED.
--
-- References:
--   - SPEC_GROWTH_CONTROL_PLANE_PHASE1_MIGRATIONS.md
--   - ADR-003 (contract-first validation)
--   - ADR-009 (multi-tenant scoping)
-- ============================================================================

-- ============================================================================
-- 1. growth_account_plans
-- ============================================================================
-- Strategic growth plan per account. Supersedes hardcoded OBJECTIVE in
-- context-builder.ts.
-- ============================================================================

create table if not exists public.growth_account_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  plan_name text not null,
  plan_version text not null default 'v1',
  objective text not null,
  north_star_metric text,
  key_results jsonb not null default '[]'::jsonb,
  allowed_lanes text[] not null,
  budget_cents_monthly integer,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_account_plans_name_version_uniq
    unique (account_id, plan_name, plan_version),
  constraint growth_account_plans_status_chk
    check (status in ('active', 'archived', 'draft')),
  constraint growth_account_plans_key_results_chk
    check (jsonb_typeof(key_results) = 'array'),
  constraint growth_account_plans_metadata_chk
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.growth_account_plans is
  'Strategic growth plan per account. Supersedes hardcoded OBJECTIVE in context-builder.ts.';
comment on column public.growth_account_plans.objective is
  'Overrides hardcoded OBJECTIVE in context-builder for this account plan.';
comment on column public.growth_account_plans.north_star_metric is
  'Primary growth metric, e.g. qualified_trip_requests/month.';
comment on column public.growth_account_plans.key_results is
  'Array of {metric, baseline, target, timeframe} objects.';

-- ============================================================================
-- 2. growth_capabilities
-- ============================================================================
-- What each account/website/locale/market/lane is allowed to do.
-- ============================================================================

create table if not exists public.growth_capabilities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null,
  market text not null,
  lane text not null,
  capability text not null,
  enabled boolean not null default false,
  canary_only boolean not null default true,
  max_concurrency integer not null default 1,
  config_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_capabilities_scope_uniq
    unique (website_id, locale, market, lane, capability),
  constraint growth_capabilities_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')),
  constraint growth_capabilities_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_capabilities_config_chk
    check (jsonb_typeof(config_overrides) = 'object')
);

comment on table public.growth_capabilities is
  'What each account/website/locale/market/lane is allowed to do.';
comment on column public.growth_capabilities.canary_only is
  'If true, this capability is only allowed in canary mode.';
comment on column public.growth_capabilities.config_overrides is
  'Lane-specific configuration overrides as JSON object.';

-- ============================================================================
-- 3. growth_provider_policies
-- ============================================================================
-- Which providers are approved for each account/website/locale/market.
-- ============================================================================

create table if not exists public.growth_provider_policies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  provider text not null,
  provider_profile_type text not null,
  locale text,
  market text,
  credential_ref text,
  consent_granted boolean not null default false,
  consent_granted_by uuid references auth.users(id) on delete set null,
  data_usage_policy text not null default 'read_only',
  rate_limit_burst integer not null default 60,
  rate_limit_daily integer not null default 1000,
  enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_provider_policies_scope_uniq
    unique (website_id, provider, provider_profile_type, locale, market),
  constraint growth_provider_policies_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')),
  constraint growth_provider_policies_data_usage_chk
    check (data_usage_policy in ('read_only', 'download', 'store_normalized'))
);

comment on table public.growth_provider_policies is
  'Which providers are approved for each account/website/locale/market.';
comment on column public.growth_provider_policies.credential_ref is
  'Reference to vaulted credential; never a raw secret.';
comment on column public.growth_provider_policies.data_usage_policy is
  'read_only = inspect only, download = retrieve raw, store_normalized = persist normalized facts.';

-- ============================================================================
-- 4. growth_agent_definitions
-- ============================================================================
-- Agent/lane definitions with safety configuration per
-- website/locale/market. Consumed by agent resolution system.
-- ============================================================================

create table if not exists public.growth_agent_definitions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  agent_name text not null,
  lane text not null,
  profile_type text not null,
  locale text not null,
  market text not null,
  schema_ref text,
  allowed_actions text[] not null default '{}'::text[],
  blocked_actions text[] not null default '{call_provider_api_directly}'::text[],
  kill_switch boolean not null default false,
  canary_only boolean not null default true,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_definitions_scope_uniq
    unique (website_id, agent_name, locale, market),
  constraint growth_agent_definitions_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')),
  constraint growth_agent_definitions_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_definitions_config_chk
    check (jsonb_typeof(config) = 'object')
);

comment on table public.growth_agent_definitions is
  'Agent/lane definitions with safety configuration per website/locale/market. Consumed by agent resolution system.';
comment on column public.growth_agent_definitions.schema_ref is
  'Zod schema name, e.g. TranscreationAgentSchema — maps to @bukeer/website-contract.';
comment on column public.growth_agent_definitions.kill_switch is
  'If true, all actions for this agent are blocked regardless of allowed_actions.';
comment on column public.growth_agent_definitions.blocked_actions is
  'Actions explicitly forbidden for this agent. Default blocks direct provider API calls.';

-- ============================================================================
-- 5. growth_source_refs — INSERT-ONLY
-- ============================================================================
-- Immutable source reference ledger. Every provider run produces one or more
-- source refs linking run_id, fact_id, and freshness status.
-- ============================================================================

create table if not exists public.growth_source_refs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  run_id uuid not null references public.growth_profile_runs(id) on delete cascade,
  source text not null,
  fact_id uuid,
  fact_type text,
  locale text not null,
  market text not null,
  profile_type text,
  freshness_status text not null default 'unknown',
  valid_from timestamptz,
  valid_until timestamptz,
  payload_hash text,
  created_at timestamptz not null default now(),
  constraint growth_source_refs_run_fact_uniq
    unique (run_id, source, fact_id)
    deferrable initially deferred,
  constraint growth_source_refs_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')),
  constraint growth_source_refs_freshness_chk
    check (freshness_status in ('fresh', 'stale', 'expired', 'unknown'))
);

comment on table public.growth_source_refs is
  'INSERT-ONLY: Immutable source reference ledger linking run_id, fact_id, and freshness.';
comment on column public.growth_source_refs.source is
  'Source table name, e.g. growth_profiles, growth_signal_facts.';
comment on column public.growth_source_refs.fact_id is
  'The row in the target table this ref points to.';
comment on column public.growth_source_refs.payload_hash is
  'Hash of payload for dedup verification.';
comment on column public.growth_source_refs.freshness_status is
  'fresh, stale, expired, or unknown.';

create index if not exists growth_source_refs_scope_idx
  on public.growth_source_refs(website_id, locale, market, created_at desc);

create index if not exists growth_source_refs_run_idx
  on public.growth_source_refs(run_id);

create index if not exists growth_source_refs_fact_idx
  on public.growth_source_refs(source, fact_id)
  where fact_id is not null;

create index if not exists growth_source_refs_freshness_idx
  on public.growth_source_refs(website_id, freshness_status, valid_until)
  where freshness_status in ('fresh', 'stale');

-- ============================================================================
-- 6. growth_context_packet_log — INSERT-ONLY
-- ============================================================================
-- Immutable log of every ContextPacket sent to a worker. Required for audit,
-- replay, and T6 learning.
-- ============================================================================

create table if not exists public.growth_context_packet_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  context_snapshot_id uuid references public.growth_context_snapshots(id) on delete set null,
  worker_run_id text,
  packet_version text not null default '1',
  locale text not null,
  market text not null,
  lane text not null,
  source_refs_included text[] not null default '{}'::text[],
  verdict text not null default 'BLOCKED',
  blocked_reasons text[] not null default '{}'::text[],
  outcome text,
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  constraint growth_context_packet_log_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'BR', 'EU', 'OTHER')),
  constraint growth_context_packet_log_verdict_chk
    check (verdict in ('PASS_AUTONOMOUS', 'PASS_WITH_WATCH', 'BLOCKED')),
  constraint growth_context_packet_log_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    ))
);

comment on table public.growth_context_packet_log is
  'INSERT-ONLY: Immutable log of every ContextPacket sent to a worker for audit, replay, and T6 learning.';
comment on column public.growth_context_packet_log.context_snapshot_id is
  'FK to growth_context_snapshots. Set null if snapshot was not persisted (dry-run).';
comment on column public.growth_context_packet_log.worker_run_id is
  'Hermes/Kanban run ID for cross-system traceability.';
comment on column public.growth_context_packet_log.verdict is
  'PASS_AUTONOMOUS, PASS_WITH_WATCH, or BLOCKED.';
comment on column public.growth_context_packet_log.token_estimate is
  'Estimated token count of the context packet.';

create index if not exists growth_context_packet_log_scope_idx
  on public.growth_context_packet_log(website_id, locale, market, created_at desc);

create index if not exists growth_context_packet_log_snapshot_idx
  on public.growth_context_packet_log(context_snapshot_id);

create index if not exists growth_context_packet_log_verdict_idx
  on public.growth_context_packet_log(website_id, verdict, created_at desc);

-- ============================================================================
-- Updated_at triggers (for mutable tables only)
-- ============================================================================

-- growth_account_plans
drop trigger if exists trg_growth_account_plans_touch
  on public.growth_account_plans;
create trigger trg_growth_account_plans_touch
  before update on public.growth_account_plans
  for each row execute function public.touch_growth_backlog_updated_at();

-- growth_capabilities
drop trigger if exists trg_growth_capabilities_touch
  on public.growth_capabilities;
create trigger trg_growth_capabilities_touch
  before update on public.growth_capabilities
  for each row execute function public.touch_growth_backlog_updated_at();

-- growth_provider_policies
drop trigger if exists trg_growth_provider_policies_touch
  on public.growth_provider_policies;
create trigger trg_growth_provider_policies_touch
  before update on public.growth_provider_policies
  for each row execute function public.touch_growth_backlog_updated_at();

-- growth_agent_definitions
drop trigger if exists trg_growth_agent_definitions_touch
  on public.growth_agent_definitions;
create trigger trg_growth_agent_definitions_touch
  before update on public.growth_agent_definitions
  for each row execute function public.touch_growth_backlog_updated_at();

-- ============================================================================
-- RLS Policies — following established growth table pattern
-- ============================================================================
-- Service role: full access
-- Authenticated users: tenant-scoped reads via user_roles
-- No INSERT/UPDATE/DELETE from authenticated (service_role only for writes)
-- ============================================================================

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_account_plans',
    'growth_capabilities',
    'growth_provider_policies',
    'growth_agent_definitions',
    'growth_source_refs',
    'growth_context_packet_log'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);

      for rec in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', rec.policyname, tbl);
      end loop;

      execute format($policy$
        create policy %I
        on public.%I
        for all
        using (auth.role() = 'service_role')
        with check (auth.role() = 'service_role')
      $policy$, tbl || '_service_all', tbl);

      execute format($policy$
        create policy %I
        on public.%I
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.user_roles ur
            where ur.account_id = %I.account_id
              and ur.user_id = auth.uid()
              and ur.is_active = true
          )
        )
      $policy$, tbl || '_tenant_read', tbl, tbl);

      execute format('grant select on public.%I to authenticated', tbl);
      execute format('grant all on public.%I to service_role', tbl);
    end if;
  end loop;
end $$;

-- ============================================================================
-- Standalone indexes for tenant-scope lookups
-- ============================================================================

create index if not exists growth_account_plans_tenant_idx
  on public.growth_account_plans(account_id, status, created_at desc);

create index if not exists growth_capabilities_tenant_idx
  on public.growth_capabilities(account_id, website_id, locale, market, lane);

create index if not exists growth_provider_policies_tenant_idx
  on public.growth_provider_policies(account_id, website_id, provider);

create index if not exists growth_agent_definitions_tenant_idx
  on public.growth_agent_definitions(website_id, lane, locale, market, enabled);
