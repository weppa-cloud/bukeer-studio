import {
  createContactsAdapter,
  type AdminNextContactsReadonlySupabaseClient,
} from "@/lib/admin-next/contacts-adapter";

type TableName = "contacts" | "itineraries";

describe("admin-next contacts adapter", () => {
  it("maps readonly contacts from Supabase rows", async () => {
    const adapter = createContactsAdapter({
      accountId: "account-1",
      mode: "readonly",
      supabase: createMockSupabase({
        contacts: [
          {
            created_at: "2026-06-01",
            email: "ana@example.test",
            id: "contact-1",
            is_client: true,
            is_company: false,
            is_provider: false,
            last_name: "Perez",
            location_name: "Bogota",
            name: "Ana",
            number_id: "123",
            phone: "+573001112233",
            type_id: "CC",
            updated_at: "2026-06-10",
          },
        ],
      }),
    });

    await expect(adapter.getContacts()).resolves.toEqual(
      expect.objectContaining({
        contacts: [
          expect.objectContaining({
            badges: ["Cliente"],
            city: "Bogota",
            document: "CC 123",
            email: "ana@example.test",
            id: "contact-1",
            initials: "AP",
            name: "Ana Perez",
            phone: "+573001112233",
          }),
        ],
      }),
    );
  });

  it("loads readonly contact detail with related itineraries", async () => {
    const adapter = createContactsAdapter({
      accountId: "account-1",
      mode: "readonly",
      supabase: createMockSupabase({
        contacts: [
          {
            email: "hotel@example.test",
            id: "provider-1",
            is_provider: true,
            last_name: "",
            location_name: "Cartagena",
            name: "Hotel Demo",
            phone: "+576001112233",
            updated_at: "2026-06-10",
          },
        ],
        itineraries: [
          {
            currency_type: "COP",
            end_date: "2026-07-05",
            id: "it-1",
            id_fm: "1001",
            name: "Cartagena demo",
            passenger_count: 2,
            start_date: "2026-07-01",
            status: "Confirmado",
            total_amount: 5000000,
            updated_at: "2026-06-10",
          },
        ],
      }),
    });

    const detail = await adapter.getContactDetail("provider-1");

    expect(detail?.contact).toEqual(
      expect.objectContaining({
        badges: ["Proveedor"],
        id: "provider-1",
        itineraries: 1,
        name: "Hotel Demo",
      }),
    );
    expect(detail?.itineraries[0]).toEqual(
      expect.objectContaining({
        id: "it-1",
        status: "Confirmado",
        title: "Cartagena demo",
      }),
    );
    expect(detail?.itineraries[0]?.amount.replace(/\s/g, " ")).toBe(
      "$ 5.000.000",
    );
    expect(detail?.profile).toEqual(
      expect.arrayContaining([{ label: "Email", value: "hotel@example.test" }]),
    );
  });

  it("returns null when readonly contact detail is missing", async () => {
    const adapter = createContactsAdapter({
      accountId: "account-1",
      mode: "readonly",
      supabase: createMockSupabase({ contacts: [] }),
    });

    await expect(adapter.getContactDetail("missing")).resolves.toBeNull();
  });
});

function createMockSupabase(
  rowsByTable: Partial<Record<TableName, unknown[]>>,
): AdminNextContactsReadonlySupabaseClient {
  return {
    from(table: TableName) {
      return {
        select() {
          return createQuery(rowsByTable[table] ?? []);
        },
      };
    },
  } as unknown as AdminNextContactsReadonlySupabaseClient;
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
