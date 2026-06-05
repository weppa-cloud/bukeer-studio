export type CredentialProbeProvider = 'dataforseo' | 'gsc' | 'ga4';
export type CredentialProbeStatus = 'PASS' | 'WARN' | 'FAIL';

export interface ProviderIntegrationCredentialState {
  provider: CredentialProbeProvider;
  status?: string | null;
  site_url?: string | null;
  property_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_expires_at?: string | null;
  credential_ref?: string | null;
  last_error?: string | null;
}

export interface GoogleCredentialProbeSecret {
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_expires_at?: string | null;
  site_url?: string | null;
  property_id?: string | null;
}

export interface CredentialProbeResult {
  provider: CredentialProbeProvider;
  status: CredentialProbeStatus;
  reason: string;
  credential_ref_present: boolean;
  legacy_token_present: boolean;
  expires_at: string | null;
  checked_at: string;
  http_status?: number;
  provider_status_code?: number | null;
  secrets_redacted: true;
}

export interface CredentialProbeFetch {
  (input: string, init?: { headers?: Record<string, string> }): Promise<{
    status: number;
    json(): Promise<unknown>;
  }>;
}

export async function probeProviderCredential(input: {
  provider: CredentialProbeProvider;
  integration?: ProviderIntegrationCredentialState | null;
  env?: Record<string, string | undefined>;
  now?: string;
  fetchImpl?: CredentialProbeFetch;
  resolveSecret?: (input: {
    provider: 'gsc' | 'ga4';
    integration: ProviderIntegrationCredentialState;
  }) => Promise<GoogleCredentialProbeSecret | null>;
}): Promise<CredentialProbeResult> {
  const checkedAt = input.now ?? new Date().toISOString();
  if (input.provider === 'dataforseo') {
    return probeDataForSeoCredential({
      env: input.env ?? process.env,
      checkedAt,
      fetchImpl: input.fetchImpl ?? fetch,
    });
  }

  return probeGoogleCredential({
    provider: input.provider,
    integration: input.integration,
    checkedAt,
    fetchImpl: input.fetchImpl ?? fetch,
    resolveSecret: input.resolveSecret,
  });
}

async function probeDataForSeoCredential(input: {
  env: Record<string, string | undefined>;
  checkedAt: string;
  fetchImpl: CredentialProbeFetch;
}): Promise<CredentialProbeResult> {
  const login = input.env.DATAFORSEO_LOGIN?.trim();
  const password = input.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) {
    return result({
      provider: 'dataforseo',
      status: 'FAIL',
      reason: 'missing_dataforseo_env_credentials',
      checkedAt: input.checkedAt,
    });
  }

  const response = await input.fetchImpl('https://api.dataforseo.com/v3/appendix/user_data', {
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
    },
  });
  const payload = asRecord(await response.json().catch(() => null));
  const statusCode = typeof payload.status_code === 'number' ? payload.status_code : null;
  return result({
    provider: 'dataforseo',
    status: response.status === 200 && statusCode === 20000 ? 'PASS' : 'FAIL',
    reason: response.status === 200 && statusCode === 20000 ? 'dataforseo_user_data_ok' : 'dataforseo_user_data_failed',
    checkedAt: input.checkedAt,
    httpStatus: response.status,
    providerStatusCode: statusCode,
  });
}

async function probeGoogleCredential(input: {
  provider: 'gsc' | 'ga4';
  integration?: ProviderIntegrationCredentialState | null;
  checkedAt: string;
  fetchImpl: CredentialProbeFetch;
  resolveSecret?: (input: {
    provider: 'gsc' | 'ga4';
    integration: ProviderIntegrationCredentialState;
  }) => Promise<GoogleCredentialProbeSecret | null>;
}): Promise<CredentialProbeResult> {
  let integration = input.integration;
  if (!integration) {
    return result({
      provider: input.provider,
      status: 'FAIL',
      reason: 'missing_seo_integration',
      checkedAt: input.checkedAt,
    });
  }
  const rawLegacyTokenPresent = Boolean(integration.access_token || integration.refresh_token);

  if (integration.credential_ref && input.resolveSecret) {
    const secret = await input.resolveSecret({ provider: input.provider, integration });
    if (secret) {
      integration = {
        ...integration,
        access_token: textOrNull(secret.access_token),
        refresh_token: textOrNull(secret.refresh_token),
        access_token_expires_at: textOrNull(secret.access_token_expires_at) ?? integration.access_token_expires_at ?? null,
        site_url: integration.site_url ?? textOrNull(secret.site_url),
        property_id: integration.property_id ?? textOrNull(secret.property_id),
      };
    }
  }

  const expiresAt = integration.access_token_expires_at ?? null;
  if (expiresAt && Date.parse(expiresAt) <= Date.parse(input.checkedAt)) {
    return result({
      provider: input.provider,
      status: 'WARN',
      reason: 'needs_refresh_no_write',
      checkedAt: input.checkedAt,
      integration,
      legacyTokenPresent: rawLegacyTokenPresent,
    });
  }

  const accessToken = integration.access_token?.trim();
  if (!accessToken) {
    return result({
      provider: input.provider,
      status: integration.credential_ref ? 'WARN' : 'FAIL',
      reason: integration.credential_ref ? 'credential_ref_present_but_vault_resolution_not_available' : 'missing_access_token',
      checkedAt: input.checkedAt,
      integration,
      legacyTokenPresent: rawLegacyTokenPresent,
    });
  }

  const endpoint = input.provider === 'gsc'
    ? 'https://www.googleapis.com/webmasters/v3/sites'
    : `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(String(integration.property_id ?? ''))}/metadata`;
  if (input.provider === 'ga4' && !integration.property_id) {
    return result({
      provider: input.provider,
      status: 'FAIL',
      reason: 'missing_ga4_property_id',
      checkedAt: input.checkedAt,
      integration,
      legacyTokenPresent: rawLegacyTokenPresent,
    });
  }

  const response = await input.fetchImpl(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result({
    provider: input.provider,
    status: response.status >= 200 && response.status < 300 ? 'PASS' : 'FAIL',
    reason: response.status >= 200 && response.status < 300 ? `${input.provider}_read_only_probe_ok` : `${input.provider}_read_only_probe_failed`,
    checkedAt: input.checkedAt,
    integration,
    legacyTokenPresent: rawLegacyTokenPresent,
    httpStatus: response.status,
  });
}

function result(input: {
  provider: CredentialProbeProvider;
  status: CredentialProbeStatus;
  reason: string;
  checkedAt: string;
  integration?: ProviderIntegrationCredentialState | null;
  legacyTokenPresent?: boolean;
  httpStatus?: number;
  providerStatusCode?: number | null;
}): CredentialProbeResult {
  return {
    provider: input.provider,
    status: input.status,
    reason: input.reason,
    credential_ref_present: Boolean(input.integration?.credential_ref),
    legacy_token_present: input.legacyTokenPresent ?? Boolean(input.integration?.access_token || input.integration?.refresh_token),
    expires_at: input.integration?.access_token_expires_at ?? null,
    checked_at: input.checkedAt,
    http_status: input.httpStatus,
    provider_status_code: input.providerStatusCode,
    secrets_redacted: true,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
