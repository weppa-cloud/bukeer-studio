-- ============================================================================
-- Security hardening — ai_cost_events write surface
--
-- Problem:
-- - `log_ai_cost_event` is SECURITY DEFINER.
-- - Function EXECUTE can be inherited via PUBLIC unless explicitly revoked.
-- - Authenticated callers could write cost events cross-account.
--
-- Fix:
-- 1) Revoke EXECUTE from PUBLIC/anon/authenticated.
-- 2) Re-grant EXECUTE only to service_role.
-- 3) Add defense-in-depth guard inside the function body requiring JWT role
--    `service_role`.
-- ============================================================================

create or replace function public.log_ai_cost_event(
  p_account_id uuid,
  p_website_id uuid,
  p_user_id uuid,
  p_feature text,
  p_route text,
  p_model text,
  p_input_tokens int,
  p_output_tokens int,
  p_cost_usd numeric,
  p_status text default 'ok',
  p_rate_limit_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text;
begin
  v_role := coalesce(auth.role(), current_setting('request.jwt.claim.role', true));

  if v_role is distinct from 'service_role' then
    raise exception 'FORBIDDEN: service_role role required';
  end if;

  insert into public.ai_cost_events (
    account_id, website_id, user_id, feature, route, model,
    input_tokens, output_tokens, cost_usd, status, rate_limit_key, metadata
  ) values (
    p_account_id, p_website_id, p_user_id, p_feature, p_route, p_model,
    p_input_tokens, p_output_tokens, p_cost_usd, p_status, p_rate_limit_key, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.log_ai_cost_event(
  uuid, uuid, uuid, text, text, text, int, int, numeric, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.log_ai_cost_event(
  uuid, uuid, uuid, text, text, text, int, int, numeric, text, text, jsonb
) to service_role;

-- Rollback:
-- create or replace function public.log_ai_cost_event(...) ...  -- previous body (without role guard)
-- grant execute on function public.log_ai_cost_event(
--   uuid, uuid, uuid, text, text, text, int, int, numeric, text, text, jsonb
-- ) to authenticated, service_role;
