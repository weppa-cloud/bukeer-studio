-- ============================================================================
-- Growth OS provider credential Vault reader (#600)
-- ============================================================================
-- Purpose:
--   Let server-side service-role runtime readers resolve opaque credential_ref
--   values without exposing decrypted provider secrets to public tables or
--   authenticated clients.
--
-- Safety:
--   - EXECUTE is granted only to service_role.
--   - The caller must pass the website/provider/credential_ref tuple.
--   - The function only returns refs matching the canonical
--     seo_integrations/<website_id>/<provider> Vault secret name.
-- ============================================================================

create or replace function public.get_seo_integration_credential_secret(
  p_website_id uuid,
  p_provider text,
  p_credential_ref text
) returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_name text;
  v_secret text;
begin
  if p_website_id is null then
    raise exception 'website_id_required';
  end if;

  if p_provider not in ('gsc', 'ga4', 'dataforseo') then
    raise exception 'unsupported_provider';
  end if;

  v_name := format('seo_integrations/%s/%s', p_website_id::text, p_provider);

  if p_credential_ref is null or p_credential_ref <> 'supabase_vault:' || v_name then
    raise exception 'credential_ref_mismatch';
  end if;

  select ds.decrypted_secret
    into v_secret
    from vault.decrypted_secrets ds
   where ds.name = v_name
   limit 1;

  if v_secret is null or btrim(v_secret) = '' then
    raise exception 'credential_secret_not_found';
  end if;

  return v_secret::jsonb;
end;
$$;

revoke all on function public.get_seo_integration_credential_secret(uuid, text, text) from public;
revoke all on function public.get_seo_integration_credential_secret(uuid, text, text) from anon;
revoke all on function public.get_seo_integration_credential_secret(uuid, text, text) from authenticated;
grant execute on function public.get_seo_integration_credential_secret(uuid, text, text) to service_role;

comment on function public.get_seo_integration_credential_secret(uuid, text, text) is
  'Service-role-only reader for Growth OS provider credentials. Resolves canonical seo_integrations credential_ref values from Supabase Vault. #600.';
