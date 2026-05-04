-- ============================================================================
-- Growth OS Agent Change Sets — Work Center Apply Layer
-- ============================================================================
-- Purpose:
--   Add the reviewable work-product table required by
--   SPEC_GROWTH_OS_AGENT_CHANGE_SETS_WORK_CENTER. Every runtime run should
--   emit at least one change set before a human approves, rejects, requests
--   changes or applies a safe non-public draft.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Server/service role writes only.
--   - Authenticated users may read tenant-scoped rows through existing Growth
--     console access paths.
--   - Publishing, transcreation merge, paid mutation and experiment activation
--     remain separately gated.
-- ============================================================================

create table if not exists public.growth_agent_change_sets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  run_id uuid not null references public.growth_agent_runs(run_id) on delete cascade,
  source_table text,
  source_id uuid,
  agent_lane text not null,
  change_type text not null,
  status text not null default 'proposed',
  title text not null,
  summary text not null,
  dedupe_key text not null,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  preview_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  risk_level text not null default 'medium',
  requires_human_review boolean not null default true,
  required_approval_role text not null default 'curator',
  parent_change_set_id uuid references public.growth_agent_change_sets(id) on delete set null,
  created_backlog_item_id uuid,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  applied_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_agent_change_sets_dedupe_uniq
    unique (account_id, website_id, run_id, change_type, dedupe_key),
  constraint growth_agent_change_sets_lane_chk
    check (agent_lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_agent_change_sets_status_chk
    check (status in (
      'proposed',
      'draft_created',
      'needs_review',
      'changes_requested',
      'approved',
      'applied',
      'published',
      'rejected',
      'blocked'
    )),
  constraint growth_agent_change_sets_change_type_chk
    check (change_type in (
      'backlog_route_update',
      'backlog_task_split',
      'follow_up_backlog_create',
      'council_packet_prepare',
      'governance_block',
      'growth_cycle_summary',
      'seo_title_meta_draft',
      'seo_indexing_draft',
      'route_mapping_draft',
      'internal_link_draft',
      'performance_remediation_task',
      'technical_smoke_result',
      'blog_draft_create',
      'content_update_draft',
      'content_brief_create',
      'faq_schema_draft',
      'landing_section_copy_draft',
      'content_evidence_request',
      'transcreation_draft_create',
      'transcreation_update_draft',
      'locale_seo_review',
      'translation_quality_fix_draft',
      'locale_serp_packet',
      'transcreation_merge_readiness',
      'content_quality_review',
      'creator_revision_request',
      'publish_packet_prepare',
      'experiment_candidate_prepare',
      'experiment_readout_prepare',
      'learning_candidate_review',
      'tool_policy_verdict',
      'blocked_tool_call_evidence',
      'replay_case_candidate',
      'memory_candidate',
      'skill_update_candidate',
      'research_packet'
    )),
  constraint growth_agent_change_sets_risk_level_chk
    check (risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint growth_agent_change_sets_approval_role_chk
    check (required_approval_role in (
      'growth_operator',
      'curator',
      'council_admin',
      'technical_owner'
    )),
  constraint growth_agent_change_sets_published_at_chk
    check (published_at is null or status = 'published'),
  constraint growth_agent_change_sets_applied_at_chk
    check (applied_at is null or status in ('applied', 'published')),
  constraint growth_agent_change_sets_human_review_chk
    check (
      requires_human_review = true
      or change_type not in (
        'blog_draft_create',
        'content_update_draft',
        'content_brief_create',
        'faq_schema_draft',
        'landing_section_copy_draft',
        'transcreation_draft_create',
        'transcreation_update_draft',
        'translation_quality_fix_draft',
        'transcreation_merge_readiness',
        'publish_packet_prepare',
        'experiment_candidate_prepare'
      )
    )
);

create index if not exists growth_agent_change_sets_tenant_status_idx
  on public.growth_agent_change_sets(account_id, website_id, status, agent_lane);
create index if not exists growth_agent_change_sets_run_idx
  on public.growth_agent_change_sets(run_id, created_at);
create index if not exists growth_agent_change_sets_source_idx
  on public.growth_agent_change_sets(source_table, source_id);
create index if not exists growth_agent_change_sets_parent_idx
  on public.growth_agent_change_sets(parent_change_set_id);

drop trigger if exists trg_growth_agent_change_sets_touch on public.growth_agent_change_sets;
create trigger trg_growth_agent_change_sets_touch
  before update on public.growth_agent_change_sets
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_agent_change_sets enable row level security;

drop policy if exists growth_agent_change_sets_service_all on public.growth_agent_change_sets;
create policy growth_agent_change_sets_service_all
  on public.growth_agent_change_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_agent_change_sets_account_read on public.growth_agent_change_sets;
create policy growth_agent_change_sets_account_read
  on public.growth_agent_change_sets
  for select
  to authenticated
  using (account_id = auth.uid());

grant select on public.growth_agent_change_sets to authenticated;
grant all on public.growth_agent_change_sets to service_role;

comment on table public.growth_agent_change_sets is
  'Growth OS reviewable work products emitted by agent runs. Publishing, paid mutation, transcreation merge and experiment activation remain human/Council gated.';
