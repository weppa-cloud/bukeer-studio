-- Growth OS Hermes Agent Context Isolation 9
-- Durable per-agent context manifests for strict skills/memories/toolset isolation.

create table if not exists public.growth_agent_context_manifests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  agent_instance_id uuid not null references public.growth_agent_instances(id) on delete cascade,
  task_session_id uuid references public.growth_agent_task_sessions(id) on delete set null,
  context_snapshot_id uuid not null references public.growth_context_snapshots(id) on delete restrict,
  lane text not null,
  status text not null default 'active',
  autonomy_level text not null default 'A2',
  context_hash text not null,
  model_provider text not null,
  model_name text not null,
  toolset_allowed text[] not null default '{}'::text[],
  skill_ids_injected uuid[] not null default '{}'::uuid[],
  memory_ids_injected uuid[] not null default '{}'::uuid[],
  global_memory_ids_injected uuid[] not null default '{}'::uuid[],
  excluded_skill_ids uuid[] not null default '{}'::uuid[],
  excluded_memory_ids uuid[] not null default '{}'::uuid[],
  provider_source_refs text[] not null default '{}'::text[],
  outcome_refs text[] not null default '{}'::text[],
  policy_refs text[] not null default '{}'::text[],
  budget_snapshot jsonb not null default '{}'::jsonb,
  injection_scan jsonb not null default '{}'::jsonb,
  isolation_verdict jsonb not null default '{}'::jsonb,
  manifest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_context_manifests_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_context_manifests_status_chk
    check (status in ('active', 'superseded', 'blocked', 'failed')),
  constraint growth_agent_context_manifests_autonomy_chk
    check (autonomy_level in ('A0', 'A1', 'A2', 'A3', 'A4')),
  constraint growth_agent_context_manifests_json_chk
    check (
      jsonb_typeof(budget_snapshot) = 'object'
      and jsonb_typeof(injection_scan) = 'object'
      and jsonb_typeof(isolation_verdict) = 'object'
      and jsonb_typeof(manifest_payload) = 'object'
    )
);

alter table public.growth_agent_task_sessions
  add column if not exists context_manifest_id uuid
    references public.growth_agent_context_manifests(id) on delete set null;

alter table public.growth_agent_artifacts
  add column if not exists context_manifest_id uuid
    references public.growth_agent_context_manifests(id) on delete set null;

alter table public.growth_agent_artifacts
  add column if not exists manifest_citation_verdict jsonb not null default '{}'::jsonb;

alter table public.growth_agent_artifacts
  drop constraint if exists growth_agent_artifacts_manifest_citation_json_chk;

alter table public.growth_agent_artifacts
  add constraint growth_agent_artifacts_manifest_citation_json_chk
  check (jsonb_typeof(manifest_citation_verdict) = 'object');

create index if not exists growth_agent_context_manifests_lookup_idx
  on public.growth_agent_context_manifests(website_id, agent_instance_id, lane, status, created_at desc);

create index if not exists growth_agent_context_manifests_task_idx
  on public.growth_agent_context_manifests(task_session_id, context_snapshot_id);

create index if not exists growth_agent_task_sessions_context_manifest_idx
  on public.growth_agent_task_sessions(context_manifest_id);

create index if not exists growth_agent_artifacts_context_manifest_idx
  on public.growth_agent_artifacts(context_manifest_id);

drop trigger if exists trg_growth_agent_context_manifests_touch
  on public.growth_agent_context_manifests;
create trigger trg_growth_agent_context_manifests_touch
  before update on public.growth_agent_context_manifests
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_agent_context_manifests enable row level security;

drop policy if exists growth_agent_context_manifests_service_all
  on public.growth_agent_context_manifests;
create policy growth_agent_context_manifests_service_all
  on public.growth_agent_context_manifests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_context_manifests_tenant_read
  on public.growth_agent_context_manifests;
create policy growth_agent_context_manifests_tenant_read
  on public.growth_agent_context_manifests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_agent_context_manifests.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

grant select on public.growth_agent_context_manifests to authenticated;
grant all on public.growth_agent_context_manifests to service_role;

comment on table public.growth_agent_context_manifests is
  'Per-task Hermes/Growth OS context manifest proving agent-instance isolation for skills, memories, toolsets, model, budget and source refs.';
comment on column public.growth_agent_context_manifests.autonomy_level is
  'A0 read-only, A1 advisory, A2 artifact autonomy, A3 work-prep autonomy, A4 live-gated execution request.';
comment on column public.growth_agent_artifacts.manifest_citation_verdict is
  'Validation result proving artifact memory/skill citations were injected in the linked context manifest.';
