import AdminNextItinerariesPage from '@/app/admin/itineraries/page';
import { ItinerariesModule } from '@/components/admin-next';
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
  ItinerariesModule: jest.fn(() => null),
}));

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    '@/lib/admin-next/session/get-admin-session-context',
  ).hasAdminPermission,
}));

const mockItinerariesModule = jest.mocked(ItinerariesModule);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: 'authenticated',
    userId: 'user-1',
    email: 'planner@bukeer.test',
    accountId: 'account-1',
    role: 'admin',
    displayName: 'Planner One',
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

describe('/admin/itineraries auth boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to shared login with next', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'unauthenticated',
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextItinerariesPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=/admin/itineraries',
    );
    expect(mockItinerariesModule).not.toHaveBeenCalled();
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

    await expect(AdminNextItinerariesPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockItinerariesModule).not.toHaveBeenCalled();
  });

  it('enforces server-side planner permission', async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ['admin_next.view'],
      }) as never,
    );

    await expect(AdminNextItinerariesPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockItinerariesModule).not.toHaveBeenCalled();
  });

  it('renders itineraries fixture with Evolucion theme styles', async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItinerariesPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockItinerariesModule,
        props: expect.objectContaining({
          session,
          fixture: expect.objectContaining({
            statuses: expect.arrayContaining([
              expect.objectContaining({ id: 'draft' }),
              expect.objectContaining({ id: 'won' }),
            ]),
            itineraries: expect.arrayContaining([
              expect.objectContaining({ id: 'it-2647' }),
            ]),
            details: expect.objectContaining({
              'it-2651': expect.objectContaining({
                services: expect.any(Array),
                passengers: expect.any(Array),
                suppliers: expect.any(Array),
                payments: expect.any(Array),
                preview: expect.any(Array),
              }),
            }),
            paymentPlans: expect.objectContaining({
              'it-2651': expect.objectContaining({
                methods: expect.arrayContaining([
                  expect.objectContaining({ id: 'card', feeIncluded: true }),
                  expect.objectContaining({ id: 'bank_transfer', feeIncluded: false }),
                ]),
                installments: expect.arrayContaining([
                  expect.objectContaining({ id: 'it-2651-installment-1', locked: true }),
                ]),
              }),
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
