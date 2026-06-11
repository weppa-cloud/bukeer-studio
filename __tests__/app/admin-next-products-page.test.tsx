import AdminNextProductsPage from '@/app/admin/products/page';
import { ProductsModule } from '@/components/admin-next';
import { createProductsAdapter } from '@/lib/admin-next/products-adapter';
import { getAdminSessionContext } from '@/lib/admin-next/session/get-admin-session-context';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('@/components/admin-next', () => ({
  ProductsModule: jest.fn(() => null),
}));

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    '@/lib/admin-next/session/get-admin-session-context',
  ).hasAdminPermission,
}));

jest.mock('@/lib/admin-next/products-adapter', () => ({
  createProductsAdapter: jest.fn(),
}));

jest.mock('@/lib/supabase/server-client', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockProductsModule = jest.mocked(ProductsModule);
const mockCreateProductsAdapter = jest.mocked(createProductsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  selected: {
    name: 'Hotel Las Islas',
  },
};

function adapterWithFixture() {
  return {
    getProducts: jest.fn().mockResolvedValue(fixture),
  };
}

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: 'authenticated',
    userId: 'user-1',
    email: 'agent@bukeer.test',
    accountId: 'account-1',
    role: 'admin',
    displayName: 'Agent One',
    permissions: ['admin_next.view', 'planner.view', 'trace.view'],
    flags: {
      adminNextPrototype: true,
      adminNextBetaReadonlyEnabled: false,
      adminNextBetaAccountAllowed: false,
      adminNextBetaRoleAllowed: false,
      adminNextBetaReadonly: false,
      adminNextExternalHandoff: false,
    },
    ...overrides,
  };
}

describe('/admin/products auth boundary', () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateProductsAdapter.mockReturnValue(adapterWithFixture() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
  });

  afterEach(() => {
    if (originalDataSourceMode === undefined) {
      delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    } else {
      process.env.ADMIN_NEXT_DATA_SOURCE_MODE = originalDataSourceMode;
    }
  });

  it('redirects unauthenticated users to shared login with next', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'unauthenticated',
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextProductsPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=/admin/products',
    );
    expect(mockCreateProductsAdapter).not.toHaveBeenCalled();
    expect(mockProductsModule).not.toHaveBeenCalled();
  });

  it('hides the route when the prototype flag is disabled', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        flags: {
          ...authenticatedSession().flags,
          adminNextPrototype: false,
        },
      }) as never,
    );

    await expect(AdminNextProductsPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockCreateProductsAdapter).not.toHaveBeenCalled();
    expect(mockProductsModule).not.toHaveBeenCalled();
  });

  it('enforces server-side Admin Next permission', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ['planner.view'],
      }) as never,
    );

    await expect(AdminNextProductsPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockCreateProductsAdapter).not.toHaveBeenCalled();
    expect(mockProductsModule).not.toHaveBeenCalled();
  });

  it('renders products fixture with Evolucion theme styles', async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextProductsPage();

    expect(mockCreateProductsAdapter).toHaveBeenCalledWith('fixture');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockProductsModule,
        props: expect.objectContaining({
          session,
          fixture,
          evolucionTheme: expect.objectContaining({
            presetSlug: 'evolucion',
          }),
        }),
      }),
    );
  });

  it('uses readonly Supabase only for allowlisted beta sessions', async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'readonly';
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    const supabase = { rpc: jest.fn() };
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateSupabaseServerClient.mockResolvedValue(supabase as never);

    const element = await AdminNextProductsPage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreateProductsAdapter).toHaveBeenCalledWith({
      mode: 'readonly',
      supabase,
      accountId: 'account-1',
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockProductsModule,
        props: expect.objectContaining({
          fixture,
        }),
      }),
    );
  });

  it('keeps fixture mode when readonly is requested without beta access', async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'readonly';
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    await AdminNextProductsPage();

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateProductsAdapter).toHaveBeenCalledWith('fixture');
  });
});
