import { Metadata } from "next";
import { getWebsiteBySubdomain } from "@/lib/supabase/get-website";
import { resolvePublicMetadataLocale } from "@/lib/seo/public-metadata";
import { SearchPageClient } from "./search-client";

interface SearchPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  params,
}: SearchPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const baseUrl = website?.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = website
    ? await resolvePublicMetadataLocale(website, "/buscar")
    : null;

  return {
    title: 'Buscar',
    description: website
      ? `Busca destinos, hoteles, actividades y paquetes en ${website.content?.account?.name || website.content?.siteName || subdomain}`
      : `Busca destinos, hoteles, actividades y paquetes en ${subdomain}`,
    alternates: localeContext
      ? {
          canonical: `${baseUrl}${localeContext.localizedPathname}`,
        }
      : undefined,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { subdomain } = await params;
  const { q } = await searchParams;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) return null;

  return (
    <SearchPageClient
      subdomain={subdomain}
      initialQuery={q || ""}
      website={website}
    />
  );
}
