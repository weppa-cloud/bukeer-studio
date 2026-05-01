jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/meta/conversions-api", () => ({
  sha256Hex: jest.fn(async (value: string) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }),
  sendMetaConversionEvent: jest.fn().mockResolvedValue({
    status: "skipped",
    eventName: "ConversationCreated",
    eventId: "HOME-2504-ABCD:chatwoot:ConversationCreated:123",
    request: { data: [] },
  }),
}));

import { createClient } from "@supabase/supabase-js";
import { sendMetaConversionEvent } from "@/lib/meta/conversions-api";

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signedRequest(
  body: Record<string, unknown>,
  signatureOverride?: string,
) {
  const raw = JSON.stringify(body);
  const signature =
    signatureOverride ?? (await hmacHex("chatwoot-secret", raw));
  return {
    text: jest.fn().mockResolvedValue(raw),
    headers: new Headers({
      "x-chatwoot-signature": `sha256=${signature}`,
      "x-chatwoot-timestamp": "1777118400",
    }),
  } as any;
}

describe("/api/webhooks/chatwoot", () => {
  const originalDateNow = Date.now;
  let webhookRows: Record<string, unknown>[];
  let webhookUpdates: Record<string, unknown>[];
  let leadUpdates: Record<string, unknown>[];
  let funnelRows: Record<string, unknown>[];
  let leadRow: Record<string, unknown> | null;
  let duplicateWebhook = false;

  function chain<T extends Record<string, unknown>>(methods: T): T {
    return methods;
  }

  function buildSupabaseMock() {
    const webhookUpdateQuery = chain({
      eq: jest.fn().mockReturnThis(),
    });
    const leadsUpdateQuery = chain({
      eq: jest.fn().mockReturnThis(),
    });
    const leadsSelectQuery = chain({
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: leadRow,
        error: null,
      }),
    });

    return {
      from: jest.fn((table: string) => {
        if (table === "webhook_events") {
          return {
            insert: jest.fn((row: Record<string, unknown>) => {
              webhookRows.push(row);
              return Promise.resolve({
                error: duplicateWebhook
                  ? { code: "23505", message: "duplicate key" }
                  : null,
              });
            }),
            update: jest.fn((row: Record<string, unknown>) => {
              webhookUpdates.push(row);
              return webhookUpdateQuery;
            }),
          };
        }
        if (table === "waflow_leads") {
          return {
            select: jest.fn(() => leadsSelectQuery),
            update: jest.fn((row: Record<string, unknown>) => {
              leadUpdates.push(row);
              return leadsUpdateQuery;
            }),
          };
        }
        if (table === "funnel_events") {
          const funnelQuery: {
            insert: jest.Mock;
            select: jest.Mock;
            maybeSingle: jest.Mock;
          } = {
            insert: jest.fn((row: Record<string, unknown>) => {
              funnelRows.push(row);
              return funnelQuery;
            }),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { event_id: "event-1" },
              error: null,
            }),
          };
          return funnelQuery;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    Date.now = jest.fn(() => new Date("2026-04-25T12:00:00Z").getTime());
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.CHATWOOT_WEBHOOK_SECRET = "chatwoot-secret";
    process.env.META_PAGE_ID = "1234567890";
    webhookRows = [];
    webhookUpdates = [];
    leadUpdates = [];
    funnelRows = [];
    duplicateWebhook = false;
    leadRow = {
      id: "lead-1",
      account_id: "11111111-1111-4111-8111-111111111111",
      website_id: "22222222-2222-4222-8222-222222222222",
      reference_code: "HOME-2504-ABCD",
      session_key: "session-123",
      payload: {
        name: "Juan Perez",
        phone: "+573001234567",
        attribution: {
          fbp: "fb.1.1700000000.abc",
          fbc: "fb.1.1700000123.FB123",
          ctwa_clid: "ctwa-test-123",
          source_url: "https://demo.bukeer.com/?fbclid=FB123",
        },
      },
      source_ip: "203.0.113.10",
      source_user_agent: "jest-agent",
    };
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
  });

  afterEach(() => {
    Date.now = originalDateNow;
    delete process.env.META_PAGE_ID;
  });

  it("rejects invalid signatures before persistence", async () => {
    const mod = await import("@/app/api/webhooks/chatwoot/route");
    const response = await mod.POST(
      await signedRequest(
        {
          event: "conversation_created",
          timestamp: 1777118400,
          conversation: { id: 123 },
        },
        "bad-signature",
      ),
    );

    expect(response.status).toBe(401);
    expect(webhookRows).toHaveLength(0);
    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
  });

  it("dedupes repeated provider events through webhook_events", async () => {
    duplicateWebhook = true;
    const mod = await import("@/app/api/webhooks/chatwoot/route");
    const response = await mod.POST(
      await signedRequest({
        id: "evt-1",
        event: "conversation_created",
        timestamp: 1777118400,
        conversation: {
          id: 123,
          custom_attributes: { reference_code: "HOME-2504-ABCD" },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { deduped: true },
    });
    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
  });

  it("logs orphan events without sending Meta conversions", async () => {
    leadRow = null;
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
    const mod = await import("@/app/api/webhooks/chatwoot/route");
    const response = await mod.POST(
      await signedRequest({
        id: "evt-orphan",
        event: "conversation_created",
        timestamp: 1777118400,
        conversation: {
          id: 123,
          custom_attributes: { reference_code: "HOME-2504-ABCD" },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        matched: false,
        conversionsSent: 0,
      },
    });
    expect(webhookUpdates[0]).toMatchObject({ status: "processed" });
    expect(sendMetaConversionEvent).not.toHaveBeenCalled();
  });

  it("links a Chatwoot conversation to a WAFlow lead and sends lifecycle conversions", async () => {
    const mod = await import("@/app/api/webhooks/chatwoot/route");
    const response = await mod.POST(
      await signedRequest({
        id: "evt-quote",
        event: "message_created",
        timestamp: 1777118400,
        message: {
          id: 456,
          content: "Te enviamos la cotización #ref: HOME-2504-ABCD",
          conversation_id: 123,
          conversation: {
            id: 123,
            custom_attributes: {
              reference_code: "HOME-2504-ABCD",
              lead_status: "qualified",
              quote_sent: true,
            },
          },
          sender: {
            name: "Juan Perez",
            phone_number: "+573001234567",
            email: "juan@example.com",
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        matched: true,
        lifecycleEvents: [
          "ConversationContinued",
          "QualifiedLead",
          "QuoteSent",
        ],
        conversionsSent: 3,
      },
    });
    expect(webhookRows[0]).toMatchObject({
      provider: "chatwoot",
      event_id: "evt-quote",
      event_type: "message_created",
    });
    expect(leadUpdates[0]).toMatchObject({
      chatwoot_conversation_id: "123",
      chatwoot_last_event: "QuoteSent",
    });
    expect(sendMetaConversionEvent).toHaveBeenCalledTimes(3);
    expect(sendMetaConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "LeadSubmitted",
        eventId: "HOME-2504-ABCD:chatwoot:LeadSubmitted:QuoteSent:123",
        actionSource: "business_messaging",
        messagingChannel: "whatsapp",
        userData: expect.objectContaining({
          email: "juan@example.com",
          phone: "+573001234567",
          externalId: "HOME-2504-ABCD",
          pageId: "1234567890",
          ctwaClid: "ctwa-test-123",
          fbp: "fb.1.1700000000.abc",
          fbc: "fb.1.1700000123.FB123",
        }),
        customData: expect.objectContaining({
          reference_code: "HOME-2504-ABCD",
          chatwoot_lifecycle_event: "QuoteSent",
        }),
        trace: expect.objectContaining({
          lifecycle_event: "QuoteSent",
        }),
        accountId: "11111111-1111-4111-8111-111111111111",
        websiteId: "22222222-2222-4222-8222-222222222222",
        waflowLeadId: "lead-1",
        chatwootConversationId: "123",
      }),
      expect.objectContaining({ supabase: expect.any(Object) }),
    );
    expect(funnelRows).toHaveLength(2);
    expect(funnelRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_name: "qualified_lead",
          stage: "qualified_lead",
          channel: "chatwoot",
          reference_code: "HOME-2504-ABCD",
          account_id: "11111111-1111-4111-8111-111111111111",
          website_id: "22222222-2222-4222-8222-222222222222",
        }),
        expect.objectContaining({
          event_name: "quote_sent",
          stage: "quote_sent",
          channel: "chatwoot",
          reference_code: "HOME-2504-ABCD",
          account_id: "11111111-1111-4111-8111-111111111111",
          website_id: "22222222-2222-4222-8222-222222222222",
        }),
      ]),
    );
    expect(
      funnelRows.every((row) => /^[0-9a-f]{64}$/.test(String(row.event_id))),
    ).toBe(true);
  });
});
