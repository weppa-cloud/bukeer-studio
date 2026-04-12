import { Metadata } from 'next';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getDestinations, getCachedGoogleReviews } from '@/lib/supabase/get-pages';
import { SectionRenderer } from '@/components/site/section-renderer';
import { notFound } from 'next/navigation';
import { JsonLd, generateHomepageSchemas } from '@/lib/schema';
import { generateHreflangLinks } from '@/lib/seo/hreflang';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import type { WebsiteSection } from '@bukeer/website-contract';
import { SECTION_TYPES } from '@bukeer/website-contract';

// Section type constants derived from contract — avoids hardcoded strings
const SECTION_DESTINATIONS = SECTION_TYPES.find((t) => t === 'destinations')!;
const SECTION_TESTIMONIALS = SECTION_TYPES.find((t) => t === 'testimonials')!;

// ISR: Revalidate every 5 minutes for fresh content with edge caching
export const revalidate = 300;

interface SitePageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: 'Sitio no encontrado' };

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const hreflangLinks = generateHreflangLinks(baseUrl, '/');
  const languages: Record<string, string> = {};
  for (const link of hreflangLinks) {
    languages[link.hreflang] = link.href;
  }

  const title = website.content.seo?.title || website.content.siteName || subdomain;
  const description = website.content.seo?.description || website.content.tagline || '';
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const ogImage = resolveOgImage(website);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: baseUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName,
      locale: 'es_ES',
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
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

  // Dynamic destinations for homepage destination section.
  // Uses dynamic source by default and only keeps manual list when `content.source === 'manual'`.
  const dynamicDestinations = await getDestinations(subdomain);
  const curatedDynamicDestinations = dynamicDestinations.filter((d) => d.total > 1);
  const sectionDynamicDestinations = (
    curatedDynamicDestinations.length > 0 ? curatedDynamicDestinations : dynamicDestinations
  ).slice(0, 8);
  const hydratedSections: WebsiteSection[] = enabledSections.map((section) => {
    if (section.section_type !== SECTION_DESTINATIONS) return section;

    const content = (section.content as Record<string, unknown>) || {};
    const source = content.source === 'manual' ? 'manual' : 'dynamic';
    const shouldUseDynamic = source !== 'manual' && sectionDynamicDestinations.length > 0;
    if (!shouldUseDynamic) return section;

    return {
      ...section,
      content: {
        ...content,
        destinations: sectionDynamicDestinations,
      },
    } as WebsiteSection;
  });

  // Dynamic Google Reviews for testimonials section.
  // Uses cached reviews when google_reviews_enabled is true on the account.
  const accountContent = (website.content as Record<string, unknown>)?.account as Record<string, unknown> | undefined;
  const googleReviewsEnabled = accountContent?.google_reviews_enabled === true;

  if (googleReviewsEnabled && website.account_id) {
    const cached = await getCachedGoogleReviews(website.account_id);
    if (cached && cached.reviews.length > 0) {
      const visibleReviews = cached.reviews.filter((r) => r.is_visible !== false);
      for (let i = 0; i < hydratedSections.length; i++) {
        if (hydratedSections[i].section_type !== SECTION_TESTIMONIALS) continue;
        hydratedSections[i] = {
          ...hydratedSections[i],
          content: {
            ...(hydratedSections[i].content as Record<string, unknown>),
            testimonials: visibleReviews.map((r) => ({
              name: r.author_name,
              avatar: r.author_photo,
              text: r.text,
              rating: r.rating,
              location: r.relative_time,
              images: r.images,
              response: r.response,
            })),
            source: 'google_reviews',
            averageRating: cached.average_rating,
            totalReviews: cached.total_reviews,
            googleMapsUrl: cached.google_maps_url,
            businessName: cached.business_name,
          },
        } as WebsiteSection;
      }
    }
  }

  return (
    <>
      {/* JSON-LD Structured Data for SEO and AI crawlers */}
      <JsonLd data={schemas} />

      {hydratedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </>
  );
}
