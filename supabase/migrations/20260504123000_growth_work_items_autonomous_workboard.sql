-- Growth OS Autonomous Workboard v2
-- Generic work-item contract inspired by Hermes Kanban.
-- Existing backlog/runs/change sets remain compatible; this table is the
-- capability/policy-driven control surface for new autonomous work.

create table if not exists public.growth_work_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  parent_work_item_id uuid references public.growth_work_items(id) on delete set null,
  source_table text,
  source_id uuid,
  run_id uuid,
  change_set_id uuid references public.growth_agent_change_sets(id) on delete set null,
  lane text not null default 'orchestrator',
  agent_profile text not null default 'Orchestrator',
  title text not null,
  intent text not null,
  status text not null default 'triage',
  language text not null default 'es',
  capability_requirements text[] not null default array[]::text[],
  skill_hints text[] not null default array[]::text[],
  allowed_action_class text not null default 'prepare',
  blocked_action_classes text[] not null default array[
    'content_publish',
    'transcreation_merge',
    'paid_mutation',
    'experiment_activation',
    'outreach_send'
  ]::text[],
  risk_level text not null default 'medium',
  risk_score integer not null default 50,
  requires_human_review boolean not null default true,
  required_approval_role text not null default 'curator',
  operator_summary text,
  handoff_summary text,
  next_action text,
  progress_label text,
  evidence jsonb not null default '{}'::jsonb,
  source_refs text[] not null default array[]::text[],
  dependency_ids uuid[] not null default array[]::uuid[],
  idempotency_key text not null,
  created_by text not null default 'growth_runtime',
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_work_items_idempotency_uniq
    unique (website_id, idempotency_key),
  constraint growth_work_items_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_work_items_status_chk
    check (status in (
      'triage',
      'ready',
      'running',
      'blocked',
      'review_needed',
      'auto_completed',
      'published_applied',
      'archived'
    )),
  constraint growth_work_items_action_class_chk
    check (allowed_action_class in (
      'observe',
      'prepare',
      'route',
      'split',
      'follow_up_backlog_create',
      'research_packet',
      'safe_apply',
      'content_publish',
      'transcreation_merge',
      'paid_mutation',
      'experiment_activation',
      'outreach_send'
    )),
  constraint growth_work_items_risk_level_chk
    check (risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint growth_work_items_risk_score_chk
    check (risk_score >= 0 and risk_score <= 100)
);

create index if not exists growth_work_items_tenant_status_idx
  on public.growth_work_items(account_id, website_id, status, lane);
create index if not exists growth_work_items_parent_idx
  on public.growth_work_items(website_id, parent_work_item_id);
create index if not exists growth_work_items_run_idx
  on public.growth_work_items(website_id, run_id);
create index if not exists growth_work_items_change_set_idx
  on public.growth_work_items(website_id, change_set_id);

drop trigger if exists trg_growth_work_items_touch on public.growth_work_items;
create trigger trg_growth_work_items_touch
  before update on public.growth_work_items
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_work_items enable row level security;

drop policy if exists growth_work_items_service_all on public.growth_work_items;
create policy growth_work_items_service_all
  on public.growth_work_items
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_work_items_account_read on public.growth_work_items;
create policy growth_work_items_account_read
  on public.growth_work_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_work_items.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

grant select on public.growth_work_items to authenticated;
grant all on public.growth_work_items to service_role;

comment on table public.growth_work_items is
  'Generic Growth OS autonomous work-item contract. Task/change types are reporting labels; execution is driven by capabilities, policy, evidence and risk.';
