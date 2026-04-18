-- ============================================================================
-- RFC #197 W3 — Product Edit History Retention (generalized audit log)
-- Partitioned RANGE(created_at) by month. Retains ≥365d with legal-hold carve-outs.
-- Generalizes package_kits_audit_log (R7) to all product types: package_kits,
-- activities, hotels. Trigger wiring per-entity ships in a follow-up migration
-- (F2 for activities/hotels; package_kits wired here).
--
-- Monthly partitions auto-created by pg_cron (see *_pg_cron.sql).
-- ============================================================================

-- ─── Parent partitioned table ────────────────────────────────────────────────

create table if not exists public.product_edit_history (
  id uuid not null default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  product_id uuid not null,
  product_type text not null
    check (product_type in ('package_kit', 'activity', 'hotel')),
  field text not null,
  source text not null
    check (source in ('flutter', 'studio', 'api', 'trigger_default', 'ai', 'system')),
  operation text not null default 'UPDATE'
    check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  previous_value jsonb,
  new_value jsonb,
  change_summary text,
  changed_by uuid references auth.users(id) on delete set null,
  ai_model text,
  ai_cost_event_id uuid,
  legal_hold boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id, created_at),
  constraint product_edit_history_new_value_size
    check (new_value is null or pg_column_size(new_value) < 65536),
  constraint product_edit_history_previous_value_size
    check (previous_value is null or pg_column_size(previous_value) < 65536)
)
partition by range (created_at);

-- FK to ai_cost_events (NOT VALID so existing rows don't block, avoids heavy scan)
alter table public.product_edit_history
  add constraint product_edit_history_ai_cost_event_fk
  foreign key (ai_cost_event_id) references public.ai_cost_events(id) on delete set null
  not valid;

-- ─── Partition helper: ensure partition exists for a given month ─────────────

create or replace function public.ensure_product_edit_history_partition(
  p_month date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_partition_name text;
  v_sql text;
begin
  v_start := date_trunc('month', p_month)::date;
  v_end := (v_start + interval '1 month')::date;
  v_partition_name := format('product_edit_history_%s', to_char(v_start, 'YYYY_MM'));

  if not exists (
    select 1 from pg_class where relname = v_partition_name and relkind = 'r'
  ) then
    v_sql := format(
      'create table public.%I partition of public.product_edit_history for values from (%L) to (%L)',
      v_partition_name, v_start, v_end
    );
    execute v_sql;

    -- Per-partition indexes for fast point lookups
    execute format(
      'create index if not exists %I on public.%I (product_id, field, created_at desc)',
      v_partition_name || '_product_field_idx', v_partition_name
    );
    execute format(
      'create index if not exists %I on public.%I (account_id, product_id, field, created_at desc)',
      v_partition_name || '_account_product_field_idx', v_partition_name
    );
  end if;

  return v_partition_name;
end;
$$;

grant execute on function public.ensure_product_edit_history_partition(date) to service_role;

-- ─── Bootstrap: create current + next 2 months partitions ────────────────────
-- pg_cron keeps rolling forward from here.

do $$
begin
  perform public.ensure_product_edit_history_partition(current_date);
  perform public.ensure_product_edit_history_partition((current_date + interval '1 month')::date);
  perform public.ensure_product_edit_history_partition((current_date + interval '2 months')::date);
end $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.product_edit_history enable row level security;

create policy product_edit_history_read
  on public.product_edit_history
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = product_edit_history.account_id
        and ur.is_active = true
    )
  );

-- WRITE: service_role only (trigger + server actions)

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- drop function if exists public.ensure_product_edit_history_partition(date);
-- drop table if exists public.product_edit_history cascade;
