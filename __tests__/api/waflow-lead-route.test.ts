jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/booking/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  extractClientIp: jest.fn(() => '203.0.113.10'),
}));

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/booking/rate-limit';

function request(body: Record<string, unknown>) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers({ 'user-agent': 'jest-agent' }),
  } as any;
}

describe('/api/waflow/lead', () => {
  let upsertPayload: Record<string, unknown> | null;

  function buildSupabaseMock() {
    const websitesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'website-1', account_id: 'account-1' },
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
        data: { id: 'lead-1' },
        error: null,
      }),
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'websites') return websitesQuery;
        if (table === 'waflow_leads') return leadsQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    upsertPayload = null;
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
          attribution: {
            source_url: 'https://legacy.example/',
          },
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(upsertPayload).toMatchObject({
      account_id: 'account-1',
      website_id: 'website-1',
      subdomain: 'colombiatours',
      reference_code: 'HOME-2504-ABCD',
      source_ip: '203.0.113.10',
      source_user_agent: 'jest-agent',
    });
    expect(upsertPayload?.payload as Record<string, unknown>).toMatchObject({
      name: 'Juan',
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
  });
});
