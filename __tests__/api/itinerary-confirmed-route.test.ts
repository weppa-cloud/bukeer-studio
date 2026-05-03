jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/meta/conversions-api', () => ({
  sha256Hex: jest.fn(async (value: string) =>
    value.startsWith('booking_confirmed:') ? 'b'.repeat(64) : 'a'.repeat(64),
  ),
  sendMetaConversionEvent: jest.fn(async () => ({ status: 'sent' })),
}));

import { createClient } from '@supabase/supabase-js';
import { sendMetaConversionEvent } from '@/lib/meta/conversions-api';

function request(body: Record<string, unknown>, secret = 'crm-secret') {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers({ 'x-bukeer-crm-secret': secret }),
  } as any;
}

describe('/api/growth/events/itinerary-confirmed', () => {
  let funnelRows: Record<string, unknown>[];
  let existingBookingEvent: { event_id: string; provider_status: unknown[] } | null;
  let existingPurchaseEvent: { status: string } | null;
  let funnelUpdates: Record<string, unknown>[];

  function buildSupabaseMock() {
    const itineraryQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: '33333333-3333-4333-8333-333333333333',
          account_id: '11111111-1111-4111-8111-111111111111',
          status: 'Confirmado',
          total_amount: 3000,
          total_cost: 2100,
          currency_type: 'EUR',
          language: 'es',
          custom_fields: {},
        },
        error: null,
      }),
    };

    const websiteQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: '22222222-2222-4222-8222-222222222222' },
        error: null,
      }),
    };

    const existingQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: existingBookingEvent, error: null }),
      ),
    };

    const attributionQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    const insertQuery: {
      insert: jest.Mock;
      select: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      insert: jest.fn((row: Record<string, unknown>) => {
        funnelRows.push(row);
        return insertQuery;
      }),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { event_id: 'b'.repeat(64) },
        error: null,
      }),
    };

    const funnelEvents = {
      select: jest.fn((columns: string) => {
        if (columns.includes('provider_status')) return existingQuery;
        return attributionQuery;
      }),
      insert: insertQuery.insert,
      update: jest.fn((row: Record<string, unknown>) => {
        funnelUpdates.push(row);
        return { eq: jest.fn().mockReturnValue({ error: null }) };
      }),
    };

    const metaConversionEvents = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockImplementation(() =>
          Promise.resolve({ data: existingPurchaseEvent, error: null }),
        ),
      }),
      insert: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: null, error: null })),
      })),
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'itineraries') return itineraryQuery;
        if (table === 'websites') return websiteQuery;
        if (table === 'funnel_events') return funnelEvents;
        if (table === 'meta_conversion_events') return metaConversionEvents;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    funnelRows = [];
    existingBookingEvent = null;
    existingPurchaseEvent = null;
    funnelUpdates = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.CRM_CONVERSION_WEBHOOK_SECRET = 'crm-secret';
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
  });

  afterEach(() => {
    delete process.env.CRM_CONVERSION_WEBHOOK_SECRET;
  });

  it('records the first confirmation and sends one Meta Purchase', async () => {
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(
      request({
        itinerary_id: '33333333-3333-4333-8333-333333333333',
        booking_id: 'quote-123',
        previous_status: 'Presupuesto',
        new_status: 'Confirmado',
        confirmed_at: '2026-05-02T12:00:00.000Z',
        value: 3200,
        currency: 'EUR',
        reference_code: 'WEB-ABC12345',
        customer: {
          email: 'buyer@example.com',
          phone: '+34600111222',
          name: 'Ana Garcia',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(sendMetaConversionEvent).toHaveBeenCalledTimes(1);
    expect(sendMetaConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Purchase',
        eventId: 'purchase:33333333-3333-4333-8333-333333333333',
        customData: expect.objectContaining({
          value: 3200,
          currency: 'EUR',
          order_id: 'quote-123',
        }),
      }),
      expect.objectContaining({ supabase: expect.any(Object) }),
    );
    expect(funnelRows).toHaveLength(1);
    expect(funnelRows[0]).toMatchObject({
      event_id: 'b'.repeat(64),
      event_name: 'booking_confirmed',
      stage: 'booking',
      reference_code: 'WEB-ABC12345',
      payload: expect.objectContaining({
        source: 'itinerary_confirmed_endpoint',
        itinerary_id: '33333333-3333-4333-8333-333333333333',
        amount: 3200,
        currency: 'EUR',
        gross_margin: 1100,
      }),
    });
    expect(JSON.stringify(funnelRows[0].payload)).not.toContain('buyer@example.com');
    expect(JSON.stringify(funnelRows[0].payload)).not.toContain('+34600111222');
  });

  it('dedupes reconfirmations for the same itinerary', async () => {
    existingBookingEvent = {
      event_id: 'b'.repeat(64),
      provider_status: [{ provider: 'meta_capi', status: 'sent' }],
    };
    existingPurchaseEvent = { status: 'sent' };
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(
      request({
        itinerary_id: '33333333-3333-4333-8333-333333333333',
        booking_id: 'quote-123',
        previous_status: 'Presupuesto',
        new_status: 'Confirmado',
        confirmed_at: '2026-05-03T12:00:00.000Z',
        value: 3600,
        currency: 'EUR',
        reference_code: 'WEB-ABC12345',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.deduped).toBe(true);
    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
    expect(funnelRows).toHaveLength(0);
  });

  it('sends Purchase once when the SQL trigger already inserted the funnel event', async () => {
    existingBookingEvent = {
      event_id: 'b'.repeat(64),
      provider_status: [],
    };
    existingPurchaseEvent = null;
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(
      request({
        itinerary_id: '33333333-3333-4333-8333-333333333333',
        booking_id: 'quote-123',
        previous_status: 'Presupuesto',
        new_status: 'Confirmado',
        confirmed_at: '2026-05-02T12:00:00.000Z',
        value: 3200,
        currency: 'EUR',
        reference_code: 'WEB-ABC12345',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.deduped).toBe(true);
    expect(sendMetaConversionEvent).toHaveBeenCalledTimes(1);
    expect(funnelRows).toHaveLength(0);
    expect(funnelUpdates[0]).toMatchObject({
      provider_status: expect.arrayContaining([
        expect.objectContaining({ provider: 'meta_capi', status: 'sent' }),
      ]),
    });
  });

  it('rejects requests without the CRM secret', async () => {
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(
      request({
        itinerary_id: '33333333-3333-4333-8333-333333333333',
        new_status: 'Confirmado',
        confirmed_at: '2026-05-02T12:00:00.000Z',
        reference_code: 'WEB-ABC12345',
      }, 'wrong-secret'),
    );

    expect(response.status).toBe(401);
  });
});
