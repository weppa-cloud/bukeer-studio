jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/booking/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  extractClientIp: jest.fn(() => '203.0.113.10'),
}));

jest.mock('@/lib/meta/conversions-api', () => ({
  sha256Hex: jest.fn(async (value: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }),
  sendMetaConversionEvent: jest.fn().mockResolvedValue({
    status: 'skipped',
    eventName: 'Lead',
    eventId: 'HOME-2504-ABCD:lead',
    request: { data: [] },
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/booking/rate-limit';
import { sendMetaConversionEvent } from '@/lib/meta/conversions-api';

function request(body: Record<string, unknown>) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers({ 'user-agent': 'jest-agent' }),
  } as any;
}

describe('/api/waflow/lead', () => {
  let upsertPayload: Record<string, unknown> | null;
  let funnelRows: Record<string, unknown>[];

  function buildSupabaseMock() {
    const websitesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: '22222222-2222-4222-8222-222222222222',
          account_id: '11111111-1111-4111-8111-111111111111',
        },
        error: null,
      }),
    };

    const leadsQuery: {
      upsert: jest.Mock;
      select: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      upsert: jest.fn((payload: Record<string, unknown>) => {
        upsertPayload = payload;
        return leadsQuery;
      }),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'lead-1', created_at: '2026-04-25T12:00:00.000Z' },
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
        data: { event_id: 'event-1' },
        error: null,
      }),
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'websites') return websitesQuery;
        if (table === 'waflow_leads') return leadsQuery;
        if (table === 'funnel_events') return funnelQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    upsertPayload = null;
    funnelRows = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    (checkRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: new Date('2026-04-25T12:10:00Z'),
    });
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
  });

  it('validates and merges attribution into the persisted payload', async () => {
    const mod = await import('@/app/api/waflow/lead/route');
    const response = await mod.POST(
      request({
        sessionKey: 'session-123',
        subdomain: 'colombiatours',
        variant: 'A',
        step: 'confirmation',
        referenceCode: 'HOME-2504-ABCD',
        submitted: true,
        attribution: {
          fbp: 'fb.1.1700000000.abc',
          fbc: 'fb.1.1700000123.FB123',
          fbclid: 'FB123',
          utm_source: 'meta',
          utm_medium: 'cpc',
          utm_campaign: 'spring',
          source_url: 'https://demo.bukeer.com/?fbclid=FB123&utm_source=meta',
          page_path: '/?fbclid=FB123&utm_source=meta',
        },
        payload: {
          name: 'Juan',
          phone: '+573001234567',
          eventIds: {
            lead: 'HOME-2504-ABCD:lead',
          },
          attribution: {
            source_url: 'https://legacy.example/',
          },
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(upsertPayload).toMatchObject({
      account_id: '11111111-1111-4111-8111-111111111111',
      website_id: '22222222-2222-4222-8222-222222222222',
      subdomain: 'colombiatours',
      reference_code: 'HOME-2504-ABCD',
      source_ip: '203.0.113.10',
      source_user_agent: 'jest-agent',
    });
    expect(upsertPayload?.payload as Record<string, unknown>).toMatchObject({
      name: 'Juan',
      phone: '+573001234567',
      eventIds: {
        lead: 'HOME-2504-ABCD:lead',
      },
      attribution: {
        fbp: 'fb.1.1700000000.abc',
        fbc: 'fb.1.1700000123.FB123',
        fbclid: 'FB123',
        utm_source: 'meta',
        utm_medium: 'cpc',
        utm_campaign: 'spring',
        source_url: 'https://demo.bukeer.com/?fbclid=FB123&utm_source=meta',
        page_path: '/?fbclid=FB123&utm_source=meta',
      },
    });
    expect(sendMetaConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'Lead',
        eventId: 'HOME-2504-ABCD:lead',
        eventSourceUrl: 'https://demo.bukeer.com/?fbclid=FB123&utm_source=meta',
        userData: expect.objectContaining({
          phone: '+573001234567',
          firstName: 'Juan',
          externalId: 'HOME-2504-ABCD',
          fbp: 'fb.1.1700000000.abc',
          fbc: 'fb.1.1700000123.FB123',
          clientIpAddress: '203.0.113.10',
          clientUserAgent: 'jest-agent',
        }),
        customData: expect.objectContaining({
          reference_code: 'HOME-2504-ABCD',
          session_key: 'session-123',
          subdomain: 'colombiatours',
        }),
        accountId: '11111111-1111-4111-8111-111111111111',
        websiteId: '22222222-2222-4222-8222-222222222222',
        waflowLeadId: 'lead-1',
      }),
      expect.objectContaining({ supabase: expect.any(Object) }),
    );
    expect(funnelRows).toHaveLength(1);
    expect(funnelRows[0]).toMatchObject({
      event_name: 'waflow_submit',
      stage: 'activation',
      channel: 'waflow',
      reference_code: 'HOME-2504-ABCD',
      account_id: '11111111-1111-4111-8111-111111111111',
      website_id: '22222222-2222-4222-8222-222222222222',
      locale: 'es-CO',
      market: 'CO',
      occurred_at: '2026-04-25T12:00:00.000Z',
    });
    expect(funnelRows[0].event_id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects malformed attribution fields before persistence', async () => {
    const mod = await import('@/app/api/waflow/lead/route');
    const response = await mod.POST(
      request({
        sessionKey: 'session-123',
        variant: 'A',
        step: 'confirmation',
        attribution: {
          unknown_field: 'not allowed',
        },
        payload: {},
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertPayload).toBeNull();
    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
  });
});
