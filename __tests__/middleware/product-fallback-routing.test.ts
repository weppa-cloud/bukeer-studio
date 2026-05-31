function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("middleware product fallback routing", () => {
  const originalFetch = global.fetch;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalMainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    process.env.NEXT_PUBLIC_MAIN_DOMAIN = originalMainDomain;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("does not apply slug redirects when a published static product landing exists", async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
    process.env.NEXT_PUBLIC_MAIN_DOMAIN = "bukeer.com";

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/rest/v1/websites?")) {
        return jsonResponse([
          {
            id: "website-colombiatours",
            subdomain: "colombiatours",
            account_id: "account-colombiatours",
            default_locale: "es-CO",
            supported_locales: ["es-CO", "en-US"],
          },
        ]);
      }

      if (url.includes("/rest/v1/rpc/get_website_product_page")) {
        return jsonResponse({ product: null });
      }

      if (
        url.includes("/rest/v1/website_pages?") &&
        url.includes("slug=eq.paquetes%2Fcartagena-medellin")
      ) {
        return jsonResponse([{ id: "page-cartagena-medellin" }]);
      }

      if (url.includes("/rest/v1/slug_redirects?")) {
        return jsonResponse([{ new_slug: "cartagena" }]);
      }

      return jsonResponse([]);
    });
    global.fetch = fetchMock as typeof fetch;

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("@/middleware");

    const response = await middleware(
      new NextRequest("https://colombiatours.travel/paquetes/cartagena-medellin", {
        headers: { host: "colombiatours.travel" },
      }),
    );

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/site/colombiatours/paquetes/cartagena-medellin",
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/rest/v1/slug_redirects?"),
      ),
    ).toBe(false);
  });

  it("does not apply legacy redirects when the product route exists", async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test";
    process.env.NEXT_PUBLIC_MAIN_DOMAIN = "bukeer.com";

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/rest/v1/websites?")) {
        return jsonResponse([
          {
            id: "website-colombiatours",
            subdomain: "colombiatours",
            account_id: "account-colombiatours",
            default_locale: "es-CO",
            supported_locales: ["es-CO", "en-US"],
          },
        ]);
      }

      if (url.includes("/rest/v1/rpc/get_website_product_page")) {
        return jsonResponse({
          product: {
            id: "pkg-cartagena-premium",
            slug: "cartagena-premium-ciudad-amurallada-y-caribe-5-dias",
            type: "package",
          },
        });
      }

      if (url.includes("/rest/v1/website_legacy_redirects?")) {
        return jsonResponse([
          {
            old_path:
              "/paquetes/cartagena-premium-ciudad-amurallada-y-caribe-5-dias",
            new_path: "/cartagena",
            status_code: 301,
          },
        ]);
      }

      return jsonResponse([]);
    });
    global.fetch = fetchMock as typeof fetch;

    const { NextRequest } = await import("next/server");
    const { middleware } = await import("@/middleware");

    const response = await middleware(
      new NextRequest(
        "https://colombiatours.travel/paquetes/cartagena-premium-ciudad-amurallada-y-caribe-5-dias",
        {
          headers: { host: "colombiatours.travel" },
        },
      ),
    );

    expect(response.status).not.toBe(301);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/site/colombiatours/paquetes/cartagena-premium-ciudad-amurallada-y-caribe-5-dias",
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("/rest/v1/website_legacy_redirects?"),
      ),
    ).toBe(false);
  });
});
