-- ============================================================================
-- Growth OS Hermes Chief of Staff Swarm (#482)
-- ============================================================================
-- Purpose:
--   Add the hybrid Hermes/Growth OS layer: conversation sessions/messages,
--   audited action routing, fixed agent type registry, editable tenant-scoped
--   agent instances, and versioned agent artifacts.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Public production mutation remains owned by growth_publication_jobs and
--     live-gated adapters.
--   - Runtime writes are service_role/server-action only.
--   - Authenticated reads are tenant scoped through user_roles.
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

create table if not exists public.growth_chief_of_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null,
  title text not null default 'Growth Chief of Staff',
  session_mode text not null default 'chief_of_staff',
  status text not null default 'active',
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_chief_sessions_mode_chk
    check (session_mode in ('chief_of_staff', 'decision_support', 'guided_action')),
  constraint growth_chief_sessions_status_chk
    check (status in ('active', 'archived')),
  constraint growth_chief_sessions_metadata_chk
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.growth_chief_of_staff_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.growth_chief_of_staff_sessions(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  role text not null,
  content text not null,
  cited_refs jsonb not null default '[]'::jsonb,
  action_id uuid,
  token_estimate integer not null default 0,
  redaction jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint growth_chief_messages_role_chk
    check (role in ('user', 'assistant', 'tool', 'system')),
  constraint growth_chief_messages_refs_chk
    check (jsonb_typeof(cited_refs) = 'array'),
  constraint growth_chief_messages_redaction_chk
    check (jsonb_typeof(redaction) = 'object'),
  constraint growth_chief_messages_metadata_chk
    check (jsonb_typeof(metadata) = 'object'),
  constraint growth_chief_messages_token_chk
    check (token_estimate >= 0)
);

create table if not exists public.growth_chief_of_staff_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.growth_chief_of_staff_sessions(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  requested_by uuid not null,
  intent text not null,
  action_class text not null,
  status text not null default 'proposed',
  requires_approval boolean not null default false,
  approval jsonb not null default '{}'::jsonb,
  policy_verdict jsonb not null default '{}'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  created_refs jsonb not null default '[]'::jsonb,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_chief_actions_class_chk
    check (action_class in (
      'read_only',
      'enqueue_wakeup',
      'propose_policy',
      'request_cap_change',
      'request_runtime_cycle',
      'approve_learning',
      'forbidden'
    )),
  constraint growth_chief_actions_status_chk
    check (status in ('proposed', 'queued', 'approved', 'rejected', 'completed', 'failed', 'blocked')),
  constraint growth_chief_actions_json_chk
    check (
      jsonb_typeof(approval) = 'object'
      and jsonb_typeof(policy_verdict) = 'object'
      and jsonb_typeof(request_payload) = 'object'
      and jsonb_typeof(result_payload) = 'object'
      and jsonb_typeof(created_refs) = 'array'
    )
);

create table if not exists public.growth_agent_types (
  agent_type text primary key,
  display_name text not null,
  purpose text not null,
  default_lane text not null,
  can_generate_artifacts boolean not null default true,
  can_request_live_execution boolean not null default false,
  immutable_safety_bounds jsonb not null default '{}'::jsonb,
  default_toolset jsonb not null default '[]'::jsonb,
  default_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_types_lane_chk
    check (default_lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_types_json_chk
    check (
      jsonb_typeof(immutable_safety_bounds) = 'object'
      and jsonb_typeof(default_toolset) = 'array'
      and jsonb_typeof(default_config) = 'object'
    )
);

create table if not exists public.growth_agent_instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  agent_type text not null references public.growth_agent_types(agent_type) on delete restrict,
  lane text not null,
  display_name text not null,
  status text not null default 'enabled',
  model_provider text not null default 'openrouter',
  model_name text not null default 'openai/gpt-5',
  max_cost_daily_usd numeric(10,4) not null default 10,
  max_cost_weekly_usd numeric(10,4) not null default 50,
  concurrency_limit integer not null default 1,
  wakeup_policy jsonb not null default '{}'::jsonb,
  active_skill_ids uuid[] not null default '{}'::uuid[],
  active_memory_ids uuid[] not null default '{}'::uuid[],
  toolset_allowlist text[] not null default '{}'::text[],
  confidence_threshold numeric(5,4) not null default 0.70,
  quality_threshold numeric(5,4) not null default 0.80,
  routing_priority integer not null default 50,
  notification_preferences jsonb not null default '{}'::jsonb,
  editable_config jsonb not null default '{}'::jsonb,
  immutable_safety_bounds jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_instances_uniq
    unique (website_id, agent_type),
  constraint growth_agent_instances_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_instances_status_chk
    check (status in ('enabled', 'paused', 'disabled', 'failed')),
  constraint growth_agent_instances_cost_chk
    check (max_cost_daily_usd >= 0 and max_cost_weekly_usd >= max_cost_daily_usd),
  constraint growth_agent_instances_limits_chk
    check (
      concurrency_limit >= 1
      and concurrency_limit <= 20
      and confidence_threshold >= 0
      and confidence_threshold <= 1
      and quality_threshold >= 0
      and quality_threshold <= 1
      and routing_priority >= 0
      and routing_priority <= 100
    ),
  constraint growth_agent_instances_json_chk
    check (
      jsonb_typeof(wakeup_policy) = 'object'
      and jsonb_typeof(notification_preferences) = 'object'
      and jsonb_typeof(editable_config) = 'object'
      and jsonb_typeof(immutable_safety_bounds) = 'object'
    )
);

create table if not exists public.growth_agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  agent_instance_id uuid references public.growth_agent_instances(id) on delete set null,
  task_session_id uuid references public.growth_agent_task_sessions(id) on delete set null,
  decision_id uuid references public.growth_orchestrator_decisions(id) on delete set null,
  artifact_type text not null,
  artifact_version text not null default 'v1',
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  quality_review jsonb not null default '{}'::jsonb,
  provider_evidence_reads jsonb not null default '[]'::jsonb,
  memory_reads jsonb not null default '[]'::jsonb,
  skill_reads jsonb not null default '[]'::jsonb,
  risk_assessment jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  created_work_item_id uuid references public.growth_work_items(id) on delete set null,
  created_change_set_id uuid references public.growth_agent_change_sets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_artifacts_uniq
    unique (website_id, idempotency_key),
  constraint growth_agent_artifacts_type_chk
    check (artifact_type in (
      'content_article',
      'content_brief',
      'transcreation_payload',
      'safe_apply_patch',
      'quality_review',
      'outcome_analysis',
      'policy_recommendation',
      'provider_analysis'
    )),
  constraint growth_agent_artifacts_status_chk
    check (status in (
      'draft',
      'ready_for_validation',
      'validated',
      'rejected',
      'materialized',
      'superseded'
    )),
  constraint growth_agent_artifacts_json_chk
    check (
      jsonb_typeof(payload) = 'object'
      and jsonb_typeof(quality_review) = 'object'
      and jsonb_typeof(provider_evidence_reads) = 'array'
      and jsonb_typeof(memory_reads) = 'array'
      and jsonb_typeof(skill_reads) = 'array'
      and jsonb_typeof(risk_assessment) = 'object'
      and jsonb_typeof(validation_errors) = 'array'
    )
);

create index if not exists growth_chief_sessions_lookup_idx
  on public.growth_chief_of_staff_sessions(website_id, user_id, status, updated_at desc);
create index if not exists growth_chief_messages_session_idx
  on public.growth_chief_of_staff_messages(session_id, created_at desc);
create index if not exists growth_chief_actions_lookup_idx
  on public.growth_chief_of_staff_actions(website_id, action_class, status, updated_at desc);
create index if not exists growth_agent_instances_lookup_idx
  on public.growth_agent_instances(website_id, lane, status, routing_priority desc);
create index if not exists growth_agent_artifacts_lookup_idx
  on public.growth_agent_artifacts(website_id, artifact_type, status, updated_at desc);
create index if not exists growth_agent_artifacts_task_idx
  on public.growth_agent_artifacts(task_session_id, decision_id);

drop trigger if exists trg_growth_chief_sessions_touch
  on public.growth_chief_of_staff_sessions;
create trigger trg_growth_chief_sessions_touch
  before update on public.growth_chief_of_staff_sessions
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_chief_actions_touch
  on public.growth_chief_of_staff_actions;
create trigger trg_growth_chief_actions_touch
  before update on public.growth_chief_of_staff_actions
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_types_touch
  on public.growth_agent_types;
create trigger trg_growth_agent_types_touch
  before update on public.growth_agent_types
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_instances_touch
  on public.growth_agent_instances;
create trigger trg_growth_agent_instances_touch
  before update on public.growth_agent_instances
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_agent_artifacts_touch
  on public.growth_agent_artifacts;
create trigger trg_growth_agent_artifacts_touch
  before update on public.growth_agent_artifacts
  for each row execute function public.touch_growth_backlog_updated_at();

insert into public.growth_agent_types (
  agent_type,
  display_name,
  purpose,
  default_lane,
  can_generate_artifacts,
  can_request_live_execution,
  immutable_safety_bounds,
  default_toolset,
  default_config
)
values
  ('chief_of_staff', 'Growth Chief of Staff', 'Conversational operating partner and decision router.', 'orchestrator', true, true, '{"forbidden_actions":["paid_mutation","pricing","availability","reservations","payments","bulk_crm","outreach"],"mutation_boundary":"growth_os_executor"}', '["growth_context_read","action_router"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('growth_ceo_brain', 'Growth CEO Brain', 'Strategy and prioritization over profiles, outcomes and active work.', 'orchestrator', true, true, '{"mutation_boundary":"growth_os_executor"}', '["growth_context_read","wakeup_queue","decision_ledger"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('content_strategist', 'Content Strategist', 'Topic and opportunity analysis for organic growth.', 'content_creator', true, true, '{"requires_provider_evidence":true,"requires_anti_rework":true}', '["provider_profiles","growth_context_read"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('content_writer', 'Content Writer', 'Article and landing copy artifact generation.', 'content_creator', true, false, '{"direct_publish":false,"requires_editor_review":true}', '["provider_profiles","content_artifacts"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('content_editor', 'Content Editor', 'Editorial, brand, duplication and quality review.', 'content_curator', true, false, '{"quality_gate_required":true}', '["quality_review","provider_profiles"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('technical_remediation', 'Technical Remediation', 'Reversible technical SEO patch design.', 'technical_remediation', true, true, '{"requires_snapshot":true,"requires_rollback":true,"requires_smoke":true}', '["provider_profiles","safe_apply_artifacts"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('transcreation', 'Transcreation', 'Locale adaptation and merge payload design.', 'transcreation', true, true, '{"requires_locale_match":true,"requires_quality_review":true}', '["translation_memory","transcreation_artifacts"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('provider_analyst', 'Provider Analyst', 'Provider/profile interpretation and correlation.', 'orchestrator', true, false, '{"read_only":true}', '["provider_profiles","correlation"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('outcome_analyst', 'Outcome Analyst', 'Outcome evaluation and learning proposals.', 'orchestrator', true, false, '{"read_only":true,"learning_activation_requires_admin":true}', '["outcomes","learning"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}'),
  ('risk_guardian', 'Risk Guardian', 'Policy, caps, sensitive surfaces and rollback review.', 'content_curator', true, false, '{"can_block_any_action":true,"direct_mutation":false}', '["policies","risk_review"]', '{"model_provider":"openrouter","model_name":"openai/gpt-5"}')
on conflict (agent_type) do update
set
  display_name = excluded.display_name,
  purpose = excluded.purpose,
  default_lane = excluded.default_lane,
  can_generate_artifacts = excluded.can_generate_artifacts,
  can_request_live_execution = excluded.can_request_live_execution,
  immutable_safety_bounds = excluded.immutable_safety_bounds,
  default_toolset = excluded.default_toolset,
  default_config = excluded.default_config,
  updated_at = now();

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_chief_of_staff_sessions',
    'growth_chief_of_staff_messages',
    'growth_chief_of_staff_actions',
    'growth_agent_instances',
    'growth_agent_artifacts'
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

alter table public.growth_agent_types enable row level security;
drop policy if exists growth_agent_types_service_all on public.growth_agent_types;
create policy growth_agent_types_service_all
  on public.growth_agent_types
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_types_authenticated_read on public.growth_agent_types;
create policy growth_agent_types_authenticated_read
  on public.growth_agent_types
  for select
  to authenticated
  using (true);

grant select on public.growth_agent_types to authenticated;
grant all on public.growth_agent_types to service_role;

comment on table public.growth_chief_of_staff_sessions is
  'Tenant-scoped Growth Chief of Staff conversation sessions for Hermes/Growth OS hybrid operations.';
comment on table public.growth_chief_of_staff_messages is
  'Append-only Growth Chief of Staff messages with cited Growth OS refs and redaction metadata.';
comment on table public.growth_chief_of_staff_actions is
  'Audited conversational action router ledger. Chat actions enqueue or request work; they do not mutate production surfaces directly.';
comment on table public.growth_agent_types is
  'Global fixed Growth OS agent type registry with immutable safety bounds.';
comment on table public.growth_agent_instances is
  'Tenant-scoped editable Growth OS/Hermes agent instance configuration.';
comment on table public.growth_agent_artifacts is
  'Versioned artifacts produced by Hermes-compatible lane agents before Growth OS validation/execution.';
