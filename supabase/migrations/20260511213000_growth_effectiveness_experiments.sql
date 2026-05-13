-- ============================================================================
-- Growth OS Effectiveness Experiments
-- ============================================================================
-- Purpose:
--   Measure Growth OS + Hermes against a human/Codex baseline and the
--   deterministic Growth OS runtime using the same live-gated executor.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Experiment writes are service_role/admin-server only.
--   - Authenticated reads are tenant scoped through user_roles.
--   - No public website mutation is introduced here.
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

create table if not exists public.growth_effectiveness_experiments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  experiment_key text not null,
  title text not null,
  objective text not null,
  status text not null default 'planned',
  baseline_actor text not null default 'baseline_human_codex',
  source_groups jsonb not null default '["baseline_human_codex","growth_os_deterministic","growth_os_hermes_isolated"]'::jsonb,
  lane_targets jsonb not null default '{}'::jsonb,
  success_criteria jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  initial_scorecard jsonb not null default '{}'::jsonb,
  final_scorecard jsonb not null default '{}'::jsonb,
  created_by uuid,
  started_at timestamptz,
  initial_verdict_at timestamptz,
  final_verdict_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_effectiveness_experiments_uniq
    unique (website_id, experiment_key),
  constraint growth_effectiveness_experiments_status_chk
    check (status in (
      'planned',
      'running',
      'initial_verdict',
      'final_verdict',
      'cancelled'
    )),
  constraint growth_effectiveness_experiments_baseline_chk
    check (baseline_actor in (
      'baseline_human_codex',
      'growth_os_deterministic',
      'growth_os_hermes_isolated'
    )),
  constraint growth_effectiveness_experiments_json_chk
    check (
      jsonb_typeof(source_groups) = 'array'
      and jsonb_typeof(lane_targets) = 'object'
      and jsonb_typeof(success_criteria) = 'object'
      and jsonb_typeof(evidence_snapshot) = 'object'
      and jsonb_typeof(initial_scorecard) = 'object'
      and jsonb_typeof(final_scorecard) = 'object'
    )
);

create table if not exists public.growth_effectiveness_observations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.growth_effectiveness_experiments(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  source_group text not null,
  lane text not null,
  status text not null default 'draft',
  idempotency_key text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  human_packet jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  timing jsonb not null default '{}'::jsonb,
  cost jsonb not null default '{}'::jsonb,
  quality_verdict jsonb not null default '{}'::jsonb,
  safety_verdict jsonb not null default '{}'::jsonb,
  decision_id uuid references public.growth_orchestrator_decisions(id) on delete set null,
  artifact_id uuid references public.growth_agent_artifacts(id) on delete set null,
  candidate_id uuid references public.growth_opportunity_candidates(id) on delete set null,
  work_item_id uuid references public.growth_work_items(id) on delete set null,
  publication_job_id uuid references public.growth_publication_jobs(id) on delete set null,
  outcome_id uuid references public.growth_work_item_outcomes(id) on delete set null,
  profile_run_ids uuid[] not null default '{}'::uuid[],
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_effectiveness_observations_uniq
    unique (website_id, experiment_id, idempotency_key),
  constraint growth_effectiveness_observations_group_chk
    check (source_group in (
      'baseline_human_codex',
      'growth_os_deterministic',
      'growth_os_hermes_isolated'
    )),
  constraint growth_effectiveness_observations_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_effectiveness_observations_status_chk
    check (status in (
      'draft',
      'candidate_created',
      'work_item_created',
      'executed',
      'measuring',
      'evaluated',
      'rejected',
      'blocked'
    )),
  constraint growth_effectiveness_observations_json_chk
    check (
      jsonb_typeof(evidence_snapshot) = 'object'
      and jsonb_typeof(human_packet) = 'object'
      and jsonb_typeof(metrics) = 'object'
      and jsonb_typeof(timing) = 'object'
      and jsonb_typeof(cost) = 'object'
      and jsonb_typeof(quality_verdict) = 'object'
      and jsonb_typeof(safety_verdict) = 'object'
    )
);

create index if not exists growth_effectiveness_experiments_lookup_idx
  on public.growth_effectiveness_experiments(website_id, status, updated_at desc);

create index if not exists growth_effectiveness_observations_lookup_idx
  on public.growth_effectiveness_observations(
    website_id,
    experiment_id,
    source_group,
    lane,
    status,
    updated_at desc
  );

create index if not exists growth_effectiveness_observations_lineage_idx
  on public.growth_effectiveness_observations(
    website_id,
    candidate_id,
    work_item_id,
    publication_job_id,
    outcome_id
  );

drop trigger if exists trg_growth_effectiveness_experiments_touch
  on public.growth_effectiveness_experiments;
create trigger trg_growth_effectiveness_experiments_touch
  before update on public.growth_effectiveness_experiments
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_effectiveness_observations_touch
  on public.growth_effectiveness_observations;
create trigger trg_growth_effectiveness_observations_touch
  before update on public.growth_effectiveness_observations
  for each row execute function public.touch_growth_backlog_updated_at();

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_effectiveness_experiments',
    'growth_effectiveness_observations'
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

comment on table public.growth_effectiveness_experiments is
  'Benchmark experiments comparing human/Codex baseline, deterministic Growth OS and Hermes-isolated Growth OS under the same live-gated executor.';

comment on table public.growth_effectiveness_observations is
  'Per-lane benchmark observations linked to artifacts, candidates, work items, publication jobs and outcomes for effectiveness scoring.';
