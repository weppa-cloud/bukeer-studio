import AdminNextSettingsPage from "@/app/admin/settings/page";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoSettings } from "@/components/admin-next/evolucion/evo-settings";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createSettingsAdapter } from "@/lib/admin-next/settings-adapter";
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

jest.mock("@/components/admin-next/evolucion/evo-settings", () => ({
  EvoSettings: jest.fn(() => null),
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

jest.mock("@/lib/admin-next/settings-adapter", () => ({
  createSettingsAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockEvoSettings = jest.mocked(EvoSettings);
const mockCreateSettingsAdapter = jest.mocked(createSettingsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  agency: {
    name: "Bukeer Demo",
    website: "demo.bukeer.com",
    locale: "es",
    currency: "COP",
  },
  businessRules: [],
  billing: [],
  team: [],
  integrations: [],
  users: [],
  permissionMatrix: [],
  signals: [],
};

function adapterWithFixture() {
  return {
    getSettings: jest.fn().mockResolvedValue(fixture),
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

describe("/admin/settings auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateSettingsAdapter.mockReturnValue(adapterWithFixture() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
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

  it("redirects unauthenticated users to shared login with next", async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: "unauthenticated",
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextSettingsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/admin/settings",
    );
    expect(mockCreateSettingsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoSettings).not.toHaveBeenCalled();
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

    await expect(AdminNextSettingsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateSettingsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoSettings).not.toHaveBeenCalled();
  });

  it("enforces server-side Admin Next permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["planner.view"],
      }) as never,
    );

    await expect(AdminNextSettingsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateSettingsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoSettings).not.toHaveBeenCalled();
  });

  it("renders settings fixture inside Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextSettingsPage();

    expect(mockCreateSettingsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "config",
          userName: session.displayName,
        }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoSettings,
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
    const supabase = { from: jest.fn(), rpc: jest.fn() };
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateSupabaseServerClient.mockResolvedValue(supabase as never);

    const element = await AdminNextSettingsPage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreateSettingsAdapter).toHaveBeenCalledWith({
      mode: "readonly",
      supabase,
      accountId: "account-1",
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "config" }),
      }),
    );
  });

  it("renders an in-shell permission error when readonly settings reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateSettingsAdapter.mockReturnValue({
      getSettings: jest.fn().mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextSettingsPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "config" }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoDataState,
        props: expect.objectContaining({
          kind: "permission",
          testId: "admin-next-settings-error",
        }),
      }),
    );
    expect(mockEvoSettings).not.toHaveBeenCalled();
  });

  it("keeps fixture mode when readonly is requested without beta access", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    await AdminNextSettingsPage();

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateSettingsAdapter).toHaveBeenCalledWith("fixture");
  });
});
