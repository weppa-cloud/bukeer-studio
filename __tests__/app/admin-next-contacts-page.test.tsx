import AdminNextContactsPage from "@/app/admin/contacts/page";
import { EvoContacts } from "@/components/admin-next/evolucion/evo-contacts";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createContactsAdapter } from "@/lib/admin-next/contacts-adapter";
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

jest.mock("@/components/admin-next/evolucion/evo-contacts", () => ({
  EvoContacts: jest.fn(() => null),
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

jest.mock("@/lib/admin-next/contacts-adapter", () => ({
  createContactsAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockEvoContacts = jest.mocked(EvoContacts);
const mockCreateContactsAdapter = jest.mocked(createContactsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  contacts: [
    { id: "laura-martinez", badges: ["Cliente"] },
    { id: "hotel-las-islas", badges: ["Proveedor"] },
  ],
  selected: { id: "laura-martinez" },
  timeline: [],
  signals: [],
};

function adapterWithFixture() {
  return {
    getContacts: jest.fn().mockResolvedValue(fixture),
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

describe("/admin/contacts auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateContactsAdapter.mockReturnValue(adapterWithFixture() as never);
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

    await expect(AdminNextContactsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/admin/contacts",
    );
    expect(mockCreateContactsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoContacts).not.toHaveBeenCalled();
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

    await expect(AdminNextContactsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateContactsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoContacts).not.toHaveBeenCalled();
  });

  it("enforces server-side Admin Next permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["planner.view"],
      }) as never,
    );

    await expect(AdminNextContactsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateContactsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoContacts).not.toHaveBeenCalled();
  });

  it("renders contacts fixture with Evolucion theme styles", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextContactsPage();

    expect(mockCreateContactsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "contacts",
          userName: session.displayName,
        }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoContacts,
        props: expect.objectContaining({
          fixture: expect.objectContaining({
            contacts: expect.arrayContaining([
              expect.objectContaining({ id: "laura-martinez" }),
            ]),
          }),
          subtitle: "2 contactos · 1 clientes, 1 proveedores",
        }),
      }),
    );
  });

  it("renders an in-shell permission error when readonly contact reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateContactsAdapter.mockReturnValue({
      getContacts: jest.fn().mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextContactsPage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "contacts" }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoDataState,
        props: expect.objectContaining({
          kind: "permission",
          testId: "admin-next-contacts-error",
        }),
      }),
    );
    expect(mockEvoContacts).not.toHaveBeenCalled();
  });
});
