import AdminNextProductDetailPage from "@/app/admin/products/[id]/page";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoProductDetail } from "@/components/admin-next/evolucion/evo-product-detail";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { createProductsAdapter } from "@/lib/admin-next/products-adapter";
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

jest.mock("@/components/admin-next/evolucion/evo-product-detail", () => ({
  EvoProductDetail: jest.fn(() => null),
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

jest.mock("@/lib/admin-next/products-adapter", () => ({
  createProductsAdapter: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockEvoShell = jest.mocked(EvoShell);
const mockEvoProductDetail = jest.mocked(EvoProductDetail);
const mockEvoDataState = jest.mocked(EvoDataState);
const mockCreateProductsAdapter = jest.mocked(createProductsAdapter);
const mockGetAdminSessionContext = jest.mocked(getAdminSessionContext);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

const productDetail = {
  selected: {
    id: "hotel-las-islas",
    name: "Hotel Las Islas",
  },
};

function adapterWithDetail(data: typeof productDetail | null = productDetail) {
  return {
    getProductDetail: jest.fn().mockResolvedValue(data),
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

function productDetailPageProps(id = "hotel-las-islas") {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("/admin/products/[id] detail states", () => {
  const originalDataSourceMode = process.env.ADMIN_NEXT_DATA_SOURCE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADMIN_NEXT_DATA_SOURCE_MODE;
    mockCreateProductsAdapter.mockReturnValue(adapterWithDetail() as never);
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

  it("renders product detail data inside the Evolucion shell", async () => {
    const session = authenticatedSession();
    mockGetAdminSessionContext.mockResolvedValue(session as never);

    const element = await AdminNextProductDetailPage(productDetailPageProps());

    expect(mockCreateProductsAdapter).toHaveBeenCalledWith("fixture");
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          accountLabel: session.email,
          activeKey: "products",
          userName: session.displayName,
          children: expect.objectContaining({
            type: mockEvoProductDetail,
            props: expect.objectContaining({
              detail: productDetail,
            }),
          }),
        }),
      }),
    );
  });

  it("renders missing product details as an in-shell empty state", async () => {
    mockGetAdminSessionContext.mockResolvedValue(
      authenticatedSession() as never,
    );
    mockCreateProductsAdapter.mockReturnValue(adapterWithDetail(null) as never);

    const element = await AdminNextProductDetailPage(
      productDetailPageProps("missing"),
    );

    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "products",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "empty",
              testId: "admin-next-product-detail-empty",
            }),
          }),
        }),
      }),
    );
    expect(mockEvoProductDetail).not.toHaveBeenCalled();
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
    mockCreateProductsAdapter.mockReturnValue({
      getProductDetail: jest
        .fn()
        .mockRejectedValue(new Error("permission denied")),
    } as never);

    const element = await AdminNextProductDetailPage(productDetailPageProps());

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(element).toEqual(
      expect.objectContaining({
        type: mockEvoShell,
        props: expect.objectContaining({
          activeKey: "products",
          children: expect.objectContaining({
            type: mockEvoDataState,
            props: expect.objectContaining({
              kind: "permission",
              testId: "admin-next-product-detail-error",
            }),
          }),
        }),
      }),
    );
    expect(mockEvoProductDetail).not.toHaveBeenCalled();
  });
});
