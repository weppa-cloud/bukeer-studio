-- ============================================================================
-- Growth OS provider runtime foundation (#600)
-- ============================================================================
-- Purpose:
--   Add a safe credential reference for provider integrations and align cache
--   RLS with account membership before certifying the ColombiaTours beta.
--
-- Safety:
--   - Additive, forward-only and idempotent.
--   - Does not move, print or delete existing OAuth/provider secrets.
--   - Keeps service-role writes only.
-- ============================================================================

alter table public.seo_integrations
  add column if not exists credential_ref text;

create index if not exists seo_integrations_credential_ref_idx
  on public.seo_integrations(credential_ref)
  where credential_ref is not null;

comment on column public.seo_integrations.credential_ref is
  'Opaque Vault/secret-manager reference for provider credentials. Do not store raw provider secrets in metadata.';

drop policy if exists growth_gsc_cache_account_read on public.growth_gsc_cache;
create policy growth_gsc_cache_account_read
  on public.growth_gsc_cache
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_gsc_cache.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

drop policy if exists growth_ga4_cache_account_read on public.growth_ga4_cache;
create policy growth_ga4_cache_account_read
  on public.growth_ga4_cache
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_ga4_cache.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

drop policy if exists growth_dataforseo_cache_account_read on public.growth_dataforseo_cache;
create policy growth_dataforseo_cache_account_read
  on public.growth_dataforseo_cache
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.account_id = growth_dataforseo_cache.account_id
        and ur.user_id = auth.uid()
        and ur.is_active = true
    )
  );

comment on policy growth_gsc_cache_account_read on public.growth_gsc_cache is
  'Tenant-scoped read via user_roles account membership; fixes account_id/auth.uid mismatch.';
comment on policy growth_ga4_cache_account_read on public.growth_ga4_cache is
  'Tenant-scoped read via user_roles account membership; fixes account_id/auth.uid mismatch.';
comment on policy growth_dataforseo_cache_account_read on public.growth_dataforseo_cache is
  'Tenant-scoped read via user_roles account membership; fixes account_id/auth.uid mismatch.';
