export interface EnvLike {
  get(key: string): string | undefined;
}

export interface TenantMetaConfigInput {
  accountId: string;
  websiteAnalytics?: unknown;
  contractConfig?: unknown;
  contractCredentials?: unknown;
  env?: EnvLike;
}

export interface TenantMetaConfig {
  enabled: boolean;
  pixelId?: string;
  accessToken?: string;
  apiVersion: string;
  testEventCode?: string;
  source: 'tenant_channel' | 'legacy_env';
  reason?: 'missing_tenant_meta_config' | 'disabled';
}

const DEFAULT_META_API_VERSION = 'v21.0';

function cleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const direct = cleanString(source[key]);
    if (direct) return direct;

    const parts = key.split('.');
    if (parts.length > 1) {
      let current: unknown = source;
      for (const part of parts) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
          current = undefined;
          break;
        }
        current = (current as Record<string, unknown>)[part];
      }
      const nested = cleanString(current);
      if (nested) return nested;
    }
  }
  return undefined;
}

function readBoolean(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }
  return undefined;
}

function legacyFallbackAllowed(accountId: string, env?: EnvLike): boolean {
  const raw = env?.get('FUNNEL_META_LEGACY_ENV_FALLBACK_ACCOUNT_IDS');
  if (!raw) return false;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(accountId);
}

export function isMetaChannelContract(contract: unknown): boolean {
  const row = parseJsonObject(contract);
  const channel = parseJsonObject(row.service_channels);
  const haystack = [
    row.code,
    row.display_name,
    row.service_type,
    row.channel_type,
    channel.code,
    channel.display_name,
    channel.service_type,
    channel.channel_type,
  ]
    .map((value) => cleanString(value)?.toLowerCase())
    .filter(Boolean)
    .join(' ');

  return ['meta', 'facebook', 'capi', 'pixel'].some((token) => haystack.includes(token));
}

export function resolveTenantMetaConfig(input: TenantMetaConfigInput): TenantMetaConfig {
  const analytics = parseJsonObject(input.websiteAnalytics);
  const config = parseJsonObject(input.contractConfig);
  const credentials = parseJsonObject(input.contractCredentials);

  const enabled = readBoolean(config, [
    'enabled',
    'meta_enabled',
    'meta_capi_enabled',
    'conversions_api_enabled',
  ]) ?? true;

  const pixelId =
    readString(config, ['pixel_id', 'meta_pixel_id', 'facebook_pixel_id', 'meta.pixel_id']) ??
    readString(credentials, ['pixel_id', 'meta_pixel_id', 'facebook_pixel_id', 'meta.pixel_id']) ??
    readString(analytics, ['facebook_pixel_id']);

  const accessToken =
    readString(credentials, [
      'access_token',
      'meta_access_token',
      'conversions_api_access_token',
      'meta.access_token',
      'meta.conversions_api_access_token',
    ]) ??
    readString(config, [
      'access_token',
      'meta_access_token',
      'conversions_api_access_token',
      'meta.access_token',
      'meta.conversions_api_access_token',
    ]);

  const apiVersion =
    readString(config, ['api_version', 'meta_api_version', 'meta.api_version']) ??
    input.env?.get('META_API_VERSION') ??
    DEFAULT_META_API_VERSION;

  const testEventCode =
    readString(config, ['test_event_code', 'meta_test_event_code', 'meta.test_event_code']) ??
    input.env?.get('META_TEST_EVENT_CODE');

  if (enabled && pixelId && accessToken) {
    return {
      enabled: true,
      pixelId,
      accessToken,
      apiVersion,
      testEventCode,
      source: 'tenant_channel',
    };
  }

  if (legacyFallbackAllowed(input.accountId, input.env)) {
    const legacyEnabled = input.env?.get('META_CONVERSIONS_API_ENABLED') === 'true';
    const legacyPixelId = input.env?.get('META_PIXEL_ID') ?? pixelId;
    const legacyToken = input.env?.get('META_ACCESS_TOKEN');
    if (legacyEnabled && cleanString(legacyPixelId) && cleanString(legacyToken)) {
      return {
        enabled: true,
        pixelId: cleanString(legacyPixelId),
        accessToken: cleanString(legacyToken),
        apiVersion,
        testEventCode,
        source: 'legacy_env',
      };
    }
  }

  return {
    enabled: false,
    pixelId,
    accessToken,
    apiVersion,
    testEventCode,
    source: 'tenant_channel',
    reason: enabled ? 'missing_tenant_meta_config' : 'disabled',
  };
}
