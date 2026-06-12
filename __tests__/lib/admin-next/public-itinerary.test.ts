import {
  createPublicPassengerRegistration,
  getPublicItineraryById,
  type PublicItinerarySupabaseClient,
} from "@/lib/admin-next/public-itinerary";

type TableName =
  | "itineraries"
  | "itinerary_items"
  | "itinerary_payment_schedule"
  | "passenger"
  | "scheduled_payments";

describe("admin-next public itinerary adapter", () => {
  it("does not expose private itineraries", async () => {
    const supabase = createMockSupabase({
      itineraries: [
        {
          account_id: "account-1",
          id: "it-1",
          itinerary_visibility: false,
          name: "Privado",
        },
      ],
    });

    await expect(
      getPublicItineraryById({ itineraryId: "it-1", supabase }),
    ).resolves.toBeNull();
  });

  it("loads only public-safe itinerary, services and passengers", async () => {
    const supabase = createMockSupabase({
      itinerary_items: [
        {
          date: "2026-07-02",
          day_number: 2,
          destination: "Cartagena",
          id: "item-1",
          product_name: "Hotel demo",
          product_type: "Hotel",
          quantity: 2,
        },
      ],
      itineraries: [
        {
          account_id: "account-1",
          contact: { name: "Cliente Demo" },
          currency_type: "COP",
          id: "it-1",
          itinerary_visibility: true,
          language: "es",
          active_payment_method: "stripe",
          name: "Viaje demo",
          passenger_count: 2,
          personalized_message: "Hola",
          rates_visibility: true,
          status: "Presupuesto",
          total_amount: 1000000,
        },
      ],
      itinerary_payment_schedule: [
        {
          currency: "COP",
          id: "schedule-1",
          status: "active",
          total_amount: 1000000,
        },
      ],
      passenger: [
        {
          email: "ana@example.test",
          id: "pax-1",
          is_main_passenger: true,
          last_name: "Perez",
          name: "Ana",
          number_id: "123",
          type_id: "Pasaporte",
        },
      ],
      scheduled_payments: [
        {
          amount: 500000,
          currency: "COP",
          due_date: "2026-07-01",
          id: "payment-1",
          paid_at: null,
          payment_number: 1,
          status: "pending",
        },
        {
          amount: 500000,
          currency: "COP",
          due_date: "2026-08-01",
          id: "payment-2",
          paid_at: "2026-06-15",
          payment_number: 2,
          status: "paid",
        },
      ],
    });

    const result = await getPublicItineraryById({
      itineraryId: "it-1",
      supabase,
    });

    expect(result?.itinerary).toMatchObject({
      accountId: "account-1",
      clientName: "Cliente Demo",
      language: "es",
      name: "Viaje demo",
      passengerCount: 2,
      ratesVisible: true,
    });
    expect(result?.items).toEqual([
      expect.objectContaining({
        dayNumber: 2,
        destination: "Cartagena",
        label: "Hotel demo",
        productType: "Hotel",
      }),
    ]);
    expect(result?.passengers).toEqual([
      expect.objectContaining({
        document: "Pasaporte 123",
        fullName: "Ana Perez",
        isMainPassenger: true,
      }),
    ]);
    expect(result?.paymentPlan).toMatchObject({
      currency: "COP",
      onlinePaymentEnabled: true,
      pendingAmount: 500000,
      scheduleId: "schedule-1",
      totalAmount: 1000000,
    });
    expect(result?.paymentPlan.payments).toEqual([
      expect.objectContaining({
        id: "payment-1",
        paymentLink:
          "/es/payment/pay?itinerary_id=it-1&scheduled_payment_id=payment-1",
        paymentNumber: 1,
        status: "pending",
      }),
      expect.objectContaining({
        id: "payment-2",
        paymentNumber: 2,
        status: "paid",
      }),
    ]);
  });

  it("registers a public passenger with the Flutter-compatible passenger payload", async () => {
    const supabase = createMockSupabase({
      itineraries: [
        {
          account_id: "account-1",
          id: "it-1",
          itinerary_visibility: true,
          name: "Viaje demo",
          passenger_count: 2,
        },
      ],
    });

    await expect(
      createPublicPassengerRegistration({
        input: {
          birthDate: "1990-01-01",
          documentNumber: "AA123",
          documentType: "Pasaporte",
          email: "ana@example.test",
          firstName: "Ana",
          gender: "",
          itineraryId: "it-1",
          isMainPassenger: false,
          lastName: "Perez",
          nationality: "Colombiana",
          phoneNumber: "+573001112233",
        },
        supabase,
      }),
    ).resolves.toBeUndefined();

    expect(supabase.inserts).toEqual([
      {
        table: "passenger",
        values: expect.objectContaining({
          account_id: "account-1",
          birth_date: "1990-01-01",
          email: "ana@example.test",
          is_main_passenger: true,
          itinerary_id: "it-1",
          last_name: "Perez",
          name: "Ana",
          nationality: "Colombiana",
          number_id: "AA123",
          phone_number: "+573001112233",
          type_id: "Pasaporte",
        }),
      },
    ]);
  });

  it("rejects registrations once the expected passenger count is complete", async () => {
    const supabase = createMockSupabase({
      itineraries: [
        {
          account_id: "account-1",
          id: "it-1",
          itinerary_visibility: true,
          passenger_count: 1,
        },
      ],
      passenger: [{ id: "pax-1", name: "Ana" }],
    });

    await expect(
      createPublicPassengerRegistration({
        input: {
          birthDate: "",
          documentNumber: "AA123",
          documentType: "Pasaporte",
          email: "",
          firstName: "Luis",
          gender: "",
          itineraryId: "it-1",
          isMainPassenger: false,
          lastName: "Perez",
          nationality: "Colombiana",
          phoneNumber: "",
        },
        supabase,
      }),
    ).rejects.toThrow("cupo de pasajeros");

    expect(supabase.inserts).toEqual([]);
  });
});

function createMockSupabase(
  rowsByTable: Partial<Record<TableName, unknown[]>>,
): PublicItinerarySupabaseClient & {
  inserts: Array<{ table: TableName; values: Record<string, unknown> }>;
} {
  const inserts: Array<{ table: TableName; values: Record<string, unknown> }> = [];

  const client = {
    from(table: TableName) {
      return {
        insert(values: Record<string, unknown>) {
          inserts.push({ table, values });
          return Promise.resolve({ error: null });
        },
        select() {
          return createQuery(rowsByTable[table] ?? []);
        },
      };
    },
    inserts,
  };

  return client as unknown as PublicItinerarySupabaseClient & {
    inserts: Array<{ table: TableName; values: Record<string, unknown> }>;
  };
}

function createQuery(data: unknown[]) {
  const query: Record<string, unknown> = {};
  query.eq = jest.fn(() => query);
  query.is = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.then = (
    resolve?: ((value: { data: unknown[]; error: null }) => unknown) | null,
    reject?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve({ data, error: null }).then(resolve ?? undefined, reject ?? undefined);

  return query;
}
