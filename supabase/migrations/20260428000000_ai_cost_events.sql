-- ============================================================================
-- RFC #195 R9 D2 — AI cost ledger + budget enforcement
-- Per-request ledger for AI spend reporting (ai_cost_events) + per-account
-- budget caps (ai_cost_budgets). Complements ai_rate_limits which enforces
-- sliding-window throttle. This ledger is append-only for reporting/billing.
--
-- Spec: docs/audits/ai-routes-cost-recording.md
-- ============================================================================

-- ─── ai_cost_events (ledger) ─────────────────────────────────────────────────

create table if not exists public.ai_cost_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
    -- 'editor' | 'public-chat' | 'seo-transcreate' | 'seo-generate'
    -- | 'package-content' | 'description-rewrite' | 'section-generate' | ...
  route text not null,
    -- full API path, e.g. '/api/generate-package-content'
  model text not null,
    -- e.g. 'anthropic/claude-sonnet-4-5'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  status text not null default 'ok'
    check (status in ('ok', 'error', 'rate_limited', 'budget_exceeded')),
  rate_limit_key text,
    -- correlates with ai_rate_limits.key (account_id or IP)
  metadata jsonb not null default '{}'::jsonb,
    -- free-form: prompt hash, product_id, locale, etc.
  created_at timestamptz not null default now()
);

create index if not exists ai_cost_events_account_created_idx
  on public.ai_cost_events(account_id, created_at desc);

create index if not exists ai_cost_events_website_created_idx
  on public.ai_cost_events(website_id, created_at desc)
  where website_id is not null;

create index if not exists ai_cost_events_route_created_idx
  on public.ai_cost_events(route, created_at desc);

create index if not exists ai_cost_events_feature_status_idx
  on public.ai_cost_events(feature, status, created_at desc);

-- RLS
alter table public.ai_cost_events enable row level security;

create policy ai_cost_events_read
  on public.ai_cost_events
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = ai_cost_events.account_id
        and ur.is_active = true
    )
  );

-- WRITE: service_role only (Studio server actions + Edge functions)
-- No explicit policy → default deny for anon/authenticated INSERT

-- ─── ai_cost_budgets (per-account caps) ──────────────────────────────────────

create table if not exists public.ai_cost_budgets (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  tier text not null default 'free'
    check (tier in ('free', 'standard', 'pro', 'enterprise')),
  daily_limit_usd numeric(10,2),    -- null = unlimited for tier
  monthly_limit_usd numeric(10,2),  -- null = unlimited for tier
  alert_threshold_pct int not null default 80
    check (alert_threshold_pct between 1 and 100),
  updated_at timestamptz not null default now()
);

alter table public.ai_cost_budgets enable row level security;

-- READ: account members (for dashboard display)
create policy ai_cost_budgets_read
  on public.ai_cost_budgets
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = ai_cost_budgets.account_id
        and ur.is_active = true
    )
  );

-- WRITE: super_admin role only via RPC (no direct INSERT/UPDATE from UI)

-- ─── RPC: log_ai_cost_event ──────────────────────────────────────────────────
-- Thin wrapper for server-side inserts. Called from lib/ai/cost-ledger.ts.

create or replace function public.log_ai_cost_event(
  p_account_id uuid,
  p_website_id uuid,
  p_user_id uuid,
  p_feature text,
  p_route text,
  p_model text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd numeric,
  p_status text default 'ok',
  p_rate_limit_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.ai_cost_events (
    account_id, website_id, user_id, feature, route, model,
    input_tokens, output_tokens, cost_usd, status, rate_limit_key, metadata
  ) values (
    p_account_id, p_website_id, p_user_id, p_feature, p_route, p_model,
    p_input_tokens, p_output_tokens, p_cost_usd, p_status, p_rate_limit_key, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_ai_cost_event(
  uuid, uuid, uuid, text, text, text, int, int, numeric, text, text, jsonb
) to service_role;

-- ─── RPC: get_account_ai_spend ───────────────────────────────────────────────
-- Returns period spend + budget + threshold status. Used by dashboard + budget
-- guard in AI routes (short-circuit when alert_threshold_pct hit).

create or replace function public.get_account_ai_spend(
  p_account_id uuid,
  p_period text default 'month'  -- 'day' | 'month'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
  v_spent numeric;
  v_budget record;
  v_limit numeric;
  v_pct int;
begin
  if p_period = 'day' then
    v_since := date_trunc('day', now());
  elsif p_period = 'month' then
    v_since := date_trunc('month', now());
  else
    raise exception 'INVALID_PERIOD: %', p_period;
  end if;

  select coalesce(sum(cost_usd), 0)
    into v_spent
    from public.ai_cost_events
    where account_id = p_account_id
      and created_at >= v_since
      and status = 'ok';

  select * into v_budget
    from public.ai_cost_budgets
    where account_id = p_account_id;

  v_limit := case
    when p_period = 'day' then v_budget.daily_limit_usd
    when p_period = 'month' then v_budget.monthly_limit_usd
  end;

  v_pct := case
    when v_limit is null or v_limit = 0 then 0
    else least(100, floor((v_spent / v_limit) * 100))::int
  end;

  return jsonb_build_object(
    'account_id', p_account_id,
    'period', p_period,
    'since', v_since,
    'spent_usd', v_spent,
    'limit_usd', v_limit,
    'tier', coalesce(v_budget.tier, 'free'),
    'pct', v_pct,
    'alert_threshold_pct', coalesce(v_budget.alert_threshold_pct, 80),
    'alert_threshold_hit',
      v_limit is not null
      and v_pct >= coalesce(v_budget.alert_threshold_pct, 80),
    'over_limit', v_limit is not null and v_spent >= v_limit
  );
end;
$$;

grant execute on function public.get_account_ai_spend(uuid, text) to authenticated, service_role;

-- Rollback:
-- drop function if exists public.get_account_ai_spend(uuid, text);
-- drop function if exists public.log_ai_cost_event(uuid, uuid, uuid, text, text, text, int, int, numeric, text, text, jsonb);
-- drop table if exists public.ai_cost_budgets;
-- drop table if exists public.ai_cost_events;
