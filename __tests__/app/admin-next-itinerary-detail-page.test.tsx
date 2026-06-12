import AdminNextItineraryDetailPage from "@/app/admin/itineraries/[id]/page";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoItineraryDetail } from "@/components/admin-next/evolucion/evo-itinerary-detail";
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

jest.mock("@/components/admin-next/evolucion/evo-itinerary-detail", () => ({
  EvoItineraryDetail: jest.fn(() => null),
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
const mockEvoItineraryDetail = jest.mocked(EvoItineraryDetail);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockCreateItinerariesAdapter = jest.mocked(createItinerariesAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const detailData = {
  summary: {
    id: "it-live-1",
    code: "ID BK-1001",
    title: "Viaje demo Cartagena",
    customer: "Cliente Demo",
    owner: "Planner",
    destination: "Cartagena",
    startDate: "3 jul",
    endDate: "8 jul",
    days: 5,
    pax: 4,
    status: "won",
    value: "$ 12.800.000",
    margin: "23%",
    marginTone: "success",
    services: 1,
    paidInstallments: 1,
    totalInstallments: 2,
    nextService: "Creado 10 jun 2026",
    risk: "",
    href: "/admin/itineraries/it-live-1",
  },
  detail: {
    services: [],
    passengers: [],
    suppliers: [],
    payments: [],
    preview: [],
  },
  paymentPlan: {
    methods: [],
    installments: [],
  },
  publicProposal: {
    shareUrl: "/admin/itineraries/it-live-1?tab=preview",
    pages: [],
  },
  auditTrail: [],
  confirmationDate: "2026-06-10",
  editDefaults: {
    itineraryId: "it-live-1",
    name: "Viaje demo Cartagena",
    startDate: "2026-07-03",
    endDate: "2026-07-08",
    passengerCount: 4,
    adults: 2,
    children: 2,
    currencyType: "COP",
    language: "es",
    requestType: "Cotizacion",
    personalizedMessage: "Demo",
    contactId: "",
    agentId: "user-1",
    mainImage: "",
    status: "Confirmado",
  },
};

function adapterWithDetail(data: typeof detailData | null = detailData) {
  return {
    getItineraries: jest.fn(),
    getItineraryDetail: jest.fn().mockResolvedValue(data),
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

function itineraryDetailPageProps(
  id = "it-live-1",
  searchParams: {
    edit?: string;
    pdfError?: string;
    pdfKind?: string;
    pdfUrl?: string;
    tab?: string;
  } = {},
) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(searchParams),
  };
}

describe("/admin/itineraries/[id] auth boundary", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateItinerariesAdapter.mockReturnValue(adapterWithDetail() as never);
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
      AdminNextItineraryDetailPage(itineraryDetailPageProps()),
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=/admin/itineraries/it-live-1");
    expect(mockCreateItinerariesAdapter).not.toHaveBeenCalled();
    expect(mockEvoItineraryDetail).not.toHaveBeenCalled();
  });

  it("enforces server-side planner permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["admin_next.view"],
      }) as never,
    );

    await expect(
      AdminNextItineraryDetailPage(itineraryDetailPageProps()),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockCreateItinerariesAdapter).not.toHaveBeenCalled();
    expect(mockEvoItineraryDetail).not.toHaveBeenCalled();
  });

  it("renders fixture detail data inside the Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1", {
        pdfKind: "proposal",
        pdfUrl: "https://cdn.example.test/proposal.pdf",
        tab: "preview",
      }),
    );

    expect(mockCreateItinerariesAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          userName: "Planner One",
          accountLabel: "planner@bukeer.test",
          activeKey: "itis",
          children: expect.objectContaining({
            type: mockEvoItineraryDetail,
            props: expect.objectContaining({
              data: detailData,
              activeTab: "preview",
              canCorrectConfirmationDate: true,
              pdfResult: {
                kind: "proposal",
                url: "https://cdn.example.test/proposal.pdf",
              },
              showEditModal: false,
              writesEnabled: false,
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

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1", { tab: "passengers" }),
    );

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
            type: mockEvoItineraryDetail,
            props: expect.objectContaining({
              activeTab: "passengers",
              canCorrectConfirmationDate: true,
              showEditModal: false,
            }),
          }),
        }),
      }),
    );
  });

  it("passes the edit modal state and write gate to the detail component", async () => {
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextItineraryWrites: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1", {
        edit: "header",
        tab: "payments",
      }),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraryDetail,
            props: expect.objectContaining({
              activeTab: "payments",
              canCorrectConfirmationDate: true,
              showEditModal: true,
              writesEnabled: true,
            }),
          }),
        }),
      }),
    );
  });

  it("normalizes unknown tabs and renders missing details as an in-shell empty state", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession() as never,
    );

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1", { tab: "nope" }),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraryDetail,
            props: expect.objectContaining({
              activeTab: "services",
            }),
          }),
        }),
      }),
    );

    mockCreateItinerariesAdapter.mockReturnValue(
      adapterWithDetail(null) as never,
    );

    const missingElement = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("missing"),
    );

    expect(missingElement).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "itis",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "empty",
              testId: "admin-next-itinerary-detail-empty",
            }),
          }),
        }),
      }),
    );
    expect(missingElement.props.children.type).toBe(mockEvoDataState);
  });

  it("renders an in-shell permission error when readonly detail reads fail", async () => {
    process.env.ADMIN_NEXT_DATA_SOURCE_MODE = "readonly";
    const session = authenticatedSession({
      flags: {
        ...authenticatedSession().flags,
        adminNextBetaReadonly: true,
      },
    });
    mockGetAdminSessionContext.mockResolvedValue(session as never);
    mockCreateItinerariesAdapter.mockReturnValue({
      getItineraryDetail: jest
        .fn()
        .mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1"),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "itis",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "permission",
              testId: "admin-next-itinerary-detail-error",
            }),
          }),
        }),
      }),
    );
    expect(mockEvoItineraryDetail).not.toHaveBeenCalled();
  });

  it("does not expose confirmation date correction for non-admin roles", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        role: "agent",
        permissions: ["admin_next.view", "planner.view", "trace.view"],
      }) as never,
    );

    const element = await AdminNextItineraryDetailPage(
      itineraryDetailPageProps("it-live-1"),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: mockEvoItineraryDetail,
            props: expect.objectContaining({
              canCorrectConfirmationDate: false,
            }),
          }),
        }),
      }),
    );
  });
});
