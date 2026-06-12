import {
  createItinerariesAdapter,
  type AdminNextItinerariesReadonlySupabaseClient,
} from "@/lib/admin-next/itineraries-adapter";

describe("itineraries adapter", () => {
  it("feeds itineraries from the fixture source by default", async () => {
    const adapter = createItinerariesAdapter();

    await expect(adapter.getItineraries()).resolves.toMatchObject({
      statuses: expect.arrayContaining([
        expect.objectContaining({ id: "draft" }),
        expect.objectContaining({ id: "won" }),
      ]),
      itineraries: expect.arrayContaining([
        expect.objectContaining({
          id: "it-2647",
          href: "/admin/itineraries/it-2647",
        }),
      ]),
    });
  });

  it("feeds itinerary detail from the fixture source", async () => {
    const adapter = createItinerariesAdapter();

    await expect(adapter.getItineraryDetail("it-2647")).resolves.toMatchObject({
      summary: expect.objectContaining({
        id: "it-2647",
        href: "/admin/itineraries/it-2647",
      }),
      detail: expect.objectContaining({
        services: expect.any(Array),
        passengers: expect.any(Array),
        suppliers: expect.any(Array),
        payments: expect.any(Array),
        preview: expect.any(Array),
      }),
      paymentPlan: expect.objectContaining({
        methods: expect.any(Array),
        installments: expect.any(Array),
      }),
      editDefaults: expect.objectContaining({
        itineraryId: "it-2647",
        currencyType: "COP",
        language: "es",
        mainImage: "",
      }),
      confirmationDate: expect.any(String),
      auditTrail: expect.arrayContaining([
        expect.objectContaining({ source: "fixture" }),
      ]),
    });
  });

  it("maps readonly itinerary rows into the Evolucion list contract", async () => {
    const supabase = createReadonlySupabaseMock({
      itineraries: {
        data: [
          {
            id: "itinerary-live-1",
            id_fm: "BK-1001",
            name: "Viaje demo Cartagena",
            status: "Confirmado",
            start_date: "2026-07-03",
            end_date: "2026-07-08",
            passenger_count: 4,
            currency_type: "COP",
            itinerary_visibility: true,
            adults: 2,
            children: 2,
            language: "es",
            request_type: "Cotizacion",
            personalized_message: "Hola",
            main_image: "https://cdn.example.test/main.jpg",
            confirmation_date: "2026-06-10",
            id_contact: "contact-1",
            total_amount: 12800000,
            total_cost: 9800000,
            total_markup: 3000000,
            agent: "Laura Mesa",
            created_at: "2026-06-10T13:45:00Z",
            destinations: ["Cartagena"],
            contact: {
              name: "Cliente Demo",
            },
          },
        ],
        error: null,
      },
    });
    const adapter = createItinerariesAdapter({
      mode: "readonly",
      supabase,
      accountId: "acct-demo",
    });

    const fixture = await adapter.getItineraries();

    expect("rpc" in supabase).toBe(false);
    expect(supabase.calls).toEqual([
      {
        table: "itineraries",
        columns: expect.stringContaining("contact:contacts!id_contact(name)"),
        filters: [
          ["account_id", "acct-demo"],
          ["deleted_at:is", null],
        ],
        order: ["created_at", { ascending: false }],
        limit: 60,
      },
    ]);
    expect(fixture.itineraries).toEqual([
      expect.objectContaining({
        id: "itinerary-live-1",
        code: "ID BK-1001",
        title: "Viaje demo Cartagena",
        customer: "Cliente Demo",
        owner: "Laura Mesa",
        destination: "Cartagena",
        startDate: expect.stringContaining("3"),
        endDate: expect.stringContaining("8"),
        days: 5,
        pax: 4,
        status: "won",
        value: "$ 12.800.000",
        margin: "23,4%",
        href: "/admin/itineraries/itinerary-live-1",
      }),
    ]);
  });

  it("maps readonly detail rows into the Evolucion detail contract", async () => {
    const itinerary = {
      id: "itinerary-live-1",
      id_fm: "BK-1001",
      name: "Viaje demo Cartagena",
      status: "Confirmado",
      start_date: "2026-07-03",
      end_date: "2026-07-08",
      passenger_count: 4,
      currency_type: "COP",
      adults: 2,
      children: 2,
      language: "es",
      itinerary_visibility: true,
      request_type: "Cotizacion",
      personalized_message: "Hola",
      main_image: "https://cdn.example.test/main.jpg",
      confirmation_date: "2026-06-10",
      id_contact: "contact-1",
      total_amount: 12800000,
      total_cost: 9800000,
      total_markup: 3000000,
      agent: "Laura Mesa",
      created_at: "2026-06-10T13:45:00Z",
      destinations: ["Cartagena"],
      contact: {
        name: "Cliente Demo",
      },
    };
    const supabase = createReadonlySupabaseMock(
      {
        itineraries: {
          data: [itinerary],
          error: null,
        },
        itinerary_items: {
          data: [
            {
              id: "item-1",
              product_type: "Hoteles",
              product_name: "Ananda Hotel Boutique",
              rate_name: null,
              date: "2026-07-03",
              day_number: 1,
              order: 1,
              destination: "Cartagena",
              quantity: 2,
              unit_cost: 450000,
              unit_price: 600000,
              total_cost: 900000,
              total_price: 1200000,
              profit: 300000,
              profit_percentage: 25,
              paid_cost: 250000,
              pending_paid_cost: 650000,
              reservation_status: "Confirmado",
              reservation_messages: [
                {
                  at: "2026-06-10T16:00:00Z",
                  message: "Solicitud enviada al proveedor",
                },
              ],
              provider_contact_id: "provider-1",
              canonical_provider_contact_id: "provider-1",
              canonical_mapping_status: "mapped",
              channel_code: "bukeer",
              is_from_package: false,
              package_group_name: null,
              source_package_id: null,
              needs_review: false,
              id_product: "hotel-1",
              created_at: "2026-06-10T14:00:00Z",
              provider: {
                name: "Ananda",
                last_name: "DMC",
                email: "ops@ananda.example.test",
                user_image: "https://cdn.example.test/ananda.jpg",
              },
            },
          ],
          error: null,
        },
        passenger: {
          data: [
            {
              id: "pax-1",
              name: "Cliente",
              last_name: "Demo",
              type_id: "CC",
              number_id: "123",
              nationality: "Colombiana",
              birth_date: "1990-01-01",
              email: "cliente@example.test",
              phone_number: "+573001112233",
              gender: "F",
              is_main_passenger: true,
            },
          ],
          error: null,
        },
        transactions: {
          data: [
            {
              id: "tx-1",
              value: 5000000,
              type: "ingreso",
              payment_method: "Transferencia",
              reference: "TRX-001",
              voucher_url: "https://cdn.example.test/voucher.pdf",
              created_at: "2026-06-10T15:00:00Z",
            },
          ],
          error: null,
        },
      },
      {
        data: [
          {
            event_id: "audit-1",
            event_type: "status",
            title: "Cambio de estado",
            description: "Presupuesto -> Confirmado",
            changed_by_name: "Laura Mesa",
            changed_at: "2026-06-10T16:00:00Z",
            source: "flutter",
            severity: "success",
          },
        ],
        error: null,
      },
    );
    const adapter = createItinerariesAdapter({
      mode: "readonly",
      supabase,
      accountId: "acct-demo",
    });

    const detail = await adapter.getItineraryDetail("itinerary-live-1");

    expect(detail).toMatchObject({
      summary: expect.objectContaining({
        id: "itinerary-live-1",
        status: "won",
      }),
      detail: expect.objectContaining({
        services: [
          expect.objectContaining({
            label: "Ananda Hotel Boutique",
            value: expect.stringContaining("2026"),
            service: expect.objectContaining({
              type: "Hoteles",
              source: "Catálogo V2",
              provider: "Ananda DMC",
              reservation: "Confirmado",
              catalogStatus: "Catálogo V2",
              quantity: "2",
              unitCost: "$ 450.000",
              unitPrice: "$ 600.000",
              totalCost: "$ 900.000",
              totalPrice: "$ 1.200.000",
              markup: "$ 300.000",
            }),
          }),
        ],
        passengers: [
          expect.objectContaining({
            label: "Cliente Demo",
            value: "Principal",
            passenger: {
              birthDate: "1990-01-01",
              documentNumber: "123",
              documentType: "CC",
              email: "cliente@example.test",
              firstName: "Cliente",
              gender: "F",
              isMainPassenger: true,
              lastName: "Demo",
              nationality: "Colombiana",
              phoneNumber: "+573001112233",
            },
          }),
        ],
        suppliers: [
          expect.objectContaining({
            detail: "1 servicio · 1/1 reservas confirmadas",
            label: "Ananda DMC",
            supplier: expect.objectContaining({
              confirmedCount: 1,
              itemCount: 1,
              paidCost: 250000,
              paidCostLabel: "$ 250.000",
              pendingCost: 650000,
              pendingCostLabel: "$ 650.000",
              providerEmail: "ops@ananda.example.test",
              providerImage: "https://cdn.example.test/ananda.jpg",
              providerName: "Ananda DMC",
              totalCost: 900000,
              totalCostLabel: "$ 900.000",
              items: [
                expect.objectContaining({
                  itemId: "item-1",
                  messageCount: 1,
                  pendingCost: 650000,
                  productName: "Ananda Hotel Boutique",
                  reservationStatus: "Confirmado",
                  reserved: true,
                }),
              ],
            }),
            value: "$ 650.000",
          }),
        ],
        payments: [
          expect.objectContaining({
            label: "ingreso",
            value: "$\u00a05.000.000",
            payment: {
              amount: 5000000,
              date: "2026-06-10",
              paymentMethod: "Transferencia",
              reference: "TRX-001",
              type: "ingreso",
              voucherUrl: "https://cdn.example.test/voucher.pdf",
            },
            locked: true,
          }),
        ],
        preview: [
          expect.objectContaining({
            id: "item-1",
            label: expect.stringContaining("2026"),
            value: "Ananda Hotel Boutique",
            detail: expect.stringContaining("Publicado ES"),
            preview: expect.objectContaining({
              amountLabel: "$ 1.200.000",
              dayNumber: 1,
              destination: "Cartagena",
              productName: "Ananda Hotel Boutique",
              productType: "Hoteles",
              providerName: "Ananda DMC",
              reservationStatus: "Confirmado",
              reserved: true,
            }),
          }),
        ],
      }),
      publicProposal: expect.objectContaining({
        shareUrl: "/es/view/itinerary-live-1?hideEmptyDays=true",
      }),
      paymentPlan: expect.objectContaining({
        installments: expect.arrayContaining([
          expect.objectContaining({
            label: "Pagado",
            locked: true,
          }),
        ]),
      }),
      auditTrail: [
        expect.objectContaining({
          title: "Cambio de estado",
          source: "flutter",
          severity: "success",
        }),
      ],
      confirmationDate: "2026-06-10",
      editDefaults: expect.objectContaining({
        itineraryId: "itinerary-live-1",
        adults: 2,
        children: 2,
        contactId: "contact-1",
        currencyType: "COP",
        language: "es",
        mainImage: "https://cdn.example.test/main.jpg",
        requestType: "Cotizacion",
      }),
    });
    expect(supabase.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "itinerary_items",
          columns: expect.stringContaining(
            "provider:contacts!provider_contact_id(name,last_name,email,user_image)",
          ),
          filters: expect.arrayContaining([
            ["account_id", "acct-demo"],
            ["id_itinerary", "itinerary-live-1"],
            ["deleted_at:is", null],
          ]),
        }),
        expect.objectContaining({
          table: "passenger",
          filters: expect.arrayContaining([
            ["itinerary_id", "itinerary-live-1"],
          ]),
        }),
        expect.objectContaining({
          table: "transactions",
          columns: "*",
        }),
      ]),
    );
    expect(supabase.rpcCalls).toEqual([
      {
        functionName: "function_get_itinerary_audit_timeline",
        params: { p_itinerary_id: "itinerary-live-1" },
      },
    ]);
  });

  it("throws when readonly itinerary reads return an error", async () => {
    const adapter = createItinerariesAdapter({
      mode: "readonly",
      supabase: createReadonlySupabaseMock({
        itineraries: {
          data: null,
          error: { message: "permission denied" },
        },
      }),
      accountId: "acct-demo",
    });

    await expect(adapter.getItineraries()).rejects.toThrow(
      "Itineraries readonly adapter failed: permission denied",
    );
  });
});

function createReadonlySupabaseMock(
  rows: Partial<
    Record<
      string,
      {
        data: unknown[] | null;
        error: { message?: string } | null;
      }
    >
  >,
  auditRows?: {
    data: unknown[] | null;
    error: { message?: string } | null;
  },
): AdminNextItinerariesReadonlySupabaseClient & {
  calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    order: [string, { ascending?: boolean } | undefined] | null;
    limit: number | null;
  }>;
  rpcCalls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }>;
} {
  const calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    order: [string, { ascending?: boolean } | undefined] | null;
    limit: number | null;
  }> = [];
  const rpcCalls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }> = [];

  const client = {
    calls,
    rpcCalls,
    from(table: string) {
      return {
        select(columns: string) {
          const call: {
            table: string;
            columns: string;
            filters: Array<[string, unknown]>;
            order: [string, { ascending?: boolean } | undefined] | null;
            limit: number | null;
          } = { table, columns, filters: [], order: null, limit: null };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            is(column: string, value: null) {
              call.filters.push([`${column}:is`, value]);
              return query;
            },
            order(column: string, options?: { ascending?: boolean }) {
              call.order = [column, options];
              return query;
            },
            limit(count: number) {
              call.limit = count;
              return query;
            },
            then(
              resolve: (value: unknown) => unknown,
              reject?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve(
                rows[table] ?? { data: [], error: null },
              ).then(resolve, reject);
            },
          };

          return query;
        },
      };
    },
  };

  if (auditRows) {
    return {
      ...client,
      rpc(functionName: string, params: Record<string, unknown>) {
        rpcCalls.push({ functionName, params });
        return Promise.resolve(auditRows);
      },
    } as unknown as AdminNextItinerariesReadonlySupabaseClient & {
      calls: Array<{
        table: string;
        columns: string;
        filters: Array<[string, unknown]>;
        order: [string, { ascending?: boolean } | undefined] | null;
        limit: number | null;
      }>;
      rpcCalls: Array<{
        functionName: string;
        params: Record<string, unknown>;
      }>;
    };
  }

  return client as unknown as AdminNextItinerariesReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      order: [string, { ascending?: boolean } | undefined] | null;
      limit: number | null;
    }>;
    rpcCalls: Array<{
      functionName: string;
      params: Record<string, unknown>;
    }>;
  };
}
