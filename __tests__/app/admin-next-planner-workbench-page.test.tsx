import PlannerWorkbenchPrototypePage from '@/app/admin/prototype/planner-workbench/page';
import { PlannerWorkbenchPrototype } from '@/components/admin-next';
import { createPlannerAgentLedgerSnapshot } from '@/lib/admin-next/agent-ledger-source';
import { createPlannerWorkbenchAdapter } from '@/lib/admin-next/planner-workbench-adapter';
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
  PlannerWorkbenchPrototype: jest.fn(() => null),
}));

jest.mock('@/lib/admin-next/agent-ledger-source', () => ({
  createPlannerAgentLedgerSnapshot: jest.fn(() => ({ trace: 'agent-ledger' })),
}));

jest.mock('@/lib/admin-next/planner-workbench-adapter', () => ({
  createPlannerWorkbenchAdapter: jest.fn(),
}));

jest.mock('@/lib/admin-next/session/get-admin-session-context', () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    '@/lib/admin-next/session/get-admin-session-context',
  ).hasAdminPermission,
}));

jest.mock('@/lib/supabase/server-client', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockPlannerWorkbench = jest.mocked(PlannerWorkbenchPrototype);
const mockCreatePlannerAgentLedgerSnapshot = jest.mocked(createPlannerAgentLedgerSnapshot);
const mockCreatePlannerWorkbenchAdapter = jest.mocked(createPlannerWorkbenchAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  opportunity: {
    id: 'opp-fixture',
    marginLabel: '18%',
  },
};

function adapterWithFixture() {
  return {
    getWorkbench: jest.fn().mockResolvedValue(fixture),
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
    permissions: [
      'admin_next.view',
      'planner.view',
      'planner.suggest',
      'planner.approve',
      'trace.view',
      'manager.view',
    ],
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

describe('/admin/prototype/planner-workbench auth boundary', () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreatePlannerWorkbenchAdapter.mockReturnValue(adapterWithFixture() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({ from: jest.fn() } as never);
  });

  afterEach(() => {
    if (originalDataSourceMode === undefined) {
      delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    } else {
      process.env.ADMIN_NEXT_DATA_SOURCE_MODE = originalDataSourceMode;
    }
  });

  it('redirects unauthenticated users to the shared login boundary', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'unauthenticated',
      flags: authenticatedSession().flags,
    } as never);

    await expect(PlannerWorkbenchPrototypePage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?next=/admin/prototype/planner-workbench',
    );
    expect(mockCreatePlannerWorkbenchAdapter).not.toHaveBeenCalled();
    expect(mockPlannerWorkbench).not.toHaveBeenCalled();
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

    await expect(PlannerWorkbenchPrototypePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockCreatePlannerWorkbenchAdapter).not.toHaveBeenCalled();
  });

  it('hides the route for authenticated users without an Admin Next role', async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: 'missing_role',
      userId: 'user-1',
      email: 'agent@bukeer.test',
      displayName: 'Agent One',
      flags: authenticatedSession().flags,
    } as never);

    await expect(PlannerWorkbenchPrototypePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockCreatePlannerWorkbenchAdapter).not.toHaveBeenCalled();
  });

  it('renders fixture mode with Evolucion theme styles for authenticated sessions', async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await PlannerWorkbenchPrototypePage();

    expect(mockCreatePlannerWorkbenchAdapter).toHaveBeenCalledWith('fixture');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreatePlannerAgentLedgerSnapshot).toHaveBeenCalledWith(fixture, {
      sourceMode: 'fixture',
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockPlannerWorkbench,
        props: expect.objectContaining({
        session,
        fixture,
        dataSourceMode: 'fixture',
        evolucionTheme: expect.objectContaining({
          presetSlug: 'evolucion',
          styles: {
            light: expect.objectContaining({
              '--bukeer-on-surface-color': expect.any(String),
            }),
            dark: expect.objectContaining({
              '--bukeer-on-surface-color': expect.any(String),
            }),
          },
        }),
      }),
      }),
    );
  });

  it('uses the server Supabase client only for allowlisted readonly sessions', async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = 'readonly';
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    const supabase = { from: jest.fn() };
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateSupabaseServerClient.mockResolvedValue(supabase as never);

    const element = await PlannerWorkbenchPrototypePage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreatePlannerWorkbenchAdapter).toHaveBeenCalledWith({
      mode: 'readonly',
      supabase,
      accountId: 'account-1',
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockPlannerWorkbench,
        props: expect.objectContaining({
          dataSourceMode: 'readonly',
        }),
      }),
    );
  });
});
