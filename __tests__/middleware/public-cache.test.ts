import { NextRequest, NextResponse } from "next/server";
import { middlewareInternals } from "@/middleware";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("public site cache headers", () => {
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
