import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSitemapIndexXml(baseUrl: string): string {
  const today = new Date().toISOString().split("T")[0];
  const sitemaps = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap-es-CO.xml`,
    `${baseUrl}/sitemap-en-US.xml`,
    `${baseUrl}/sitemap-fr-FR.xml`,
    `${baseUrl}/sitemap-de-DE.xml`,
    `${baseUrl}/sitemap-pt-BR.xml`,
  ];

  const entries = sitemaps
    .map(
      (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ host: string }> },
) {
  const { host } = await params;
  const normalizedHost = host.toLowerCase().replace(/\.$/, "");

  const { data: website } = await supabase
    .from("websites")
    .select("id, custom_domain, status")
    .eq("custom_domain", normalizedHost)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!website) {
    return new NextResponse("Website not found", { status: 404 });
  }

  return new NextResponse(generateSitemapIndexXml(`https://${normalizedHost}`), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
