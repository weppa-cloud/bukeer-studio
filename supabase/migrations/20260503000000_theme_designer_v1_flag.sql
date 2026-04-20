-- ============================================================================
-- EPIC #250 / Issue #259
-- Extends account_feature_flags with website-scoped theme_designer_v1 control.
-- Keeps the existing account_feature_flags infrastructure (no parallel flag table).
-- ============================================================================

alter table public.account_feature_flags
  add column if not exists theme_designer_v1_enabled boolean not null default false,
  add column if not exists theme_designer_v1_enabled_at timestamptz;

comment on column public.account_feature_flags.theme_designer_v1_enabled is
  'Designer reference theme rollout gate. website_id row overrides account_id row.';

comment on column public.account_feature_flags.theme_designer_v1_enabled_at is
  'Timestamp when designer reference theme flag was enabled.';

create index if not exists account_feature_flags_theme_designer_enabled_idx
  on public.account_feature_flags(account_id, website_id, updated_at desc)
  where theme_designer_v1_enabled = true;

-- ----------------------------------------------------------------------------
-- Read helper RPC (SSR/public-safe via security definer)
-- Resolution order:
--   1) website row
--   2) account row (website_id is null)
--   3) default false
-- ----------------------------------------------------------------------------
create or replace function public.resolve_theme_designer_v1(
  p_account_id uuid,
  p_website_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website_flag boolean;
  v_account_flag boolean;
begin
  if p_website_id is not null then
    select aff.theme_designer_v1_enabled
      into v_website_flag
      from public.account_feature_flags aff
     where aff.account_id = p_account_id
       and aff.website_id = p_website_id
     order by aff.updated_at desc
     limit 1;

    if found then
      return jsonb_build_object(
        'enabled', coalesce(v_website_flag, false),
        'scope', 'website'
      );
    end if;
  end if;

  select aff.theme_designer_v1_enabled
    into v_account_flag
    from public.account_feature_flags aff
   where aff.account_id = p_account_id
     and aff.website_id is null
   order by aff.updated_at desc
   limit 1;

  if found then
    return jsonb_build_object(
      'enabled', coalesce(v_account_flag, false),
      'scope', 'account'
    );
  end if;

  return jsonb_build_object(
    'enabled', false,
    'scope', 'default'
  );
end;
$$;

grant execute on function public.resolve_theme_designer_v1(uuid, uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Write helper RPC for rollout toggles.
-- Uses super_admin guard server-side (defense-in-depth on top of RLS).
-- ----------------------------------------------------------------------------
create or replace function public.toggle_theme_designer_v1(
  p_account_id uuid,
  p_website_id uuid default null,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super_admin boolean;
  v_flag_id uuid;
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

  if p_website_id is null then
    select aff.id
      into v_flag_id
      from public.account_feature_flags aff
     where aff.account_id = p_account_id
       and aff.website_id is null
     order by aff.updated_at desc
     limit 1;

    if v_flag_id is null then
      insert into public.account_feature_flags (
        account_id,
        website_id,
        theme_designer_v1_enabled,
        theme_designer_v1_enabled_at,
        updated_at,
        updated_by
      )
      values (
        p_account_id,
        null,
        p_enabled,
        case when p_enabled then now() else null end,
        now(),
        auth.uid()
      )
      returning id into v_flag_id;
    else
      update public.account_feature_flags
         set theme_designer_v1_enabled = p_enabled,
             theme_designer_v1_enabled_at = case when p_enabled then now() else null end,
             updated_at = now(),
             updated_by = auth.uid()
       where id = v_flag_id;
    end if;
  else
    insert into public.account_feature_flags (
      account_id,
      website_id,
      theme_designer_v1_enabled,
      theme_designer_v1_enabled_at,
      updated_at,
      updated_by
    )
    values (
      p_account_id,
      p_website_id,
      p_enabled,
      case when p_enabled then now() else null end,
      now(),
      auth.uid()
    )
    on conflict (account_id, website_id) do update set
      theme_designer_v1_enabled = excluded.theme_designer_v1_enabled,
      theme_designer_v1_enabled_at = excluded.theme_designer_v1_enabled_at,
      updated_at = now(),
      updated_by = auth.uid()
    returning id into v_flag_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'flag_id', v_flag_id,
    'account_id', p_account_id,
    'website_id', p_website_id,
    'enabled', p_enabled
  );
end;
$$;

grant execute on function public.toggle_theme_designer_v1(uuid, uuid, boolean) to authenticated;

-- Rollback:
-- drop function if exists public.toggle_theme_designer_v1(uuid, uuid, boolean);
-- drop function if exists public.resolve_theme_designer_v1(uuid, uuid);
-- alter table public.account_feature_flags
--   drop column if exists theme_designer_v1_enabled,
--   drop column if exists theme_designer_v1_enabled_at;
