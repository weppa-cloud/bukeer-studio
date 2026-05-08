-- ============================================================================
-- Growth OS Runtime Cycles — Epic #441 backend/runtime slice
-- ============================================================================
-- Purpose:
--   Add a tenant-scoped cycle ledger for production Growth OS runtime passes.
--   The cycle row is the orchestration envelope for profile refresh,
--   candidate discovery, backlog promotion, dry-run execution bridge hooks,
--   outcome evaluation and learning summaries.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Service-role writes only.
--   - Authenticated users get tenant-scoped reads through user_roles.
--   - Execution remains dry-run/ledger-only unless future policy explicitly
--     enables live publication/application elsewhere.
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

create table if not exists public.growth_runtime_cycles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  cycle_key text not null,
  cycle_window text,
  environment text not null default 'production',
  git_sha text,
  status text not null default 'started',
  trigger_source text not null default 'manual',
  runtime_version text not null default 'growth-runtime-v1',
  dry_run boolean not null default true,
  options jsonb not null default '{}'::jsonb,
  stage_results jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  error_class text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_runtime_cycles_key_uniq
    unique (website_id, cycle_key),
  constraint growth_runtime_cycles_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_runtime_cycles_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_runtime_cycles_environment_chk
    check (environment in ('local', 'qa', 'staging', 'production')),
  constraint growth_runtime_cycles_status_chk
    check (status in ('started', 'running', 'completed', 'completed_with_blocks', 'failed', 'cancelled')),
  constraint growth_runtime_cycles_trigger_chk
    check (trigger_source in ('manual', 'scheduled', 'webhook', 'test')),
  constraint growth_runtime_cycles_json_chk
    check (
      jsonb_typeof(options) = 'object'
      and jsonb_typeof(stage_results) = 'object'
      and jsonb_typeof(summary) = 'object'
    ),
  constraint growth_runtime_cycles_finished_at_chk
    check (finished_at is null or finished_at >= started_at),
  constraint growth_runtime_cycles_completed_chk
    check (
      status not in ('completed', 'completed_with_blocks')
      or (finished_at is not null and error_class is null and error_message is null)
    )
);

create index if not exists growth_runtime_cycles_tenant_status_idx
  on public.growth_runtime_cycles(account_id, website_id, status, started_at desc);

create index if not exists growth_runtime_cycles_started_idx
  on public.growth_runtime_cycles(website_id, started_at desc);

create index if not exists growth_runtime_cycles_running_idx
  on public.growth_runtime_cycles(website_id, status, updated_at desc)
  where status in ('started', 'running');

drop trigger if exists trg_growth_runtime_cycles_touch
  on public.growth_runtime_cycles;
create trigger trg_growth_runtime_cycles_touch
  before update on public.growth_runtime_cycles
  for each row execute function public.touch_growth_backlog_updated_at();

-- Make profile upserts practical from TypeScript while preserving the existing
-- expression unique index. Postgres 15 NULLS NOT DISTINCT lets Supabase target
-- the natural column list in onConflict.
create unique index if not exists growth_profiles_scope_nulls_not_distinct_uniq
  on public.growth_profiles(
    website_id,
    locale,
    market,
    profile_type,
    subject_table,
    subject_id,
    subject_key
  )
  nulls not distinct;

create index if not exists growth_signal_facts_runtime_idx
  on public.growth_signal_facts(
    account_id,
    website_id,
    expires_at,
    confidence desc,
    observed_at desc
  );

create index if not exists growth_opportunity_candidates_runtime_idx
  on public.growth_opportunity_candidates(
    account_id,
    website_id,
    status,
    total_score desc,
    updated_at desc
  );

create index if not exists growth_work_items_runtime_claim_idx
  on public.growth_work_items(
    account_id,
    website_id,
    status,
    lane,
    updated_at
  );

create index if not exists growth_work_item_outcomes_runtime_due_idx
  on public.growth_work_item_outcomes(
    account_id,
    website_id,
    status,
    evaluation_date
  )
  where status in ('scheduled', 'measuring');

alter table public.growth_work_item_outcomes
  drop constraint if exists growth_work_item_outcomes_status_chk;
alter table public.growth_work_item_outcomes
  add constraint growth_work_item_outcomes_status_chk
  check (status in (
    'scheduled',
    'measuring',
    'evaluated',
    'inconclusive',
    'won',
    'lost',
    'scale',
    'stop'
  ));

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_runtime_cycles',
    'growth_signal_facts',
    'growth_profiles',
    'growth_opportunity_candidates',
    'growth_work_items',
    'growth_agent_change_sets',
    'growth_agent_memories',
    'growth_agent_skills',
    'growth_agent_tool_calls',
    'growth_agent_replay_cases',
    'growth_agent_run_metrics',
    'growth_agent_definitions',
    'growth_agent_runs',
    'growth_agent_run_events',
    'growth_publication_jobs',
    'growth_work_item_outcomes',
    'growth_autonomy_policies'
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

comment on table public.growth_runtime_cycles is
  'Growth OS production-cycle ledger. One row per runtime pass covering profile refresh, candidate discovery, work item promotion, dry-run execution bridge, outcome evaluation and learning summary.';
