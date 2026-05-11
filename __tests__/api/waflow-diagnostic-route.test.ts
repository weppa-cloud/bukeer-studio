jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/meta/conversions-api', () => ({
  sha256Hex: jest.fn(async () => 'b'.repeat(64)),
}));

import { createClient } from '@supabase/supabase-js';

function request(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  } as any;
}

describe('/api/growth/events/waflow-diagnostic', () => {
  let websiteEqCalls: Array<[string, unknown]>;
  let funnelRows: Record<string, unknown>[];
  let rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;

  function buildSupabaseMock() {
    const websitesQuery: {
      select: jest.Mock;
      eq: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((field: string, value: unknown) => {
        websiteEqCalls.push([field, value]);
        return websitesQuery;
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: '22222222-2222-4222-8222-222222222222',
          account_id: '11111111-1111-4111-8111-111111111111',
        },
        error: null,
      }),
    };

    const funnelQuery: {
      insert: jest.Mock;
      select: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      insert: jest.fn((payload: Record<string, unknown>) => {
        funnelRows.push(payload);
        return funnelQuery;
      }),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { event_id: 'b'.repeat(64) },
        error: null,
      }),
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'websites') return websitesQuery;
        if (table === 'funnel_events') return funnelQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: jest.fn((fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args });
        return Promise.resolve({ data: { event_id: 'b'.repeat(64) }, error: null });
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    websiteEqCalls = [];
    funnelRows = [];
    rpcCalls = [];
    delete process.env.FUNNEL_EVENTS_DISPATCHER_V1;
    delete process.env.FUNNEL_DISPATCH_SYNC;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
  });

  it('persists WAFlow abandon diagnostics as first-party funnel events', async () => {
    const mod = await import('@/app/api/growth/events/waflow-diagnostic/route');
    const response = await mod.POST(
      request({
        event_name: 'waflow_abandon',
        reference_code: 'WEB-ABANDON1',
        source_url:
          'https://colombiatours.travel/colombia-travel-packages?utm_source=google&gclid=GCLID123',
        page_path: '/colombia-travel-packages?utm_source=google&gclid=GCLID123',
        referrer: 'https://google.com/',
        variant: 'B',
        step: 'contact',
        reason: 'drawer_close',
        has_phone: true,
        has_name: false,
        occurred_at: '2026-05-11T18:00:00.000Z',
      }),
    );

    expect(response.status).toBe(200);
    expect(websiteEqCalls).toEqual(
      expect.arrayContaining([
        ['status', 'published'],
        ['custom_domain', 'colombiatours.travel'],
      ]),
    );
    expect(funnelRows).toHaveLength(1);
    expect(funnelRows[0]).toMatchObject({
      event_id: 'b'.repeat(64),
      pixel_event_id: 'b'.repeat(64),
      event_name: 'waflow_abandon',
      source_system: 'waflow',
      business_stage: 'dropped',
      owner: 'studio',
      optimization_policy: 'observation_only',
      stage: 'activation',
      channel: 'waflow',
      reference_code: 'WEB-ABANDON1',
      account_id: '11111111-1111-4111-8111-111111111111',
      website_id: '22222222-2222-4222-8222-222222222222',
      occurred_at: '2026-05-11T18:00:00.000Z',
    });
    expect(funnelRows[0].payload).toMatchObject({
      variant: 'B',
      step: 'contact',
      reason: 'drawer_close',
      has_phone: true,
      has_name: false,
    });
    expect(funnelRows[0].attribution).toMatchObject({
      channel: 'google_ads',
      click_ids: expect.objectContaining({ gclid: 'GCLID123' }),
    });
  });

  it('uses record_funnel_event RPC when dispatcher v1 is enabled', async () => {
    process.env.FUNNEL_EVENTS_DISPATCHER_V1 = 'true';
    const mod = await import('@/app/api/growth/events/waflow-diagnostic/route');
    const response = await mod.POST(
      request({
        event_name: 'waflow_validation_error',
        reference_code: 'WEB-VALIDATE1',
        source_url: 'https://colombiatours.travel/eje-cafetero',
        page_path: '/eje-cafetero',
        step: 'contact',
        fields: 'phone',
        occurred_at: '2026-05-11T18:01:00.000Z',
      }),
    );

    expect(response.status).toBe(200);
    expect(funnelRows).toHaveLength(0);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toMatchObject({
      fn: 'record_funnel_event',
      args: {
        payload: expect.objectContaining({
          event_name: 'waflow_validation_error',
          pixel_event_id: 'b'.repeat(64),
          source_system: 'waflow',
          business_stage: 'intent',
          optimization_policy: 'observation_only',
          raw_payload: expect.objectContaining({
            step: 'contact',
            fields: 'phone',
          }),
        }),
      },
    });
  });
});
