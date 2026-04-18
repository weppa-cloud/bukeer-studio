-- ============================================================================
-- RFC #197 W3 — Product edit history RPCs
-- log_edit_history: append row (for server actions + trigger delegates)
-- rollback_product_field: restore prior value and log the rollback
-- reconcile_product_surfaces: polymorphic dual-surface detection (replaces
--   reconcile_package_kits_surfaces for all 3 product types)
-- ============================================================================

-- ─── log_edit_history ────────────────────────────────────────────────────────

create or replace function public.log_edit_history(
  p_account_id uuid,
  p_product_id uuid,
  p_product_type text,
  p_field text,
  p_source text,
  p_operation text,
  p_previous_value jsonb,
  p_new_value jsonb,
  p_change_summary text default null,
  p_changed_by uuid default null,
  p_ai_model text default null,
  p_ai_cost_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Ensure partition exists for today (lazy guard in case cron missed a window)
  perform public.ensure_product_edit_history_partition(current_date);

  insert into public.product_edit_history (
    account_id, product_id, product_type, field, source, operation,
    previous_value, new_value, change_summary, changed_by, ai_model, ai_cost_event_id
  ) values (
    p_account_id, p_product_id, p_product_type, p_field, p_source, p_operation,
    p_previous_value, p_new_value, p_change_summary,
    coalesce(p_changed_by, auth.uid()),
    p_ai_model, p_ai_cost_event_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_edit_history(
  uuid, uuid, text, text, text, text, jsonb, jsonb, text, uuid, text, uuid
) to service_role;

-- ─── rollback_product_field ──────────────────────────────────────────────────
-- Restores the previous_value from a history row into the live product row +
-- logs the rollback as a new history entry. Scope-limited to package_kits for
-- now; activities/hotels support follows once F2 trigger is wired.

create or replace function public.rollback_product_field(
  p_history_id uuid,
  p_history_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.product_edit_history%rowtype;
  v_new_history_id uuid;
  v_restored_value jsonb;
begin
  select * into v_row
    from public.product_edit_history
    where id = p_history_id and created_at = p_history_created_at;

  if v_row.id is null then
    raise exception 'HISTORY_NOT_FOUND: id=% created_at=%', p_history_id, p_history_created_at;
  end if;

  if v_row.product_type != 'package_kit' then
    raise exception 'ROLLBACK_NOT_SUPPORTED_YET_FOR: %', v_row.product_type;
  end if;

  v_restored_value := v_row.previous_value;

  -- Route back through the single-tx marketing RPC so the audit trigger picks
  -- surface='studio' and resets AI flags if applicable.
  perform public.update_package_kit_marketing_field(
    v_row.product_id,
    v_row.account_id,
    v_row.field,
    coalesce(v_restored_value, 'null'::jsonb),
    null
  );

  v_new_history_id := public.log_edit_history(
    v_row.account_id,
    v_row.product_id,
    v_row.product_type,
    v_row.field,
    'studio',
    'UPDATE',
    v_row.new_value,
    v_restored_value,
    format('rollback from history %s', v_row.id),
    auth.uid(),
    null,
    null
  );

  return jsonb_build_object(
    'success', true,
    'source_history_id', v_row.id,
    'new_history_id', v_new_history_id,
    'product_id', v_row.product_id,
    'field', v_row.field,
    'restored_value', v_restored_value
  );
end;
$$;

grant execute on function public.rollback_product_field(uuid, timestamptz) to authenticated, service_role;

-- ─── reconcile_product_surfaces (polymorphic) ────────────────────────────────

create or replace function public.reconcile_product_surfaces(
  p_product_type text default null,  -- null = all types
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
      product_id,
      product_type,
      account_id,
      array_agg(distinct source) as sources,
      count(*) as write_count,
      min(created_at) as first_at,
      max(created_at) as last_at
    from public.product_edit_history
    where created_at > now() - p_window
      and operation = 'UPDATE'
      and (p_product_type is null or product_type = p_product_type)
    group by product_id, product_type, account_id
    having array_length(array_agg(distinct source) filter (
      where source in ('flutter', 'studio')
    ), 1) > 1
  loop
    v_anomalies := v_anomalies || jsonb_build_object(
      'product_id', r.product_id,
      'product_type', r.product_type,
      'account_id', r.account_id,
      'sources', r.sources,
      'write_count', r.write_count,
      'window_start', r.first_at,
      'window_end', r.last_at
    );

    insert into public.reconciliation_alerts (
      account_id, source, severity, summary, details
    ) values (
      r.account_id,
      'studio_editor_v2',
      'warn',
      format('Dual-surface write detected: %s %s (%s writes in %s)',
        r.product_type, r.product_id, r.write_count, p_window),
      jsonb_build_object(
        'product_id', r.product_id,
        'product_type', r.product_type,
        'sources', r.sources,
        'write_count', r.write_count
      )
    )
    on conflict do nothing;
  end loop;

  return jsonb_build_object(
    'anomalies_count', jsonb_array_length(v_anomalies),
    'anomalies', v_anomalies,
    'checked_at', now(),
    'product_type_filter', p_product_type
  );
end;
$$;

grant execute on function public.reconcile_product_surfaces(text, interval) to authenticated;

-- ─── Trigger wiring: package_kits UPDATE → log_edit_history ──────────────────
-- Replaces fn_audit_package_kits write-path with generalized table.
-- Keeps fn_audit_package_kits alive for 90d R7 dual-write window, but now also
-- appends to product_edit_history. Once stabilised, fn_audit_package_kits can
-- be dropped.

create or replace function public.fn_audit_package_kits_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_surface text;
  v_user_id uuid;
  v_changed_field text;
  v_previous jsonb;
  v_new jsonb;
begin
  v_surface := coalesce(
    nullif(current_setting('app.edit_surface', true), ''),
    'trigger_default'
  );
  v_user_id := auth.uid();

  if tg_op = 'UPDATE' then
    -- Per-field decomposition so history stays queryable by field name.
    for v_changed_field, v_previous, v_new in
      select key, o.value, n.value
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
      where n.value is distinct from o.value
    loop
      perform public.log_edit_history(
        new.account_id,
        new.id,
        'package_kit',
        v_changed_field,
        v_surface,
        'UPDATE',
        v_previous,
        v_new,
        null, v_user_id, null, null
      );
    end loop;
  elsif tg_op = 'INSERT' then
    perform public.log_edit_history(
      new.account_id, new.id, 'package_kit',
      '__create__', v_surface, 'INSERT',
      null, to_jsonb(new), null, v_user_id, null, null
    );
  elsif tg_op = 'DELETE' then
    perform public.log_edit_history(
      old.account_id, old.id, 'package_kit',
      '__delete__', v_surface, 'DELETE',
      to_jsonb(old), null, null, v_user_id, null, null
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_package_kits_v2 on public.package_kits;
create trigger trg_audit_package_kits_v2
  after insert or update or delete on public.package_kits
  for each row execute function public.fn_audit_package_kits_v2();

-- Rollback:
-- drop trigger if exists trg_audit_package_kits_v2 on public.package_kits;
-- drop function if exists public.fn_audit_package_kits_v2();
-- drop function if exists public.reconcile_product_surfaces(text, interval);
-- drop function if exists public.rollback_product_field(uuid, timestamptz);
-- drop function if exists public.log_edit_history(uuid, uuid, text, text, text, text, jsonb, jsonb, text, uuid, text, uuid);
