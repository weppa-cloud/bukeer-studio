import AdminNextPaymentsPage from "@/app/admin/payments/page";
import { EvoPayments } from "@/components/admin-next/evolucion/evo-payments";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { getAdminSessionContext } from "@/lib/admin-next/session/get-admin-session-context";

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

jest.mock("@/components/admin-next/evolucion/evo-payments", () => ({
  EvoPayments: jest.fn(() => null),
}));

jest.mock("@/lib/admin-next/session/get-admin-session-context", () => ({
  getAdminSessionContext: jest.fn(),
  hasAdminPermission: jest.requireActual(
    "@/lib/admin-next/session/get-admin-session-context",
  ).hasAdminPermission,
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoPayments = jest.mocked(EvoPayments);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);

function paymentsPageProps(
  searchParams: {
    batch?: string;
    method?: string;
  } = {},
) {
  return {
    searchParams: Promise.resolve(searchParams),
  };
}

function authenticatedSession(overrides: Record<string, unknown> = {}) {
  return {
    status: "authenticated",
    userId: "user-1",
    email: "treasury@bukeer.test",
    accountId: "account-1",
    role: "accounting",
    displayName: "Treasury One",
    permissions: ["admin_next.view", "payments.manage", "trace.view"],
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

describe("/admin/payments auth boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects unauthenticated users to shared login with next", async () => {
    mockGetAdminSessionContext.mockResolvedValue({
      status: "unauthenticated",
      flags: authenticatedSession().flags,
    } as never);

    await expect(AdminNextPaymentsPage(paymentsPageProps())).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=/admin/payments",
    );
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoPayments).not.toHaveBeenCalled();
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

    await expect(AdminNextPaymentsPage(paymentsPageProps())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoPayments).not.toHaveBeenCalled();
  });

  it("enforces server-side Admin Next visibility permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        permissions: ["payments.manage"],
      }) as never,
    );

    await expect(AdminNextPaymentsPage(paymentsPageProps())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoPayments).not.toHaveBeenCalled();
  });

  it("blocks agent sessions without payment management permission", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession({
        role: "agent",
        permissions: ["admin_next.view", "planner.view", "trace.view"],
      }) as never,
    );

    await expect(AdminNextPaymentsPage(paymentsPageProps())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockEvoShell).not.toHaveBeenCalled();
    expect(mockEvoPayments).not.toHaveBeenCalled();
  });

  it.each([
    { role: "admin", email: "admin@bukeer.test", displayName: "Admin One" },
    {
      role: "accounting",
      email: "treasury@bukeer.test",
      displayName: "Treasury One",
    },
  ])(
    "renders payments fixture with Evolucion theme styles for $role",
    async ({ role, email, displayName }) => {
      const session = authenticatedSession({ role, email, displayName });
      mockGetAdminSessionContext.mockResolvedValue(session as never);

      const element = await AdminNextPaymentsPage(
        paymentsPageProps({ batch: "supplier", method: "bank_transfer" }),
      );

      expect(element).toEqual(
        expect.objectContaining({
          type: mockEvoShell,
          props: expect.objectContaining({
            accountLabel: email,
            activeKey: "pay",
            role,
            userName: displayName,
          }),
        }),
      );
      expect(element.props.children).toEqual(
        expect.objectContaining({
          type: mockEvoPayments,
          props: expect.objectContaining({
            canManagePayments: true,
            fixture: expect.objectContaining({
              collectBatch: expect.objectContaining({
                invoiceIds: ["inv-2647-01", "inv-2647-02", "inv-2647-03"],
              }),
              accountPaymentConfig: expect.objectContaining({
                mode: "test",
              }),
            }),
            searchParams: {
              batch: "supplier",
              method: "bank_transfer",
            },
          }),
        }),
      );
    },
  );
});
