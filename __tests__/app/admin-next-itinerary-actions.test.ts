import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeAdminNextItineraryStatusAction,
  createAdminNextItineraryAction,
  deleteAdminNextPassengerAction,
  deleteAdminNextTransactionAction,
  deleteAdminNextItineraryItemAction,
  generateAdminNextItineraryPdfAction,
  updateAdminNextItineraryConfirmationDateAction,
  updateAdminNextItineraryHeaderAction,
  upsertAdminNextTransactionAction,
  upsertAdminNextPassengerAction,
} from "@/app/admin/itineraries/actions";
import { canCorrectItineraryConfirmationDateRole } from "@/lib/admin-next/itinerary-permissions";
import {
  changeItineraryStatusWithFlutterParity,
  createItineraryWithFlutterParity,
  deletePassengerWithFlutterParity,
  deleteTransactionWithFlutterParity,
  deleteItineraryItemWithFlutterParity,
  updateItineraryConfirmationDateWithFlutterParity,
  updateItineraryHeaderWithFlutterParity,
  updateItineraryItemsReservationStatusWithFlutterParity,
  upsertPassengerWithFlutterParity,
  upsertTransactionWithFlutterParity,
} from "@/lib/admin-next/itinerary-write-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock("@/lib/admin-next/route-boundary", () => ({
  requireAdminNextSession: jest.fn(),
}));

jest.mock("@/lib/supabase/server-client", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/admin-next/itinerary-write-adapter", () => ({
  changeItineraryStatusWithFlutterParity: jest.fn(),
  createItineraryWithFlutterParity: jest.fn(),
  deletePassengerWithFlutterParity: jest.fn(),
  deleteTransactionWithFlutterParity: jest.fn(),
  deleteItineraryItemWithFlutterParity: jest.fn(),
  updateItineraryConfirmationDateWithFlutterParity: jest.fn(),
  updateItineraryHeaderWithFlutterParity: jest.fn(),
  updateItineraryItemsReservationStatusWithFlutterParity: jest.fn(),
  upsertPassengerWithFlutterParity: jest.fn(),
  upsertTransactionWithFlutterParity: jest.fn(),
}));

const mockRequireAdminNextSession = jest.mocked(requireAdminNextSession);
const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);
const mockCreateItineraryWithFlutterParity = jest.mocked(
  createItineraryWithFlutterParity,
);
const mockChangeItineraryStatusWithFlutterParity = jest.mocked(
  changeItineraryStatusWithFlutterParity,
);
const mockUpdateItineraryConfirmationDateWithFlutterParity = jest.mocked(
  updateItineraryConfirmationDateWithFlutterParity,
);
const mockUpdateItineraryHeaderWithFlutterParity = jest.mocked(
  updateItineraryHeaderWithFlutterParity,
);
const mockUpdateItineraryItemsReservationStatusWithFlutterParity = jest.mocked(
  updateItineraryItemsReservationStatusWithFlutterParity,
);
const mockDeleteItineraryItemWithFlutterParity = jest.mocked(
  deleteItineraryItemWithFlutterParity,
);
const mockUpsertPassengerWithFlutterParity = jest.mocked(
  upsertPassengerWithFlutterParity,
);
const mockDeletePassengerWithFlutterParity = jest.mocked(
  deletePassengerWithFlutterParity,
);
const mockUpsertTransactionWithFlutterParity = jest.mocked(
  upsertTransactionWithFlutterParity,
);
const mockDeleteTransactionWithFlutterParity = jest.mocked(
  deleteTransactionWithFlutterParity,
);
const mockRevalidatePath = jest.mocked(revalidatePath);
const mockRedirect = jest.mocked(redirect);

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = {
    adults: "2",
    children: "0",
    currencyType: "COP",
    endDate: "2026-07-07",
    language: "es",
    name: "Viaje demo Cartagena",
    passengerCount: "2",
    personalizedMessage: "Hola",
    requestType: "Cotizacion",
    startDate: "2026-07-01",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    status: "authenticated",
    userId: "user-1",
    email: "planner@bukeer.test",
    accountId: "account-1",
    role: "admin",
    displayName: "Planner One",
    permissions: [
      "admin_next.view",
      "planner.view",
      "planner.approve",
      "payments.manage",
    ],
    flags: {
      adminNextPrototype: true,
      adminNextBetaReadonlyEnabled: true,
      adminNextBetaAccountAllowed: true,
      adminNextBetaRoleAllowed: true,
      adminNextBetaReadonly: true,
      adminNextExternalHandoff: false,
      adminNextItineraryWrites: true,
    },
    ...overrides,
  };
}

describe("createAdminNextItineraryAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
    mockCreateItineraryWithFlutterParity.mockResolvedValue("it-new");
    mockChangeItineraryStatusWithFlutterParity.mockResolvedValue();
    mockUpdateItineraryConfirmationDateWithFlutterParity.mockResolvedValue();
    mockUpdateItineraryHeaderWithFlutterParity.mockResolvedValue();
  });

  it("keeps writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      createAdminNextItineraryAction({ status: "idle" }, formData()),
    ).resolves.toEqual({
      status: "error",
      message:
        "La creación de itinerarios en Next está cerrada para esta cuenta.",
    });

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateItineraryWithFlutterParity).not.toHaveBeenCalled();
  });

  it("validates the passenger total before calling Supabase", async () => {
    await expect(
      createAdminNextItineraryAction(
        { status: "idle" },
        formData({ passengerCount: "3" }),
      ),
    ).resolves.toMatchObject({
      status: "error",
      fieldErrors: {
        passengerCount: ["El total debe coincidir con adultos + menores"],
      },
    });

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockCreateItineraryWithFlutterParity).not.toHaveBeenCalled();
  });

  it("creates the itinerary through the parity adapter and redirects to detail", async () => {
    await expect(
      createAdminNextItineraryAction({ status: "idle" }, formData()),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/itineraries/it-new");

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: "/admin/itineraries",
      permission: "planner.approve",
    });
    expect(mockCreateItineraryWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          accountId: "account-1",
          creatorId: "user-1",
          name: "Viaje demo Cartagena",
          passengerCount: 2,
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/itineraries/it-new");
  });
});

describe("changeAdminNextItineraryStatusAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
    mockChangeItineraryStatusWithFlutterParity.mockResolvedValue();
  });

  function statusFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      itineraryId: "11111111-1111-4111-8111-111111111111",
      target: "confirmed",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps status writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      changeAdminNextItineraryStatusAction(statusFormData()),
    ).rejects.toThrow(
      "El cambio de estado de itinerarios en Next está cerrado para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockChangeItineraryStatusWithFlutterParity).not.toHaveBeenCalled();
  });

  it("confirms itineraries through the Flutter status-history RPC and redirects", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      changeAdminNextItineraryStatusAction(statusFormData({ itineraryId })),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}`,
      permission: "planner.approve",
    });
    expect(mockChangeItineraryStatusWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          isConfirmed: true,
          itineraryId,
          source: "admin_next_detail",
          metadata: expect.objectContaining({
            action: "confirm",
            actor_user_id: "user-1",
            surface: "admin_next_itinerary_detail",
          }),
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
  });

  it("maps budget target to reopen metadata", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      changeAdminNextItineraryStatusAction(
        statusFormData({ itineraryId, target: "budget" }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockChangeItineraryStatusWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          isConfirmed: false,
          source: "admin_next_detail",
          metadata: expect.objectContaining({
            action: "reopen_to_budget",
          }),
        }),
      }),
    );
  });
});

describe("updateAdminNextItineraryConfirmationDateAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
    mockUpdateItineraryConfirmationDateWithFlutterParity.mockResolvedValue();
  });

  function confirmationDateFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      confirmationDate: "2026-08-09",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      reason: "Corrección comercial validada por admin",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps confirmation date correction closed when writes are disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      updateAdminNextItineraryConfirmationDateAction(
        confirmationDateFormData(),
      ),
    ).rejects.toThrow(
      "La corrección de fecha de confirmación en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(
      mockUpdateItineraryConfirmationDateWithFlutterParity,
    ).not.toHaveBeenCalled();
  });

  it("requires an admin role before calling the backend RPC", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({ role: "agent" }) as never,
    );

    await expect(
      updateAdminNextItineraryConfirmationDateAction(
        confirmationDateFormData(),
      ),
    ).rejects.toThrow(
      "La corrección de fecha de confirmación requiere rol admin o super_admin.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(
      mockUpdateItineraryConfirmationDateWithFlutterParity,
    ).not.toHaveBeenCalled();
  });

  it("corrects the commercial confirmation date through the Flutter RPC", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      updateAdminNextItineraryConfirmationDateAction(
        confirmationDateFormData({ itineraryId }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}`,
      permission: "planner.approve",
    });
    expect(
      mockUpdateItineraryConfirmationDateWithFlutterParity,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          confirmationDate: "2026-08-09",
          itineraryId,
          reason: "Corrección comercial validada por admin",
        },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
  });

  it("matches Flutter's admin/super_admin correction boundary", () => {
    expect(canCorrectItineraryConfirmationDateRole("admin")).toBe(true);
    expect(canCorrectItineraryConfirmationDateRole("super_admin")).toBe(true);
    expect(canCorrectItineraryConfirmationDateRole("superadmin")).toBe(true);
    expect(canCorrectItineraryConfirmationDateRole("owner")).toBe(false);
    expect(canCorrectItineraryConfirmationDateRole("agent")).toBe(false);
  });
});

describe("updateAdminNextItineraryItemReservationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
    mockUpdateItineraryItemsReservationStatusWithFlutterParity.mockResolvedValue();
  });

  async function loadAction() {
    return await import("@/app/admin/itineraries/actions");
  }

  function reservationFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      itemId: "22222222-2222-4222-8222-222222222222",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      reservationStatus: "true",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps item reservation writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );
    const { updateAdminNextItineraryItemReservationAction } =
      await loadAction();

    await expect(
      updateAdminNextItineraryItemReservationAction(reservationFormData()),
    ).rejects.toThrow(
      "La confirmación de reservas en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(
      mockUpdateItineraryItemsReservationStatusWithFlutterParity,
    ).not.toHaveBeenCalled();
  });

  it("confirms an itinerary item reservation through the parity adapter", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const itemId = "22222222-2222-4222-8222-222222222222";
    const { updateAdminNextItineraryItemReservationAction } =
      await loadAction();

    await expect(
      updateAdminNextItineraryItemReservationAction(
        reservationFormData({ itemId, itineraryId }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}`,
      permission: "planner.approve",
    });
    expect(
      mockUpdateItineraryItemsReservationStatusWithFlutterParity,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          accountId: "account-1",
          itemIds: [itemId],
          itineraryId,
          reservationStatus: true,
        },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
  });

  it("returns to suppliers tab when reservation confirmation originates there", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const itemId = "22222222-2222-4222-8222-222222222222";
    const { updateAdminNextItineraryItemReservationAction } =
      await loadAction();

    await expect(
      updateAdminNextItineraryItemReservationAction(
        reservationFormData({ itemId, itineraryId, returnTab: "suppliers" }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=suppliers`,
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}?tab=suppliers`,
      permission: "planner.approve",
    });
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}?tab=suppliers`,
    );
  });
});

describe("deleteAdminNextItineraryItemAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
    mockDeleteItineraryItemWithFlutterParity.mockResolvedValue();
  });

  function deleteItemFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      itemId: "22222222-2222-4222-8222-222222222222",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps item deletes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      deleteAdminNextItineraryItemAction(deleteItemFormData()),
    ).rejects.toThrow(
      "La eliminación de servicios en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockDeleteItineraryItemWithFlutterParity).not.toHaveBeenCalled();
  });

  it("deletes an itinerary item through the parity adapter and redirects", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const itemId = "22222222-2222-4222-8222-222222222222";

    await expect(
      deleteAdminNextItineraryItemAction(
        deleteItemFormData({ itemId, itineraryId }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}`,
      permission: "planner.approve",
    });
    expect(mockDeleteItineraryItemWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          accountId: "account-1",
          itemId,
          itineraryId,
        },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
  });
});

describe("upsertAdminNextPassengerAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
    mockUpsertPassengerWithFlutterParity.mockResolvedValue();
  });

  function passengerFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      birthDate: "1990-01-01",
      documentNumber: "123",
      documentType: "CC",
      email: "cliente@example.test",
      firstName: "Cliente",
      gender: "F",
      isMainPassenger: "true",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      lastName: "Demo",
      nationality: "Colombiana",
      passengerId: "",
      phoneNumber: "+573001112233",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps passenger writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      upsertAdminNextPassengerAction(passengerFormData()),
    ).rejects.toThrow(
      "La edición de pasajeros en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockUpsertPassengerWithFlutterParity).not.toHaveBeenCalled();
  });

  it("creates a passenger through the parity adapter and redirects to passengers tab", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      upsertAdminNextPassengerAction(passengerFormData({ itineraryId })),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=passengers`,
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}?tab=passengers`,
      permission: "planner.approve",
    });
    expect(mockUpsertPassengerWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          accountId: "account-1",
          documentNumber: "123",
          firstName: "Cliente",
          isMainPassenger: true,
          itineraryId,
          passengerId: null,
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}?tab=passengers`,
    );
  });

  it("updates a passenger through the parity adapter", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const passengerId = "33333333-3333-4333-8333-333333333333";

    await expect(
      upsertAdminNextPassengerAction(
        passengerFormData({
          firstName: "Cliente Editado",
          itineraryId,
          passengerId,
        }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=passengers`,
    );

    expect(mockUpsertPassengerWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          firstName: "Cliente Editado",
          itineraryId,
          passengerId,
        }),
      }),
    );
  });
});

describe("deleteAdminNextPassengerAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
    mockDeletePassengerWithFlutterParity.mockResolvedValue();
  });

  function deletePassengerFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      itineraryId: "11111111-1111-4111-8111-111111111111",
      passengerId: "33333333-3333-4333-8333-333333333333",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps passenger deletes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      deleteAdminNextPassengerAction(deletePassengerFormData()),
    ).rejects.toThrow(
      "La eliminación de pasajeros en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockDeletePassengerWithFlutterParity).not.toHaveBeenCalled();
  });

  it("deletes a passenger through the parity adapter and redirects to passengers tab", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const passengerId = "33333333-3333-4333-8333-333333333333";

    await expect(
      deleteAdminNextPassengerAction(
        deletePassengerFormData({ itineraryId, passengerId }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=passengers`,
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}?tab=passengers`,
      permission: "planner.approve",
    });
    expect(mockDeletePassengerWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          accountId: "account-1",
          itineraryId,
          passengerId,
        },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}?tab=passengers`,
    );
  });
});

describe("generateAdminNextItineraryPdfAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
  });

  function pdfFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      hideEmptyDays: "true",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      kind: "proposal",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("generates a proposal PDF through the Flutter Edge Function and redirects with the public URL", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { publicUrl: "https://cdn.example.test/proposal.pdf" },
      error: null,
      status: 200,
    });
    mockCreateSupabaseServerClient.mockResolvedValue({
      functions: { invoke },
    } as never);

    await expect(
      generateAdminNextItineraryPdfAction(pdfFormData()),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/itineraries/11111111-1111-4111-8111-111111111111?tab=preview&pdfKind=proposal&pdfUrl=https%3A%2F%2Fcdn.example.test%2Fproposal.pdf",
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath:
        "/admin/itineraries/11111111-1111-4111-8111-111111111111?tab=preview",
      permission: "planner.view",
    });
    expect(invoke).toHaveBeenCalledWith("create-itinerary-proposal-pdf", {
      body: {
        hideEmptyDays: true,
        itineraryId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/admin/itineraries/11111111-1111-4111-8111-111111111111",
    );
  });

  it("generates an account statement PDF and forwards language override", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { pdf_url: "https://cdn.example.test/account.pdf" },
      error: null,
      status: 200,
    });
    mockCreateSupabaseServerClient.mockResolvedValue({
      functions: { invoke },
    } as never);

    await expect(
      generateAdminNextItineraryPdfAction(
        pdfFormData({ kind: "account_statement", lang: "en" }),
      ),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/itineraries/11111111-1111-4111-8111-111111111111?tab=preview&pdfKind=account_statement&pdfUrl=https%3A%2F%2Fcdn.example.test%2Faccount.pdf",
    );

    expect(invoke).toHaveBeenCalledWith("create-account-statement-pdf", {
      body: {
        hideEmptyDays: true,
        itineraryId: "11111111-1111-4111-8111-111111111111",
        lang: "en",
      },
    });
  });

  it("redirects back to preview with an error when the Edge Function fails", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Gotenberg returned error: 503" },
      status: 503,
    });
    mockCreateSupabaseServerClient.mockResolvedValue({
      functions: { invoke },
    } as never);

    await expect(
      generateAdminNextItineraryPdfAction(pdfFormData()),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/admin/itineraries/11111111-1111-4111-8111-111111111111?tab=preview&pdfKind=proposal&pdfError=Gotenberg+returned+error%3A+503",
    );
  });
});

describe("upsertAdminNextTransactionAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
    mockUpsertTransactionWithFlutterParity.mockResolvedValue();
  });

  function transactionFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      conversionDate: "",
      date: "2026-07-04",
      exchangeRate: "1",
      feeAmount: "0",
      itineraryId: "11111111-1111-4111-8111-111111111111",
      originalCurrency: "COP",
      paymentMethod: "Transferencia bancaria",
      reference: "REC-F6-001",
      totalPaid: "",
      transactionId: "",
      type: "ingreso",
      value: "1500000",
      voucherUrl: "https://cdn.example.test/voucher.pdf",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps payment writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      upsertAdminNextTransactionAction(transactionFormData()),
    ).rejects.toThrow(
      "El registro de pagos en Next está cerrado para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockUpsertTransactionWithFlutterParity).not.toHaveBeenCalled();
  });

  it("creates a transaction through the Flutter-compatible payload and redirects to payments tab", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      upsertAdminNextTransactionAction(
        transactionFormData({ itineraryId, reference: "REC-F6-CREATE" }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=payments`,
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}?tab=payments`,
      permission: "payments.manage",
    });
    expect(mockUpsertTransactionWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          accountId: "account-1",
          date: "2026-07-04",
          itineraryId,
          paymentMethod: "Transferencia bancaria",
          reference: "REC-F6-CREATE",
          totalPaid: 1500000,
          transactionId: null,
          type: "ingreso",
          value: 1500000,
          voucherUrl: "https://cdn.example.test/voucher.pdf",
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}?tab=payments`,
    );
  });

  it("updates a transaction through the parity adapter", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const transactionId = "98765";

    await expect(
      upsertAdminNextTransactionAction(
        transactionFormData({
          itineraryId,
          reference: "REC-F6-EDIT",
          transactionId,
          value: "1750000",
        }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=payments`,
    );

    expect(mockUpsertTransactionWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          itineraryId,
          reference: "REC-F6-EDIT",
          totalPaid: 1750000,
          transactionId,
          value: 1750000,
        }),
      }),
    );
  });
});

describe("deleteAdminNextTransactionAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      rpc: jest.fn(),
    } as never);
    mockDeleteTransactionWithFlutterParity.mockResolvedValue();
  });

  function deleteTransactionFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    const values = {
      itineraryId: "11111111-1111-4111-8111-111111111111",
      transactionId: "98765",
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("keeps payment deletes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      deleteAdminNextTransactionAction(deleteTransactionFormData()),
    ).rejects.toThrow(
      "La eliminación de pagos en Next está cerrada para esta cuenta.",
    );

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockDeleteTransactionWithFlutterParity).not.toHaveBeenCalled();
  });

  it("deletes a transaction through Flutter RPC parity and redirects to payments tab", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";
    const transactionId = "98765";

    await expect(
      deleteAdminNextTransactionAction(
        deleteTransactionFormData({ itineraryId, transactionId }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/admin/itineraries/${itineraryId}?tab=payments`,
    );

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}?tab=payments`,
      permission: "payments.manage",
    });
    expect(mockDeleteTransactionWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          accountId: "account-1",
          itineraryId,
          transactionId,
        },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}?tab=payments`,
    );
  });
});

describe("updateAdminNextItineraryHeaderAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminNextSession.mockResolvedValue(session() as never);
    mockCreateSupabaseServerClient.mockResolvedValue({
      from: jest.fn(),
    } as never);
    mockUpdateItineraryHeaderWithFlutterParity.mockResolvedValue();
  });

  it("keeps edit writes closed when the session gate is disabled", async () => {
    mockRequireAdminNextSession.mockResolvedValue(
      session({
        flags: {
          ...session().flags,
          adminNextItineraryWrites: false,
        },
      }) as never,
    );

    await expect(
      updateAdminNextItineraryHeaderAction(
        { status: "idle" },
        formData({ itineraryId: "11111111-1111-4111-8111-111111111111" }),
      ),
    ).resolves.toEqual({
      status: "error",
      message:
        "La edición de itinerarios en Next está cerrada para esta cuenta.",
    });

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockUpdateItineraryHeaderWithFlutterParity).not.toHaveBeenCalled();
  });

  it("validates edit passenger totals before calling Supabase", async () => {
    await expect(
      updateAdminNextItineraryHeaderAction(
        { status: "idle" },
        formData({
          itineraryId: "11111111-1111-4111-8111-111111111111",
          passengerCount: "3",
        }),
      ),
    ).resolves.toMatchObject({
      status: "error",
      fieldErrors: {
        passengerCount: ["El total debe coincidir con adultos + menores"],
      },
    });

    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockUpdateItineraryHeaderWithFlutterParity).not.toHaveBeenCalled();
  });

  it("updates the header through the parity adapter and redirects to detail", async () => {
    const itineraryId = "11111111-1111-4111-8111-111111111111";

    await expect(
      updateAdminNextItineraryHeaderAction(
        { status: "idle" },
        formData({
          agentId: "22222222-2222-4222-8222-222222222222",
          contactId: "",
          itineraryId,
          mainImage: "https://cdn.example.test/main.jpg",
          status: "Presupuesto",
        }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT:/admin/itineraries/${itineraryId}`);

    expect(mockRequireAdminNextSession).toHaveBeenCalledWith({
      nextPath: `/admin/itineraries/${itineraryId}`,
      permission: "planner.approve",
    });
    expect(mockUpdateItineraryHeaderWithFlutterParity).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          agentId: "22222222-2222-4222-8222-222222222222",
          contactId: null,
          itineraryId,
          mainImage: "https://cdn.example.test/main.jpg",
          name: "Viaje demo Cartagena",
          passengerCount: 2,
          status: "Presupuesto",
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/itineraries");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      `/admin/itineraries/${itineraryId}`,
    );
  });
});
