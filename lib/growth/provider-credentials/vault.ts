export type GoogleProviderCredentialProvider = 'gsc' | 'ga4';

export interface GoogleProviderCredentialSecret {
  provider?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_expires_at?: string | null;
  scopes?: string[] | null;
  site_url?: string | null;
  property_id?: string | null;
  updated_at?: string | null;
}

export interface GoogleCredentialIntegrationFields {
  website_id: string;
  credential_ref?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  access_token_expires_at?: string | null;
  site_url?: string | null;
  property_id?: string | null;
  scopes?: string[] | null;
}

export interface HydratedGoogleCredential<T extends GoogleCredentialIntegrationFields> {
  integration: T;
  credentialSource: 'vault' | 'legacy';
  secret: GoogleProviderCredentialSecret | null;
}

interface SupabaseRpcClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): unknown;
}

export async function resolveGoogleProviderCredentialSecret(input: {
  supabase: SupabaseRpcClient;
  websiteId: string;
  provider: GoogleProviderCredentialProvider;
  credentialRef: string;
}): Promise<GoogleProviderCredentialSecret> {
  if (!input.credentialRef.startsWith('supabase_vault:')) {
    throw new Error('Unsupported credential_ref scheme');
  }

  const { data, error } = await input.supabase.rpc('get_seo_integration_credential_secret', {
    p_website_id: input.websiteId,
    p_provider: input.provider,
    p_credential_ref: input.credentialRef,
  }) as { data: unknown; error: { message?: string } | null };
  if (error) {
    throw new Error(`Failed to resolve ${input.provider} credential_ref`);
  }

  return normalizeGoogleProviderCredentialSecret(data);
}

export async function storeGoogleProviderCredentialSecret(input: {
  supabase: SupabaseRpcClient;
  websiteId: string;
  provider: GoogleProviderCredentialProvider;
  secret: GoogleProviderCredentialSecret;
}): Promise<string> {
  const { data, error } = await input.supabase.rpc('store_seo_integration_credential_secret', {
    p_website_id: input.websiteId,
    p_provider: input.provider,
    p_secret: {
      ...input.secret,
      provider: input.provider,
      updated_at: input.secret.updated_at ?? new Date().toISOString(),
    },
  }) as { data: unknown; error: { message?: string } | null };
  if (error || typeof data !== 'string') {
    throw new Error(`Failed to store ${input.provider} credential_ref`);
  }
  return data;
}

export async function hydrateGoogleCredential<T extends GoogleCredentialIntegrationFields>(input: {
  supabase: SupabaseRpcClient;
  provider: GoogleProviderCredentialProvider;
  integration: T;
}): Promise<HydratedGoogleCredential<T>> {
  const credentialRef = input.integration.credential_ref?.trim();
  if (!credentialRef) {
    return { integration: input.integration, credentialSource: 'legacy', secret: null };
  }

  const secret = await resolveGoogleProviderCredentialSecret({
    supabase: input.supabase,
    websiteId: input.integration.website_id,
    provider: input.provider,
    credentialRef,
  });

  return {
    integration: {
      ...input.integration,
      access_token: textOrNull(secret.access_token),
      refresh_token: textOrNull(secret.refresh_token),
      access_token_expires_at: textOrNull(secret.access_token_expires_at) ?? input.integration.access_token_expires_at ?? null,
      site_url: input.integration.site_url ?? textOrNull(secret.site_url),
      property_id: input.integration.property_id ?? textOrNull(secret.property_id),
      scopes: Array.isArray(secret.scopes) ? secret.scopes : input.integration.scopes ?? null,
    },
    credentialSource: 'vault',
    secret,
  };
}

export function mergeRefreshedGoogleSecret(input: {
  provider: GoogleProviderCredentialProvider;
  integration: GoogleCredentialIntegrationFields;
  secret: GoogleProviderCredentialSecret | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}): GoogleProviderCredentialSecret {
  return {
    ...(input.secret ?? {}),
    provider: input.provider,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    access_token_expires_at: input.expiresAt,
    scopes: input.secret?.scopes ?? input.integration.scopes ?? [],
    site_url: input.integration.site_url ?? input.secret?.site_url ?? null,
    property_id: input.integration.property_id ?? input.secret?.property_id ?? null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeGoogleProviderCredentialSecret(value: unknown): GoogleProviderCredentialSecret {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  const record = isRecord(parsed) ? parsed : {};
  return {
    provider: textOrNull(record.provider),
    access_token: textOrNull(record.access_token),
    refresh_token: textOrNull(record.refresh_token),
    access_token_expires_at: textOrNull(record.access_token_expires_at),
    scopes: Array.isArray(record.scopes) ? record.scopes.map(String) : null,
    site_url: textOrNull(record.site_url),
    property_id: textOrNull(record.property_id),
    updated_at: textOrNull(record.updated_at),
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
