import AdminNextContactDetailPage from "@/app/admin/contacts/[id]/page";
import { EvoContactDetail } from "@/components/admin-next/evolucion/evo-contact-detail";
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

jest.mock("@/components/admin-next/evolucion/evo-contact-detail", () => ({
  EvoContactDetail: jest.fn(() => null),
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
const mockEvoContactDetail = jest.mocked(EvoContactDetail);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockCreateContactsAdapter = jest.mocked(createContactsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const contactDetail = {
  contact: {
    id: "laura-martinez",
    name: "Laura Martinez",
  },
};

function adapterWithDetail(data: typeof contactDetail | null = contactDetail) {
  return {
    getContactDetail: jest.fn().mockResolvedValue(data),
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

function contactDetailPageProps(id = "laura-martinez") {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("/admin/contacts/[id] detail states", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateContactsAdapter.mockReturnValue(adapterWithDetail() as never);
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

  it("renders contact detail data inside the Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextContactDetailPage(contactDetailPageProps());

    expect(mockCreateContactsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "contacts",
          userName: session.displayName,
          children: expect.objectContaining({
            type: mockEvoContactDetail,
            props: expect.objectContaining({
              detail: contactDetail,
            }),
          }),
        }),
      }),
    );
  });

  it("renders missing contact details as an in-shell empty state", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession() as never,
    );
    mockCreateContactsAdapter.mockReturnValue(adapterWithDetail(null) as never);

    const element = await AdminNextContactDetailPage(
      contactDetailPageProps("missing"),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "contacts",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "empty",
              testId: "admin-next-contact-detail-empty",
            }),
          }),
        }),
      }),
    );
    expect(mockEvoContactDetail).not.toHaveBeenCalled();
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
    mockCreateContactsAdapter.mockReturnValue({
      getContactDetail: jest
        .fn()
        .mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextContactDetailPage(contactDetailPageProps());

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "contacts",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "permission",
              testId: "admin-next-contact-detail-error",
            }),
          }),
        }),
      }),
    );
    expect(mockEvoContactDetail).not.toHaveBeenCalled();
  });
});
