import AdminNextReportsPage from "@/app/admin/reports/page";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoReports } from "@/components/admin-next/evolucion/evo-reports";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createReportsAdapter } from "@/lib/admin-next/reports-adapter";
import { getAdminSessionContext } from "@/lib/admin-next/session/get-admin-session-context";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("@/components/admin-next/evolucion/evo-shell", () => ({
  EvoShell: jest.fn(({ children }) => children),
}));

jest.mock("@/components/admin-next/evolucion/evo-reports", () => ({
  EvoReports: jest.fn(() => null),
}));

jest.mock("@/components/admin-next/evolucion/evo-data-state", () => ({
  EvoDataState: jest.fn(() => null),
}));

jest.mock("@/lib/admin-next/session/get-admin-session-context", () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    "@/lib/admin-next/session/get-admin-session-context",
  ).hasAdminPermission,
}));

jest.mock("@/lib/admin-next/reports-adapter", () => ({
  createReportsAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockEvoReports = jest.mocked(EvoReports);
const mockCreateReportsAdapter = jest.mocked(createReportsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  reports: [{ id: "sales", label: "Ventas" }],
  ranges: [],
  priceRanges: [],
  insights: [],
  tableRows: [],
  chart: [],
  aiSignals: [],
};

function adapterWithFixture() {
  return {
    getReports: jest.fn().mockResolvedValue(fixture),
  };
}

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: "authenticated",
    userId: "user-1",
    email: "agent@bukeer.test",
    accountId: "account-1",
    role: "admin",
    displayName: "Agent One",
    permissions: ["admin_next.view", "planner.view", "trace.view"],
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

describe("/admin/reports auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateReportsAdapter.mockReturnValue(adapterWithFixture() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
  });

  afterEach(() => {
    if (originalDataSourceMode === undefined) {
      delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    } else {
      process.env.ADMIN_NEXT_DATA_SOURCE_MODE = originalDataSourceMode;
    }
  });

  it("redirects unauthenticated users to shared login with next", async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: "unauthenticated",
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextReportsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/admin/reports",
    );
    expect(mockCreateReportsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoReports).not.toHaveBeenCalled();
  });

  it("hides the route when the prototype flag is disabled", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        flags: {
          ...authenticatedSession().flags,
          adminNextPrototype: false,
        },
      }) as never,
    );

    await expect(AdminNextReportsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateReportsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoReports).not.toHaveBeenCalled();
  });

  it("enforces server-side Admin Next permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["planner.view"],
      }) as never,
    );

    await expect(AdminNextReportsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateReportsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoReports).not.toHaveBeenCalled();
  });

  it("renders reports fixture inside Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextReportsPage();

    expect(mockCreateReportsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "reports",
          userName: session.displayName,
        }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoReports,
        props: expect.objectContaining({ fixture }),
      }),
    );
  });

  it("uses readonly Supabase only for allowlisted beta sessions", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    const supabase = { from: jest.fn() };
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateSupabaseServerClient.mockResolvedValue(supabase as never);

    const element = await AdminNextReportsPage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreateReportsAdapter).toHaveBeenCalledWith({
      mode: "readonly",
      supabase,
      accountId: "account-1",
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "reports" }),
      }),
    );
  });

  it("renders an in-shell permission error when readonly report reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateReportsAdapter.mockReturnValue({
      getReports: jest.fn().mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextReportsPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "reports",
          role: "admin",
        }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoDataState,
        props: expect.objectContaining({
          kind: "permission",
          testId: "admin-next-reports-error",
        }),
      }),
    );
    expect(mockEvoReports).not.toHaveBeenCalled();
  });

  it("keeps fixture mode when readonly is requested without beta access", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    await AdminNextReportsPage();

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateReportsAdapter).toHaveBeenCalledWith("fixture");
  });
});
