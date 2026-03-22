import { Metadata } from 'next';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { SectionRenderer } from '@/components/site/section-renderer';
import { notFound } from 'next/navigation';
import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
import { generateHreflangLinks } from '@/lib/seo/hreflang';

// ISR: Revalidate every 5 minutes for fresh content with edge caching
export const revalidate = 300;

interface SitePageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: 'Sitio no encontrado' };

  const baseUrl = `https://${subdomain}.bukeer.com`;
  const hreflangLinks = generateHreflangLinks(baseUrl, '/');
  const languages: Record<string, string> = {};
  for (const link of hreflangLinks) {
    languages[link.hreflang] = link.href;
  }

  return {
    title: website.content.seo?.title || website.content.siteName,
    description: website.content.seo?.description || website.content.tagline,
    alternates: {
      canonical: baseUrl,
      languages,
    },
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  // Generate base URL for schema
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;

  // Generate JSON-LD schemas (Organization, WebSite, Breadcrumb, FAQ if exists)
  const schemas = generateHomepageSchemas(website, baseUrl);

  // Get sections sorted by display_order (RPC already filters is_enabled=true)
  const enabledSections = (website.sections || [])
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />

      {enabledSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
