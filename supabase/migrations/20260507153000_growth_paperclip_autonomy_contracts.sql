-- ============================================================================
-- Growth OS Paperclip autonomy contracts (#431 / #432)
-- ============================================================================
-- Purpose:
--   Add the data contract required for a Paperclip-style Growth OS cockpit:
--   policy/caps, autonomous publication/application jobs and measurable
--   outcomes. This is the foundation for aggressive organic + reversible
--   technical autonomy for ColombiaTours.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Service-role writes only for runtime/publisher mutations.
--   - Authenticated users get tenant-scoped reads via user_roles membership.
--   - DB contract refuses paid publication jobs in v1.
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

create table if not exists public.growth_autonomy_policies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  lane text not null,
  action_class text not null,
  enabled boolean not null default false,
  dry_run_only boolean not null default true,
  kill_switch_enabled boolean not null default false,
  paused_reason text,
  max_risk_level text not null default 'medium',
  max_risk_score integer not null default 60,
  daily_cap integer not null default 0,
  weekly_cap integer not null default 0,
  required_checks text[] not null default array[
    'before_snapshot',
    'rollback_payload',
    'smoke_check',
    'baseline',
    'success_metric',
    'evaluation_date'
  ]::text[],
  policy_version text not null default 'paperclip-v1',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_autonomy_policies_scope_uniq
    unique (account_id, website_id, locale, market, lane, action_class),
  constraint growth_autonomy_policies_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_autonomy_policies_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_autonomy_policies_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_autonomy_policies_action_class_chk
    check (action_class in (
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
  constraint growth_autonomy_policies_max_risk_level_chk
    check (max_risk_level in ('low', 'medium', 'high')),
  constraint growth_autonomy_policies_max_risk_score_chk
    check (max_risk_score >= 0 and max_risk_score <= 100),
  constraint growth_autonomy_policies_caps_chk
    check (daily_cap >= 0 and weekly_cap >= 0 and weekly_cap >= daily_cap),
  constraint growth_autonomy_policies_checks_chk
    check (
      required_checks <@ array[
        'before_snapshot',
        'rollback_payload',
        'smoke_check',
        'baseline',
        'success_metric',
        'evaluation_date',
        'no_paid_mutation',
        'tenant_allowlist',
        'technical_reversibility'
      ]::text[]
    )
);

create table if not exists public.growth_publication_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  work_item_id uuid not null references public.growth_work_items(id) on delete cascade,
  change_set_id uuid not null references public.growth_agent_change_sets(id) on delete restrict,
  policy_id uuid references public.growth_autonomy_policies(id) on delete set null,
  lane text not null,
  action_class text not null,
  job_mode text not null default 'dry_run',
  status text not null default 'queued',
  target_table text not null,
  target_id uuid,
  target_path text,
  idempotency_key text not null,
  before_snapshot jsonb not null,
  after_payload jsonb not null,
  smoke_result jsonb not null default '{}'::jsonb,
  rollback_payload jsonb not null,
  baseline jsonb not null,
  success_metric text not null,
  evaluation_date date not null,
  evidence jsonb not null default '{}'::jsonb,
  created_by text not null default 'growth_runtime',
  applied_at timestamptz,
  smoke_checked_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_publication_jobs_idempotency_uniq
    unique (website_id, idempotency_key),
  constraint growth_publication_jobs_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_publication_jobs_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_publication_jobs_lane_chk
    check (lane in (
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_publication_jobs_action_class_chk
    check (action_class in (
      'safe_apply',
      'content_publish',
      'transcreation_merge'
    )),
  constraint growth_publication_jobs_mode_chk
    check (job_mode in ('dry_run', 'live')),
  constraint growth_publication_jobs_status_chk
    check (status in (
      'queued',
      'snapshot_created',
      'dry_run_ready',
      'applying',
      'applied',
      'smoke_passed',
      'smoke_failed',
      'rolled_back',
      'blocked',
      'cancelled'
    )),
  constraint growth_publication_jobs_target_table_chk
    check (target_table in (
      'website_blog_posts',
      'website_pages',
      'website_sections',
      'seo_localized_variants',
      'seo_transcreation_jobs',
      'product_seo_overrides'
    )),
  constraint growth_publication_jobs_snapshot_chk
    check (
      jsonb_typeof(before_snapshot) = 'object'
      and before_snapshot <> '{}'::jsonb
      and jsonb_typeof(after_payload) = 'object'
      and after_payload <> '{}'::jsonb
      and jsonb_typeof(rollback_payload) = 'object'
      and rollback_payload <> '{}'::jsonb
      and jsonb_typeof(baseline) = 'object'
      and baseline <> '{}'::jsonb
      and jsonb_typeof(smoke_result) = 'object'
    ),
  constraint growth_publication_jobs_metric_chk
    check (char_length(btrim(success_metric)) > 0),
  constraint growth_publication_jobs_applied_at_chk
    check (
      applied_at is null
      or status in ('applied', 'smoke_passed', 'smoke_failed', 'rolled_back')
    ),
  constraint growth_publication_jobs_smoke_checked_at_chk
    check (
      smoke_checked_at is null
      or status in ('smoke_passed', 'smoke_failed', 'rolled_back')
    ),
  constraint growth_publication_jobs_rolled_back_at_chk
    check (rolled_back_at is null or status = 'rolled_back')
);

create table if not exists public.growth_work_item_outcomes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  work_item_id uuid not null references public.growth_work_items(id) on delete cascade,
  publication_job_id uuid not null references public.growth_publication_jobs(id) on delete cascade,
  change_set_id uuid not null references public.growth_agent_change_sets(id) on delete restrict,
  outcome_type text not null,
  status text not null default 'scheduled',
  success_metric text not null,
  baseline jsonb not null,
  current_result jsonb not null default '{}'::jsonb,
  evaluation_window text not null,
  evaluation_date date not null,
  funnel_attribution_status text not null default 'pending',
  attribution_evidence jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_work_item_outcomes_metric_window_uniq
    unique (work_item_id, publication_job_id, success_metric, evaluation_date),
  constraint growth_work_item_outcomes_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_work_item_outcomes_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_work_item_outcomes_type_chk
    check (outcome_type in ('seo_content', 'technical_seo', 'crm_funnel')),
  constraint growth_work_item_outcomes_status_chk
    check (status in (
      'scheduled',
      'measuring',
      'evaluated',
      'inconclusive',
      'won',
      'lost'
    )),
  constraint growth_work_item_outcomes_window_chk
    check (evaluation_window in (
      'immediate',
      'day_1',
      'day_7',
      'day_21',
      'day_28',
      'day_30',
      'day_45'
    )),
  constraint growth_work_item_outcomes_attribution_chk
    check (funnel_attribution_status in (
      'not_applicable',
      'pending',
      'partial',
      'attributed',
      'unattributed'
    )),
  constraint growth_work_item_outcomes_baseline_chk
    check (
      char_length(btrim(success_metric)) > 0
      and jsonb_typeof(baseline) = 'object'
      and baseline <> '{}'::jsonb
      and jsonb_typeof(current_result) = 'object'
      and jsonb_typeof(attribution_evidence) = 'object'
    ),
  constraint growth_work_item_outcomes_evaluated_at_chk
    check (
      evaluated_at is null
      or status in ('evaluated', 'inconclusive', 'won', 'lost')
    )
);

create index if not exists growth_autonomy_policies_tenant_lane_idx
  on public.growth_autonomy_policies(
    account_id,
    website_id,
    lane,
    action_class,
    enabled
  );

create index if not exists growth_autonomy_policies_kill_switch_idx
  on public.growth_autonomy_policies(website_id, kill_switch_enabled)
  where kill_switch_enabled = true;

create index if not exists growth_publication_jobs_work_item_idx
  on public.growth_publication_jobs(website_id, work_item_id, created_at desc);

create index if not exists growth_publication_jobs_change_set_idx
  on public.growth_publication_jobs(website_id, change_set_id, created_at desc);

create index if not exists growth_publication_jobs_status_idx
  on public.growth_publication_jobs(website_id, status, action_class, created_at desc);

create index if not exists growth_publication_jobs_target_idx
  on public.growth_publication_jobs(website_id, target_table, target_id);

create index if not exists growth_work_item_outcomes_work_item_idx
  on public.growth_work_item_outcomes(website_id, work_item_id, evaluation_date);

create index if not exists growth_work_item_outcomes_publication_job_idx
  on public.growth_work_item_outcomes(website_id, publication_job_id);

create index if not exists growth_work_item_outcomes_status_idx
  on public.growth_work_item_outcomes(website_id, status, evaluation_date);

drop trigger if exists trg_growth_autonomy_policies_touch
  on public.growth_autonomy_policies;
create trigger trg_growth_autonomy_policies_touch
  before update on public.growth_autonomy_policies
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_publication_jobs_touch
  on public.growth_publication_jobs;
create trigger trg_growth_publication_jobs_touch
  before update on public.growth_publication_jobs
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_work_item_outcomes_touch
  on public.growth_work_item_outcomes;
create trigger trg_growth_work_item_outcomes_touch
  before update on public.growth_work_item_outcomes
  for each row execute function public.touch_growth_backlog_updated_at();

-- Normalize Growth runtime RLS to user_roles tenant membership. This includes
-- the three new Paperclip tables plus the Growth runtime tables this feature
-- reads or links through. Runtime/publisher writes remain service-role only.
do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_autonomy_policies',
    'growth_publication_jobs',
    'growth_work_item_outcomes',
    'growth_work_items',
    'growth_agent_change_sets',
    'growth_agent_memories',
    'growth_agent_skills',
    'growth_agent_tool_calls',
    'growth_agent_replay_cases',
    'growth_agent_run_metrics',
    'growth_agent_definitions',
    'growth_agent_runs',
    'growth_agent_run_events'
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

comment on table public.growth_autonomy_policies is
  'Growth OS Paperclip autonomy policy by tenant, website, lane and action class. Controls caps, max risk, required checks and kill switch.';
comment on table public.growth_publication_jobs is
  'Growth OS autonomous publication/application ledger. Each row snapshots target state, stores after payload, smoke result, rollback payload and metric metadata.';
comment on table public.growth_work_item_outcomes is
  'Growth OS impact ledger linking autonomous work items and publication jobs to success metrics, baselines and evaluation windows.';
