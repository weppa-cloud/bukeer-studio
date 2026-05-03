jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/meta/conversions-api", () => ({
  sha256Hex: jest.fn(async () => "a".repeat(64)),
  sendMetaConversionEvent: jest.fn(async () => ({ status: "skipped" })),
}));

import { createClient } from "@supabase/supabase-js";
import { sendMetaConversionEvent } from "@/lib/meta/conversions-api";

function request(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  } as any;
}

describe("/api/growth/events/whatsapp-cta", () => {
  let websiteEqCalls: Array<[string, unknown]>;
  let funnelRows: Record<string, unknown>[];

  function buildSupabaseMock() {
    const websitesQuery: {
      select: jest.Mock;
      eq: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((field: string, value: unknown) => {
        websiteEqCalls.push([field, value]);
        return websitesQuery;
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "22222222-2222-4222-8222-222222222222",
          account_id: "11111111-1111-4111-8111-111111111111",
        },
        error: null,
      }),
    };

    const funnelQuery: {
      insert: jest.Mock;
      select: jest.Mock;
      maybeSingle: jest.Mock;
    } = {
      insert: jest.fn((payload: Record<string, unknown>) => {
        funnelRows.push(payload);
        return funnelQuery;
      }),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { event_id: "a".repeat(64) },
        error: null,
      }),
    };

    return {
      from: jest.fn((table: string) => {
        if (table === "websites") return websitesQuery;
        if (table === "funnel_events") return funnelQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    websiteEqCalls = [];
    funnelRows = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    (createClient as jest.Mock).mockReturnValue(buildSupabaseMock());
  });

  it("resolves custom-domain beacons from source_url and writes a durable funnel event", async () => {
    const mod = await import("@/app/api/growth/events/whatsapp-cta/route");
    const response = await mod.POST(
      request({
        reference_code: "CTA-3004-ABCD",
        source_url:
          "https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=FB123",
        page_path:
          "/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=FB123",
        referrer: "https://facebook.com/",
        location_context: "sticky_bar",
        occurred_at: "2026-04-30T15:00:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    expect(websiteEqCalls).toEqual(
      expect.arrayContaining([
        ["status", "published"],
        ["custom_domain", "colombiatours.travel"],
      ]),
    );
    expect(funnelRows).toHaveLength(1);
    expect(funnelRows[0]).toMatchObject({
      event_id: "a".repeat(64),
      event_name: "whatsapp_cta_click",
      stage: "activation",
      channel: "whatsapp",
      reference_code: "CTA-3004-ABCD",
      account_id: "11111111-1111-4111-8111-111111111111",
      website_id: "22222222-2222-4222-8222-222222222222",
      locale: "es-CO",
      market: "CO",
      occurred_at: "2026-04-30T15:00:00.000Z",
      source_url:
        "https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=FB123",
      page_path:
        "/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=FB123",
    });
    expect(funnelRows[0].attribution).toMatchObject({
      channel: "meta",
      reference_code: "CTA-3004-ABCD",
      source_url:
        "https://colombiatours.travel/paquetes-a-colombia-todo-incluido-en-9-dias?utm_source=meta&fbclid=FB123",
      page_path: "/paquetes-a-colombia-todo-incluido-en-9-dias",
      utm: expect.objectContaining({ utm_source: "meta" }),
      click_ids: expect.objectContaining({ fbclid: "FB123" }),
    });
  });

  it("keeps subdomain resolution for bukeer.com tenants", async () => {
    const mod = await import("@/app/api/growth/events/whatsapp-cta/route");
    await mod.POST(
      request({
        reference_code: "CTA-3004-WXYZ",
        source_url: "https://colombiatours.bukeer.com/paquetes/demo",
        page_path: "/paquetes/demo",
        occurred_at: "2026-04-30T15:00:00.000Z",
      }),
    );

    expect(websiteEqCalls).toEqual(
      expect.arrayContaining([
        ["status", "published"],
        ["subdomain", "colombiatours"],
      ]),
    );
  });

  it("sends a Meta CAPI Contact event when the browser provides a dedupe id", async () => {
    const mod = await import("@/app/api/growth/events/whatsapp-cta/route");
    await mod.POST(
      request(
        {
          reference_code: "CTA-3004-CAPI",
          source_url:
            "https://colombiatours.travel/paquetes/demo?utm_source=meta&fbclid=FB123",
          page_path: "/paquetes/demo?utm_source=meta&fbclid=FB123",
          referrer: "https://facebook.com/",
          location_context: "hero",
          package_slug: "demo",
          contact_event_id: "CTA-3004-CAPI:contact",
          fbp: "fb.1.1714480000.123456789",
          fbc: "fb.1.1714480000.FB123",
          occurred_at: "2026-04-30T15:00:00.000Z",
        },
        {
          "user-agent": "Jest Browser",
          "x-forwarded-for": "203.0.113.9",
        },
      ),
    );

    expect(sendMetaConversionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "Contact",
        eventId: "CTA-3004-CAPI:contact",
        actionSource: "website",
        eventSourceUrl:
          "https://colombiatours.travel/paquetes/demo?utm_source=meta&fbclid=FB123",
        accountId: "11111111-1111-4111-8111-111111111111",
        websiteId: "22222222-2222-4222-8222-222222222222",
        userData: expect.objectContaining({
          externalId: "CTA-3004-CAPI",
          fbp: "fb.1.1714480000.123456789",
          fbc: "fb.1.1714480000.FB123",
          clientIpAddress: "203.0.113.9",
          clientUserAgent: "Jest Browser",
        }),
        customData: expect.objectContaining({
          package_slug: "demo",
          reference_code: "CTA-3004-CAPI",
        }),
      }),
      expect.objectContaining({ supabase: expect.any(Object) }),
    );
  });
});
