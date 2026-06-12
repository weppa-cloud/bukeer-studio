import {
  changeItineraryStatusWithFlutterParity,
  createItineraryWithFlutterParity,
  deletePassengerWithFlutterParity,
  deleteTransactionWithFlutterParity,
  deleteItineraryItemWithFlutterParity,
  extractCreatedItineraryId,
  type AdminNextItineraryWriteSupabaseClient,
  updateItineraryConfirmationDateWithFlutterParity,
  updateItineraryHeaderWithFlutterParity,
  updateItineraryItemsReservationStatusWithFlutterParity,
  upsertPassengerWithFlutterParity,
  upsertTransactionWithFlutterParity,
} from "@/lib/admin-next/itinerary-write-adapter";

describe("admin-next itinerary write adapter", () => {
  it("extracts created itinerary ids from Flutter RPC response shapes", () => {
    expect(extractCreatedItineraryId([{ itinerary_id: "it-1" }])).toBe("it-1");
    expect(extractCreatedItineraryId([{ id: "it-2" }])).toBe("it-2");
    expect(extractCreatedItineraryId({ itinerary_id: "it-3" })).toBe("it-3");
    expect(extractCreatedItineraryId([])).toBeNull();
  });

  it("calls the Flutter parity RPC and persists passenger breakdown", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ update }));
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: [{ itinerary_id: "it-new" }], error: null });
    const supabase = {
      rpc,
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      createItineraryWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          adults: 2,
          children: 1,
          contactId: null,
          creatorId: "user-1",
          currencyType: "COP",
          endDate: "2026-07-07",
          language: "es",
          name: "Viaje demo Cartagena",
          passengerCount: 3,
          personalizedMessage: "Hola",
          requestType: "Cotizacion",
          startDate: "2026-07-01",
        },
      }),
    ).resolves.toBe("it-new");

    expect(rpc).toHaveBeenCalledWith(
      "function_create_itinerary",
      expect.objectContaining({
        account_id: "account-1",
        creator_id: "user-1",
        itinerary_agent: "user-1",
        itinerary_currency_type: "COP",
        itinerary_passenger_count: 3,
        itinerary_status: "Presupuesto",
        name: "Viaje demo Cartagena",
      }),
    );
    expect(from).toHaveBeenCalledWith("itineraries");
    expect(update).toHaveBeenCalledWith({ adults: 2, children: 1 });
    expect(eq).toHaveBeenCalledWith("id", "it-new");
  });

  it("patches itinerary header fields with Flutter parity and then passenger breakdown", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ update }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      updateItineraryHeaderWithFlutterParity({
        supabase,
        input: {
          adults: 3,
          agentId: "agent-1",
          children: 1,
          contactId: null,
          currencyType: "USD",
          endDate: "2026-08-06",
          itineraryId: "it-live-1",
          language: "en",
          mainImage: "https://cdn.example.test/main.jpg",
          name: "Viaje demo editado",
          passengerCount: 4,
          personalizedMessage: "Updated",
          requestType: "Operacion",
          startDate: "2026-08-01",
          status: "Presupuesto",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenNthCalledWith(1, "itineraries");
    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agent: "agent-1",
        currency_type: "USD",
        end_date: "2026-08-06",
        id_contact: null,
        language: "en",
        main_image: "https://cdn.example.test/main.jpg",
        name: "Viaje demo editado",
        passenger_count: 4,
        request_type: "Operacion",
        start_date: "2026-08-01",
        status: "Presupuesto",
      }),
    );
    expect(update).toHaveBeenNthCalledWith(2, { adults: 3, children: 1 });
    expect(eq).toHaveBeenCalledTimes(2);
    expect(eq).toHaveBeenNthCalledWith(1, "id", "it-live-1");
    expect(eq).toHaveBeenNthCalledWith(2, "id", "it-live-1");
  });

  it("changes status through the Flutter status-history RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const supabase = {
      rpc,
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      changeItineraryStatusWithFlutterParity({
        supabase,
        input: {
          isConfirmed: true,
          itineraryId: "it-live-1",
          metadata: {
            action: "confirm",
            surface: "admin_next_itinerary_detail",
          },
          source: "admin_next_detail",
        },
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith(
      "function_update_itinerary_status_with_history",
      {
        p_is_confirmed: true,
        p_itinerary_id: "it-live-1",
        p_metadata: {
          action: "confirm",
          surface: "admin_next_itinerary_detail",
        },
        p_source: "admin_next_detail",
      },
    );
  });

  it("rejects status changes when the RPC returns false", async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      changeItineraryStatusWithFlutterParity({
        supabase,
        input: {
          isConfirmed: false,
          itineraryId: "it-live-1",
          metadata: {},
          source: "admin_next_detail",
        },
      }),
    ).rejects.toThrow("El backend rechazó el cambio de estado");
  });

  it("corrects confirmation date through the Flutter admin RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const supabase = {
      rpc,
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      updateItineraryConfirmationDateWithFlutterParity({
        supabase,
        input: {
          confirmationDate: "2026-08-09",
          itineraryId: "it-live-1",
          reason: "Corrección comercial validada",
        },
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith(
      "function_update_itinerary_confirmation_date",
      {
        p_confirmation_date: "2026-08-09",
        p_itinerary_id: "it-live-1",
        p_reason: "Corrección comercial validada",
      },
    );
  });

  it("rejects confirmation date corrections when the RPC returns false", async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      updateItineraryConfirmationDateWithFlutterParity({
        supabase,
        input: {
          confirmationDate: "2026-08-09",
          itineraryId: "it-live-1",
          reason: "Corrección comercial validada",
        },
      }),
    ).rejects.toThrow("El backend rechazó la corrección de fecha");
  });

  it("updates item reservation status through the Flutter RPC when available", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const supabase = {
      rpc,
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      updateItineraryItemsReservationStatusWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itemIds: ["item-1"],
          itineraryId: "it-live-1",
          reservationStatus: true,
        },
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith("function_update_itinerary_items_status", {
      item_ids: ["item-1"],
      reservation_status: true,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("falls back to scoped itinerary_items update when the Flutter RPC is missing", async () => {
    const inFilter = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ in: inFilter }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const update = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({ update }));
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function missing" },
    });
    const supabase = {
      rpc,
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      updateItineraryItemsReservationStatusWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itemIds: ["item-1"],
          itineraryId: "it-live-1",
          reservationStatus: true,
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("itinerary_items");
    expect(update).toHaveBeenCalledWith({ reservation_status: true });
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("id_itinerary", "it-live-1");
    expect(inFilter).toHaveBeenCalledWith("id", ["item-1"]);
  });

  it("deletes itinerary items through the same table mutation as Flutter, scoped by account and itinerary", async () => {
    const eqItem = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ eq: eqItem }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const deleteFn = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({ delete: deleteFn, update: jest.fn() }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      deleteItineraryItemWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itemId: "item-1",
          itineraryId: "it-live-1",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("itinerary_items");
    expect(deleteFn).toHaveBeenCalledWith();
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("id_itinerary", "it-live-1");
    expect(eqItem).toHaveBeenCalledWith("id", "item-1");
  });

  it("creates passengers through the same passenger table payload as Flutter", async () => {
    const insert = jest.fn().mockResolvedValue({ data: null, error: null });
    const from = jest.fn(() => ({
      insert,
      update: jest.fn(),
      delete: jest.fn(),
    }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      upsertPassengerWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          birthDate: "1990-01-01",
          documentNumber: "123",
          documentType: "CC",
          email: "cliente@example.test",
          firstName: "Cliente",
          gender: "F",
          isMainPassenger: true,
          itineraryId: "it-live-1",
          lastName: "Demo",
          nationality: "Colombiana",
          phoneNumber: "+573001112233",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("passenger");
    expect(insert).toHaveBeenCalledWith({
      account_id: "account-1",
      birth_date: "1990-01-01",
      email: "cliente@example.test",
      gender: "F",
      is_main_passenger: true,
      itinerary_id: "it-live-1",
      last_name: "Demo",
      name: "Cliente",
      nationality: "Colombiana",
      number_id: "123",
      phone_number: "+573001112233",
      type_id: "CC",
    });
  });

  it("updates passengers scoped by account and itinerary", async () => {
    const eqPassenger = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ eq: eqPassenger }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const update = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({
      update,
      insert: jest.fn(),
      delete: jest.fn(),
    }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      upsertPassengerWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          documentNumber: "456",
          documentType: "PAS",
          firstName: "Cliente",
          isMainPassenger: false,
          itineraryId: "it-live-1",
          lastName: "Editado",
          passengerId: "pax-1",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("passenger");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_main_passenger: false,
        last_name: "Editado",
        name: "Cliente",
        number_id: "456",
        type_id: "PAS",
      }),
    );
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("itinerary_id", "it-live-1");
    expect(eqPassenger).toHaveBeenCalledWith("id", "pax-1");
  });

  it("deletes passengers through the same table mutation as Flutter, scoped by account and itinerary", async () => {
    const eqPassenger = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ eq: eqPassenger }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const deleteFn = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({
      delete: deleteFn,
      insert: jest.fn(),
      update: jest.fn(),
    }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      deletePassengerWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itineraryId: "it-live-1",
          passengerId: "pax-1",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("passenger");
    expect(deleteFn).toHaveBeenCalledWith();
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("itinerary_id", "it-live-1");
    expect(eqPassenger).toHaveBeenCalledWith("id", "pax-1");
  });

  it("creates transactions through the same transactions table payload as Flutter", async () => {
    const insert = jest.fn().mockResolvedValue({ data: null, error: null });
    const from = jest.fn(() => ({
      insert,
      update: jest.fn(),
      delete: jest.fn(),
    }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      upsertTransactionWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          date: "2026-07-03",
          exchangeRate: 1,
          feeAmount: 0,
          itineraryId: "it-live-1",
          originalAmount: 250000,
          originalCurrency: "COP",
          paymentMethod: "Transferencia bancaria",
          reference: "[E2E][F6] TRX",
          totalPaid: 250000,
          type: "ingreso",
          value: 250000,
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("transactions");
    expect(insert).toHaveBeenCalledWith({
      account_id: "account-1",
      conversion_date: "2026-07-03",
      date: "2026-07-03",
      exchange_rate: 1,
      fee_amount: 0,
      id_item_itinerary: null,
      id_itinerary: "it-live-1",
      is_final_payment: false,
      original_amount: 250000,
      original_currency: "COP",
      payment_method: "Transferencia bancaria",
      reference: "[E2E][F6] TRX",
      rounding_adjustment: 0,
      scheduled_payment_id: null,
      total_paid: 250000,
      type: "ingreso",
      value: 250000,
      voucher_url: null,
    });
  });

  it("updates transactions scoped by account and itinerary", async () => {
    const eqTransaction = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ eq: eqTransaction }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const update = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({
      update,
      insert: jest.fn(),
      delete: jest.fn(),
    }));
    const supabase = {
      rpc: jest.fn(),
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      upsertTransactionWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          date: "2026-07-04",
          itineraryId: "it-live-1",
          paymentMethod: "PSE",
          reference: "TRX-EDIT",
          transactionId: "123",
          type: "ingreso",
          value: 300000,
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("transactions");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-07-04",
        payment_method: "PSE",
        reference: "TRX-EDIT",
        type: "ingreso",
        value: 300000,
      }),
    );
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("id_itinerary", "it-live-1");
    expect(eqTransaction).toHaveBeenCalledWith("id", "123");
  });

  it("deletes transactions through Flutter's delete_transaction RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const supabase = {
      rpc,
      from: jest.fn(),
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      deleteTransactionWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itineraryId: "it-live-1",
          transactionId: "123",
        },
      }),
    ).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith("delete_transaction", {
      p_account_id: "account-1",
      p_transaction_id: 123,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("soft-deletes transactions scoped by account and itinerary when the RPC is missing", async () => {
    const eqTransaction = jest.fn().mockResolvedValue({ error: null });
    const eqItinerary = jest.fn(() => ({ eq: eqTransaction }));
    const eqAccount = jest.fn(() => ({ eq: eqItinerary }));
    const update = jest.fn(() => ({ eq: eqAccount }));
    const from = jest.fn(() => ({
      update,
      insert: jest.fn(),
      delete: jest.fn(),
    }));
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function missing" },
    });
    const supabase = {
      rpc,
      from,
    } as unknown as AdminNextItineraryWriteSupabaseClient;

    await expect(
      deleteTransactionWithFlutterParity({
        supabase,
        input: {
          accountId: "account-1",
          itineraryId: "it-live-1",
          transactionId: "tx-opaq",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("transactions");
    expect(update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    });
    expect(eqAccount).toHaveBeenCalledWith("account_id", "account-1");
    expect(eqItinerary).toHaveBeenCalledWith("id_itinerary", "it-live-1");
    expect(eqTransaction).toHaveBeenCalledWith("id", "tx-opaq");
  });
});
