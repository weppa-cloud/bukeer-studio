-- ============================================================================
-- #204 F2 — Attach product_edit_history trigger to activities + hotels
-- Mirrors fn_audit_package_kits_v2: per-field diff → log_edit_history with
-- product_type='activity' | 'hotel'. Reads app.edit_surface session variable
-- so Studio server actions route to source='studio' via set_config.
-- Depends on 20260429000100_product_edit_history_rpcs.sql (log_edit_history).
-- ============================================================================

create or replace function public.fn_audit_activities()
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
    for v_changed_field, v_previous, v_new in
      select key, o.value, n.value
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
      where n.value is distinct from o.value
    loop
      perform public.log_edit_history(
        new.account_id, new.id, 'activity',
        v_changed_field, v_surface, 'UPDATE',
        v_previous, v_new, null, v_user_id, null, null
      );
    end loop;
  elsif tg_op = 'INSERT' then
    perform public.log_edit_history(
      new.account_id, new.id, 'activity',
      '__create__', v_surface, 'INSERT',
      null, to_jsonb(new), null, v_user_id, null, null
    );
  elsif tg_op = 'DELETE' then
    perform public.log_edit_history(
      old.account_id, old.id, 'activity',
      '__delete__', v_surface, 'DELETE',
      to_jsonb(old), null, null, v_user_id, null, null
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_activities on public.activities;
create trigger trg_audit_activities
  after insert or update or delete on public.activities
  for each row execute function public.fn_audit_activities();

-- ─── hotels ──────────────────────────────────────────────────────────────────

create or replace function public.fn_audit_hotels()
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
    for v_changed_field, v_previous, v_new in
      select key, o.value, n.value
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
      where n.value is distinct from o.value
    loop
      perform public.log_edit_history(
        new.account_id, new.id, 'hotel',
        v_changed_field, v_surface, 'UPDATE',
        v_previous, v_new, null, v_user_id, null, null
      );
    end loop;
  elsif tg_op = 'INSERT' then
    perform public.log_edit_history(
      new.account_id, new.id, 'hotel',
      '__create__', v_surface, 'INSERT',
      null, to_jsonb(new), null, v_user_id, null, null
    );
  elsif tg_op = 'DELETE' then
    perform public.log_edit_history(
      old.account_id, old.id, 'hotel',
      '__delete__', v_surface, 'DELETE',
      to_jsonb(old), null, null, v_user_id, null, null
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_hotels on public.hotels;
create trigger trg_audit_hotels
  after insert or update or delete on public.hotels
  for each row execute function public.fn_audit_hotels();

-- Rollback:
-- drop trigger if exists trg_audit_activities on public.activities;
-- drop function if exists public.fn_audit_activities();
-- drop trigger if exists trg_audit_hotels on public.hotels;
-- drop function if exists public.fn_audit_hotels();
