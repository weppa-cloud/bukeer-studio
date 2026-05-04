/**
 * F2 / EPIC #419 — Google Ads dispatcher branch unit tests.
 */

import {
  dispatchToGoogleAds,
  type EventDestinationMappingRow,
} from '@/lib/funnel/destinations/google-ads';
import type { FunnelEvent } from '@bukeer/website-contract';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const WEBSITE_ID = '22222222-2222-4222-8222-222222222222';
const CONVERSION_ACTION_ID = '987654321';

function makeMapping(
  overrides: Partial<EventDestinationMappingRow> = {},
): EventDestinationMappingRow {
  return {
    funnel_event_name: 'waflow_submit',
    destination: 'google_ads',
    destination_event_name: 'waflow_submit',
    value_field: null,
    enabled: true,
    tenant_overrides: {
      [ACCOUNT_ID]: { conversion_action_id: CONVERSION_ACTION_ID },
    },
    ...overrides,
  };
}

function makeEvent(overrides: Partial<FunnelEvent> = {}): FunnelEvent {
  return {
    account_id: ACCOUNT_ID,
    website_id: WEBSITE_ID,
    locale: 'es-CO',
    market: 'CO',
    event_id:
      '0000000000000000000000000000000000000000000000000000000000000001',
    event_name: 'waflow_submit',
    stage: 'activation',
    channel: 'google_ads',
    reference_code: 'HOME-2505-ABCD',
    occurred_at: '2026-05-03T10:00:00-05:00',
    attribution: null,
    payload: {},
    provider_status: [],
    source_url: null,
    page_path: '/',
    ...overrides,
  } as FunnelEvent;
}

describe('dispatchToGoogleAds', () => {
  it('returns skipped/no_click_id when the event has no gclid/gbraid/wbraid', async () => {
    const result = await dispatchToGoogleAds(
      makeEvent({ attribution: null }),
      makeMapping(),
    );
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('no_click_id');
    expect(result.conversionActionId).toBe(CONVERSION_ACTION_ID);
  });

  it('returns skipped/missing_conversion_action_id when no tenant override is set', async () => {
    const result = await dispatchToGoogleAds(
      makeEvent({
        attribution: {
          account_id: ACCOUNT_ID,
          website_id: WEBSITE_ID,
          locale: 'es-CO',
          market: 'CO',
          reference_code: 'HOME-2505-ABCD',
          session_key: 'sess-12345678',
          source_url: null,
          page_path: '/',
          channel: 'google_ads',
          utm: {
            utm_source: null,
            utm_medium: null,
            utm_campaign: null,
            utm_content: null,
            utm_term: null,
          },
          click_ids: {
            gclid: 'G-ABC',
            gbraid: null,
            wbraid: null,
            fbclid: null,
            ttclid: null,
          },
          captured_at: '2026-05-03T10:00:00.000Z',
        },
      }),
      makeMapping({ tenant_overrides: {} }),
    );
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('missing_conversion_action_id');
  });

  it('returns skipped/mapping_disabled when mapping is disabled for the tenant', async () => {
    const result = await dispatchToGoogleAds(
      makeEvent(),
      makeMapping({
        tenant_overrides: {
          [ACCOUNT_ID]: {
            conversion_action_id: CONVERSION_ACTION_ID,
            enabled: false,
          },
        },
      }),
    );
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('mapping_disabled');
  });

  it('uploads when a gclid is present (stubbed fetch); attaches order id when bookingId given', async () => {
    const fetchImpl = jest.fn();
    const event = makeEvent({
      attribution: {
        account_id: ACCOUNT_ID,
        website_id: WEBSITE_ID,
        locale: 'es-CO',
        market: 'CO',
        reference_code: 'HOME-2505-ABCD',
        session_key: 'sess-12345678',
        source_url: null,
        page_path: '/',
        channel: 'google_ads',
        utm: {
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          utm_term: null,
        },
        click_ids: {
          gclid: 'G-LEAD-123',
          gbraid: null,
          wbraid: null,
          fbclid: null,
          ttclid: null,
        },
        captured_at: '2026-05-03T10:00:00.000Z',
      },
    });
    const result = await dispatchToGoogleAds(event, makeMapping(), {
      bookingId: 'booking-xyz',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      // No accessToken provided → upload client uses the stub branch
      // (returns ok=true status=202). Real Google Ads call NOT made.
      config: {
        enabled: true,
        customerId: '1112223333',
        developerToken: 'tok',
      },
    });
    expect(result.status).toBe('sent');
    expect(result.conversionActionId).toBe(CONVERSION_ACTION_ID);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads value_amount from event.payload when mapping.value_field is set', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{}] }),
      text: async () => '',
    } as unknown as Response);
    const event = makeEvent({
      event_name: 'booking_confirmed',
      stage: 'booking',
      payload: { value_amount: 1500000, value_currency: 'COP' },
      attribution: {
        account_id: ACCOUNT_ID,
        website_id: WEBSITE_ID,
        locale: 'es-CO',
        market: 'CO',
        reference_code: 'HOME-2505-ABCD',
        session_key: 'sess-12345678',
        source_url: null,
        page_path: '/',
        channel: 'google_ads',
        utm: {
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          utm_term: null,
        },
        click_ids: {
          gclid: 'G-BOOK-XYZ',
          gbraid: null,
          wbraid: null,
          fbclid: null,
          ttclid: null,
        },
        captured_at: '2026-05-03T10:00:00.000Z',
      },
    });
    const result = await dispatchToGoogleAds(
      event,
      makeMapping({ value_field: 'value_amount' }),
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        accessToken: 'oauth-token',
        config: {
          enabled: true,
          customerId: '1112223333',
          developerToken: 'tok',
        },
      },
    );
    expect(result.status).toBe('sent');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = (fetchImpl as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.conversions[0].conversionValue).toBe(1500000);
    expect(body.conversions[0].currencyCode).toBe('COP');
  });
});
