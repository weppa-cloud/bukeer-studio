import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ host: string }> },
  targetLocale: string,
) {
  const { host } = await params;
  const normalizedHost = host.toLowerCase().replace(/\.$/, "");

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, subdomain, custom_domain, status, default_locale, supported_locales",
    )
    .eq("custom_domain", normalizedHost)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!website) {
    return new NextResponse("Website not found", { status: 404 });
  }

  const baseUrl = `https://${normalizedHost}`;
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
  const urls = await buildSitemapUrls(website.subdomain, website.id, baseUrl);
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
