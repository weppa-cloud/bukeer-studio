import { NextRequest, NextResponse } from "next/server";
import { config, middlewareInternals } from "@/middleware";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("public site cache headers", () => {
  it("keeps auth pages inside middleware so en subdomain canonical redirects still run", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/login")).toBe(true);
    expect(matcher.test("/forgot-password")).toBe(true);
    expect(matcher.test("/reset-password")).toBe(true);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
  });

  it("adds shared edge cache headers for cacheable public tenant HTML", () => {
    const request = makeRequest("https://colombiatours.travel/");
    const response = NextResponse.rewrite(
      new URL("https://colombiatours.travel/site/colombiatours/"),
    );

    const finalized = middlewareInternals.finalizePublicSiteResponse(
      request,
      response,
      {},
    );

    expect(finalized.headers.get("Cache-Control")).toBe(
      middlewareInternals.PUBLIC_HTML_CACHE_CONTROL,
    );
  });

  it("does not cache click-id landing requests that persist attribution cookies", () => {
    const request = makeRequest("https://colombiatours.travel/?gclid=test-123");
    const response = NextResponse.rewrite(
      new URL("https://colombiatours.travel/site/colombiatours/"),
    );

    const finalized = middlewareInternals.finalizePublicSiteResponse(
      request,
      response,
      { gclid: "test-123" },
    );

    expect(finalized.headers.get("Cache-Control")).toBeNull();
    expect(finalized.headers.get("set-cookie")).toContain("bk_gclid=test-123");
  });

  it("redirects cache-bust-only URLs to the clean canonical URL", () => {
    const request = makeRequest(
      "https://colombiatours.travel/blog/donde-queda-bora-bora-discovering-the-allure?nocache=1773759669",
    );

    const redirect =
      middlewareInternals.redirectWithoutCacheBustQueryParams(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("location")).toBe(
      "https://colombiatours.travel/blog/donde-queda-bora-bora-discovering-the-allure",
    );
  });

  it("strips cache-bust params while preserving attribution query params", () => {
    const request = makeRequest(
      "https://colombiatours.travel/paquetes?nocache=1773759669&gclid=test-123&utm_source=google",
    );

    const redirect =
      middlewareInternals.redirectWithoutCacheBustQueryParams(request);
    const location = new URL(redirect?.headers.get("location") ?? "");

    expect(redirect?.status).toBe(301);
    expect(location.searchParams.has("nocache")).toBe(false);
    expect(location.searchParams.get("gclid")).toBe("test-123");
    expect(location.searchParams.get("utm_source")).toBe("google");
  });

  it("does not cache public responses that already set cookies", () => {
    const request = makeRequest("https://colombiatours.travel/");
    const response = NextResponse.next();
    response.cookies.set("session", "abc", { path: "/" });

    const finalized = middlewareInternals.finalizePublicSiteResponse(
      request,
      response,
      {},
    );

    expect(finalized.headers.get("Cache-Control")).toBeNull();
  });

  it("keeps /site preview responses noindex and no-store", () => {
    const response = middlewareInternals.applySitePreviewHeaders(
      new NextResponse("Preview token required", { status: 401 }),
    );

    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
  });
});
