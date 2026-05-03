-- ============================================================================
-- Growth OS Runtime Maturity Score 8.5/10 — Hermes-inspired learning/eval/observability tables
-- ============================================================================
-- Purpose:
--   Add the append-only/approval-gated tables used by the Codex executor
--   adapter (#413) and the learning loop required to reach the Runtime
--   Maturity Score target of 8.5/10 (#414-#417). The 8.5 label is a
--   benchmark score, not a schema version.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - No memory or skill is active by default.
--   - Tool calls are ledger rows only; business mutation remains gated by
--     Bukeer Growth OS human/Council review.
--   - RLS follows the current Growth OS review-ledger convention:
--     service_role full access, authenticated account-scoped reads.
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

create table if not exists public.growth_agent_memories (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  lane text not null,
  memory_key text not null,
  status text not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id uuid,
  proposed_by text not null default 'codex_runtime',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_memories_website_key_uniq
    unique (website_id, memory_key),
  constraint growth_agent_memories_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_memories_status_chk
    check (status in ('draft', 'active', 'rejected', 'deprecated'))
);

create table if not exists public.growth_agent_skills (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  lane text not null,
  skill_key text not null,
  version integer not null default 1,
  status text not null default 'draft',
  title text not null,
  instructions jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id uuid,
  proposed_by text not null default 'codex_runtime',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_skills_website_key_version_uniq
    unique (website_id, skill_key, version),
  constraint growth_agent_skills_version_chk
    check (version > 0),
  constraint growth_agent_skills_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_skills_status_chk
    check (status in ('draft', 'active', 'deprecated'))
);

create table if not exists public.growth_agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  run_id uuid not null,
  lane text not null,
  call_key text not null,
  tool text not null,
  action_class text not null,
  policy_verdict text not null,
  allowed boolean not null default false,
  reason text,
  cost_usd numeric(12,6),
  result_status text not null default 'recorded',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint growth_agent_tool_calls_run_call_uniq
    unique (run_id, call_key),
  constraint growth_agent_tool_calls_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_tool_calls_result_status_chk
    check (result_status in ('recorded', 'blocked', 'failed', 'succeeded'))
);

create table if not exists public.growth_agent_replay_cases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  lane text not null,
  source_table text not null,
  source_id uuid not null,
  run_id uuid,
  expected_decision text not null,
  expected_allowed_action text,
  rationale text,
  status text not null default 'candidate',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_replay_cases_source_uniq
    unique (website_id, lane, source_table, source_id, expected_decision),
  constraint growth_agent_replay_cases_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_replay_cases_status_chk
    check (status in ('candidate', 'active', 'rejected', 'deprecated'))
);

create table if not exists public.growth_agent_run_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  run_id uuid not null,
  lane text not null,
  duration_ms integer,
  codex_duration_ms integer,
  exit_code integer,
  retries integer not null default 0,
  artifact_complete boolean not null default false,
  cost_usd numeric(12,6),
  tokens_input integer,
  tokens_output integer,
  error_class text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint growth_agent_run_metrics_run_uniq
    unique (run_id),
  constraint growth_agent_run_metrics_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_run_metrics_duration_chk
    check (duration_ms is null or duration_ms >= 0),
  constraint growth_agent_run_metrics_codex_duration_chk
    check (codex_duration_ms is null or codex_duration_ms >= 0),
  constraint growth_agent_run_metrics_retries_chk
    check (retries >= 0),
  constraint growth_agent_run_metrics_tokens_input_chk
    check (tokens_input is null or tokens_input >= 0),
  constraint growth_agent_run_metrics_tokens_output_chk
    check (tokens_output is null or tokens_output >= 0)
);

create index if not exists growth_agent_memories_lane_status_idx
  on public.growth_agent_memories(website_id, lane, status);
create index if not exists growth_agent_memories_source_run_idx
  on public.growth_agent_memories(website_id, source_run_id, status);

create index if not exists growth_agent_skills_lane_status_idx
  on public.growth_agent_skills(website_id, lane, status);
create index if not exists growth_agent_skills_source_run_idx
  on public.growth_agent_skills(website_id, source_run_id, status);

create index if not exists growth_agent_tool_calls_run_idx
  on public.growth_agent_tool_calls(website_id, run_id, created_at);
create index if not exists growth_agent_tool_calls_lane_idx
  on public.growth_agent_tool_calls(website_id, lane, allowed);

create index if not exists growth_agent_replay_cases_run_idx
  on public.growth_agent_replay_cases(website_id, run_id, status);
create index if not exists growth_agent_replay_cases_lane_idx
  on public.growth_agent_replay_cases(website_id, lane, status);

create index if not exists growth_agent_run_metrics_lane_idx
  on public.growth_agent_run_metrics(website_id, lane, artifact_complete);
create index if not exists growth_agent_run_metrics_created_idx
  on public.growth_agent_run_metrics(website_id, created_at desc);

drop trigger if exists trg_growth_agent_memories_touch on public.growth_agent_memories;
create trigger trg_growth_agent_memories_touch
  before update on public.growth_agent_memories
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_skills_touch on public.growth_agent_skills;
create trigger trg_growth_agent_skills_touch
  before update on public.growth_agent_skills
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_replay_cases_touch on public.growth_agent_replay_cases;
create trigger trg_growth_agent_replay_cases_touch
  before update on public.growth_agent_replay_cases
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_agent_memories enable row level security;
alter table public.growth_agent_skills enable row level security;
alter table public.growth_agent_tool_calls enable row level security;
alter table public.growth_agent_replay_cases enable row level security;
alter table public.growth_agent_run_metrics enable row level security;

drop policy if exists growth_agent_memories_service_all on public.growth_agent_memories;
create policy growth_agent_memories_service_all
  on public.growth_agent_memories
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_memories_account_read on public.growth_agent_memories;
create policy growth_agent_memories_account_read
  on public.growth_agent_memories
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_agent_skills_service_all on public.growth_agent_skills;
create policy growth_agent_skills_service_all
  on public.growth_agent_skills
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_skills_account_read on public.growth_agent_skills;
create policy growth_agent_skills_account_read
  on public.growth_agent_skills
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_agent_tool_calls_service_all on public.growth_agent_tool_calls;
create policy growth_agent_tool_calls_service_all
  on public.growth_agent_tool_calls
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_tool_calls_account_read on public.growth_agent_tool_calls;
create policy growth_agent_tool_calls_account_read
  on public.growth_agent_tool_calls
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_agent_replay_cases_service_all on public.growth_agent_replay_cases;
create policy growth_agent_replay_cases_service_all
  on public.growth_agent_replay_cases
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_replay_cases_account_read on public.growth_agent_replay_cases;
create policy growth_agent_replay_cases_account_read
  on public.growth_agent_replay_cases
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_agent_run_metrics_service_all on public.growth_agent_run_metrics;
create policy growth_agent_run_metrics_service_all
  on public.growth_agent_run_metrics
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_run_metrics_account_read on public.growth_agent_run_metrics;
create policy growth_agent_run_metrics_account_read
  on public.growth_agent_run_metrics
  for select
  to authenticated
  using (account_id = auth.uid());

grant select on public.growth_agent_memories to authenticated;
grant select on public.growth_agent_skills to authenticated;
grant select on public.growth_agent_tool_calls to authenticated;
grant select on public.growth_agent_replay_cases to authenticated;
grant select on public.growth_agent_run_metrics to authenticated;

grant all on public.growth_agent_memories to service_role;
grant all on public.growth_agent_skills to service_role;
grant all on public.growth_agent_tool_calls to service_role;
grant all on public.growth_agent_replay_cases to service_role;
grant all on public.growth_agent_run_metrics to service_role;

comment on table public.growth_agent_memories is
  'Growth OS draft/approved memory ledger. Runtime may propose draft memories; human approval is required before active use.';
comment on table public.growth_agent_skills is
  'Growth OS versioned skill ledger. Runtime may propose draft skills; human approval is required before activation.';
comment on table public.growth_agent_tool_calls is
  'Growth OS append-only tool gateway ledger for policy verdicts, costs and tool outcomes.';
comment on table public.growth_agent_replay_cases is
  'Growth OS replay/eval case candidates derived from reviewed runtime runs.';
comment on table public.growth_agent_run_metrics is
  'Growth OS runtime execution metrics: duration, exit code, artifact completeness, cost and token accounting.';
