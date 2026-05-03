jest.mock('@/lib/meta/conversions-api', () => ({
  sendMetaConversionEvent: jest.fn(async () => ({ status: 'sent' })),
}));

import { sendMetaConversionEvent } from '@/lib/meta/conversions-api';
import { sendPurchaseConversions } from '@/lib/growth/purchase-conversions';

describe('sendPurchaseConversions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends Meta Purchase with value and currency', async () => {
    const supabase = { from: jest.fn() };

    const statuses = await sendPurchaseConversions(supabase, {
      accountId: '11111111-1111-4111-8111-111111111111',
      websiteId: '22222222-2222-4222-8222-222222222222',
      itineraryId: '33333333-3333-4333-8333-333333333333',
      bookingId: 'quote-123',
      referenceCode: 'WEB-ABC12345',
      purchaseEventId: 'purchase:33333333-3333-4333-8333-333333333333',
      occurredAt: new Date('2026-05-02T12:00:00.000Z'),
      value: 2400,
      currency: 'EUR',
      customer: {
        email: 'buyer@example.com',
        phone: '+34600111222',
        name: 'Ana Garcia',
      },
    });

    expect(sendMetaConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Purchase',
        eventId: 'purchase:33333333-3333-4333-8333-333333333333',
        bookingId: null,
        customData: expect.objectContaining({
          value: 2400,
          currency: 'EUR',
          order_id: 'quote-123',
          itinerary_id: '33333333-3333-4333-8333-333333333333',
        }),
        userData: expect.objectContaining({
          email: 'buyer@example.com',
          phone: '+34600111222',
          firstName: 'Ana',
          lastName: 'Garcia',
        }),
      }),
      { supabase },
    );
    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'meta_capi', status: 'sent' }),
        expect.objectContaining({ provider: 'ga4', status: 'skipped', error_code: 'skipped_missing_client_id' }),
        expect.objectContaining({ provider: 'tiktok_events_api', status: 'skipped', error_code: 'skipped_not_configured' }),
      ]),
    );
  });

  it('skips provider sends when value or currency is missing', async () => {
    const statuses = await sendPurchaseConversions({ from: jest.fn() }, {
      accountId: '11111111-1111-4111-8111-111111111111',
      websiteId: '22222222-2222-4222-8222-222222222222',
      itineraryId: '33333333-3333-4333-8333-333333333333',
      referenceCode: 'WEB-ABC12345',
      purchaseEventId: 'purchase:33333333-3333-4333-8333-333333333333',
      occurredAt: new Date('2026-05-02T12:00:00.000Z'),
      value: null,
      currency: 'EUR',
    });

    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'meta_capi',
          status: 'skipped',
          error_code: 'skipped_missing_value',
        }),
      ]),
    );
  });
});
