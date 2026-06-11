import AdminNextDashboardPage from '@/app/admin/dashboard/page';
import { DashboardModule } from '@/components/admin-next';
import { getAdminSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('@/components/admin-next', () => ({
  DashboardModule: jest.fn(() => null),
}));

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    '@/lib/admin-next/session/get-admin-session-context',
  ).hasAdminPermission,
}));

const mockDashboardModule = jest.mocked(DashboardModule);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);

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

describe('/admin/dashboard auth boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to shared login with next', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'unauthenticated',
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextDashboardPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=/admin/dashboard',
    );
    expect(mockDashboardModule).not.toHaveBeenCalled();
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

    await expect(AdminNextDashboardPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockDashboardModule).not.toHaveBeenCalled();
  });

  it('enforces server-side Admin Next permission', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ['planner.view'],
      }) as never,
    );

    await expect(AdminNextDashboardPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockDashboardModule).not.toHaveBeenCalled();
  });

  it('renders dashboard fixture with Evolucion theme styles', async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextDashboardPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockDashboardModule,
        props: expect.objectContaining({
          session,
          fixture: expect.objectContaining({
            kpis: expect.arrayContaining([
              expect.objectContaining({ id: 'monthly-sales' }),
            ]),
          }),
          evolucionTheme: expect.objectContaining({
            presetSlug: 'evolucion',
          }),
        }),
      }),
    );
  });
});
