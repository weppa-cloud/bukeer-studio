import { NextRequest } from 'next/server';

import { POST } from '@/app/api/admin-next/products/catalog-resolver/route';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.fn(),
}));

jest.mock('@/lib/supabase/server-client', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockHasAdminPermission = jest.mocked(hasAdminPermission);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

function request(body: unknown) {
  return new NextRequest('http://localhost/api/admin-next/products/catalog-resolver', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    status: 'authenticated',
    userId: 'user-products',
    email: 'products@bukeer.test',
    displayName: 'Products Admin',
    accountId: 'account-products',
    role: 'admin',
    permissions: ['admin_next.view', 'planner.view', 'trace.view'],
    flags: {
      adminNextPrototype: true,
      adminNextBetaReadonly: true,
      adminNextExternalHandoff: false,
    },
    ...overrides,
  };
}

describe('POST /api/admin-next/products/catalog-resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'fixture';
    mockGetAdminSessionContext.mockResolvedValue(session() as never);
    mockHasAdminPermission.mockReturnValue(true);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
  });

  afterEach(() => {
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
  });

  it('requires an authenticated Admin Next session', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      {
        status: 'unauthenticated',
        flags: {
          adminNextPrototype: true,
          adminNextBetaReadonly: false,
          adminNextExternalHandoff: false,
        },
      } as never,
    );

    const response = await POST(
      request({ rows: [{ id: 'row-1', sourceName: 'Hotel Las Islas' }] }),
    );

    expect(response.status).toBe(401);
  });

  it('requires server-side admin_next.view permission', async () => {
    mockHasAdminPermission.mockReturnValue(false);

    const response = await POST(
      request({ rows: [{ id: 'row-1', sourceName: 'Hotel Las Islas' }] }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('validates rows at the API boundary', async () => {
    const response = await POST(request({ rows: [] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('resolves catalog rows with account-scoped response metadata', async () => {
    const response = await POST(
      request({
        rows: [
          {
            id: 'row-1',
            sourceName: 'Hotel Las Islas',
            type: 'Hotel',
            city: 'Baru, Cartagena',
            provider: 'Hotel Las Islas',
          },
          {
            id: 'row-2',
            sourceName: 'Tour privado Getsemani nocturno',
          },
        ],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      mode: 'fixture',
      accountId: 'account-products',
      resolverVersion: 'catalog_resolver_v1',
      items: [
        expect.objectContaining({
          id: 'row-1',
          action: 'link',
          reason: 'exact_fixture_match',
        }),
        expect.objectContaining({
          id: 'row-2',
          action: 'create',
          reason: 'no_match_fixture_fallback',
        }),
      ],
    });
  });

  it('uses the readonly Supabase RPC resolver for beta readonly sessions', async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'readonly';
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'master-hotel-1',
          name: 'Hotel Las Islas',
          data_completeness: 96,
        },
      ],
      error: null,
    });
    mockCreateSupabaseServerClient.mockResolvedValue({ rpc } as never);

    const response = await POST(
      request({
        rows: [
          {
            id: 'row-1',
            sourceName: 'Hotel Las Islas',
            type: 'Hotel',
          },
        ],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('search_master_hotels', {
      p_query: 'Hotel Las Islas',
      p_limit: 1,
    });
    expect(body.data).toMatchObject({
      mode: 'readonly',
      accountId: 'account-products',
      items: [
        expect.objectContaining({
          action: 'link',
          reason: 'readonly_master_match',
        }),
      ],
    });
  });
});
