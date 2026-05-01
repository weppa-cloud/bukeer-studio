-- ============================================================================
-- Growth OS Content Tasks + Review Ledger (#310 / #337)
-- ============================================================================
-- Purpose:
--   Extend the Growth OS operational SSOT after the unified backlog ledger:
--   reviewed backlog items -> content briefs/tasks -> AI/human review evidence.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Does not change existing backlog or experiment status semantics.
--   - Scripts may backfill from growth_backlog_items.evidence while Studio UI
--     migrates to the durable tables.
--   - RLS follows the existing growth ledger convention:
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

create table if not exists public.growth_content_briefs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  backlog_item_id uuid not null references public.growth_backlog_items(id) on delete cascade,
  brief_key text not null,
  version integer not null default 1,
  title text not null,
  brief_type text not null,
  source_locale text,
  target_locale text,
  locale_gate_required boolean not null default false,
  status text not null default 'generated',
  artifact_path text,
  objective text,
  hypothesis text,
  baseline text,
  success_metric text,
  evaluation_date date,
  required_checks text[] not null default array[]::text[],
  outline jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_content_briefs_website_key_uniq
    unique (website_id, brief_key),
  constraint growth_content_briefs_version_chk
    check (version > 0),
  constraint growth_content_briefs_status_chk
    check (status in (
      'generated', 'in_review', 'approved',
      'changes_requested', 'rejected', 'superseded'
    ))
);

create table if not exists public.growth_content_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  backlog_item_id uuid not null references public.growth_backlog_items(id) on delete cascade,
  brief_id uuid references public.growth_content_briefs(id) on delete set null,
  task_key text not null,
  task_type text not null,
  title text not null,
  entity_key text not null,
  target_locale text,
  locale_gate_required boolean not null default false,
  status text not null default 'ready_for_seo_qa',
  owner_role text,
  owner_issue text,
  next_action text not null,
  qa_checks text[] not null default array[]::text[],
  artifact_path text,
  due_date date,
  completed_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_content_tasks_website_key_uniq
    unique (website_id, task_key),
  constraint growth_content_tasks_status_chk
    check (status in (
      'ready_for_seo_qa', 'locale_qa_required', 'drafting',
      'ready_to_apply', 'applied', 'published',
      'measuring', 'blocked', 'done', 'rejected'
    ))
);

create table if not exists public.growth_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  backlog_item_id uuid references public.growth_backlog_items(id) on delete cascade,
  candidate_id uuid references public.growth_backlog_candidates(id) on delete set null,
  brief_id uuid references public.growth_content_briefs(id) on delete cascade,
  task_id uuid references public.growth_content_tasks(id) on delete cascade,
  review_key text not null,
  model text not null,
  prompt_version text,
  config_version text,
  confidence_score numeric not null default 0,
  recommendation text not null,
  risks text[] not null default array[]::text[],
  status text not null default 'watch',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_ai_reviews_website_key_uniq
    unique (website_id, review_key),
  constraint growth_ai_reviews_confidence_chk
    check (confidence_score >= 0 and confidence_score <= 1),
  constraint growth_ai_reviews_status_chk
    check (status in ('pass', 'watch', 'blocked', 'rejected'))
);

create table if not exists public.growth_human_reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  website_id uuid not null,
  backlog_item_id uuid references public.growth_backlog_items(id) on delete cascade,
  experiment_id uuid references public.growth_experiments(id) on delete cascade,
  brief_id uuid references public.growth_content_briefs(id) on delete cascade,
  task_id uuid references public.growth_content_tasks(id) on delete cascade,
  review_key text not null,
  reviewer_role text not null,
  reviewer_name text,
  decision text not null,
  rationale text,
  status text not null default 'recorded',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint growth_human_reviews_website_key_uniq
    unique (website_id, review_key),
  constraint growth_human_reviews_decision_chk
    check (decision in (
      'approve', 'reject', 'request_changes',
      'block', 'watch', 'override'
    )),
  constraint growth_human_reviews_status_chk
    check (status in ('recorded', 'superseded'))
);

create index if not exists growth_content_briefs_item_idx
  on public.growth_content_briefs(website_id, backlog_item_id, status);
create index if not exists growth_content_briefs_locale_idx
  on public.growth_content_briefs(website_id, target_locale, locale_gate_required, status);

create index if not exists growth_content_tasks_item_idx
  on public.growth_content_tasks(website_id, backlog_item_id, status);
create index if not exists growth_content_tasks_status_idx
  on public.growth_content_tasks(website_id, status, due_date);
create index if not exists growth_content_tasks_locale_idx
  on public.growth_content_tasks(website_id, target_locale, locale_gate_required, status);

create index if not exists growth_ai_reviews_item_idx
  on public.growth_ai_reviews(website_id, backlog_item_id, status);
create index if not exists growth_ai_reviews_task_idx
  on public.growth_ai_reviews(website_id, task_id, status);

create index if not exists growth_human_reviews_item_idx
  on public.growth_human_reviews(website_id, backlog_item_id, status);
create index if not exists growth_human_reviews_task_idx
  on public.growth_human_reviews(website_id, task_id, status);
create index if not exists growth_human_reviews_experiment_idx
  on public.growth_human_reviews(website_id, experiment_id, status);

drop trigger if exists trg_growth_content_briefs_touch on public.growth_content_briefs;
create trigger trg_growth_content_briefs_touch
  before update on public.growth_content_briefs
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_content_tasks_touch on public.growth_content_tasks;
create trigger trg_growth_content_tasks_touch
  before update on public.growth_content_tasks
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_ai_reviews_touch on public.growth_ai_reviews;
create trigger trg_growth_ai_reviews_touch
  before update on public.growth_ai_reviews
  for each row execute function public.touch_growth_backlog_updated_at();

drop trigger if exists trg_growth_human_reviews_touch on public.growth_human_reviews;
create trigger trg_growth_human_reviews_touch
  before update on public.growth_human_reviews
  for each row execute function public.touch_growth_backlog_updated_at();

alter table public.growth_content_briefs enable row level security;
alter table public.growth_content_tasks enable row level security;
alter table public.growth_ai_reviews enable row level security;
alter table public.growth_human_reviews enable row level security;

drop policy if exists growth_content_briefs_service_all on public.growth_content_briefs;
create policy growth_content_briefs_service_all
  on public.growth_content_briefs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_content_briefs_account_read on public.growth_content_briefs;
create policy growth_content_briefs_account_read
  on public.growth_content_briefs
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_content_tasks_service_all on public.growth_content_tasks;
create policy growth_content_tasks_service_all
  on public.growth_content_tasks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_content_tasks_account_read on public.growth_content_tasks;
create policy growth_content_tasks_account_read
  on public.growth_content_tasks
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_ai_reviews_service_all on public.growth_ai_reviews;
create policy growth_ai_reviews_service_all
  on public.growth_ai_reviews
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_ai_reviews_account_read on public.growth_ai_reviews;
create policy growth_ai_reviews_account_read
  on public.growth_ai_reviews
  for select
  to authenticated
  using (account_id = auth.uid());

drop policy if exists growth_human_reviews_service_all on public.growth_human_reviews;
create policy growth_human_reviews_service_all
  on public.growth_human_reviews
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists growth_human_reviews_account_read on public.growth_human_reviews;
create policy growth_human_reviews_account_read
  on public.growth_human_reviews
  for select
  to authenticated
  using (account_id = auth.uid());

grant select on public.growth_content_briefs to authenticated;
grant select on public.growth_content_tasks to authenticated;
grant select on public.growth_ai_reviews to authenticated;
grant select on public.growth_human_reviews to authenticated;

grant all on public.growth_content_briefs to service_role;
grant all on public.growth_content_tasks to service_role;
grant all on public.growth_ai_reviews to service_role;
grant all on public.growth_human_reviews to service_role;

comment on table public.growth_content_briefs is
  'Growth OS content briefs generated from reviewed backlog items.';
comment on table public.growth_content_tasks is
  'Growth OS operational content tasks derived from approved briefs.';
comment on table public.growth_ai_reviews is
  'Growth OS AI review ledger with model, prompt/config version, confidence and risks.';
comment on table public.growth_human_reviews is
  'Growth OS human or Council review ledger for backlog, content tasks and experiments.';
