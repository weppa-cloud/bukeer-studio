/**
 * Google Ads — Offline Conversion Upload client (F2 / EPIC #419).
 *
 * Sends server-side conversions to the Google Ads Conversions Upload API
 * (a.k.a. "Enhanced Conversions for Leads") so that bookings confirmed in
 * the CRM can be matched back to the originating Ads click via `gclid`.
 *
 * Why this lives here and not in a shared `lib/ads/`:
 *   - Mirrors the per-platform layout used by `lib/meta/conversions-api.ts`.
 *   - F1 (`lib/funnel/dispatch.ts`) imports this module from the
 *     `google_ads` dispatcher branch (`lib/funnel/destinations/google-ads.ts`).
 *
 * Status of the actual API call:
 *   The upload-to-Google call below is intentionally STUBBED. The full client
 *   structure, hashing, idempotent log and retry semantics are implemented
 *   and tested with a mocked fetch — but the real Google Ads API integration
 *   requires a developer token + service-account validation that cannot be
 *   exercised in this session. See the marked TODO in `sendOfflineUpload`.
 *
 * Reference: https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('google_ads.offline-upload');

const PROVIDER = 'google_ads';
const DEFAULT_API_VERSION = 'v18';

export type GoogleAdsAuthType = 'service_account' | 'oauth2_refresh_token';
export type GoogleAdsConversionStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface GoogleAdsConfig {
  enabled?: boolean;
  developerToken?: string | null;
  loginCustomerId?: string | null;
  customerId?: string | null;
  authType?: GoogleAdsAuthType;
  credentialsPath?: string | null;
  apiVersion?: string | null;
  endpointBase?: string;
}

export interface GoogleAdsUserIdentifierInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  street?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

export interface OfflineConversionInput {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  conversionActionId: string;
  conversionDateTime: string;
  conversionValue?: number;
  currencyCode?: string;
  orderId?: string;
  userIdentifiers?: GoogleAdsUserIdentifierInput;
}

export interface OfflineConversionTrace {
  accountId?: string | null;
  websiteId?: string | null;
  funnelEventId?: string | null;
  bookingId?: string | null;
  trace?: Record<string, unknown>;
}

export interface GoogleAdsProviderResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface SendOfflineUploadResult {
  status: GoogleAdsConversionStatus;
  conversionActionId: string;
  request: GoogleAdsConversionUploadRequest;
  providerResponse?: GoogleAdsProviderResponse;
  error?: string;
  skippedReason?: string;
  deduped?: boolean;
}

interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface SupabaseQueryLike {
  select?: (...args: unknown[]) => SupabaseQueryLike | unknown;
  eq?: (...args: unknown[]) => SupabaseQueryLike | unknown;
  maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
  then?: PromiseLike<{ data?: unknown; error?: SupabaseErrorLike | null }>['then'];
}

export interface GoogleAdsConversionUploadRequest {
  customerId: string;
  conversions: GoogleAdsConversionEntry[];
  partialFailure: boolean;
  validateOnly: boolean;
}

export interface GoogleAdsConversionEntry {
  conversionAction: string;
  conversionDateTime: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  conversionValue?: number;
  currencyCode?: string;
  orderId?: string;
  userIdentifiers?: GoogleAdsUserIdentifier[];
}

export interface GoogleAdsUserIdentifier {
  hashedEmail?: string;
  hashedPhoneNumber?: string;
  addressInfo?: {
    hashedFirstName?: string;
    hashedLastName?: string;
    hashedStreetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  userIdentifierSource?: 'FIRST_PARTY';
}

function cleanString(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeForHash(value: string | null | undefined): string | undefined {
  return cleanString(value)?.toLowerCase();
}

function normalizePhoneForHash(value: string | null | undefined): string | undefined {
  const trimmed = cleanString(value);
  if (!trimmed) return undefined;
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : undefined;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits || undefined;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return bytesToHex(digest);
}

async function hashIfPresent(value: string | undefined): Promise<string | undefined> {
  return value ? await sha256Hex(value) : undefined;
}

export function resolveGoogleAdsConfig(
  overrides: GoogleAdsConfig = {},
): Required<Pick<GoogleAdsConfig, 'endpointBase' | 'apiVersion'>> & GoogleAdsConfig {
  return {
    enabled:
      overrides.enabled ??
      process.env.GOOGLE_ADS_OFFLINE_UPLOAD_ENABLED === 'true',
    developerToken:
      overrides.developerToken ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? null,
    loginCustomerId:
      overrides.loginCustomerId ??
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ??
      null,
    customerId:
      overrides.customerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID ?? null,
    authType:
      overrides.authType ??
      ((process.env.GOOGLE_ADS_AUTH_TYPE as GoogleAdsAuthType | undefined) ??
        'service_account'),
    credentialsPath:
      overrides.credentialsPath ??
      process.env.GOOGLE_ADS_CREDENTIALS_PATH ??
      null,
    apiVersion:
      overrides.apiVersion ?? process.env.GOOGLE_ADS_API_VERSION ?? DEFAULT_API_VERSION,
    endpointBase: overrides.endpointBase ?? 'https://googleads.googleapis.com',
  };
}

export function isGoogleAdsConfigured(config: GoogleAdsConfig): boolean {
  return Boolean(
    config.enabled &&
      cleanString(config.developerToken) &&
      cleanString(config.customerId),
  );
}

export async function buildUserIdentifiers(
  input: GoogleAdsUserIdentifierInput = {},
): Promise<GoogleAdsUserIdentifier[]> {
  const out: GoogleAdsUserIdentifier[] = [];

  const hashedEmail = await hashIfPresent(normalizeForHash(input.email));
  if (hashedEmail) {
    out.push({ hashedEmail, userIdentifierSource: 'FIRST_PARTY' });
  }

  const hashedPhoneNumber = await hashIfPresent(
    normalizePhoneForHash(input.phone),
  );
  if (hashedPhoneNumber) {
    out.push({ hashedPhoneNumber, userIdentifierSource: 'FIRST_PARTY' });
  }

  const hasAddress =
    normalizeForHash(input.firstName) ||
    normalizeForHash(input.lastName) ||
    normalizeForHash(input.street) ||
    cleanString(input.city) ||
    cleanString(input.region) ||
    cleanString(input.postalCode) ||
    cleanString(input.countryCode);

  if (hasAddress) {
    const hashedFirstName = await hashIfPresent(normalizeForHash(input.firstName));
    const hashedLastName = await hashIfPresent(normalizeForHash(input.lastName));
    const hashedStreetAddress = await hashIfPresent(normalizeForHash(input.street));
    out.push({
      addressInfo: {
        ...(hashedFirstName && { hashedFirstName }),
        ...(hashedLastName && { hashedLastName }),
        ...(hashedStreetAddress && { hashedStreetAddress }),
        ...(cleanString(input.city) && { city: cleanString(input.city)! }),
        ...(cleanString(input.region) && { state: cleanString(input.region)! }),
        ...(cleanString(input.postalCode) && {
          postalCode: cleanString(input.postalCode)!,
        }),
        ...(cleanString(input.countryCode) && {
          countryCode: cleanString(input.countryCode)!.toUpperCase(),
        }),
      },
      userIdentifierSource: 'FIRST_PARTY',
    });
  }

  return out;
}

function conversionActionResource(customerId: string, actionId: string): string {
  return `customers/${customerId}/conversionActions/${actionId}`;
}

export async function buildOfflineConversionRequest(
  input: OfflineConversionInput,
  config: GoogleAdsConfig = {},
): Promise<GoogleAdsConversionUploadRequest> {
  const resolved = resolveGoogleAdsConfig(config);
  const customerId = cleanString(resolved.customerId);
  if (!customerId) {
    throw new Error('GOOGLE_ADS_CUSTOMER_ID is required to build a request');
  }

  const userIdentifiers = await buildUserIdentifiers(input.userIdentifiers);

  const entry: GoogleAdsConversionEntry = {
    conversionAction: conversionActionResource(customerId, input.conversionActionId),
    conversionDateTime: input.conversionDateTime,
    ...(input.gclid && { gclid: input.gclid }),
    ...(input.gbraid && { gbraid: input.gbraid }),
    ...(input.wbraid && { wbraid: input.wbraid }),
    ...(typeof input.conversionValue === 'number' && {
      conversionValue: input.conversionValue,
    }),
    ...(input.currencyCode && { currencyCode: input.currencyCode }),
    ...(input.orderId && { orderId: input.orderId }),
    ...(userIdentifiers.length > 0 && { userIdentifiers }),
  };

  return {
    customerId,
    conversions: [entry],
    partialFailure: false,
    validateOnly: false,
  };
}

export function redactGoogleAdsProviderResponse(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(redactGoogleAdsProviderResponse);

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (/access[_-]?token|developer[_-]?token|secret|password/i.test(key)) {
      output[key] = '[redacted]';
    } else {
      output[key] = redactGoogleAdsProviderResponse(value);
    }
  }
  return output;
}

async function sendOfflineUpload(
  request: GoogleAdsConversionUploadRequest,
  config: Required<Pick<GoogleAdsConfig, 'endpointBase' | 'apiVersion'>> & GoogleAdsConfig,
  fetchImpl: typeof fetch = fetch,
  accessToken?: string,
): Promise<GoogleAdsProviderResponse> {
  // TODO[F2-followup]: real Google Ads API integration pending dev token +
  // auth validation. Replace stubbed early-return with real OAuth/JWT
  // exchange once GOOGLE_ADS_DEVELOPER_TOKEN is validated.

  const url = `${config.endpointBase.replace(/\/$/, '')}/${config.apiVersion}/customers/${request.customerId}:uploadClickConversions`;

  if (!accessToken) {
    log.info('google_ads.offline-upload.stub', {
      url,
      customer_id: request.customerId,
      conversions: request.conversions.length,
    });
    return {
      ok: true,
      status: 202,
      body: redactGoogleAdsProviderResponse({
        stub: true,
        results: request.conversions.map((c) => ({
          conversionAction: c.conversionAction,
          conversionDateTime: c.conversionDateTime,
        })),
      }),
    };
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  };
  if (cleanString(config.developerToken)) {
    headers['developer-token'] = cleanString(config.developerToken)!;
  }
  if (cleanString(config.loginCustomerId)) {
    headers['login-customer-id'] = cleanString(config.loginCustomerId)!;
  }

  const response = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversions: request.conversions,
      partialFailure: request.partialFailure,
      validateOnly: request.validateOnly,
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text().catch(() => null);
  }

  return {
    ok: response.ok,
    status: response.status,
    body: redactGoogleAdsProviderResponse(body),
  };
}

function buildLogRow(
  input: OfflineConversionInput & OfflineConversionTrace,
  request: GoogleAdsConversionUploadRequest,
  status: GoogleAdsConversionStatus,
  details: { error?: string; providerResponse?: unknown } = {},
): Record<string, unknown> {
  return {
    provider: PROVIDER,
    account_id: input.accountId ?? null,
    website_id: input.websiteId ?? null,
    funnel_event_id: input.funnelEventId ?? null,
    booking_id: input.bookingId ?? null,
    conversion_action_id: input.conversionActionId,
    gclid: input.gclid ?? null,
    gbraid: input.gbraid ?? null,
    wbraid: input.wbraid ?? null,
    conversion_value: input.conversionValue ?? null,
    currency_code: input.currencyCode ?? null,
    conversion_date_time: input.conversionDateTime,
    status,
    request_payload: request,
    provider_response: details.providerResponse ?? null,
    error: details.error ?? null,
    trace: {
      ...(input.accountId && { account_id: input.accountId }),
      ...(input.websiteId && { website_id: input.websiteId }),
      ...(input.funnelEventId && { funnel_event_id: input.funnelEventId }),
      ...(input.bookingId && { booking_id: input.bookingId }),
      ...(input.trace ?? {}),
    },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };
}

async function insertOfflineUploadLog(
  supabase: SupabaseLike,
  row: Record<string, unknown>,
): Promise<{ row: unknown; deduped: boolean }> {
  const insertQuery = supabase.from('google_ads_offline_uploads').insert?.(row) as
    | {
        select?: (...args: unknown[]) => unknown;
        maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
      }
    | undefined;
  const insertSelected = insertQuery?.select?.('*') as
    | { maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }> }
    | undefined;
  const insertResult = await insertSelected?.maybeSingle?.();

  if (!insertResult) return { row: null, deduped: false };
  if (!insertResult.error) return { row: insertResult.data, deduped: false };
  if (insertResult.error.code !== '23505') {
    throw new Error(insertResult.error.message);
  }

  const selectQuery = supabase
    .from('google_ads_offline_uploads')
    .select?.('*') as SupabaseQueryLike | undefined;
  const byEvent = selectQuery?.eq?.(
    'funnel_event_id',
    row.funnel_event_id,
  ) as SupabaseQueryLike | undefined;
  const byAction = byEvent?.eq?.(
    'conversion_action_id',
    row.conversion_action_id,
  ) as SupabaseQueryLike | undefined;
  const existing = await byAction?.maybeSingle?.();
  if (existing?.error) throw new Error(existing.error.message);
  return { row: existing?.data ?? null, deduped: true };
}

async function updateOfflineUploadLog(
  supabase: SupabaseLike,
  funnelEventId: string,
  conversionActionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const query = supabase
    .from('google_ads_offline_uploads')
    .update?.(patch) as SupabaseQueryLike | undefined;
  const byEvent = query?.eq?.(
    'funnel_event_id',
    funnelEventId,
  ) as SupabaseQueryLike | undefined;
  const byAction = byEvent?.eq?.(
    'conversion_action_id',
    conversionActionId,
  ) as SupabaseQueryLike | undefined;
  const updateResult = byAction?.then
    ? await (byAction as PromiseLike<{ error?: SupabaseErrorLike | null }>)
    : undefined;
  if (updateResult?.error) throw new Error(updateResult.error.message);
}

export interface SendOfflineConversionDeps {
  supabase?: SupabaseLike;
  config?: GoogleAdsConfig;
  fetchImpl?: typeof fetch;
  accessToken?: string;
}

export async function sendOfflineConversionUpload(
  input: OfflineConversionInput & OfflineConversionTrace,
  deps: SendOfflineConversionDeps = {},
): Promise<SendOfflineUploadResult> {
  const config = resolveGoogleAdsConfig(deps.config);

  if (!input.gclid && !input.gbraid && !input.wbraid) {
    return {
      status: 'skipped',
      conversionActionId: input.conversionActionId,
      request: {
        customerId: cleanString(config.customerId) ?? '',
        conversions: [],
        partialFailure: false,
        validateOnly: false,
      },
      skippedReason: 'no_click_id',
    };
  }

  const request = await buildOfflineConversionRequest(input, config);

  if (!isGoogleAdsConfigured(config)) {
    const skippedReason =
      'Google Ads offline upload disabled or missing GOOGLE_ADS_DEVELOPER_TOKEN/CUSTOMER_ID';
    if (deps.supabase && input.funnelEventId) {
      try {
        await insertOfflineUploadLog(
          deps.supabase,
          buildLogRow(input, request, 'skipped', { error: skippedReason }),
        );
      } catch (err) {
        log.warn('log_insert_failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return {
      status: 'skipped',
      conversionActionId: input.conversionActionId,
      request,
      skippedReason,
    };
  }

  let deduped = false;
  if (deps.supabase && input.funnelEventId) {
    const inserted = await insertOfflineUploadLog(
      deps.supabase,
      buildLogRow(input, request, 'pending'),
    );
    deduped = inserted.deduped;
    if (deduped) {
      return {
        status: 'skipped',
        conversionActionId: input.conversionActionId,
        request,
        skippedReason: 'Duplicate Google Ads offline upload row',
        deduped: true,
      };
    }
  }

  try {
    const providerResponse = await sendOfflineUpload(
      request,
      config,
      deps.fetchImpl ?? fetch,
      deps.accessToken,
    );
    const status: GoogleAdsConversionStatus = providerResponse.ok ? 'sent' : 'failed';
    if (deps.supabase && input.funnelEventId) {
      await updateOfflineUploadLog(
        deps.supabase,
        input.funnelEventId,
        input.conversionActionId,
        {
          status,
          provider_response: providerResponse.body,
          error: providerResponse.ok
            ? null
            : `Google Ads API returned HTTP ${providerResponse.status}`,
          sent_at: providerResponse.ok ? new Date().toISOString() : null,
        },
      );
    }
    return {
      status,
      conversionActionId: input.conversionActionId,
      request,
      providerResponse,
      deduped,
      ...(providerResponse.ok
        ? {}
        : { error: `Google Ads API returned HTTP ${providerResponse.status}` }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('send_failed', {
      conversion_action_id: input.conversionActionId,
      error: message,
    });
    if (deps.supabase && input.funnelEventId) {
      await updateOfflineUploadLog(
        deps.supabase,
        input.funnelEventId,
        input.conversionActionId,
        {
          status: 'failed',
          error: message,
        },
      );
    }
    return {
      status: 'failed',
      conversionActionId: input.conversionActionId,
      request,
      error: message,
      deduped,
    };
  }
}
