// supabase/functions/dispatch-funnel-event/index.ts
//
// SPEC F1/F2 AC1.7/AC2.3 — Funnel events dispatcher.
//
// Contract:
//   POST /functions/v1/dispatch-funnel-event
//     body:    { funnel_event_id: string }
//     headers: Authorization: Bearer <SERVICE_ROLE_KEY>
//   returns: { dispatched: number, skipped: number, failed: number }
//
// Behaviour:
//   1. Reads the funnel_events row by event_id.
//   2. Reads enabled destinations from event_destination_mapping for this
//      event_name.
//   3. For each destination, calls a destination-specific handler. Meta CAPI
//      and Google Ads offline uploads are wired here; other destinations are
//      skipped until their platform adapters land.
//   4. Updates funnel_events.dispatch_status to 'dispatched' (any one
//      destination succeeded), 'failed' (all enabled destinations failed),
//      or leaves 'pending' for retry (only if EVERY destination was a
//      transient skip — currently never).
//   5. Returns a summary so the caller (DB trigger or manual invocation)
//      can log the outcome.
//
// Deliberately single-file: per F1 instructions, "don't try to be perfect on
// the Edge Function packaging — keep it simple". Extract destinations once
// more than Meta/Google are live.
//
// Deno runtime. No npm imports allowed; use the Deno-compatible Supabase
// client and Web Crypto for SHA-256.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  isMetaChannelContract,
  resolveTenantMetaConfig,
  type EnvLike,
} from './tenant-meta-config.ts';

type DispatchStatus = 'pending' | 'dispatched' | 'failed';

interface FunnelEventRow {
  event_id: string;
  pixel_event_id: string | null;
  event_name: string;
  occurred_at: string;
  source: string;
  account_id: string;
  website_id: string;
  reference_code: string;
  source_url: string | null;
  user_email: string | null;
  user_phone: string | null;
  external_id: string | null;
  fbp: string | null;
  fbc: string | null;
  ctwa_clid: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  ip_address: string | null;
  user_agent: string | null;
  value_amount: string | number | null;
  value_currency: string | null;
  payload: Record<string, unknown> | null;
  attribution: Record<string, unknown> | null;
  dispatch_status: DispatchStatus;
  dispatch_attempt_count: number;
  provider_status: unknown;
}

interface MappingRow {
  destination: string;
  destination_event_name: string;
  value_field: string | null;
  enabled: boolean;
  tenant_overrides: Record<string, unknown> | null;
}

interface TenantMetaContext {
  websiteAnalytics: unknown;
  contractConfig: unknown;
  contractCredentials: unknown;
}

interface AccountChannelContractRow {
  config: unknown;
  credentials_encrypted: unknown;
  service_channels?: unknown;
}

interface Ga4IntegrationRow {
  property_id: string | null;
  api_token: string | null;
  metadata: Record<string, unknown> | null;
}

interface SupabaseClientLike {
  // Supabase Edge Functions run this file under Deno; keep the local type
  // narrow so Deno check does not couple helper functions to generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

interface DestinationResult {
  destination: string;
  outcome: 'dispatched' | 'skipped' | 'failed';
  reason?: string;
}

const META_PROVIDER = 'meta';
const GOOGLE_ADS_PROVIDER = 'google_ads';
const GA4_PROVIDER = 'ga4';

function truncateReason(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value);
  return raw.slice(0, 500);
}

function destinationFailureResult(destination: string, error: unknown): DestinationResult {
  return {
    destination,
    outcome: 'failed',
    reason: `dispatcher_exception:${truncateReason(error)}`,
  };
}

function mergeProviderStatus(
  previous: unknown,
  results: DestinationResult[],
): Array<Record<string, unknown>> {
  const previousEntries = Array.isArray(previous)
    ? previous.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>
    : [];
  return [
    ...previousEntries.slice(-9),
    {
      dispatcher: 'dispatch-funnel-event-edge-fn',
      attempted_at: new Date().toISOString(),
      results,
    },
  ];
}

// --------------------------------------------------------------------------
// Tiny helpers (mirror lib/meta/conversions-api.ts hashing rules — kept
// inline so the Edge Function has no cross-package import).
// --------------------------------------------------------------------------

function cleanString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return bytesToHex(digest);
}

async function hashed(value: string | null | undefined): Promise<string[] | undefined> {
  const cleaned = cleanString(value);
  if (!cleaned) return undefined;
  return [await sha256Hex(cleaned.toLowerCase())];
}

async function hashedPhone(
  value: string | null | undefined,
): Promise<string[] | undefined> {
  const digits = cleanString(value)?.replace(/\D/g, '');
  if (!digits) return undefined;
  return [await sha256Hex(digits)];
}

// --------------------------------------------------------------------------
// Meta destination handler.
// --------------------------------------------------------------------------

async function dispatchToMeta(
  event: FunnelEventRow,
  mapping: MappingRow,
  supabase: SupabaseClientLike,
  tenantMetaContext: TenantMetaContext,
): Promise<DestinationResult> {
  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno?.env;
  const metaConfig = resolveTenantMetaConfig({
    accountId: event.account_id,
    websiteAnalytics: tenantMetaContext.websiteAnalytics,
    contractConfig: tenantMetaContext.contractConfig,
    contractCredentials: tenantMetaContext.contractCredentials,
    env: env as EnvLike | undefined,
  });

  if (!metaConfig.enabled || !metaConfig.pixelId || !metaConfig.accessToken) {
    await insertMetaLog(supabase, event, mapping, 'skipped', null, {
      error: metaConfig.reason === 'disabled'
        ? 'Meta CAPI is disabled for tenant channel config'
        : 'Meta CAPI missing tenant channel config',
      dispatchConfigSource: metaConfig.source,
      dispatchConfigReason: metaConfig.reason ?? 'missing_tenant_meta_config',
    });
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: metaConfig.reason ?? 'missing_tenant_meta_config',
    };
  }

  // The Meta CAPI event_id MUST be the pixel_event_id (browser-paired) when
  // set, falling back to the sha256 funnel_events.event_id only when no
  // pixel-paired id was minted (e.g. backfilled rows). See ADR-029
  // §"Implementation reality check" point 2.
  const metaEventId = event.pixel_event_id || event.event_id;
  const eventTimeSeconds = Math.floor(new Date(event.occurred_at).getTime() / 1000);

  const userData: Record<string, unknown> = {};
  const em = await hashed(event.user_email);
  const ph = await hashedPhone(event.user_phone);
  const externalId = await hashed(event.external_id ?? event.reference_code);
  if (em) userData.em = em;
  if (ph) userData.ph = ph;
  if (externalId) userData.external_id = externalId;
  if (mapping.destination !== 'meta_messaging' && cleanString(event.fbp)) {
    userData.fbp = cleanString(event.fbp);
  }
  if (mapping.destination !== 'meta_messaging' && cleanString(event.fbc)) {
    userData.fbc = cleanString(event.fbc);
  }
  if (cleanString(event.ctwa_clid)) userData.ctwa_clid = cleanString(event.ctwa_clid);
  if (cleanString(event.ip_address)) userData.client_ip_address = cleanString(event.ip_address);
  if (cleanString(event.user_agent)) userData.client_user_agent = cleanString(event.user_agent);

  const customData: Record<string, unknown> = {
    reference_code: event.reference_code,
    source: event.source,
  };
  if (mapping.value_field === 'value_amount' && event.value_amount != null) {
    customData.value = Number(event.value_amount);
    if (event.value_currency) customData.currency = event.value_currency;
  }

  const body = {
    data: [
      {
        event_name: mapping.destination_event_name,
        event_time: eventTimeSeconds,
        event_id: metaEventId,
        action_source: mapping.destination === 'meta_messaging' ? 'business_messaging' : 'website',
        ...(mapping.destination === 'meta_messaging' ? { messaging_channel: 'whatsapp' } : {}),
        ...(event.source_url && mapping.destination !== 'meta_messaging'
          ? { event_source_url: event.source_url }
          : {}),
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
    ...(metaConfig.testEventCode ? { test_event_code: metaConfig.testEventCode } : {}),
  };

  // Insert pending log row first so we can dedup on (provider, event_name,
  // event_id) — same pattern as lib/meta/conversions-api.ts.
  const logInsert = await insertMetaLog(supabase, event, mapping, 'pending', body, {});
  if (logInsert.deduped) {
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: 'duplicate_log_row',
    };
  }

  try {
    const url = `https://graph.facebook.com/${metaConfig.apiVersion}/${metaConfig.pixelId}/events?access_token=${encodeURIComponent(
      metaConfig.accessToken,
    )}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => null);
    }
    const status = response.ok ? 'sent' : 'failed';
    await updateMetaLog(supabase, mapping.destination_event_name, metaEventId, {
      status,
      provider_response: responseBody,
      error: response.ok ? null : `Meta CAPI returned HTTP ${response.status}`,
      sent_at: response.ok ? new Date().toISOString() : null,
    });
    return {
      destination: mapping.destination,
      outcome: response.ok ? 'dispatched' : 'failed',
      reason: response.ok ? undefined : `http_${response.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMetaLog(supabase, mapping.destination_event_name, metaEventId, {
      status: 'failed',
      error: message,
    });
    return { destination: mapping.destination, outcome: 'failed', reason: message };
  }
}

async function insertMetaLog(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  mapping: MappingRow,
  status: 'pending' | 'sent' | 'failed' | 'skipped',
  requestPayload: unknown,
  details: {
    error?: string;
    dispatchConfigSource?: string;
    dispatchConfigReason?: string;
  },
): Promise<{ deduped: boolean }> {
  const metaEventId = event.pixel_event_id || event.event_id;
  const row = {
    provider: META_PROVIDER,
    account_id: event.account_id,
    website_id: event.website_id,
    event_name: mapping.destination_event_name,
    event_id: metaEventId,
    action_source: mapping.destination === 'meta_messaging' ? 'business_messaging' : 'website',
    event_time: event.occurred_at,
    event_source_url: event.source_url,
    status,
    request_payload: requestPayload ?? {},
    error: details.error ?? null,
    trace: {
      funnel_event_id: event.event_id,
      funnel_event_name: event.event_name,
      reference_code: event.reference_code,
      dispatcher: 'dispatch-funnel-event-edge-fn',
      ...(details.dispatchConfigSource && { dispatch_config_source: details.dispatchConfigSource }),
      ...(details.dispatchConfigReason && { dispatch_config_reason: details.dispatchConfigReason }),
    },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('meta_conversion_events').insert(row);
  if (!error) return { deduped: false };
  if ((error as { code?: string }).code === '23505') return { deduped: true };
  throw new Error(error.message ?? 'meta_conversion_events insert failed');
}

async function updateMetaLog(
  supabase: SupabaseClientLike,
  eventName: string,
  eventId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('meta_conversion_events')
    .update(patch)
    .eq('provider', META_PROVIDER)
    .eq('event_name', eventName)
    .eq('event_id', eventId);
  if (error) throw new Error(error.message);
}

async function loadTenantMetaContext(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
): Promise<TenantMetaContext> {
  const { data: website } = await supabase
    .from('websites')
    .select('analytics')
    .eq('id', event.website_id)
    .eq('account_id', event.account_id)
    .maybeSingle();

  const { data: contracts } = await supabase
    .from('account_channel_contracts')
    .select('config, credentials_encrypted, service_channels(code, display_name, service_type, channel_type)')
    .eq('account_id', event.account_id)
    .eq('is_active', true);

  const metaContract = ((contracts ?? []) as unknown as AccountChannelContractRow[])
    .find((contract) => isMetaChannelContract(contract));

  return {
    websiteAnalytics: (website as { analytics?: unknown } | null)?.analytics ?? {},
    contractConfig: metaContract?.config ?? {},
    contractCredentials: metaContract?.credentials_encrypted ?? {},
  };
}

// --------------------------------------------------------------------------
// Google Ads destination handler.
// --------------------------------------------------------------------------

interface GoogleAdsConfig {
  enabled: boolean;
  developerToken?: string;
  loginCustomerId?: string;
  customerId?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  apiVersion: string;
}

interface GoogleAdsUploadRequest {
  conversions: Array<Record<string, unknown>>;
  partialFailure: boolean;
  validateOnly: boolean;
}

type GoogleAdsLogStatus = 'pending' | 'sent' | 'failed' | 'skipped';

function readTenantOverride(
  mapping: MappingRow,
  accountId: string,
): Record<string, unknown> {
  const overrides = mapping.tenant_overrides;
  if (!overrides || typeof overrides !== 'object') return {};
  const raw = overrides[accountId];
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

function resolveGoogleAdsConversionActionId(
  event: FunnelEventRow,
  mapping: MappingRow,
): string | null {
  const tenantOverride = readTenantOverride(mapping, event.account_id);
  const id = tenantOverride.conversion_action_id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

async function resolveGoogleAdsConversionActionIdFromBinding(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
): Promise<string | null> {
  let query = supabase
    .from('platform_goal_bindings')
    .select('platform_goal_id')
    .eq('account_id', event.account_id)
    .eq('canonical_event_name', event.event_name)
    .eq('destination', 'google_ads')
    .in('sync_status', ['healthy', 'watch'])
    .limit(1);

  if (event.website_id) {
    query = query.or(`website_id.eq.${event.website_id},website_id.is.null`);
  } else {
    query = query.is('website_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    const message = error.message ?? '';
    const tableMissing =
      (error as { code?: string }).code === '42P01' ||
      message.toLowerCase().includes('does not exist');
    if (!tableMissing) {
      console.warn('platform_goal_binding_lookup_failed', {
        event_name: event.event_name,
        error: message,
      });
    }
    return null;
  }
  const id = (data as { platform_goal_id?: unknown } | null)?.platform_goal_id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function resolveGoogleAdsConfig(): GoogleAdsConfig {
  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  return {
    enabled: env.get('GOOGLE_ADS_OFFLINE_UPLOAD_ENABLED') === 'true',
    developerToken: cleanString(env.get('GOOGLE_ADS_DEVELOPER_TOKEN')),
    loginCustomerId: cleanString(env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID')),
    customerId: cleanString(env.get('GOOGLE_ADS_CUSTOMER_ID')),
    clientId: cleanString(env.get('GOOGLE_ADS_CLIENT_ID')),
    clientSecret: cleanString(env.get('GOOGLE_ADS_CLIENT_SECRET')),
    refreshToken: cleanString(env.get('GOOGLE_ADS_REFRESH_TOKEN')),
    apiVersion: cleanString(env.get('GOOGLE_ADS_API_VERSION')) ?? 'v24',
  };
}

async function googleAccessToken(config: GoogleAdsConfig): Promise<string> {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error('missing_google_ads_oauth_config');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== 'string') {
    throw new Error(`google_ads_oauth_failed_${response.status}`);
  }
  return body.access_token;
}

function stripCustomerId(value: string | undefined): string | undefined {
  return value?.replace(/\D/g, '') || undefined;
}

function formatGoogleAdsDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}+00:00`;
}

async function googleUserIdentifiers(
  event: FunnelEventRow,
): Promise<Array<Record<string, unknown>> | undefined> {
  const identifiers: Array<Record<string, unknown>> = [];
  const em = await hashed(event.user_email);
  const ph = await hashedPhone(event.user_phone);
  if (em?.[0]) identifiers.push({ hashedEmail: em[0], userIdentifierSource: 'FIRST_PARTY' });
  if (ph?.[0]) identifiers.push({ hashedPhoneNumber: ph[0], userIdentifierSource: 'FIRST_PARTY' });
  return identifiers.length ? identifiers : undefined;
}

async function buildGoogleAdsRequest(
  event: FunnelEventRow,
  mapping: MappingRow,
  conversionActionId: string,
  config: GoogleAdsConfig,
): Promise<GoogleAdsUploadRequest> {
  const customerId = stripCustomerId(config.customerId);
  if (!customerId) throw new Error('missing_google_ads_customer_id');

  const conversion: Record<string, unknown> = {
    conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
    conversionDateTime: formatGoogleAdsDateTime(event.occurred_at),
  };
  if (cleanString(event.gclid)) conversion.gclid = cleanString(event.gclid);
  if (cleanString(event.gbraid)) conversion.gbraid = cleanString(event.gbraid);
  if (cleanString(event.wbraid)) conversion.wbraid = cleanString(event.wbraid);
  if (mapping.value_field === 'value_amount' && event.value_amount != null) {
    conversion.conversionValue = Number(event.value_amount);
    if (event.value_currency) conversion.currencyCode = event.value_currency;
  }
  const userIdentifiers = await googleUserIdentifiers(event);
  if (userIdentifiers) conversion.userIdentifiers = userIdentifiers;

  return {
    conversions: [conversion],
    partialFailure: true,
    validateOnly: false,
  };
}

async function insertGoogleAdsLog(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  conversionActionId: string,
  status: GoogleAdsLogStatus,
  requestPayload: unknown,
  details: { error?: string; providerResponse?: unknown } = {},
): Promise<{ deduped: boolean }> {
  const row = {
    provider: GOOGLE_ADS_PROVIDER,
    account_id: event.account_id,
    website_id: event.website_id,
    funnel_event_id: event.event_id,
    conversion_action_id: conversionActionId,
    gclid: event.gclid,
    gbraid: event.gbraid,
    wbraid: event.wbraid,
    conversion_value: event.value_amount,
    currency_code: event.value_currency,
    conversion_date_time: event.occurred_at,
    status,
    request_payload: requestPayload ?? {},
    provider_response: details.providerResponse ?? null,
    error: details.error ?? null,
    trace: {
      funnel_event_id: event.event_id,
      funnel_event_name: event.event_name,
      reference_code: event.reference_code,
      dispatcher: 'dispatch-funnel-event-edge-fn',
    },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('google_ads_offline_uploads').insert(row);
  if (!error) return { deduped: false };
  if ((error as { code?: string }).code === '23505') return { deduped: true };
  throw new Error(error.message ?? 'google_ads_offline_uploads insert failed');
}

async function stageGoogleAdsUploadAttempt(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  conversionActionId: string,
  requestPayload: unknown,
): Promise<{ shouldUpload: boolean; reason?: string }> {
  const inserted = await insertGoogleAdsLog(
    supabase,
    event,
    conversionActionId,
    'pending',
    requestPayload,
  );
  if (!inserted.deduped) return { shouldUpload: true };

  const { data, error } = await supabase
    .from('google_ads_offline_uploads')
    .select('status, retry_count')
    .eq('funnel_event_id', event.event_id)
    .eq('conversion_action_id', conversionActionId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const existing = data as { status?: GoogleAdsLogStatus; retry_count?: number } | null;
  if (existing?.status === 'sent') {
    return { shouldUpload: false, reason: 'duplicate_sent_log_row' };
  }
  if (existing?.status === 'pending') {
    return { shouldUpload: false, reason: 'duplicate_pending_log_row' };
  }
  if (existing?.status === 'skipped') {
    return { shouldUpload: false, reason: 'duplicate_skipped_log_row' };
  }

  const retryCount = Number.isFinite(existing?.retry_count)
    ? Number(existing?.retry_count) + 1
    : 1;
  const { error: updateError } = await supabase
    .from('google_ads_offline_uploads')
    .update({
      status: 'pending',
      retry_count: retryCount,
      request_payload: requestPayload ?? {},
      provider_response: null,
      error: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('funnel_event_id', event.event_id)
    .eq('conversion_action_id', conversionActionId)
    .eq('status', 'failed');
  if (updateError) throw new Error(updateError.message);

  return { shouldUpload: true };
}

async function updateGoogleAdsLog(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  conversionActionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('google_ads_offline_uploads')
    .update(patch)
    .eq('funnel_event_id', event.event_id)
    .eq('conversion_action_id', conversionActionId);
  if (error) throw new Error(error.message);
}

async function dispatchToGoogleAds(
  event: FunnelEventRow,
  mapping: MappingRow,
  supabase: SupabaseClientLike,
): Promise<DestinationResult> {
  const conversionActionId =
    (await resolveGoogleAdsConversionActionIdFromBinding(supabase, event)) ??
    resolveGoogleAdsConversionActionId(event, mapping);
  if (!conversionActionId) {
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: 'missing_conversion_action_id',
    };
  }

  const config = resolveGoogleAdsConfig();
  let request: GoogleAdsUploadRequest;
  try {
    request = await buildGoogleAdsRequest(event, mapping, conversionActionId, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await insertGoogleAdsLog(supabase, event, conversionActionId, 'skipped', {}, { error: message });
    return { destination: mapping.destination, outcome: 'skipped', reason: message };
  }

  if (!event.gclid && !event.gbraid && !event.wbraid) {
    await insertGoogleAdsLog(supabase, event, conversionActionId, 'skipped', request, {
      error: 'no_click_id',
    });
    return { destination: mapping.destination, outcome: 'skipped', reason: 'no_click_id' };
  }

  if (!config.enabled || !config.developerToken || !config.customerId) {
    await insertGoogleAdsLog(supabase, event, conversionActionId, 'skipped', request, {
      error: 'google_ads_offline_upload_disabled_or_missing_config',
    });
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: 'google_ads_offline_upload_disabled_or_missing_config',
    };
  }

  const staged = await stageGoogleAdsUploadAttempt(supabase, event, conversionActionId, request);
  if (!staged.shouldUpload) {
    return { destination: mapping.destination, outcome: 'skipped', reason: staged.reason ?? 'duplicate_log_row' };
  }

  try {
    const accessToken = await googleAccessToken(config);
    const customerId = stripCustomerId(config.customerId);
    const response = await fetch(
      `https://googleads.googleapis.com/${config.apiVersion}/customers/${customerId}:uploadClickConversions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': config.developerToken,
          ...(config.loginCustomerId ? { 'login-customer-id': stripCustomerId(config.loginCustomerId)! } : {}),
        },
        body: JSON.stringify(request),
      },
    );
    const responseBody = await response.json().catch(() => null);
    const partialFailure = responseBody?.partialFailureError;
    const status = response.ok && !partialFailure ? 'sent' : 'failed';
    await updateGoogleAdsLog(supabase, event, conversionActionId, {
      status,
      provider_response: responseBody,
      error: status === 'sent'
        ? null
        : partialFailure?.message ?? `Google Ads API returned HTTP ${response.status}`,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
    return {
      destination: mapping.destination,
      outcome: status === 'sent' ? 'dispatched' : 'failed',
      reason: status === 'sent' ? undefined : 'google_ads_upload_failed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGoogleAdsLog(supabase, event, conversionActionId, {
      status: 'failed',
      error: message,
    });
    return { destination: mapping.destination, outcome: 'failed', reason: message };
  }
}

// --------------------------------------------------------------------------
// GA4 Measurement Protocol destination handler.
// --------------------------------------------------------------------------

interface Ga4Config {
  enabled: boolean;
  measurementId?: string;
  apiSecret?: string;
  propertyId?: string;
  source: string;
  reason?: string;
}

function resolveGa4Config(input: {
  websiteAnalytics: unknown;
  integration: Ga4IntegrationRow | null;
}): Ga4Config {
  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  const enabled = env.get('FUNNEL_GA4_MP_DISPATCH_V1') === 'true';
  const analytics = readRecord(input.websiteAnalytics);
  const metadata = readRecord(input.integration?.metadata);
  const tenantMeasurementId =
    readString(analytics.ga4_id) ??
    readString(analytics.ga4_measurement_id) ??
    readString(metadata.measurement_id) ??
    readString(metadata.ga4_measurement_id);
  const tenantApiSecret =
    readString(input.integration?.api_token) ??
    readString(metadata.measurement_protocol_api_secret) ??
    readString(metadata.api_secret);
  const measurementId = tenantMeasurementId ?? cleanString(env.get('GA4_MEASUREMENT_ID'));
  const apiSecret = tenantApiSecret ?? cleanString(env.get('GA4_API_SECRET'));
  const propertyId = readString(input.integration?.property_id) ?? readString(metadata.property_id);
  const source = tenantMeasurementId || tenantApiSecret ? 'tenant_config' : 'env_or_missing';

  if (!enabled) {
    return { enabled: false, measurementId, apiSecret, propertyId, source, reason: 'ga4_mp_dispatch_disabled' };
  }
  if (!measurementId || !apiSecret) {
    return {
      enabled: false,
      measurementId,
      apiSecret,
      propertyId,
      source,
      reason: !measurementId ? 'missing_ga4_measurement_id' : 'missing_ga4_api_secret',
    };
  }
  return { enabled: true, measurementId, apiSecret, propertyId, source };
}

async function loadGa4Context(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
): Promise<{ websiteAnalytics: unknown; integration: Ga4IntegrationRow | null }> {
  const [websiteResult, integrationResult] = await Promise.all([
    supabase
      .from('websites')
      .select('analytics')
      .eq('id', event.website_id)
      .eq('account_id', event.account_id)
      .maybeSingle(),
    supabase
      .from('seo_integrations')
      .select('property_id, api_token, metadata')
      .eq('account_id', event.account_id)
      .eq('website_id', event.website_id)
      .eq('provider', 'ga4')
      .maybeSingle(),
  ]);

  return {
    websiteAnalytics: (websiteResult.data as { analytics?: unknown } | null)?.analytics ?? {},
    integration: (integrationResult.data as Ga4IntegrationRow | null) ?? null,
  };
}

function ga4ClientId(event: FunnelEventRow): string {
  const payload = readRecord(event.payload);
  const attribution = readRecord(event.attribution);
  const clickIds = readRecord(attribution.click_ids);
  return (
    readString(payload.ga_client_id) ??
    readString(payload.client_id) ??
    readString(attribution.ga_client_id) ??
    readString(clickIds.ga_client_id) ??
    `${event.reference_code || event.event_id}.${event.event_id.slice(0, 10)}`
  );
}

function ga4EventParams(event: FunnelEventRow, mapping: MappingRow): Record<string, unknown> {
  const params: Record<string, unknown> = {
    event_id: event.event_id,
    canonical_event_name: event.event_name,
    reference_code: event.reference_code,
    source: event.source,
    engagement_time_msec: 1,
  };
  if (event.source_url) params.page_location = event.source_url;
  if (event.gclid) params.gclid = event.gclid;
  if (event.gbraid) params.gbraid = event.gbraid;
  if (event.wbraid) params.wbraid = event.wbraid;
  if (event.fbp) params.fbp = event.fbp;
  if (event.fbc) params.fbc = event.fbc;
  if (mapping.value_field === 'value_amount' && event.value_amount != null) {
    params.value = Number(event.value_amount);
    if (event.value_currency) params.currency = event.value_currency;
  }
  if (mapping.destination_event_name === 'purchase') {
    params.transaction_id = event.reference_code || event.event_id;
  }
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  );
}

function buildGa4Payload(event: FunnelEventRow, mapping: MappingRow): Record<string, unknown> {
  return {
    client_id: ga4ClientId(event),
    ...(event.external_id ? { user_id: event.external_id } : {}),
    timestamp_micros: String(new Date(event.occurred_at).getTime() * 1000),
    non_personalized_ads: true,
    events: [
      {
        name: mapping.destination_event_name,
        params: ga4EventParams(event, mapping),
      },
    ],
  };
}

async function insertGa4Log(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  mapping: MappingRow,
  config: Ga4Config,
  status: 'pending' | 'sent' | 'failed' | 'skipped',
  requestPayload: unknown,
  details: { error?: string; providerResponse?: unknown } = {},
): Promise<{ deduped: boolean }> {
  const row = {
    provider: GA4_PROVIDER,
    account_id: event.account_id,
    website_id: event.website_id,
    funnel_event_id: event.event_id,
    event_name: mapping.destination_event_name,
    measurement_id: config.measurementId ?? null,
    property_id: config.propertyId ?? null,
    status,
    request_payload: requestPayload ?? {},
    provider_response: details.providerResponse ?? null,
    error: details.error ?? null,
    trace: {
      funnel_event_id: event.event_id,
      funnel_event_name: event.event_name,
      reference_code: event.reference_code,
      dispatcher: 'dispatch-funnel-event-edge-fn',
      dispatch_config_source: config.source,
      ...(config.reason && { dispatch_config_reason: config.reason }),
    },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('ga4_measurement_protocol_events').insert(row);
  if (!error) return { deduped: false };
  if ((error as { code?: string }).code === '23505') return { deduped: true };
  throw new Error(error.message ?? 'ga4_measurement_protocol_events insert failed');
}

async function updateGa4Log(
  supabase: SupabaseClientLike,
  event: FunnelEventRow,
  eventName: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('ga4_measurement_protocol_events')
    .update(patch)
    .eq('funnel_event_id', event.event_id)
    .eq('event_name', eventName);
  if (error) throw new Error(error.message);
}

async function dispatchToGa4(
  event: FunnelEventRow,
  mapping: MappingRow,
  supabase: SupabaseClientLike,
  ga4Context: { websiteAnalytics: unknown; integration: Ga4IntegrationRow | null },
): Promise<DestinationResult> {
  const config = resolveGa4Config({
    websiteAnalytics: ga4Context.websiteAnalytics,
    integration: ga4Context.integration,
  });
  const payload = buildGa4Payload(event, mapping);

  if (!config.enabled || !config.measurementId || !config.apiSecret) {
    await insertGa4Log(supabase, event, mapping, config, 'skipped', payload, {
      error: config.reason ?? 'missing_ga4_config',
    });
    return {
      destination: mapping.destination,
      outcome: 'skipped',
      reason: config.reason ?? 'missing_ga4_config',
    };
  }

  const pending = await insertGa4Log(supabase, event, mapping, config, 'pending', payload);
  if (pending.deduped) {
    return { destination: mapping.destination, outcome: 'skipped', reason: 'duplicate_log_row' };
  }

  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  const validationMode = env.get('GA4_MP_VALIDATION_MODE') === 'true';
  const endpoint = validationMode
    ? 'https://www.google-analytics.com/debug/mp/collect'
    : 'https://www.google-analytics.com/mp/collect';
  const url = `${endpoint}?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text().catch(() => '');
    let responseBody: unknown = responseText;
    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseBody = { body: responseText };
    }
    const validationMessages = Array.isArray((responseBody as { validationMessages?: unknown }).validationMessages)
      ? (responseBody as { validationMessages?: unknown[] }).validationMessages ?? []
      : [];
    const status = response.ok && validationMessages.length === 0 ? 'sent' : 'failed';
    await updateGa4Log(supabase, event, mapping.destination_event_name, {
      status,
      provider_response: responseBody,
      error: status === 'sent'
        ? null
        : validationMessages.length
          ? 'GA4 MP validation returned messages'
          : `GA4 MP returned HTTP ${response.status}`,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
    return {
      destination: mapping.destination,
      outcome: status === 'sent' ? 'dispatched' : 'failed',
      reason: status === 'sent' ? undefined : 'ga4_mp_send_failed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGa4Log(supabase, event, mapping.destination_event_name, {
      status: 'failed',
      error: message,
    });
    return { destination: mapping.destination, outcome: 'failed', reason: message };
  }
}

// --------------------------------------------------------------------------
// Main dispatcher entry point.
// --------------------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env;
  const supabaseUrl = env.get('SUPABASE_URL');
  const serviceRoleKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'missing_supabase_env' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { funnel_event_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const funnelEventId = body.funnel_event_id;
  if (!funnelEventId || typeof funnelEventId !== 'string') {
    return new Response(JSON.stringify({ error: 'missing_funnel_event_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: eventRow, error: eventErr } = await supabase
	    .from('funnel_events')
	    .select(
	      'event_id, pixel_event_id, event_name, occurred_at, source, account_id, website_id, reference_code, source_url, user_email, user_phone, external_id, fbp, fbc, ctwa_clid, gclid, gbraid, wbraid, ip_address, user_agent, value_amount, value_currency, payload, attribution, dispatch_status, dispatch_attempt_count, provider_status',
	    )
    .eq('event_id', funnelEventId)
    .maybeSingle();

  if (eventErr) {
    return new Response(
      JSON.stringify({ error: 'event_lookup_failed', detail: eventErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (!eventRow) {
    return new Response(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const event = eventRow as unknown as FunnelEventRow;

  // Skip rows already in a terminal state to keep replay/cron loops safe.
  if (event.dispatch_status === 'dispatched') {
    return new Response(
      JSON.stringify({ dispatched: 0, skipped: 1, failed: 0, reason: 'already_dispatched' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { data: mappings, error: mapErr } = await supabase
    .from('event_destination_mapping')
    .select('destination, destination_event_name, value_field, enabled, tenant_overrides')
    .eq('funnel_event_name', event.event_name)
    .eq('enabled', true);

  if (mapErr) {
    return new Response(
      JSON.stringify({ error: 'mapping_lookup_failed', detail: mapErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

	  const results: DestinationResult[] = [];
	  let tenantMetaContext: TenantMetaContext | null = null;
	  let ga4Context: { websiteAnalytics: unknown; integration: Ga4IntegrationRow | null } | null = null;
	  for (const m of (mappings ?? []) as unknown as MappingRow[]) {
	    try {
	      if (m.destination === 'meta' || m.destination === 'meta_messaging') {
	        tenantMetaContext ??= await loadTenantMetaContext(supabase, event);
	        results.push(await dispatchToMeta(event, m, supabase, tenantMetaContext));
	      } else if (m.destination === 'google_ads') {
	        results.push(await dispatchToGoogleAds(event, m, supabase));
	      } else if (m.destination === 'ga4') {
	        ga4Context ??= await loadGa4Context(supabase, event);
	        results.push(await dispatchToGa4(event, m, supabase, ga4Context));
	      } else {
	        results.push({
	          destination: m.destination,
	          outcome: 'skipped',
	          reason: 'destination_not_implemented',
	        });
	      }
	    } catch (error) {
	      results.push(destinationFailureResult(m.destination, error));
	    }
	  }

  const dispatched = results.filter((r) => r.outcome === 'dispatched').length;
  const skipped = results.filter((r) => r.outcome === 'skipped').length;
  const failed = results.filter((r) => r.outcome === 'failed').length;

  // Determine final dispatch_status:
  //   * dispatched: at least one destination succeeded (or all configured
  //     destinations were intentionally skipped — config no-op should not
  //     keep the row pending forever).
  //   * failed:     no destination succeeded AND at least one failed.
  //   * pending:    no enabled mappings at all (nothing to do; mark dispatched
  //     so cron stops retrying).
  let nextStatus: DispatchStatus;
  if (results.length === 0) {
    nextStatus = 'dispatched';
  } else if (dispatched > 0 || (failed === 0 && skipped > 0)) {
    nextStatus = 'dispatched';
  } else {
    nextStatus = 'failed';
  }

  await supabase
    .from('funnel_events')
	    .update({
	      dispatch_status: nextStatus,
	      dispatch_attempted_at: new Date().toISOString(),
	      provider_status: mergeProviderStatus(event.provider_status, results),
	      // attempt_count is incremented by the cron loop; happy-path trigger
      // calls don't increment to avoid double-counting.
    })
    .eq('event_id', funnelEventId);

  return new Response(
    JSON.stringify({ dispatched, skipped, failed, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

(globalThis as unknown as { Deno: { serve(handler: (req: Request) => Promise<Response>): void } }).Deno.serve(handle);
