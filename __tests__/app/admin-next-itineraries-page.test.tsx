import AdminNextItinerariesPage from "@/app/admin/itineraries/page";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoItineraries } from "@/components/admin-next/evolucion/evo-itineraries";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createItinerariesAdapter } from "@/lib/admin-next/itineraries-adapter";
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
  EvoShell: jest.fn(({ children }) => <div>{children}</div>),
}));

jest.mock("@/components/admin-next/evolucion/evo-itineraries", () => ({
  EvoItineraries: jest.fn(() => null),
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

jest.mock("@/lib/admin-next/itineraries-adapter", () => ({
  createItinerariesAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockEvoItineraries = jest.mocked(EvoItineraries);
const mockCreateItinerariesAdapter = jest.mocked(createItinerariesAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  statuses: [
    { id: "draft", label: "Borrador" },
    { id: "quoted", label: "Presupuesto" },
    { id: "won", label: "Confirmado" },
  ],
  itineraries: [
    {
      id: "it-live-1",
      code: "ID BK-1",
      title: "Viaje demo Cartagena",
      customer: "Cliente Demo",
      destination: "Cartagena",
      owner: "Planner One",
      status: "quoted",
    },
    {
      id: "it-live-2",
      code: "ID BK-2",
      title: "Viaje demo cerrado",
      customer: "Cliente Cerrado",
      destination: "Medellin",
      owner: "Planner Two",
      status: "won",
    },
  ],
};

function adapterWithFixture() {
  return {
    getItineraries: jest.fn().mockResolvedValue(fixture),
  };
}

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: "authenticated",
    userId: "user-1",
    email: "planner@bukeer.test",
    accountId: "account-1",
    role: "admin",
    displayName: "Planner One",
    permissions: ["admin_next.view", "planner.view", "trace.view"],
    flags: {
      adminNextPrototype: true,
      adminNextBetaReadonlyEnabled: false,
      adminNextBetaAccountAllowed: false,
      adminNextBetaRoleAllowed: false,
      adminNextBetaReadonly: false,
      adminNextExternalHandoff: false,
      adminNextItineraryWrites: false,
    },
    ...overrides,
  };
}

function itineraryPageProps(
  searchParams: {
    view?: string;
    status?: string;
    q?: string;
    new?: string;
  } = {},
) {
  return {
    searchParams: Promise.resolve(searchParams),
  };
}

describe("/admin/itineraries auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateItinerariesAdapter.mockReturnValue(adapterWithFixture() as never);
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

    await expect(
      AdminNextItinerariesPage(itineraryPageProps()),
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/itineraries");
    expect(mockCreateItinerariesAdapter).not.toHaveBeenCalled();
    expect(mockEvoItineraries).not.toHaveBeenCalled();
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

    await expect(
      AdminNextItinerariesPage(itineraryPageProps()),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateItinerariesAdapter).not.toHaveBeenCalled();
    expect(mockEvoItineraries).not.toHaveBeenCalled();
  });

  it("enforces server-side planner permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["admin_next.view"],
      }) as never,
    );

    await expect(
      AdminNextItinerariesPage(itineraryPageProps()),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateItinerariesAdapter).not.toHaveBeenCalled();
    expect(mockEvoItineraries).not.toHaveBeenCalled();
  });

  it.each([
    {
      role: "agent",
      permissions: ["admin_next.view", "planner.view", "planner.suggest"],
    },
    {
      role: "accounting",
      permissions: ["admin_next.view", "planner.view", "payments.manage"],
    },
  ])(
    "allows $role sessions with planner visibility",
    async ({ role, permissions }) => {
      mockGetAdminSessionContext.mockResolvedValue(
        authenticatedSession({ role, permissions }) as never,
      );

      const element = await AdminNextItinerariesPage(itineraryPageProps());

      expect(element).toEqual(
        expect.objectContaining({
          type: mockEvoShell,
          props: expect.objectContaining({
            role,
            activeKey: "itis",
          }),
        }),
      );
    },
  );

  it("renders itinerary fixture data inside the Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItinerariesPage(
      itineraryPageProps({ view: "kanban" }),
    );

    expect(mockCreateItinerariesAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          userName: "Planner One",
          accountLabel: "planner@bukeer.test",
          role: "admin",
          activeKey: "itis",
          children: expect.objectContaining({
            type: mockEvoItineraries,
            props: expect.objectContaining({
              fixture,
              filters: { q: "", status: "all" },
              subtitle: "2 activos · 1 por confirmar",
              view: "kanban",
            }),
          }),
        }),
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

    const element = await AdminNextItinerariesPage(itineraryPageProps());

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreateItinerariesAdapter).toHaveBeenCalledWith({
      mode: "readonly",
      supabase,
      accountId: "account-1",
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraries,
            props: expect.objectContaining({
              fixture,
              filters: { q: "", status: "all" },
              view: "list",
            }),
          }),
        }),
      }),
    );
  });

  it("renders an in-shell permission error when readonly itinerary reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateItinerariesAdapter.mockReturnValue({
      getItineraries: jest
        .fn()
        .mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextItinerariesPage(itineraryPageProps());

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "itis" }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoDataState,
        props: expect.objectContaining({
          kind: "permission",
          testId: "admin-next-itineraries-error",
        }),
      }),
    );
    expect(mockEvoItineraries).not.toHaveBeenCalled();
  });

  it("keeps fixture mode when readonly is requested without beta access", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession() as never,
    );

    await AdminNextItinerariesPage(itineraryPageProps());

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateItinerariesAdapter).toHaveBeenCalledWith("fixture");
  });

  it("filters itineraries from URL searchParams before rendering", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItinerariesPage(
      itineraryPageProps({ status: "quoted", q: "cartagena" }),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraries,
            props: expect.objectContaining({
              filters: { q: "cartagena", status: "quoted" },
              fixture: expect.objectContaining({
                itineraries: [
                  expect.objectContaining({
                    id: "it-live-1",
                    title: "Viaje demo Cartagena",
                  }),
                ],
              }),
              subtitle: "1 activos · 1 por confirmar",
            }),
          }),
        }),
      }),
    );
  });

  it("opens the create modal only when requested and forwards the write gate", async () => {
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextItineraryWrites: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItinerariesPage(
      itineraryPageProps({ new: "itinerary" }),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraries,
            props: expect.objectContaining({
              showCreateModal: true,
              writesEnabled: true,
              createDefaults: expect.objectContaining({
                startDate: expect.any(String),
                endDate: expect.any(String),
              }),
            }),
          }),
        }),
      }),
    );
  });
});
