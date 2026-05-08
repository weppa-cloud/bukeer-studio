-- ============================================================================
-- RFC #194 R7 — Studio Editor v2 Migration Plan (Phase 1 of 3)
-- Creates account_feature_flags table to gate gradual Flutter→Studio cutover.
--
-- FLAG RESOLUTION (lib/features/studio-editor-v2.ts):
--   1. If studio_editor_v2_fields includes field → Studio writer wins
--   2. Else if studio_editor_v2_enabled=true → Studio writer wins
--   3. Else → Flutter writer wins (default)
--
-- Q1 (per-account vs per-website) resolved: website_id nullable.
--   NULL = account-wide flag; non-null = per-website override.
--
-- TENANCY (ADR-005): RLS checks raw user_roles.role_name = 'super_admin' for
-- writes, account-scoped read for operators. Bypasses lib/admin/permissions.ts
-- abstraction (which collapses super_admin → owner).
-- ============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.account_feature_flags (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  studio_editor_v2_enabled boolean not null default false,
  studio_editor_v2_enabled_at timestamptz,
  studio_editor_v2_fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (account_id, website_id)
);

comment on table public.account_feature_flags is
  'RFC #194 R7 — gradual Studio Editor v2 rollout. website_id NULL = account-wide.';

comment on column public.account_feature_flags.studio_editor_v2_fields is
  'Array of field names for per-field override. Resolution: field array > account flag > default Flutter.';

create index if not exists account_feature_flags_account_idx
  on public.account_feature_flags(account_id);

create index if not exists account_feature_flags_website_idx
  on public.account_feature_flags(website_id)
  where website_id is not null;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.account_feature_flags enable row level security;

-- READ: account-scoped (all members of the account)
create policy account_feature_flags_read
  on public.account_feature_flags
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.account_id = account_feature_flags.account_id
        and ur.is_active = true
    )
  );

-- WRITE: super_admin ONLY (raw role check, bypasses owner abstraction)
create policy account_feature_flags_write_super_admin
  on public.account_feature_flags
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

-- ─── Flip RPC ────────────────────────────────────────────────────────────────
-- Operators hit this via admin UI. Validates super_admin role server-side
-- (defense-in-depth beyond RLS). Logs to audit_log in Phase 2 migration.

create or replace function public.toggle_studio_editor_v2(
  p_account_id uuid,
  p_website_id uuid default null,
  p_enabled boolean default true,
  p_fields jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_name text;
  v_flag_id uuid;
begin
  -- Caller must be super_admin
  select r.role_name into v_role_name
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
    and ur.is_active = true
  limit 1;

  if v_role_name is distinct from 'super_admin' then
    raise exception 'FORBIDDEN: super_admin role required';
  end if;

  insert into public.account_feature_flags (
    account_id, website_id,
    studio_editor_v2_enabled, studio_editor_v2_enabled_at,
    studio_editor_v2_fields, updated_at, updated_by
  )
  values (
    p_account_id, p_website_id,
    p_enabled, case when p_enabled then now() else null end,
    p_fields, now(), auth.uid()
  )
  on conflict (account_id, website_id) do update set
    studio_editor_v2_enabled = excluded.studio_editor_v2_enabled,
    studio_editor_v2_enabled_at = excluded.studio_editor_v2_enabled_at,
    studio_editor_v2_fields = excluded.studio_editor_v2_fields,
    updated_at = now(),
    updated_by = auth.uid()
  returning id into v_flag_id;

  return jsonb_build_object(
    'success', true,
    'flag_id', v_flag_id,
    'account_id', p_account_id,
    'website_id', p_website_id,
    'enabled', p_enabled,
    'fields', p_fields
  );
end;
$$;

grant execute on function public.toggle_studio_editor_v2(uuid, uuid, boolean, jsonb) to authenticated;

-- ─── Read helper RPC ─────────────────────────────────────────────────────────
-- Used by Studio SSR to resolve flag without multi-join in every request.

create or replace function public.resolve_studio_editor_v2(
  p_account_id uuid,
  p_website_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website_flag record;
  v_account_flag record;
begin
  -- Try per-website override first
  if p_website_id is not null then
    select studio_editor_v2_enabled, studio_editor_v2_fields into v_website_flag
    from public.account_feature_flags
    where account_id = p_account_id and website_id = p_website_id
    limit 1;

    if found then
      return jsonb_build_object(
        'enabled', v_website_flag.studio_editor_v2_enabled,
        'fields', v_website_flag.studio_editor_v2_fields,
        'scope', 'website'
      );
    end if;
  end if;

  -- Fallback to account-wide flag
  select studio_editor_v2_enabled, studio_editor_v2_fields into v_account_flag
  from public.account_feature_flags
  where account_id = p_account_id and website_id is null
  limit 1;

  if found then
    return jsonb_build_object(
      'enabled', v_account_flag.studio_editor_v2_enabled,
      'fields', v_account_flag.studio_editor_v2_fields,
      'scope', 'account'
    );
  end if;

  -- Default: Flutter wins
  return jsonb_build_object(
    'enabled', false,
    'fields', '[]'::jsonb,
    'scope', 'default'
  );
end;
$$;

grant execute on function public.resolve_studio_editor_v2(uuid, uuid) to anon, authenticated;

-- ─── Reconciliation alerts table (shared by R7 + W3 RFCs) ────────────────────
-- Nightly reconciliation cron writes here when dual-write discrepancy detected.
-- Surfaced in /dashboard/[websiteId]/ops/reconciliation (super_admin only).

create table if not exists public.reconciliation_alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  source text not null,                  -- 'studio_editor_v2' | 'edit_history_archive' | ...
  severity text not null default 'warn', -- 'info' | 'warn' | 'error'
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reconciliation_alerts_unresolved_idx
  on public.reconciliation_alerts(created_at desc)
  where resolved_at is null;

create index if not exists reconciliation_alerts_account_idx
  on public.reconciliation_alerts(account_id, created_at desc);

alter table public.reconciliation_alerts enable row level security;

create policy reconciliation_alerts_read_super_admin
  on public.reconciliation_alerts
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid())
        and ur.is_active = true
        and r.role_name = 'super_admin'
    )
  );

-- Writes via service role only (triggered by cron job / server actions)

-- Rollback:
-- drop function if exists public.resolve_studio_editor_v2(uuid, uuid);
-- drop function if exists public.toggle_studio_editor_v2(uuid, uuid, boolean, jsonb);
-- drop table if exists public.reconciliation_alerts;
-- drop table if exists public.account_feature_flags;
