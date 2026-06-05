-- ============================================================================
-- Growth OS provider credential Vault writer (#600)
-- ============================================================================
-- Purpose:
--   Give server-side service-role code one controlled RPC for storing provider
--   OAuth/API material in Supabase Vault and returning an opaque credential_ref.
--
-- Safety:
--   - Does not expose decrypted secrets through public tables.
--   - EXECUTE is granted only to service_role.
--   - Agents and authenticated clients must keep using snapshots/context packets.
-- ============================================================================

create or replace function public.store_seo_integration_credential_secret(
  p_website_id uuid,
  p_provider text,
  p_secret jsonb
) returns text
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_name text;
  v_description text;
  v_secret_id uuid;
begin
  if p_website_id is null then
    raise exception 'website_id_required';
  end if;

  if p_provider not in ('gsc', 'ga4', 'dataforseo') then
    raise exception 'unsupported_provider';
  end if;

  if p_secret is null or p_secret = '{}'::jsonb then
    raise exception 'secret_payload_required';
  end if;

  v_name := format('seo_integrations/%s/%s', p_website_id::text, p_provider);
  v_description := format('Growth OS provider credential for website %s provider %s', p_website_id::text, p_provider);

  select ds.id
    into v_secret_id
    from vault.decrypted_secrets ds
   where ds.name = v_name
   limit 1;

  if v_secret_id is null then
    perform vault.create_secret(p_secret::text, v_name, v_description);
  else
    perform vault.update_secret(v_secret_id, p_secret::text, v_name, v_description);
  end if;

  return 'supabase_vault:' || v_name;
end;
$$;

revoke all on function public.store_seo_integration_credential_secret(uuid, text, jsonb) from public;
revoke all on function public.store_seo_integration_credential_secret(uuid, text, jsonb) from anon;
revoke all on function public.store_seo_integration_credential_secret(uuid, text, jsonb) from authenticated;
grant execute on function public.store_seo_integration_credential_secret(uuid, text, jsonb) to service_role;

comment on function public.store_seo_integration_credential_secret(uuid, text, jsonb) is
  'Service-role-only writer for Growth OS provider credentials. Stores encrypted payload in Supabase Vault and returns an opaque credential_ref. #600.';
