import AdminNextConversationsPage from "@/app/admin/conversations/page";
import { EvoConversations } from "@/components/admin-next/evolucion/evo-conversations";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createConversationsAdapter } from "@/lib/admin-next/conversations-adapter";
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

jest.mock("@/components/admin-next/evolucion/evo-conversations", () => ({
  EvoConversations: jest.fn(() => null),
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

jest.mock("@/lib/admin-next/conversations-adapter", () => ({
  createConversationsAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockEvoConversations = jest.mocked(EvoConversations);
const mockCreateConversationsAdapter = jest.mocked(createConversationsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const fixture = {
  conversations: [
    {
      id: "conv-1",
      customerName: "Laura Mejia",
      agencyLabel: "Familia Mejia",
      channel: "whatsapp",
      status: "open",
      tone: "primary",
      temperature: "hot",
      lastMessage: "Queremos cerrar San Andres hoy.",
      lastMessageAt: "Hace 4 min",
      unreadCount: 1,
      itineraryId: "IT-2647",
      valueLabel: "$18.4M",
      owner: "Carolina",
      slaLabel: "SLA 12 min",
    },
    {
      id: "conv-2",
      customerName: "Andres Pardo",
      agencyLabel: "Corporativo",
      channel: "email",
      status: "waiting",
      tone: "warning",
      temperature: "warm",
      lastMessage: "Pendiente fee Stripe.",
      lastMessageAt: "Hace 22 min",
      unreadCount: 0,
      itineraryId: "IT-2651",
      valueLabel: "$9.8M",
      owner: "Daniel",
      slaLabel: "SLA 38 min",
    },
  ],
  selected: {
    id: "conv-1",
    customerName: "Laura Mejia",
    agencyLabel: "Familia Mejia",
    channel: "whatsapp",
    status: "open",
    tone: "primary",
    temperature: "hot",
    lastMessage: "Queremos cerrar San Andres hoy.",
    lastMessageAt: "Hace 4 min",
    unreadCount: 1,
    itineraryId: "IT-2647",
    valueLabel: "$18.4M",
    owner: "Carolina",
    slaLabel: "SLA 12 min",
    messages: [],
    notes: [],
    closeReasons: [],
    crm: {
      contactId: "ct-1",
      phone: "+57 300 000 0000",
      email: "laura@example.com",
      document: "Documento pendiente",
      lastPurchase: "open",
      totalValue: "$18.4M",
      preference: "San Andres",
    },
    realtime: {
      provider: "Chatwoot mirror",
      mirrorLabel: "Mirror conectado",
      latencyLabel: "<= Flutter/Chatwoot",
      updatedAt: "09:25",
    },
    linkedItinerary: {
      id: "IT-2647",
      title: "San Andres",
      state: "Cotizacion",
      margin: "$18.4M",
    },
    requestDraft: {
      title: "Solicitud activa",
      destination: "San Andres",
      pax: "4 pax",
      dates: "21-25 jun",
    },
  },
  signals: [],
  templates: [],
};

function adapterWithFixture() {
  return {
    getConversations: jest.fn().mockResolvedValue(fixture),
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

describe("/admin/conversations auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateConversationsAdapter.mockReturnValue(
      adapterWithFixture() as never,
    );
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

    await expect(AdminNextConversationsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/admin/conversations",
    );
    expect(mockCreateConversationsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoConversations).not.toHaveBeenCalled();
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

    await expect(AdminNextConversationsPage()).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockCreateConversationsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoConversations).not.toHaveBeenCalled();
  });

  it("enforces server-side Admin Next permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["planner.view"],
      }) as never,
    );

    await expect(AdminNextConversationsPage()).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockCreateConversationsAdapter).not.toHaveBeenCalled();
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoConversations).not.toHaveBeenCalled();
  });

  it("renders conversations fixture with Evolucion theme styles", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextConversationsPage();

    expect(mockCreateConversationsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "conv",
          userName: session.displayName,
        }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoConversations,
        props: expect.objectContaining({
          fixture,
          subtitle: "CRM · 1 abiertas, 1 en espera",
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

    const element = await AdminNextConversationsPage();

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(mockCreateConversationsAdapter).toHaveBeenCalledWith({
      mode: "readonly",
      supabase,
      accountId: "account-1",
    });
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "conv" }),
      }),
    );
  });

  it("renders an in-shell permission error when readonly conversation reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateConversationsAdapter.mockReturnValue({
      getConversations: jest
        .fn()
        .mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextConversationsPage();

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({ activeKey: "conv" }),
      }),
    );
    expect(element.props.children).toEqual(
      expect.objectContaining({
        type: mockEvoDataState,
        props: expect.objectContaining({
          kind: "permission",
          testId: "admin-next-conversations-error",
        }),
      }),
    );
    expect(mockEvoConversations).not.toHaveBeenCalled();
  });

  it("keeps fixture mode when readonly is requested without beta access", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    await AdminNextConversationsPage();

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateConversationsAdapter).toHaveBeenCalledWith("fixture");
  });
});
