-- ============================================================================
-- Growth OS Profile Freshness Flow (#431 / #310)
-- ============================================================================
-- Purpose:
--   Add the Sprint 1 data flow for Paperclip-style Growth OS:
--   signal facts -> versioned profiles -> opportunity candidates -> work items.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Service-role writes only for runtime/profile refresh jobs.
--   - Authenticated users get tenant-scoped reads via user_roles membership.
--   - Backlog promotion stores profile snapshots in growth_work_items.evidence.
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

create table if not exists public.growth_signal_facts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  source text not null,
  signal_type text not null,
  entity_table text,
  entity_id uuid,
  entity_path text,
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confidence numeric(5,4) not null default 0.7,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint growth_signal_facts_idempotency_uniq
    unique (website_id, idempotency_key),
  constraint growth_signal_facts_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_signal_facts_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_signal_facts_confidence_chk
    check (confidence >= 0 and confidence <= 1),
  constraint growth_signal_facts_payload_chk
    check (jsonb_typeof(payload) = 'object' and payload <> '{}'::jsonb),
  constraint growth_signal_facts_expiry_chk
    check (expires_at > observed_at)
);

create table if not exists public.growth_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  profile_type text not null,
  subject_table text,
  subject_id uuid,
  subject_key text,
  source text not null default 'growth_profile_refresh',
  confidence numeric(5,4) not null default 0.7,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  freshness_ttl_hours integer not null,
  payload jsonb not null,
  source_signal_fact_ids uuid[] not null default '{}'::uuid[],
  policy_version text not null default 'profile-freshness-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_profiles_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_profiles_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_profiles_type_chk
    check (profile_type in (
      'business',
      'buyer',
      'seo_market',
      'competitor',
      'page_product',
      'agent_lane',
      'risk_policy'
    )),
  constraint growth_profiles_confidence_chk
    check (confidence >= 0 and confidence <= 1),
  constraint growth_profiles_ttl_chk
    check (freshness_ttl_hours > 0),
  constraint growth_profiles_window_chk
    check (valid_until > valid_from),
  constraint growth_profiles_payload_chk
    check (jsonb_typeof(payload) = 'object' and payload <> '{}'::jsonb)
);

create unique index if not exists growth_profiles_scope_uniq
  on public.growth_profiles(
    website_id,
    locale,
    market,
    profile_type,
    coalesce(subject_table, ''),
    coalesce(subject_id::text, ''),
    coalesce(subject_key, '')
  );

create table if not exists public.growth_opportunity_candidates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  locale text not null default 'es-CO',
  market text not null default 'CO',
  candidate_type text not null,
  lane text not null,
  allowed_action_class text not null,
  title text not null,
  summary text not null,
  impact_score integer not null default 0,
  confidence numeric(5,4) not null default 0.5,
  urgency_score integer not null default 0,
  cost_score integer not null default 50,
  risk_score integer not null default 50,
  total_score integer not null default 0,
  status text not null default 'candidate',
  blocking_reason text,
  required_profile_types text[] not null default '{}'::text[],
  profile_snapshot jsonb not null default '{}'::jsonb,
  source_signal_fact_ids uuid[] not null default '{}'::uuid[],
  evidence jsonb not null default '{}'::jsonb,
  success_metric text,
  evaluation_window text,
  idempotency_key text not null,
  promoted_work_item_id uuid references public.growth_work_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_opportunity_candidates_idempotency_uniq
    unique (website_id, idempotency_key),
  constraint growth_opportunity_candidates_locale_chk
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint growth_opportunity_candidates_market_chk
    check (market in ('CO', 'MX', 'US', 'CA', 'EU', 'OTHER')),
  constraint growth_opportunity_candidates_lane_chk
    check (lane in (
      'orchestrator',
      'technical_remediation',
      'transcreation',
      'content_creator',
      'content_curator'
    )),
  constraint growth_opportunity_candidates_action_chk
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
  constraint growth_opportunity_candidates_type_chk
    check (candidate_type in (
      'keyword_gap',
      'page_decay',
      'missing_translation',
      'technical_seo_issue',
      'funnel_leak',
      'content_refresh',
      'internal_linking_gap'
    )),
  constraint growth_opportunity_candidates_status_chk
    check (status in (
      'candidate',
      'ready_for_backlog',
      'promoted',
      'blocked',
      'rejected'
    )),
  constraint growth_opportunity_candidates_score_chk
    check (
      impact_score between 0 and 100
      and urgency_score between 0 and 100
      and cost_score between 0 and 100
      and risk_score between 0 and 100
      and total_score between 0 and 100
      and confidence >= 0
      and confidence <= 1
    ),
  constraint growth_opportunity_candidates_profile_snapshot_chk
    check (jsonb_typeof(profile_snapshot) = 'object'),
  constraint growth_opportunity_candidates_evidence_chk
    check (jsonb_typeof(evidence) = 'object' and evidence <> '{}'::jsonb)
);

create index if not exists growth_signal_facts_lookup_idx
  on public.growth_signal_facts(website_id, source, signal_type, observed_at desc);

create index if not exists growth_signal_facts_expiry_idx
  on public.growth_signal_facts(website_id, expires_at);

create index if not exists growth_profiles_freshness_idx
  on public.growth_profiles(website_id, profile_type, valid_until, confidence);

create index if not exists growth_profiles_subject_idx
  on public.growth_profiles(website_id, subject_table, subject_id);

create index if not exists growth_opportunity_candidates_status_idx
  on public.growth_opportunity_candidates(
    website_id,
    status,
    total_score desc,
    updated_at desc
  );

create index if not exists growth_opportunity_candidates_lane_idx
  on public.growth_opportunity_candidates(
    website_id,
    lane,
    allowed_action_class,
    status
  );

drop trigger if exists trg_growth_profiles_touch
  on public.growth_profiles;
create trigger trg_growth_profiles_touch
  before update on public.growth_profiles
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_opportunity_candidates_touch
  on public.growth_opportunity_candidates;
create trigger trg_growth_opportunity_candidates_touch
  before update on public.growth_opportunity_candidates
  for each row execute function public.touch_growth_backlog_updated_at();

do $$
declare
  tbl text;
  rec record;
begin
  foreach tbl in array array[
    'growth_signal_facts',
    'growth_profiles',
    'growth_opportunity_candidates'
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

comment on table public.growth_signal_facts is
  'Versioned Growth OS signal facts from GSC, GA4, DataForSEO, CRM, audits and inventory. Facts are not backlog until promoted through opportunity scoring.';
comment on table public.growth_profiles is
  'Versioned Growth OS profiles with freshness windows and confidence. Runtime must snapshot required profiles before backlog promotion or publication.';
comment on table public.growth_opportunity_candidates is
  'Scored Growth OS opportunities derived from signal facts and profiles. Candidates promote to growth_work_items only when freshness and dedupe gates pass.';
