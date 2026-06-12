-- Align CRM audience projection tenant-read policies with production tenancy model.
-- Production uses public.user_roles(account_id, user_id, is_active) instead of account_users.

create or replace function public.crm_audience_projection_can_read_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.account_id = p_account_id
      and ur.user_id = auth.uid()
      and coalesce(ur.is_active, true) = true
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

revoke all on function public.crm_audience_projection_can_read_account(uuid) from public, anon;
grant execute on function public.crm_audience_projection_can_read_account(uuid) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_audience_definitions'
      and policyname = 'crm_audience_definitions_user_roles_read'
  ) then
    create policy crm_audience_definitions_user_roles_read
      on public.crm_audience_definitions
      for select to authenticated
      using (public.crm_audience_projection_can_read_account(account_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_audience_memberships'
      and policyname = 'crm_audience_memberships_user_roles_read'
  ) then
    create policy crm_audience_memberships_user_roles_read
      on public.crm_audience_memberships
      for select to authenticated
      using (public.crm_audience_projection_can_read_account(account_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_audience_destination_bindings'
      and policyname = 'crm_audience_destination_bindings_user_roles_read'
  ) then
    create policy crm_audience_destination_bindings_user_roles_read
      on public.crm_audience_destination_bindings
      for select to authenticated
      using (public.crm_audience_projection_can_read_account(account_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crm_audience_sync_runs'
      and policyname = 'crm_audience_sync_runs_user_roles_read'
  ) then
    create policy crm_audience_sync_runs_user_roles_read
      on public.crm_audience_sync_runs
      for select to authenticated
      using (public.crm_audience_projection_can_read_account(account_id));
  end if;
end $$;

comment on function public.crm_audience_projection_can_read_account(uuid) is
  'Tenant-read helper for CRM audience projection tables using production user_roles membership. Does not grant access to hashed identities, sync events or suppressions.';
