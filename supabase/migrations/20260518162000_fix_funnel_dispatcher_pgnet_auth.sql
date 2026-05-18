-- Fix Funnel Events dispatcher pg_net auth - #419 / #456
--
-- Production drift found on 2026-05-18:
-- public.fn_invoke_dispatch_funnel_event had a hardcoded Edge Function URL and
-- called pg_net without Authorization, causing 401 UNAUTHORIZED_NO_AUTH_HEADER.
--
-- Secrets are intentionally not stored in this migration. Operators should set:
--   ALTER DATABASE postgres SET app.dispatch_function_url = 'https://<ref>.functions.supabase.co/dispatch-funnel-event';
--
-- The service-role key is read from app.dispatch_service_role_key when present,
-- otherwise from Supabase Vault secret `service_role_key`.

create or replace function public.fn_invoke_dispatch_funnel_event(
  p_event_id text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url     text := current_setting('app.dispatch_function_url', true);
  v_key     text := current_setting('app.dispatch_service_role_key', true);
  v_request bigint;
begin
  if v_url is null or v_url = '' then
    v_url := 'https://wzlxbpicdcdvxvdcvgas.functions.supabase.co/dispatch-funnel-event';
  end if;

  if v_key is null or v_key = '' then
    select ds.decrypted_secret
      into v_key
      from vault.decrypted_secrets ds
     where ds.name = 'service_role_key'
     limit 1;
  end if;

  if v_url is null or v_url = '' then
    return false;
  end if;

  if v_key is null or v_key = '' then
    return false;
  end if;

  select net.http_post(
    url := v_url,
    body := jsonb_build_object('funnel_event_id', p_event_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    timeout_milliseconds := 10000
  )
  into v_request;

  return true;
exception when others then
  raise warning 'fn_invoke_dispatch_funnel_event(%) failed: %', p_event_id, sqlerrm;
  return false;
end;
$$;

comment on function public.fn_invoke_dispatch_funnel_event(text) is
  'Issues an async pg_net.http_post to dispatch-funnel-event with service-role auth from app.dispatch_service_role_key or Vault secret service_role_key. Returns false if auth config is absent. #419/#456.';
