import { NextRequest, NextResponse } from "next/server";
import { getWebsiteBySubdomain } from "@/lib/supabase/get-website";
import { buildSitemapUrls, generateSitemapXml } from "@/lib/seo/sitemap";
import { extractWebsiteLocaleSettings } from "@/lib/seo/locale-routing";

/**
 * Legacy sitemap API route — GET /api/sitemap?subdomain=my-agency
 *
 * Kept for backward compatibility (robots.txt files may still reference this URL).
 * New routes: /site/[subdomain]/sitemap.xml and /domain/[host]/sitemap.xml
 */
export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json(
      { error: "subdomain parameter is required" },
      { status: 400 },
    );
  }

  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return new NextResponse("Website not found", { status: 404 });
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const urls = await buildSitemapUrls(subdomain, website.id, baseUrl);
  const localeSettings = extractWebsiteLocaleSettings(website);
  const xml = generateSitemapXml(urls, { baseUrl, settings: localeSettings });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
