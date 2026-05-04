/**
 * Funnel events dispatcher — Google Ads branch (F2 / EPIC #419).
 *
 * Consumed by F1's `lib/funnel/dispatch.ts` switch statement: when an
 * event_destination_mapping row resolves `destination='google_ads'` for
 * an incoming funnel event, F1 calls `dispatchToGoogleAds(event, mapping)`.
 *
 * tenant_overrides shape (stored on event_destination_mapping):
 *   {
 *     "<account_id>": {
 *       "conversion_action_id": "987654321",
 *       "enabled": true | false,
 *       "destination_event_name": "..."
 *     }
 *   }
 */

import { createLogger } from '@/lib/logger';
import {
  sendOfflineConversionUpload,
  type GoogleAdsConfig,
  type GoogleAdsUserIdentifierInput,
  type SendOfflineUploadResult,
} from '@/lib/google-ads/offline-upload';
import type { FunnelEvent } from '@bukeer/website-contract';

const log = createLogger('funnel.destinations.google-ads');

export type DispatchStatus = 'sent' | 'failed' | 'skipped';

export interface DispatchResult {
  destination: 'google_ads';
  status: DispatchStatus;
  reason?: string;
  conversionActionId?: string;
  providerResponse?: unknown;
  error?: string;
}

export interface EventDestinationMappingRow {
  funnel_event_name: string;
  destination: string;
  destination_event_name: string;
  value_field: string | null;
  enabled: boolean;
  tenant_overrides: Record<string, unknown>;
  notes?: string | null;
}

interface TenantOverrideShape {
  conversion_action_id?: string;
  destination_event_name?: string;
  enabled?: boolean;
}

interface DispatchDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: { from: (table: string) => any };
  config?: GoogleAdsConfig;
  fetchImpl?: typeof fetch;
  conversionActionIdOverride?: string;
  userIdentifiers?: GoogleAdsUserIdentifierInput;
  bookingId?: string;
  accessToken?: string;
}

function getTenantOverride(
  mapping: EventDestinationMappingRow,
  accountId: string | null | undefined,
): TenantOverrideShape | null {
  if (!accountId) return null;
  const overrides = mapping.tenant_overrides;
  if (!overrides || typeof overrides !== 'object') return null;
  const entry = (overrides as Record<string, unknown>)[accountId];
  if (!entry || typeof entry !== 'object') return null;
  return entry as TenantOverrideShape;
}

function resolveConversionActionId(
  mapping: EventDestinationMappingRow,
  accountId: string | null | undefined,
  override?: string,
): string | null {
  if (override) return override;
  const tenantOverride = getTenantOverride(mapping, accountId);
  if (tenantOverride?.conversion_action_id) {
    return tenantOverride.conversion_action_id;
  }
  return null;
}

function isEnabled(
  mapping: EventDestinationMappingRow,
  accountId: string | null | undefined,
): boolean {
  const tenantOverride = getTenantOverride(mapping, accountId);
  if (tenantOverride?.enabled === false) return false;
  return mapping.enabled !== false;
}

function extractClickIds(
  event:
    | FunnelEvent
    | (FunnelEvent & {
        gclid?: string | null;
        gbraid?: string | null;
        wbraid?: string | null;
      }),
): { gclid?: string; gbraid?: string; wbraid?: string } {
  const flat = event as {
    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;
  };
  const fromAttribution = event.attribution?.click_ids ?? null;
  return {
    ...(flat.gclid && { gclid: flat.gclid }),
    ...(flat.gbraid && { gbraid: flat.gbraid }),
    ...(flat.wbraid && { wbraid: flat.wbraid }),
    ...(fromAttribution?.gclid && { gclid: fromAttribution.gclid }),
    ...(fromAttribution?.gbraid && { gbraid: fromAttribution.gbraid }),
    ...(fromAttribution?.wbraid && { wbraid: fromAttribution.wbraid }),
  };
}

function extractValue(
  event: FunnelEvent,
  mapping: EventDestinationMappingRow,
): { conversionValue?: number; currencyCode?: string } {
  if (!mapping.value_field) return {};
  const payload = event.payload ?? {};
  const rawValue = (payload as Record<string, unknown>)[mapping.value_field];
  const rawCurrency = (payload as Record<string, unknown>)['value_currency'];
  const numericValue =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string'
        ? Number(rawValue)
        : undefined;
  if (numericValue === undefined || Number.isNaN(numericValue)) return {};
  return {
    conversionValue: numericValue,
    ...(typeof rawCurrency === 'string' && { currencyCode: rawCurrency }),
  };
}

export async function dispatchToGoogleAds(
  event: FunnelEvent,
  mapping: EventDestinationMappingRow,
  deps: DispatchDeps = {},
): Promise<DispatchResult> {
  if (!isEnabled(mapping, event.account_id)) {
    return {
      destination: 'google_ads',
      status: 'skipped',
      reason: 'mapping_disabled',
    };
  }

  const conversionActionId = resolveConversionActionId(
    mapping,
    event.account_id,
    deps.conversionActionIdOverride,
  );
  if (!conversionActionId) {
    log.warn('missing_conversion_action_id', {
      event_name: event.event_name,
      account_id: event.account_id,
    });
    return {
      destination: 'google_ads',
      status: 'skipped',
      reason: 'missing_conversion_action_id',
    };
  }

  const clickIds = extractClickIds(event);
  if (!clickIds.gclid && !clickIds.gbraid && !clickIds.wbraid) {
    return {
      destination: 'google_ads',
      status: 'skipped',
      reason: 'no_click_id',
      conversionActionId,
    };
  }

  const { conversionValue, currencyCode } = extractValue(event, mapping);

  const result: SendOfflineUploadResult = await sendOfflineConversionUpload(
    {
      conversionActionId,
      conversionDateTime: event.occurred_at,
      ...(typeof conversionValue === 'number' && { conversionValue }),
      ...(currencyCode && { currencyCode }),
      ...(deps.bookingId && { orderId: deps.bookingId }),
      ...clickIds,
      userIdentifiers: deps.userIdentifiers,
      accountId: event.account_id,
      websiteId: event.website_id,
      funnelEventId: event.event_id,
      bookingId: deps.bookingId,
    },
    {
      supabase: deps.supabase,
      config: deps.config,
      fetchImpl: deps.fetchImpl,
      accessToken: deps.accessToken,
    },
  );

  if (result.status === 'sent') {
    return {
      destination: 'google_ads',
      status: 'sent',
      conversionActionId,
      providerResponse: result.providerResponse?.body,
    };
  }
  if (result.status === 'skipped') {
    return {
      destination: 'google_ads',
      status: 'skipped',
      reason: result.skippedReason ?? 'skipped',
      conversionActionId,
    };
  }
  return {
    destination: 'google_ads',
    status: 'failed',
    conversionActionId,
    error: result.error,
    providerResponse: result.providerResponse?.body,
  };
}
