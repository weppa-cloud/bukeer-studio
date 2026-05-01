import { createLogger } from '@/lib/logger';

const log = createLogger('meta.conversions-api');

const DEFAULT_META_API_VERSION = 'v21.0';
const META_PROVIDER = 'meta';

export type MetaActionSource =
  | 'website'
  | 'app'
  | 'phone_call'
  | 'chat'
  | 'email'
  | 'other'
  | 'business_messaging'
  | 'system_generated';

export type MetaConversionStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface MetaCapiConfig {
  enabled?: boolean;
  pixelId?: string | null;
  accessToken?: string | null;
  apiVersion?: string | null;
  testEventCode?: string | null;
  endpointBase?: string;
}

export interface MetaUserDataInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

export interface MetaConversionEventInput {
  eventName: string;
  eventId: string;
  actionSource?: MetaActionSource;
  messagingChannel?: 'messenger' | 'whatsapp' | 'instagram' | null;
  eventTime?: Date | number;
  eventSourceUrl?: string | null;
  userData?: MetaUserDataInput;
  customData?: Record<string, unknown>;
}

export interface MetaConversionTrace {
  accountId?: string | null;
  websiteId?: string | null;
  waflowLeadId?: string | null;
  chatwootConversationId?: string | null;
  bookingId?: string | null;
  trace?: Record<string, unknown>;
}

export interface MetaCapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: MetaActionSource;
  messaging_channel?: 'messenger' | 'whatsapp' | 'instagram';
  event_source_url?: string;
  user_data: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
}

export interface MetaCapiRequest {
  data: MetaCapiEvent[];
  test_event_code?: string;
}

export interface MetaProviderResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface SendMetaConversionResult {
  status: MetaConversionStatus;
  eventName: string;
  eventId: string;
  request: MetaCapiRequest;
  providerResponse?: MetaProviderResponse;
  error?: string;
  skippedReason?: string;
  deduped?: boolean;
}

interface SupabaseLike {
  // Supabase query builders are generic and chainable; keep this narrow at
  // usage sites instead of trying to mirror the full PostgREST type surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

interface SupabaseQueryLike {
  select?: (...args: unknown[]) => SupabaseQueryLike | unknown;
  eq?: (...args: unknown[]) => SupabaseQueryLike | unknown;
  maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
  then?: PromiseLike<{ data?: unknown; error?: SupabaseErrorLike | null }>['then'];
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function cleanString(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeEmail(value: string | null | undefined): string | undefined {
  return cleanString(value)?.toLowerCase();
}

function normalizePhone(value: string | null | undefined): string | undefined {
  const digits = cleanString(value)?.replace(/\D/g, '');
  return digits || undefined;
}

function normalizeGenericHashValue(value: string | null | undefined): string | undefined {
  return cleanString(value)?.toLowerCase();
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(digest);
}

async function hashIfPresent(value: string | undefined): Promise<string[] | undefined> {
  return value ? [await sha256Hex(value)] : undefined;
}

export function resolveMetaCapiConfig(overrides: MetaCapiConfig = {}): Required<Pick<MetaCapiConfig, 'endpointBase'>> & MetaCapiConfig {
  return {
    enabled:
      overrides.enabled ??
      process.env.META_CHATWOOT_CONVERSIONS_ENABLED === 'true',
    pixelId: overrides.pixelId ?? process.env.META_PIXEL_ID ?? null,
    accessToken: overrides.accessToken ?? process.env.META_ACCESS_TOKEN ?? null,
    apiVersion: overrides.apiVersion ?? process.env.META_API_VERSION ?? DEFAULT_META_API_VERSION,
    testEventCode: overrides.testEventCode ?? process.env.META_TEST_EVENT_CODE ?? null,
    endpointBase: overrides.endpointBase ?? 'https://graph.facebook.com',
  };
}

export function isMetaCapiConfigured(config: MetaCapiConfig): boolean {
  return Boolean(config.enabled && cleanString(config.pixelId) && cleanString(config.accessToken));
}

export async function buildMetaUserData(input: MetaUserDataInput = {}): Promise<Record<string, unknown>> {
  const email = await hashIfPresent(normalizeEmail(input.email));
  const phone = await hashIfPresent(normalizePhone(input.phone));
  const firstName = await hashIfPresent(normalizeGenericHashValue(input.firstName));
  const lastName = await hashIfPresent(normalizeGenericHashValue(input.lastName));
  const externalId = await hashIfPresent(cleanString(input.externalId));

  return {
    ...(email && { em: email }),
    ...(phone && { ph: phone }),
    ...(firstName && { fn: firstName }),
    ...(lastName && { ln: lastName }),
    ...(externalId && { external_id: externalId }),
    ...(cleanString(input.fbp) && { fbp: cleanString(input.fbp) }),
    ...(cleanString(input.fbc) && { fbc: cleanString(input.fbc) }),
    ...(cleanString(input.clientIpAddress) && {
      client_ip_address: cleanString(input.clientIpAddress),
    }),
    ...(cleanString(input.clientUserAgent) && {
      client_user_agent: cleanString(input.clientUserAgent),
    }),
  };
}

export async function buildMetaCapiEvent(input: MetaConversionEventInput): Promise<MetaCapiEvent> {
  const eventTime =
    input.eventTime instanceof Date
      ? Math.floor(input.eventTime.getTime() / 1000)
      : typeof input.eventTime === 'number'
        ? input.eventTime
        : Math.floor(Date.now() / 1000);

  return {
    event_name: input.eventName,
    event_time: eventTime,
    event_id: input.eventId,
    action_source: input.actionSource ?? 'website',
    ...(input.messagingChannel && {
      messaging_channel: input.messagingChannel,
    }),
    ...(cleanString(input.eventSourceUrl) && {
      event_source_url: cleanString(input.eventSourceUrl),
    }),
    user_data: await buildMetaUserData(input.userData),
    ...(input.customData && Object.keys(input.customData).length > 0 && {
      custom_data: input.customData,
    }),
  };
}

export async function buildMetaCapiRequest(
  input: MetaConversionEventInput,
  config: MetaCapiConfig = {},
): Promise<MetaCapiRequest> {
  const resolved = resolveMetaCapiConfig(config);
  const event = await buildMetaCapiEvent(input);

  return {
    data: [event],
    ...(cleanString(resolved.testEventCode) && {
      test_event_code: cleanString(resolved.testEventCode),
    }),
  };
}

function metaEventsUrl(config: Required<Pick<MetaCapiConfig, 'endpointBase'>> & MetaCapiConfig): string {
  const apiVersion = cleanString(config.apiVersion) ?? DEFAULT_META_API_VERSION;
  const pixelId = cleanString(config.pixelId);
  if (!pixelId) throw new Error('META_PIXEL_ID is required');
  const url = new URL(`${config.endpointBase.replace(/\/$/, '')}/${apiVersion}/${pixelId}/events`);
  const accessToken = cleanString(config.accessToken);
  if (!accessToken) throw new Error('META_ACCESS_TOKEN is required');
  url.searchParams.set('access_token', accessToken);
  return url.toString();
}

export function redactMetaProviderResponse(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(redactMetaProviderResponse);

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (/access[_-]?token|token|secret|password/i.test(key)) {
      output[key] = '[redacted]';
    } else {
      output[key] = redactMetaProviderResponse(value);
    }
  }
  return output;
}

export function buildMetaConversionTrace(input: MetaConversionTrace): Record<string, unknown> {
  return {
    ...(input.accountId && { account_id: input.accountId }),
    ...(input.websiteId && { website_id: input.websiteId }),
    ...(input.waflowLeadId && { waflow_lead_id: input.waflowLeadId }),
    ...(input.chatwootConversationId && {
      chatwoot_conversation_id: input.chatwootConversationId,
    }),
    ...(input.bookingId && { booking_id: input.bookingId }),
    ...(input.trace ?? {}),
  };
}

export async function sendMetaCapiRequest(
  request: MetaCapiRequest,
  configOverrides: MetaCapiConfig = {},
  fetchImpl: typeof fetch = fetch,
): Promise<MetaProviderResponse> {
  const config = resolveMetaCapiConfig(configOverrides);
  const response = await fetchImpl(metaEventsUrl(config), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
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
    body: redactMetaProviderResponse(body),
  };
}

function buildLogRow(
  input: MetaConversionEventInput & MetaConversionTrace,
  request: MetaCapiRequest,
  status: MetaConversionStatus,
  details: { error?: string; providerResponse?: unknown } = {},
): Record<string, unknown> {
  const event = request.data[0];

  return {
    provider: META_PROVIDER,
    account_id: input.accountId ?? null,
    website_id: input.websiteId ?? null,
    waflow_lead_id: input.waflowLeadId ?? null,
    chatwoot_conversation_id: input.chatwootConversationId ?? null,
    booking_id: input.bookingId ?? null,
    event_name: event.event_name,
    event_id: event.event_id,
    action_source: event.action_source,
    event_time: new Date(event.event_time * 1000).toISOString(),
    event_source_url: event.event_source_url ?? null,
    status,
    request_payload: request,
    provider_response: details.providerResponse ?? null,
    error: details.error ?? null,
    trace: buildMetaConversionTrace(input),
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };
}

async function insertMetaEventLog(
  supabase: SupabaseLike,
  row: Record<string, unknown>,
): Promise<{ row: unknown; deduped: boolean }> {
  const insertQuery = supabase.from('meta_conversion_events').insert?.(row) as
    | { select?: (...args: unknown[]) => unknown; maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }> }
    | undefined;
  const insertSelected = insertQuery?.select?.('*') as
    | { maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }> }
    | undefined;
  const insertResult = await insertSelected?.maybeSingle?.();

  if (!insertResult) return { row: null, deduped: false };
  if (!insertResult.error) return { row: insertResult.data, deduped: false };
  if (insertResult.error.code !== '23505') throw new Error(insertResult.error.message);

  const selectQuery = supabase
    .from('meta_conversion_events')
    .select?.('*') as
    | { eq?: (...args: unknown[]) => unknown; maybeSingle?: () => Promise<{ data: unknown; error: SupabaseErrorLike | null }> }
    | undefined;
  const selectedByProvider = selectQuery?.eq?.('provider', META_PROVIDER) as typeof selectQuery;
  const selectedByName = selectedByProvider?.eq?.('event_name', row.event_name) as typeof selectQuery;
  const selectedById = selectedByName?.eq?.('event_id', row.event_id) as typeof selectQuery;
  const existing = await selectedById?.maybeSingle?.();
  if (existing?.error) throw new Error(existing.error.message);
  return { row: existing?.data ?? null, deduped: true };
}

async function updateMetaEventLog(
  supabase: SupabaseLike,
  eventName: string,
  eventId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const updatePayload = { ...patch };
  if (updatePayload.retry_count === undefined) {
    delete updatePayload.retry_count;
  }

  const query = supabase
    .from('meta_conversion_events')
    .update?.(updatePayload) as SupabaseQueryLike | undefined;
  const byProvider = query?.eq?.('provider', META_PROVIDER) as SupabaseQueryLike | undefined;
  const byName = byProvider?.eq?.('event_name', eventName) as SupabaseQueryLike | undefined;
  const byId = byName?.eq?.('event_id', eventId) as SupabaseQueryLike | undefined;
  const updateResult = byId?.then
    ? await (byId as PromiseLike<{ error?: SupabaseErrorLike | null }>)
    : undefined;

  if (updateResult?.error) throw new Error(updateResult.error.message);
}

export async function sendMetaConversionEvent(
  input: MetaConversionEventInput & MetaConversionTrace,
  deps: {
    supabase?: SupabaseLike;
    config?: MetaCapiConfig;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<SendMetaConversionResult> {
  const config = resolveMetaCapiConfig(deps.config);
  const request = await buildMetaCapiRequest(input, config);
  const event = request.data[0];

  if (!isMetaCapiConfigured(config)) {
    const skippedReason = 'Meta CAPI is disabled or missing META_PIXEL_ID/META_ACCESS_TOKEN';
    if (deps.supabase) {
      await insertMetaEventLog(
        deps.supabase,
        buildLogRow(input, request, 'skipped', { error: skippedReason }),
      );
    }
    return {
      status: 'skipped',
      eventName: event.event_name,
      eventId: event.event_id,
      request,
      skippedReason,
    };
  }

  let deduped = false;
  if (deps.supabase) {
    const inserted = await insertMetaEventLog(deps.supabase, buildLogRow(input, request, 'pending'));
    deduped = inserted.deduped;
    if (deduped) {
      return {
        status: 'skipped',
        eventName: event.event_name,
        eventId: event.event_id,
        request,
        skippedReason: 'Duplicate Meta event log row',
        deduped: true,
      };
    }
  }

  try {
    const providerResponse = await sendMetaCapiRequest(request, config, deps.fetchImpl ?? fetch);
    const status: MetaConversionStatus = providerResponse.ok ? 'sent' : 'failed';
    if (deps.supabase) {
      await updateMetaEventLog(deps.supabase, event.event_name, event.event_id, {
        status,
        provider_response: providerResponse.body,
        error: providerResponse.ok ? null : `Meta CAPI returned HTTP ${providerResponse.status}`,
        sent_at: providerResponse.ok ? new Date().toISOString() : null,
      });
    }
    return {
      status,
      eventName: event.event_name,
      eventId: event.event_id,
      request,
      providerResponse,
      deduped,
      ...(providerResponse.ok ? {} : { error: `Meta CAPI returned HTTP ${providerResponse.status}` }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('send_failed', {
      event_name: event.event_name,
      event_id: event.event_id,
      error: message,
    });
    if (deps.supabase) {
      await updateMetaEventLog(deps.supabase, event.event_name, event.event_id, {
        status: 'failed',
        error: message,
      });
    }
    return {
      status: 'failed',
      eventName: event.event_name,
      eventId: event.event_id,
      request,
      error: message,
      deduped,
    };
  }
}
