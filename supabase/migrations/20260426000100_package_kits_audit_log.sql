-- ============================================================================
-- RFC #194 R7 — Studio Editor v2 Migration Plan (Phase 2 of 3)
-- Audit log for every package_kits UPDATE during dual-write cutover.
-- Captures which surface wrote + before/after snapshot for reconciliation.
--
-- Retention: 90d (Q2 resolved). Partitioning by day on created_at for cheap
-- purge via DROP PARTITION. See also W3 (#197) for generalized edit history.
--
-- This table is Studio Editor v2 migration-specific. Once R7 cutover complete,
-- generalize into product_edit_history (W3 #197).
-- ============================================================================

create table if not exists public.package_kits_audit_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  package_kit_id uuid not null references public.package_kits(id) on delete cascade,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  surface text not null check (surface in ('flutter', 'studio', 'api', 'trigger_default')),
  changed_fields text[] not null default '{}',
  previous_row jsonb,
  new_row jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists package_kits_audit_log_pkg_created_idx
  on public.package_kits_audit_log(package_kit_id, created_at desc);

create index if not exists package_kits_audit_log_account_created_idx
  on public.package_kits_audit_log(account_id, created_at desc);

create index if not exists package_kits_audit_log_surface_idx
  on public.package_kits_audit_log(surface, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.package_kits_audit_log enable row level security;

-- READ: account members (for per-product history in Studio UI)
create policy package_kits_audit_log_read
  on public.package_kits_audit_log
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = package_kits_audit_log.account_id
        and ur.is_active = true
    )
  );

-- WRITE: service_role only (trigger + Studio server actions)
-- No explicit policy → default deny for anon/authenticated INSERT

-- ─── Trigger: auto-log every package_kits UPDATE ─────────────────────────────
-- Set-based diff via jsonb_each; captures only changed fields.

create or replace function public.fn_audit_package_kits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_surface text;
  v_changed_fields text[];
  v_user_id uuid;
begin
  -- Surface: read from session variable if set by Studio server action,
  -- else default (e.g. Flutter writer sets nothing → 'trigger_default')
  v_surface := coalesce(
    nullif(current_setting('app.edit_surface', true), ''),
    'trigger_default'
  );

  v_user_id := auth.uid();

  if tg_op = 'UPDATE' then
    select array_agg(key)
    into v_changed_fields
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value;

    -- Skip no-op updates
    if v_changed_fields is null or cardinality(v_changed_fields) = 0 then
      return new;
    end if;

    insert into public.package_kits_audit_log (
      account_id, package_kit_id, operation, surface, changed_fields,
      previous_row, new_row, changed_by
    ) values (
      new.account_id, new.id, 'UPDATE', v_surface, v_changed_fields,
      to_jsonb(old), to_jsonb(new), v_user_id
    );

  elsif tg_op = 'INSERT' then
    insert into public.package_kits_audit_log (
      account_id, package_kit_id, operation, surface, changed_fields,
      previous_row, new_row, changed_by
    ) values (
      new.account_id, new.id, 'INSERT', v_surface, '{}',
      null, to_jsonb(new), v_user_id
    );

  elsif tg_op = 'DELETE' then
    insert into public.package_kits_audit_log (
      account_id, package_kit_id, operation, surface, changed_fields,
      previous_row, new_row, changed_by
    ) values (
      old.account_id, old.id, 'DELETE', v_surface, '{}',
      to_jsonb(old), null, v_user_id
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_package_kits on public.package_kits;
create trigger trg_audit_package_kits
  after insert or update or delete on public.package_kits
  for each row execute function public.fn_audit_package_kits();

-- ─── Retention: 90d purge via pg_cron ────────────────────────────────────────
-- Runs nightly at 02:30 UTC. Simple DELETE; partitioning is a W3 concern for
-- the generalized edit_history table. At expected R7 scale (audit only during
-- ~4 week rollout window + 90d tail), DELETE is acceptable.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron extension not installed — skipping retention job. Install via: create extension pg_cron;';
  else
    perform cron.unschedule('purge-package-kits-audit-log') where exists (select 1 from cron.job where jobname = 'purge-package-kits-audit-log');
    perform cron.schedule(
      'purge-package-kits-audit-log',
      '30 2 * * *',
      $job$delete from public.package_kits_audit_log where created_at < now() - interval '90 days';$job$
    );
  end if;
end $$;

-- ─── Reconciliation helper: detect dual-write anomalies ──────────────────────
-- Flags packages where Flutter + Studio both wrote in the same 60min window.
-- Called by nightly reconciliation cron (to be scheduled in W3 or follow-up).

create or replace function public.reconcile_package_kits_surfaces(
  p_window interval default '24 hours'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anomalies jsonb := '[]'::jsonb;
  r record;
begin
  for r in
    select
      package_kit_id,
      account_id,
      array_agg(distinct surface) as surfaces,
      count(*) as write_count,
      min(created_at) as first_at,
      max(created_at) as last_at
    from public.package_kits_audit_log
    where created_at > now() - p_window
      and operation = 'UPDATE'
    group by package_kit_id, account_id
    having array_length(array_agg(distinct surface), 1) > 1
  loop
    v_anomalies := v_anomalies || jsonb_build_object(
      'package_kit_id', r.package_kit_id,
      'account_id', r.account_id,
      'surfaces', r.surfaces,
      'write_count', r.write_count,
      'window_start', r.first_at,
      'window_end', r.last_at
    );

    -- Emit to reconciliation_alerts (table created in R7 phase 1 migration)
    insert into public.reconciliation_alerts (
      account_id, source, severity, summary, details
    ) values (
      r.account_id,
      'studio_editor_v2',
      'warn',
      format('Dual-surface write detected: package_kit %s (%s writes in %s)',
        r.package_kit_id, r.write_count, p_window),
      jsonb_build_object(
        'package_kit_id', r.package_kit_id,
        'surfaces', r.surfaces,
        'write_count', r.write_count
      )
    )
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'anomalies_count', jsonb_array_length(v_anomalies),
    'anomalies', v_anomalies,
    'checked_at', now()
  );
end;
$$;

grant execute on function public.reconcile_package_kits_surfaces(interval) to authenticated;

-- Rollback:
-- drop function if exists public.reconcile_package_kits_surfaces(interval);
-- drop trigger if exists trg_audit_package_kits on public.package_kits;
-- drop function if exists public.fn_audit_package_kits();
-- drop table if exists public.package_kits_audit_log;
