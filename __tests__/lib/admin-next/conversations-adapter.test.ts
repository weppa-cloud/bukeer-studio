import {
  createConversationsAdapter,
  type AdminNextConversationsReadonlySupabaseClient,
} from "@/lib/admin-next/conversations-adapter";

describe("admin-next conversations adapter", () => {
  it("feeds Conversations from fixture source by default", async () => {
    const adapter = createConversationsAdapter();

    await expect(adapter.getConversations()).resolves.toMatchObject({
      conversations: expect.arrayContaining([
        expect.objectContaining({ id: "conv-1024" }),
      ]),
      selected: expect.objectContaining({
        realtime: expect.objectContaining({
          latencyLabel: "<= Flutter/Chatwoot",
        }),
      }),
    });
  });

  it("maps readonly CRM and Chatwoot tables into Evolucion conversations", async () => {
    const supabase = createReadonlySupabaseMock({
      requests: {
        data: [
          {
            id: "req-1",
            short_id: "R-100",
            account_id: "acct-1",
            bukeer_contact_id: "ct-1",
            chatwoot_conversation_id: 4201,
            traveler_name: "Laura Mejia",
            traveler_email: "laura@example.com",
            traveler_phone: "+57 300 111 2233",
            status: "open",
            pipeline_status: "qualified",
            request_stage: "new_lead",
            lead_score: 82,
            lead_score_label: "hot",
            lead_qualification: "high",
            lead_source: "whatsapp",
            destinations: ["San Andres"],
            budget: 12000000,
            expected_value: 18000000,
            currency_type: "COP",
            conversation_summary: "Quiere cerrar si incluye traslados.",
            preferred_channel: "whatsapp",
            last_message_at: "2026-06-11T15:20:00Z",
            created_at: "2026-06-10T10:00:00Z",
            updated_at: "2026-06-11T15:21:00Z",
            itinerary_id: "it-1",
            special_requests: "Hotel familiar",
            assigned_to: "Carolina",
            urgency: "alta",
            trip_type: "family",
            adults: 2,
            children: 2,
            start_date: "2026-07-01",
            end_date: "2026-07-05",
          },
        ],
        error: null,
      },
      conversation_messages: {
        data: [
          {
            id: "msg-1",
            conversation_id: 4201,
            content: "Hola, queremos cerrar hoy.",
            message_type: "incoming",
            private: false,
            sender_name: "Laura Mejia",
            sender_type: "contact",
            chatwoot_created_at: "2026-06-11T15:18:00Z",
            created_at: "2026-06-11T15:18:05Z",
          },
          {
            id: "msg-2",
            conversation_id: 4201,
            content: "Confirmo traslado incluido.",
            message_type: "outgoing",
            private: false,
            sender_name: "Carolina",
            sender_type: "agent",
            chatwoot_created_at: "2026-06-11T15:20:00Z",
            created_at: "2026-06-11T15:20:05Z",
          },
        ],
        error: null,
      },
      chatwoot_events: {
        data: [
          {
            id: "event-1",
            conversation_id: 4201,
            event_type: "message_created",
            created_at: "2026-06-11T15:20:07Z",
            processed: true,
          },
        ],
        error: null,
      },
    });
    const adapter = createConversationsAdapter({
      mode: "readonly",
      supabase,
      accountId: "acct-1",
    });

    const fixture = await adapter.getConversations();

    expect(supabase.calls).toEqual([
      expect.objectContaining({
        table: "conversation_messages",
        filters: expect.arrayContaining([["account_id", "acct-1"]]),
        limit: 120,
      }),
      expect.objectContaining({
        table: "requests",
        filters: expect.arrayContaining([
          ["account_id", "acct-1"],
          ["chatwoot_conversation_id:in", [4201]],
        ]),
        limit: 25,
      }),
      expect.objectContaining({
        table: "chatwoot_events",
        filters: expect.arrayContaining([
          ["account_id", "acct-1"],
          ["conversation_id:in", [4201]],
        ]),
        limit: 80,
      }),
    ]);
    expect(fixture.conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "4201",
          customerName: "Laura Mejia",
          agencyLabel: "San Andres",
          channel: "whatsapp",
          temperature: "hot",
          lastMessage: "Confirmo traslado incluido.",
          itineraryId: "it-1",
          valueLabel: "$18.000.000",
          owner: "Carolina",
        }),
      ]),
    );
    expect(fixture.selected.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "msg-1",
          author: "customer",
          body: "Hola, queremos cerrar hoy.",
        }),
        expect.objectContaining({
          id: "msg-2",
          author: "agent",
          body: "Confirmo traslado incluido.",
        }),
      ]),
    );
    expect(fixture.selected.crm).toEqual(
      expect.objectContaining({
        contactId: "ct-1",
        phone: "+57 300 111 2233",
        totalValue: "$18.000.000",
        preference: "San Andres",
      }),
    );
    expect(fixture.selected.realtime).toEqual(
      expect.objectContaining({
        mirrorLabel: "Mirror conectado",
        latencyLabel: "<= Flutter/Chatwoot",
      }),
    );
    expect(fixture.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "realtime",
          value: "message_created",
          tone: "live",
        }),
      ]),
    );
  });

  it("returns the fixture when readonly CRM has no requests yet", async () => {
    const adapter = createConversationsAdapter({
      mode: "readonly",
      supabase: createReadonlySupabaseMock({
        requests: { data: [], error: null },
        conversation_messages: { data: [], error: null },
        chatwoot_events: { data: [], error: null },
      }),
      accountId: "acct-1",
    });

    await expect(adapter.getConversations()).resolves.toMatchObject({
      selected: expect.objectContaining({ id: "conv-1024" }),
    });
  });

  it("throws when readonly CRM reads return an error", async () => {
    const adapter = createConversationsAdapter({
      mode: "readonly",
      supabase: createReadonlySupabaseMock({
        requests: { data: null, error: { message: "permission denied" } },
        conversation_messages: { data: [], error: null },
        chatwoot_events: { data: [], error: null },
      }),
      accountId: "acct-1",
    });

    await expect(adapter.getConversations()).rejects.toThrow(
      "Conversations readonly adapter failed for requests: permission denied",
    );
  });
});

function createReadonlySupabaseMock(rows: {
  requests: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  conversation_messages: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  chatwoot_events: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextConversationsReadonlySupabaseClient & {
  calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }>;
} {
  const calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }> = [];

  return {
    calls,
    from(table: "requests" | "conversation_messages" | "chatwoot_events") {
      return {
        select(columns: string) {
          const call = {
            table,
            columns,
            filters: [] as Array<[string, unknown]>,
            orders: [] as Array<[string, { ascending?: boolean } | undefined]>,
            limit: null as number | null,
          };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            in(column: string, values: readonly unknown[]) {
              call.filters.push([`${column}:in`, Array.from(values)]);
              return query;
            },
            order(column: string, options?: { ascending?: boolean }) {
              call.orders.push([column, options]);
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
              return Promise.resolve(rows[table]).then(resolve, reject);
            },
          };

          return query;
        },
      };
    },
  } as unknown as AdminNextConversationsReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending?: boolean } | undefined]>;
      limit: number | null;
    }>;
  };
}
