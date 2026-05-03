import { sendMetaConversionEvent } from '@/lib/meta/conversions-api';
import type {
  FunnelEventProviderRecord,
  GrowthAttribution,
} from '@bukeer/website-contract';

interface SupabaseLike {
  // Supabase builders are chainable; keep the route-side dependency narrow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface PurchaseCustomerInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}

export interface PurchaseConversionInput {
  accountId: string;
  websiteId: string;
  itineraryId: string;
  bookingId?: string | null;
  referenceCode: string;
  purchaseEventId: string;
  occurredAt: Date;
  value?: number | null;
  currency?: string | null;
  eventSourceUrl?: string | null;
  attribution?: GrowthAttribution | null;
  customer?: PurchaseCustomerInput | null;
  source?: string;
}

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function isoNow(): string {
  return new Date().toISOString();
}

function status(
  provider: FunnelEventProviderRecord['provider'],
  state: FunnelEventProviderRecord['status'],
  errorCode: string | null = null,
): FunnelEventProviderRecord {
  return {
    provider,
    status: state,
    attempted_at: isoNow(),
    error_code: errorCode,
  };
}

function splitName(customer: PurchaseCustomerInput | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  if (customer?.firstName || customer?.lastName) {
    return {
      firstName: customer.firstName ?? null,
      lastName: customer.lastName ?? null,
    };
  }

  const parts = customer?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(' ') || null,
  };
}

export async function sendPurchaseConversions(
  supabase: SupabaseLike,
  input: PurchaseConversionInput,
): Promise<FunnelEventProviderRecord[]> {
  const providerStatus: FunnelEventProviderRecord[] = [];

  if (input.value == null || !Number.isFinite(input.value) || input.value <= 0 || !input.currency) {
    providerStatus.push(status('meta_capi', 'skipped', 'skipped_missing_value'));
  } else {
    const name = splitName(input.customer);
    const result = await sendMetaConversionEvent(
      {
        eventName: 'Purchase',
        eventId: input.purchaseEventId,
        actionSource: 'website',
        eventTime: input.occurredAt,
        eventSourceUrl: input.eventSourceUrl ?? input.attribution?.source_url ?? null,
        userData: {
          email: input.customer?.email ?? null,
          phone: input.customer?.phone ?? null,
          firstName: name.firstName,
          lastName: name.lastName,
          externalId: input.referenceCode,
          fbc: input.attribution?.click_ids.fbclid
            ? `fb.1.${Math.floor(input.occurredAt.getTime() / 1000)}.${input.attribution.click_ids.fbclid}`
            : null,
        },
        customData: {
          value: input.value,
          currency: input.currency,
          order_id: input.bookingId ?? input.itineraryId,
          content_name: 'Itinerary confirmed',
          content_type: 'travel_itinerary',
          reference_code: input.referenceCode,
          itinerary_id: input.itineraryId,
          booking_id: input.bookingId ?? null,
        },
        accountId: input.accountId,
        websiteId: input.websiteId,
        bookingId: input.bookingId && UUID_PATTERN.test(input.bookingId) ? input.bookingId : null,
        trace: {
          source: input.source ?? 'itinerary_confirmed',
          itinerary_id: input.itineraryId,
          reference_code: input.referenceCode,
        },
      },
      { supabase },
    );

    providerStatus.push(
      status(
        'meta_capi',
        result.status === 'sent' ? 'sent' : result.status,
        result.error ?? result.skippedReason ?? null,
      ),
    );
  }

  providerStatus.push(status('ga4', 'skipped', 'skipped_missing_client_id'));
  providerStatus.push(status('google_ads_offline', 'skipped', 'skipped_not_configured'));
  providerStatus.push(status('tiktok_events_api', 'skipped', 'skipped_not_configured'));

  return providerStatus;
}
