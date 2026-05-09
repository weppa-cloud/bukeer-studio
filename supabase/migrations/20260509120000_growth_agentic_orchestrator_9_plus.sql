-- ============================================================================
-- Growth OS Agentic Orchestrator 9+ (#460)
-- ============================================================================
-- Purpose:
--   Add the Paperclip/Hermes-inspired agentic orchestration layer:
--   context snapshots, orchestrator decisions, wakeups, runtime state and
--   task sessions. These tables are control-plane/runtime ledgers only; public
--   production mutation remains owned by growth_publication_jobs and adapters.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Runtime writes are service_role only.
--   - Authenticated reads are tenant scoped through user_roles.
--   - Legacy learning-table read policies are normalized away from
--     account_id = auth.uid().
-- ============================================================================

create or replace function public.touch_growth_backlog_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.growth_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  lane text not null default 'all',
  wakeup_request_id uuid,
  cycle_id uuid references public.growth_runtime_cycles(id) on delete set null,
  context_version text not null default 'agentic-context-v1',
  objective text not null,
  sanitized_context jsonb not null default '{}'::jsonb,
  source_refs text[] not null default '{}'::text[],
  injection_scan jsonb not null default '{}'::jsonb,
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  constraint growth_context_snapshots_lane_chk
    check (lane in (
      'all',
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_context_snapshots_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_context_snapshots_context_chk
    check (jsonb_typeof(sanitized_context) = 'object' and sanitized_context <> '{}'::jsonb),
  constraint growth_context_snapshots_scan_chk
    check (jsonb_typeof(injection_scan) = 'object'),
  constraint growth_context_snapshots_token_chk
    check (token_estimate >= 0)
);

create table if not exists public.growth_orchestrator_decisions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  cycle_id uuid references public.growth_runtime_cycles(id) on delete set null,
  wakeup_request_id uuid,
  context_snapshot_id uuid not null references public.growth_context_snapshots(id) on delete restrict,
  objective text not null,
  north_star_alignment text not null,
  decision_type text not null,
  observed_signals jsonb not null default '[]'::jsonb,
  proposed_candidates jsonb not null default '[]'::jsonb,
  proposed_work_items jsonb not null default '[]'::jsonb,
  delegated_tasks jsonb not null default '[]'::jsonb,
  blocked_decisions jsonb not null default '[]'::jsonb,
  memory_reads jsonb not null default '[]'::jsonb,
  skill_reads jsonb not null default '[]'::jsonb,
  outcome_references jsonb not null default '[]'::jsonb,
  policy_recommendations jsonb not null default '[]'::jsonb,
  risk_assessment jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) not null default 0.5,
  no_go_reasons text[] not null default '{}'::text[],
  created_signal_fact_ids uuid[] not null default '{}'::uuid[],
  created_candidate_ids uuid[] not null default '{}'::uuid[],
  created_work_item_ids uuid[] not null default '{}'::uuid[],
  materialization_status text not null default 'pending',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint growth_orchestrator_decisions_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_orchestrator_decisions_type_chk
    check (decision_type in (
      'create_work',
      'delegate',
      'block',
      'learn',
      'recommend_policy',
      'observe'
    )),
  constraint growth_orchestrator_decisions_status_chk
    check (materialization_status in ('pending', 'materialized', 'blocked', 'failed')),
  constraint growth_orchestrator_decisions_confidence_chk
    check (confidence >= 0 and confidence <= 1),
  constraint growth_orchestrator_decisions_json_chk
    check (
      jsonb_typeof(observed_signals) = 'array'
      and jsonb_typeof(proposed_candidates) = 'array'
      and jsonb_typeof(proposed_work_items) = 'array'
      and jsonb_typeof(delegated_tasks) = 'array'
      and jsonb_typeof(blocked_decisions) = 'array'
      and jsonb_typeof(memory_reads) = 'array'
      and jsonb_typeof(skill_reads) = 'array'
      and jsonb_typeof(outcome_references) = 'array'
      and jsonb_typeof(policy_recommendations) = 'array'
      and jsonb_typeof(risk_assessment) = 'object'
      and jsonb_typeof(evidence) = 'object'
    )
);

create table if not exists public.growth_agent_wakeup_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  lane text not null,
  source text not null,
  status text not null default 'queued',
  priority integer not null default 50,
  idempotency_key text not null,
  coalesced_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  completed_at timestamptz,
  run_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_wakeup_requests_uniq
    unique (website_id, lane, idempotency_key),
  constraint growth_agent_wakeup_requests_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_wakeup_requests_source_chk
    check (source in (
      'timer',
      'data_refresh',
      'assignment',
      'outcome_due',
      'blocked_unblock',
      'user_on_demand',
      'policy_change'
    )),
  constraint growth_agent_wakeup_requests_status_chk
    check (status in ('queued', 'claimed', 'completed', 'failed', 'cancelled', 'coalesced')),
  constraint growth_agent_wakeup_requests_priority_chk
    check (priority between 0 and 100),
  constraint growth_agent_wakeup_requests_coalesced_chk
    check (coalesced_count >= 0),
  constraint growth_agent_wakeup_requests_payload_chk
    check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.growth_agent_runtime_state (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  lane text not null,
  agent_id text not null,
  status text not null default 'idle',
  heartbeat_at timestamptz,
  current_wakeup_id uuid references public.growth_agent_wakeup_requests(id) on delete set null,
  current_work_item_id uuid references public.growth_work_items(id) on delete set null,
  active_task_session_id uuid,
  total_wakeups integer not null default 0,
  total_decisions integer not null default 0,
  total_cost_usd numeric(12,6) not null default 0,
  last_error text,
  runtime_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_runtime_state_uniq
    unique (website_id, lane, agent_id),
  constraint growth_agent_runtime_state_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_runtime_state_status_chk
    check (status in ('idle', 'queued', 'running', 'paused', 'blocked', 'failed')),
  constraint growth_agent_runtime_state_counts_chk
    check (total_wakeups >= 0 and total_decisions >= 0 and total_cost_usd >= 0),
  constraint growth_agent_runtime_state_json_chk
    check (jsonb_typeof(runtime_state) = 'object')
);

create table if not exists public.growth_agent_task_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  parent_work_item_id uuid references public.growth_work_items(id) on delete set null,
  child_work_item_id uuid references public.growth_work_items(id) on delete set null,
  delegated_by_agent_id text not null,
  assigned_agent_lane text not null,
  wakeup_request_id uuid references public.growth_agent_wakeup_requests(id) on delete set null,
  decision_id uuid references public.growth_orchestrator_decisions(id) on delete set null,
  status text not null default 'created',
  handoff_summary text not null,
  required_context_refs text[] not null default '{}'::text[],
  dependencies uuid[] not null default '{}'::uuid[],
  completion_contract jsonb not null default '{}'::jsonb,
  session_state jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_task_sessions_lane_chk
    check (assigned_agent_lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_task_sessions_status_chk
    check (status in ('created', 'assigned', 'running', 'blocked', 'completed', 'cancelled')),
  constraint growth_agent_task_sessions_json_chk
    check (
      jsonb_typeof(completion_contract) = 'object'
      and completion_contract <> '{}'::jsonb
      and jsonb_typeof(session_state) = 'object'
    )
);

create index if not exists growth_context_snapshots_lookup_idx
  on public.growth_context_snapshots(website_id, lane, created_at desc);

create index if not exists growth_orchestrator_decisions_lookup_idx
  on public.growth_orchestrator_decisions(website_id, decision_type, created_at desc);
create index if not exists growth_orchestrator_decisions_cycle_idx
  on public.growth_orchestrator_decisions(cycle_id, created_at desc);
create index if not exists growth_orchestrator_decisions_context_idx
  on public.growth_orchestrator_decisions(context_snapshot_id);

create index if not exists growth_agent_wakeup_requests_claim_idx
  on public.growth_agent_wakeup_requests(website_id, lane, status, priority desc, created_at);

create index if not exists growth_agent_runtime_state_lookup_idx
  on public.growth_agent_runtime_state(website_id, lane, status);

create index if not exists growth_agent_task_sessions_lookup_idx
  on public.growth_agent_task_sessions(website_id, assigned_agent_lane, status, updated_at desc);
create index if not exists growth_agent_task_sessions_parent_idx
  on public.growth_agent_task_sessions(parent_work_item_id, child_work_item_id);
create index if not exists growth_agent_task_sessions_decision_idx
  on public.growth_agent_task_sessions(decision_id);

drop trigger if exists trg_growth_agent_wakeup_requests_touch
  on public.growth_agent_wakeup_requests;
create trigger trg_growth_agent_wakeup_requests_touch
  before update on public.growth_agent_wakeup_requests
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_runtime_state_touch
  on public.growth_agent_runtime_state;
create trigger trg_growth_agent_runtime_state_touch
  before update on public.growth_agent_runtime_state
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_task_sessions_touch
  on public.growth_agent_task_sessions;
create trigger trg_growth_agent_task_sessions_touch
  before update on public.growth_agent_task_sessions
  for each row execute function public.touch_growth_backlog_updated_at();

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_context_snapshots',
    'growth_orchestrator_decisions',
    'growth_agent_wakeup_requests',
    'growth_agent_runtime_state',
    'growth_agent_task_sessions',
    'growth_agent_memories',
    'growth_agent_skills',
    'growth_agent_tool_calls',
    'growth_agent_replay_cases',
    'growth_agent_run_metrics'
  ] loop
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
  end loop;
end $$;

comment on table public.growth_context_snapshots is
  'Sanitized, versioned context bundles injected into Growth OS brain and lane agents.';
comment on table public.growth_orchestrator_decisions is
  'Append-only Growth CEO Brain decision ledger: create, delegate, block, learn and policy recommendations.';
comment on table public.growth_agent_wakeup_requests is
  'Paperclip-style DB wakeup queue for Growth OS lane agents.';
comment on table public.growth_agent_runtime_state is
  'Per-lane agent runtime state, heartbeat, current work, counters and last error.';
comment on table public.growth_agent_task_sessions is
  'Delegation/handoff ledger for parent-child Growth OS task sessions.';
