-- ============================================================================
-- RFC #197 W3 — product_edit_history retention schedule
-- pg_cron jobs:
--   1. Monthly: create partition for next month
--   2. Monthly: drop partitions older than 365d, UNLESS any row has legal_hold=true
-- Advisory lock 42 on the purge job so concurrent runs don't race.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed — skipping edit history cron. Install via: create extension pg_cron;';
  else
    -- ── Partition rollover (runs 25th of each month at 00:00 UTC) ─────────
    perform cron.unschedule('product-edit-history-create-partition')
      where exists (select 1 from cron.job where jobname = 'product-edit-history-create-partition');

    perform cron.schedule(
      'product-edit-history-create-partition',
      '0 0 25 * *',
      $job$select public.ensure_product_edit_history_partition((current_date + interval '1 month')::date);$job$
    );

    -- ── Retention: purge partitions older than 365d ───────────────────────
    perform cron.unschedule('product-edit-history-purge')
      where exists (select 1 from cron.job where jobname = 'product-edit-history-purge');

    perform cron.schedule(
      'product-edit-history-purge',
      '15 3 1 * *',
      $job$select public.purge_product_edit_history_partitions();$job$
    );
  end if;
end $$;

-- ─── Purge helper: drops partitions whose entire range is >365d old ──────────
-- Skips partitions that contain any legal_hold=true row.

create or replace function public.purge_product_edit_history_partitions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_ok boolean;
  v_partition record;
  v_dropped text[] := '{}';
  v_held text[] := '{}';
  v_has_hold boolean;
  v_cutoff date;
begin
  v_lock_ok := pg_try_advisory_lock(42);
  if not v_lock_ok then
    return jsonb_build_object('skipped', true, 'reason', 'another purge in flight');
  end if;

  v_cutoff := (current_date - interval '365 days')::date;

  begin
    for v_partition in
      select
        c.relname as partition_name,
        pg_get_expr(c.relpartbound, c.oid) as bound
      from pg_class c
      join pg_inherits i on i.inhrelid = c.oid
      join pg_class p on p.oid = i.inhparent
      where p.relname = 'product_edit_history'
        and c.relkind = 'r'
    loop
      -- Parse upper bound from 'FOR VALUES FROM (...) TO (...)'
      if v_partition.bound !~ 'TO \(''[0-9-]+''\)' then
        continue;
      end if;

      declare
        v_upper_text text;
        v_upper_date date;
      begin
        v_upper_text := substring(v_partition.bound from 'TO \(''([0-9-]+)''\)');
        v_upper_date := v_upper_text::date;

        if v_upper_date > v_cutoff then
          continue;  -- partition still in retention window
        end if;

        execute format(
          'select exists (select 1 from public.%I where legal_hold = true limit 1)',
          v_partition.partition_name
        ) into v_has_hold;

        if v_has_hold then
          v_held := array_append(v_held, v_partition.partition_name);
          continue;
        end if;

        execute format('drop table public.%I', v_partition.partition_name);
        v_dropped := array_append(v_dropped, v_partition.partition_name);
      end;
    end loop;

    perform pg_advisory_unlock(42);
  exception when others then
    perform pg_advisory_unlock(42);
    raise;
  end;

  return jsonb_build_object(
    'dropped', to_jsonb(v_dropped),
    'held', to_jsonb(v_held),
    'cutoff', v_cutoff,
    'checked_at', now()
  );
end;
$$;

grant execute on function public.purge_product_edit_history_partitions() to service_role;

-- Rollback:
-- do $$ begin
--   perform cron.unschedule('product-edit-history-create-partition')
--     where exists (select 1 from cron.job where jobname = 'product-edit-history-create-partition');
--   perform cron.unschedule('product-edit-history-purge')
--     where exists (select 1 from cron.job where jobname = 'product-edit-history-purge');
-- end $$;
-- drop function if exists public.purge_product_edit_history_partitions();
