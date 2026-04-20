-- ============================================================================
-- EPIC #250 / Issue #259
-- Snapshot + controlled apply/restore flow for pilot designer reference themes.
-- Rollback model: flag OFF + restore snapshot + revalidate.
-- ============================================================================

create table if not exists public.pilot_theme_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  previous_theme jsonb not null,
  git_sha text not null,
  reason text not null default 'theme_designer_v1_rollout',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  restored_at timestamptz,
  restored_by uuid references auth.users(id) on delete set null,
  check (
    jsonb_typeof(previous_theme) = 'object'
    and previous_theme ? 'tokens'
    and previous_theme ? 'profile'
  ),
  check (char_length(btrim(git_sha)) between 7 and 64)
);

comment on table public.pilot_theme_snapshots is
  'Pre-rollout snapshot of websites.theme for reversible pilot theme rollout.';

comment on column public.pilot_theme_snapshots.git_sha is
  'Git commit SHA associated with the rollout action.';

create index if not exists pilot_theme_snapshots_website_created_idx
  on public.pilot_theme_snapshots(website_id, created_at desc);

create index if not exists pilot_theme_snapshots_account_created_idx
  on public.pilot_theme_snapshots(account_id, created_at desc);

alter table public.pilot_theme_snapshots enable row level security;

create policy pilot_theme_snapshots_read
  on public.pilot_theme_snapshots
  for select
  using (
    exists (
      select 1
        from public.user_roles ur
       where ur.user_id = (select auth.uid())
         and ur.account_id = pilot_theme_snapshots.account_id
         and ur.is_active = true
    )
  );

create policy pilot_theme_snapshots_write_super_admin
  on public.pilot_theme_snapshots
  for all
  using (
    exists (
      select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
       where ur.user_id = (select auth.uid())
         and ur.is_active = true
         and r.role_name = 'super_admin'
    )
  )
  with check (
    exists (
      select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
       where ur.user_id = (select auth.uid())
         and ur.is_active = true
         and r.role_name = 'super_admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Create a snapshot from current websites.theme
-- ----------------------------------------------------------------------------
create or replace function public.create_pilot_theme_snapshot(
  p_account_id uuid,
  p_website_id uuid,
  p_git_sha text,
  p_reason text default 'theme_designer_v1_rollout'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super_admin boolean;
  v_current_theme jsonb;
  v_snapshot_id uuid;
begin
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
     where ur.user_id = auth.uid()
       and ur.is_active = true
       and r.role_name = 'super_admin'
  )
    into v_is_super_admin;

  if not coalesce(v_is_super_admin, false) then
    raise exception 'FORBIDDEN: super_admin role required';
  end if;

  select w.theme
    into v_current_theme
    from public.websites w
   where w.id = p_website_id
     and w.account_id = p_account_id
     and w.deleted_at is null
   limit 1;

  if v_current_theme is null then
    raise exception 'WEBSITE_NOT_FOUND_OR_THEME_EMPTY';
  end if;

  insert into public.pilot_theme_snapshots (
    account_id,
    website_id,
    previous_theme,
    git_sha,
    reason,
    created_by
  )
  values (
    p_account_id,
    p_website_id,
    v_current_theme,
    p_git_sha,
    coalesce(nullif(p_reason, ''), 'theme_designer_v1_rollout'),
    auth.uid()
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

grant execute on function public.create_pilot_theme_snapshot(uuid, uuid, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Apply designer reference theme in a controlled server-side write path:
--  1) snapshot current theme
--  2) write new theme to websites.theme
--  3) enable website-scoped rollout flag
-- ----------------------------------------------------------------------------
create or replace function public.apply_designer_reference_theme(
  p_account_id uuid,
  p_website_id uuid,
  p_theme jsonb,
  p_git_sha text,
  p_reason text default 'theme_designer_v1_rollout'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot_id uuid;
  v_rows_updated integer;
begin
  if p_theme is null
     or jsonb_typeof(p_theme) <> 'object'
     or not (p_theme ? 'tokens')
     or not (p_theme ? 'profile') then
    raise exception 'INVALID_THEME_PAYLOAD';
  end if;

  v_snapshot_id := public.create_pilot_theme_snapshot(
    p_account_id := p_account_id,
    p_website_id := p_website_id,
    p_git_sha := p_git_sha,
    p_reason := p_reason
  );

  update public.websites
     set theme = p_theme,
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_website_id
     and account_id = p_account_id
     and deleted_at is null;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated <> 1 then
    raise exception 'WEBSITE_NOT_FOUND';
  end if;

  perform public.toggle_theme_designer_v1(
    p_account_id := p_account_id,
    p_website_id := p_website_id,
    p_enabled := true
  );

  return jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'website_id', p_website_id,
    'account_id', p_account_id,
    'flag_enabled', true
  );
end;
$$;

grant execute on function public.apply_designer_reference_theme(uuid, uuid, jsonb, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Restore from snapshot + optional flag disable.
-- ----------------------------------------------------------------------------
create or replace function public.restore_pilot_theme_snapshot(
  p_snapshot_id uuid,
  p_disable_flag boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super_admin boolean;
  v_snapshot record;
  v_rows_updated integer;
begin
  select exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
     where ur.user_id = auth.uid()
       and ur.is_active = true
       and r.role_name = 'super_admin'
  )
    into v_is_super_admin;

  if not coalesce(v_is_super_admin, false) then
    raise exception 'FORBIDDEN: super_admin role required';
  end if;

  select *
    into v_snapshot
    from public.pilot_theme_snapshots pts
   where pts.id = p_snapshot_id
   limit 1;

  if not found then
    raise exception 'SNAPSHOT_NOT_FOUND';
  end if;

  update public.websites
     set theme = v_snapshot.previous_theme,
         updated_at = now(),
         updated_by = auth.uid()
   where id = v_snapshot.website_id
     and account_id = v_snapshot.account_id
     and deleted_at is null;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated <> 1 then
    raise exception 'WEBSITE_NOT_FOUND';
  end if;

  update public.pilot_theme_snapshots
     set restored_at = now(),
         restored_by = auth.uid()
   where id = p_snapshot_id;

  if coalesce(p_disable_flag, true) then
    perform public.toggle_theme_designer_v1(
      p_account_id := v_snapshot.account_id,
      p_website_id := v_snapshot.website_id,
      p_enabled := false
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'snapshot_id', p_snapshot_id,
    'website_id', v_snapshot.website_id,
    'account_id', v_snapshot.account_id,
    'flag_disabled', coalesce(p_disable_flag, true)
  );
end;
$$;

grant execute on function public.restore_pilot_theme_snapshot(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- Public-safe read helper used by SSR fallback when flag is disabled.
-- Returns only previous_theme JSON.
-- ----------------------------------------------------------------------------
create or replace function public.get_latest_pilot_theme_snapshot(
  p_website_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_theme jsonb;
begin
  select pts.previous_theme
    into v_theme
    from public.pilot_theme_snapshots pts
   where pts.website_id = p_website_id
   order by pts.created_at desc
   limit 1;

  return v_theme;
end;
$$;

grant execute on function public.get_latest_pilot_theme_snapshot(uuid) to anon, authenticated;

-- Rollback:
-- drop function if exists public.get_latest_pilot_theme_snapshot(uuid);
-- drop function if exists public.restore_pilot_theme_snapshot(uuid, boolean);
-- drop function if exists public.apply_designer_reference_theme(uuid, uuid, jsonb, text, text);
-- drop function if exists public.create_pilot_theme_snapshot(uuid, uuid, text, text);
-- drop table if exists public.pilot_theme_snapshots;
