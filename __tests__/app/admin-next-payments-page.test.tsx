import AdminNextPaymentsPage from '@/app/admin/payments/page';
import { PaymentsModule } from '@/components/admin-next';
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
  PaymentsModule: jest.fn(() => null),
}));

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual('@/lib/admin-next/session/get-admin-session-context')
    .hasAdminPermission,
}));

const mockPaymentsModule = jest.mocked(PaymentsModule);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: 'authenticated',
    userId: 'user-1',
    email: 'treasury@bukeer.test',
    accountId: 'account-1',
    role: 'accounting',
    displayName: 'Treasury One',
    permissions: ['admin_next.view', 'payments.manage', 'trace.view'],
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

describe('/admin/payments auth boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to shared login with next', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'unauthenticated',
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextPaymentsPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=/admin/payments',
    );
    expect(mockPaymentsModule).not.toHaveBeenCalled();
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

    await expect(AdminNextPaymentsPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockPaymentsModule).not.toHaveBeenCalled();
  });

  it('enforces server-side Admin Next visibility permission', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ['payments.manage'],
      }) as never,
    );

    await expect(AdminNextPaymentsPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockPaymentsModule).not.toHaveBeenCalled();
  });

  it('renders payments fixture with Evolucion theme styles', async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextPaymentsPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockPaymentsModule,
        props: expect.objectContaining({
          session,
          fixture: expect.objectContaining({
            collectBatch: expect.objectContaining({
              invoiceIds: ['inv-2647-01', 'inv-2647-02', 'inv-2647-03'],
            }),
            accountPaymentConfig: expect.objectContaining({
              mode: 'test',
            }),
          }),
          evolucionTheme: expect.objectContaining({
            presetSlug: 'evolucion',
          }),
        }),
      }),
    );
  });
});
