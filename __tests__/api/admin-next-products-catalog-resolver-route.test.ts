import { NextRequest } from 'next/server';

import { POST } from '@/app/api/admin-next/products/catalog-resolver/route';
import {
  getAdminSessionContext,
  hasAdminPermission,
} from '@/lib/admin-next/session/get-admin-session-context';

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.fn(),
}));

const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockHasAdminPermission = jest.mocked(hasAdminPermission);

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
});
