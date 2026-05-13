import { NextRequest, NextResponse } from "next/server";
import { getWebsiteBySubdomain } from "@/lib/supabase/get-website";
import {
  buildSitemapUrls,
  generateSitemapXml,
  localizeSitemapUrlsForLocale,
} from "@/lib/seo/sitemap";
import {
  extractWebsiteLocaleSettings,
  normalizeLocale,
  normalizeWebsiteLocales,
} from "@/lib/seo/locale-routing";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
  targetLocale: string,
) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return new NextResponse("Website not found", { status: 404 });
  }

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  const localeSettings = normalizeWebsiteLocales(
    extractWebsiteLocaleSettings(website),
  );
  const normalizedTarget = normalizeLocale(
    targetLocale,
    localeSettings.defaultLocale,
  );

  if (!localeSettings.supportedLocales.includes(normalizedTarget)) {
    return new NextResponse("Locale not found", { status: 404 });
  }

  const localeContext = { baseUrl, settings: localeSettings };
  const urls = await buildSitemapUrls(subdomain, website.id, baseUrl);
  const localizedUrls = localizeSitemapUrlsForLocale(
    urls,
    normalizedTarget,
    localeContext,
  );
  const xml = generateSitemapXml(localizedUrls, localeContext);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
