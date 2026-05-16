import { Metadata } from "next";
import { getWebsiteBySubdomain } from "@/lib/supabase/get-website";
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from "@/lib/seo/public-metadata";
import { getPublicUiMessages } from "@/lib/site/public-ui-messages";
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
  const siteName = website?.content?.account?.name || subdomain;
  const baseUrl = website?.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = website
    ? await resolvePublicMetadataLocale(website, "/buscar")
    : null;
  const messages = getPublicUiMessages(localeContext?.resolvedLocale);
  const pageTitle = `${messages.searchPage.eyebrow} | ${siteName}`;

  return {
    title: pageTitle,
    description: `${messages.searchPage.initialHint} - ${siteName}`,
    alternates: localeContext
      ? {
          canonical: `${baseUrl}${localeContext.localizedPathname}`,
          languages: buildLocaleAwareAlternateLanguages(
            baseUrl,
            "/buscar",
            localeContext,
          ),
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

  const localeContext = await resolvePublicMetadataLocale(website, "/buscar");
  const localizedWebsite = {
    ...website,
    resolvedLocale: localeContext.resolvedLocale,
  };

  return (
    <SearchPageClient
      subdomain={subdomain}
      initialQuery={q || ""}
      website={localizedWebsite}
    />
  );
}
