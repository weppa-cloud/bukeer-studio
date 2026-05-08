import {
  isMetaChannelContract,
  resolveTenantMetaConfig,
} from '../../../supabase/functions/dispatch-funnel-event/tenant-meta-config';

function env(values: Record<string, string | undefined>) {
  return {
    get(key: string) {
      return values[key];
    },
  };
}

describe('dispatch-funnel-event tenant Meta config', () => {
  it('resolves Pixel from website analytics and CAPI token from active tenant channel credentials', () => {
    const config = resolveTenantMetaConfig({
      accountId: 'tenant-a',
      websiteAnalytics: { facebook_pixel_id: '361881980826384' },
      contractConfig: { enabled: true, api_version: 'v21.0', test_event_code: 'TEST123' },
      contractCredentials: { meta_access_token: 'tenant-token-a' },
      env: env({ META_PIXEL_ID: 'global-pixel', META_ACCESS_TOKEN: 'global-token' }),
    });

    expect(config).toMatchObject({
      enabled: true,
      pixelId: '361881980826384',
      accessToken: 'tenant-token-a',
      apiVersion: 'v21.0',
      testEventCode: 'TEST123',
      source: 'tenant_channel',
    });
  });

  it('marks missing tenant credentials as skipped instead of falling back to global env', () => {
    const config = resolveTenantMetaConfig({
      accountId: 'tenant-a',
      websiteAnalytics: { facebook_pixel_id: '361881980826384' },
      contractConfig: { enabled: true },
      contractCredentials: {},
      env: env({
        META_CONVERSIONS_API_ENABLED: 'true',
        META_PIXEL_ID: 'global-pixel',
        META_ACCESS_TOKEN: 'global-token',
      }),
    });

    expect(config).toMatchObject({
      enabled: false,
      pixelId: '361881980826384',
      source: 'tenant_channel',
      reason: 'missing_tenant_meta_config',
    });
  });

  it('allows legacy env fallback only for explicitly allowlisted tenants', () => {
    const config = resolveTenantMetaConfig({
      accountId: 'tenant-a',
      websiteAnalytics: { facebook_pixel_id: '361881980826384' },
      contractConfig: {},
      contractCredentials: {},
      env: env({
        FUNNEL_META_LEGACY_ENV_FALLBACK_ACCOUNT_IDS: 'tenant-a',
        META_CONVERSIONS_API_ENABLED: 'true',
        META_PIXEL_ID: 'legacy-pixel',
        META_ACCESS_TOKEN: 'legacy-token',
      }),
    });

    expect(config).toMatchObject({
      enabled: true,
      pixelId: 'legacy-pixel',
      accessToken: 'legacy-token',
      source: 'legacy_env',
    });
  });

  it('recognizes Meta contracts from joined service_channels metadata', () => {
    expect(isMetaChannelContract({
      config: {},
      credentials_encrypted: {},
      service_channels: {
        code: 'meta_capi',
        display_name: 'Meta Conversions API',
        service_type: 'activities',
        channel_type: 'direct',
      },
    })).toBe(true);

    expect(isMetaChannelContract({
      service_channels: {
        code: 'hotelbeds',
        display_name: 'Hotelbeds',
      },
    })).toBe(false);
  });
});
