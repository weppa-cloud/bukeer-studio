/**
 * F3 (#422) -- refactored route test.
 *
 * The route is now a thin wrapper around the Supabase RPC
 * `record_booking_confirmed` (introduced in
 * `supabase/migrations/20260503150100_record_booking_confirmed_rpc.sql`).
 *
 * Coverage focus:
 *  - Auth gate (CRM secret) still rejects bad headers.
 *  - On success the route invokes `supabase.rpc('record_booking_confirmed', { p_itinerary_id })`
 *    and surfaces the RPC return verbatim under `data.rpc`.
 *  - Legacy body fields (value, currency, locale, market, ...) are
 *    intentionally ignored (RPC reads from the DB row), and the route flags
 *    `value_override_ignored` / `currency_override_ignored` for diagnostics.
 *  - RPC error is reported as a 5xx without leaking PostgREST details.
 */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';

function request(body: Record<string, unknown>, secret = 'crm-secret') {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers({ 'x-bukeer-crm-secret': secret }),
  } as unknown as import('next/server').NextRequest;
}

interface RpcCallSpy {
  fn: string;
  args: Record<string, unknown> | undefined;
}

interface RpcResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

function installSupabaseMock(rpcResult: RpcResult, rpcCalls: RpcCallSpy[]) {
  (createClient as jest.Mock).mockImplementation(() => ({
    rpc: jest.fn(async (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return rpcResult;
    }),
  }));
}

describe('/api/growth/events/itinerary-confirmed (F3 wrapper)', () => {
  let rpcCalls: RpcCallSpy[];

  beforeEach(() => {
    rpcCalls = [];
    (createClient as jest.Mock).mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.CRM_CONVERSION_WEBHOOK_SECRET = 'crm-secret';
  });

  afterEach(() => {
    delete process.env.CRM_CONVERSION_WEBHOOK_SECRET;
  });

  it('forwards itinerary_id to record_booking_confirmed RPC and returns its result', async () => {
    installSupabaseMock(
      { data: { inserted: true, event_id: 'a'.repeat(64), dispatch_status: 'pending' }, error: null },
      rpcCalls,
    );

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

    expect(response.status).toBe(200);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toMatchObject({
      fn: 'record_booking_confirmed',
      args: { p_itinerary_id: '33333333-3333-4333-8333-333333333333' },
    });

    const json = (await response.json()) as { data: Record<string, unknown> };
    expect(json.data).toMatchObject({
      itinerary_id: '33333333-3333-4333-8333-333333333333',
      rpc: { inserted: true, event_id: 'a'.repeat(64), dispatch_status: 'pending' },
      value_override_ignored: true,
      currency_override_ignored: true,
    });
  });

  it('flags value_override_ignored=false when the body did not include value', async () => {
    installSupabaseMock(
      { data: { inserted: false, deduped: true, event_id: 'b'.repeat(64) }, error: null },
      rpcCalls,
    );

    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(request({ itinerary_id: '33333333-3333-4333-8333-333333333333' }));

    expect(response.status).toBe(200);
    const json = (await response.json()) as { data: Record<string, unknown> };
    expect(json.data.value_override_ignored).toBe(false);
    expect(json.data.currency_override_ignored).toBe(false);
    expect(json.data.rpc).toMatchObject({ inserted: false, deduped: true });
  });

  it('returns 5xx without leaking the PostgREST error message', async () => {
    installSupabaseMock(
      { data: null, error: { code: '42883', message: 'function record_booking_confirmed does not exist' } },
      rpcCalls,
    );

    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(request({ itinerary_id: '33333333-3333-4333-8333-333333333333' }));

    expect(response.status).toBe(500);
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain('record_booking_confirmed does not exist');
  });

  it('rejects requests without the CRM secret', async () => {
    installSupabaseMock({ data: null, error: null }, rpcCalls);
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(
      request({ itinerary_id: '33333333-3333-4333-8333-333333333333' }, 'wrong-secret'),
    );

    expect(response.status).toBe(401);
    expect(rpcCalls).toHaveLength(0);
  });

  it('rejects malformed itinerary_id with 400', async () => {
    installSupabaseMock({ data: null, error: null }, rpcCalls);
    const mod = await import('@/app/api/growth/events/itinerary-confirmed/route');
    const response = await mod.POST(request({ itinerary_id: 'not-a-uuid' }));

    expect(response.status).toBe(400);
    expect(rpcCalls).toHaveLength(0);
  });
});
