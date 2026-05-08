-- ============================================================================
-- Meta CAPI tenant channel contract — #419 / #454
-- ============================================================================
-- Seeds the service channel used by dispatch-funnel-event to resolve Meta CAPI
-- config per tenant. Credentials stay in account_channel_contracts, never in
-- websites.analytics; websites.analytics.facebook_pixel_id remains the public
-- browser Pixel contract.

insert into public.service_channels (
  code,
  display_name,
  service_type,
  channel_type,
  api_base_url,
  api_sandbox_url,
  api_format,
  auth_method,
  rate_limit_per_minute,
  default_timeout_ms,
  max_timeout_ms,
  supports_search,
  supports_booking,
  supports_cancellation,
  supports_modifications,
  status,
  documentation_url,
  config
)
values (
  'meta_capi',
  'Meta Conversions API',
  'activities',
  'direct',
  'https://graph.facebook.com',
  null,
  'rest',
  'bearer',
  600,
  10000,
  30000,
  false,
  false,
  false,
  false,
  'active',
  'https://developers.facebook.com/docs/marketing-api/conversions-api/',
  jsonb_build_object(
    'credential_contract', jsonb_build_object(
      'credentials_encrypted', jsonb_build_array(
        'meta_access_token',
        'access_token',
        'conversions_api_access_token'
      ),
      'config', jsonb_build_array(
        'pixel_id',
        'facebook_pixel_id',
        'api_version',
        'test_event_code',
        'enabled'
      )
    ),
    'public_pixel_source', 'websites.analytics.facebook_pixel_id',
    'secret_source', 'account_channel_contracts.credentials_encrypted',
    'fallback_policy', 'env fallback is local/test or explicit allowlist only'
  )
)
on conflict (code) do update
set display_name = excluded.display_name,
    service_type = excluded.service_type,
    channel_type = excluded.channel_type,
    api_base_url = excluded.api_base_url,
    api_format = excluded.api_format,
    auth_method = excluded.auth_method,
    rate_limit_per_minute = excluded.rate_limit_per_minute,
    default_timeout_ms = excluded.default_timeout_ms,
    max_timeout_ms = excluded.max_timeout_ms,
    supports_search = excluded.supports_search,
    supports_booking = excluded.supports_booking,
    supports_cancellation = excluded.supports_cancellation,
    supports_modifications = excluded.supports_modifications,
    status = excluded.status,
    documentation_url = excluded.documentation_url,
    config = public.service_channels.config || excluded.config,
    updated_at = now();
