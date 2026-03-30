import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getWebsiteNavigation } from '@/lib/supabase/get-pages';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { MobileStickyBar } from '@/components/site/mobile-sticky-bar';
import { SmoothScroll } from '@/components/ui/smooth-scroll';
import { GoogleTagManager, GoogleTagManagerBody } from '@/components/analytics/google-tag-manager';
import { buildNavTree, getDefaultNavigation } from '@/lib/utils/navigation';
import { getBasePath } from '@/lib/utils/base-path';
import '@/app/globals.css';

interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SiteLayoutProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return {
      title: 'Sitio no encontrado',
    };
  }

  const { content } = website;
  const siteName = content.account?.name || content.siteName;
  const description = content?.seo?.description
    || content?.tagline
    || `${content?.siteName || subdomain} - Tu agencia de viajes de confianza`;

  // Resolve og:image from: seo.image > hero backgroundImage > account logo
  const heroSection = website.sections?.find(
    (s: { section_type: string; is_enabled: boolean }) => s.section_type === 'hero' && s.is_enabled
  );
  const ogImage =
    content.seo?.image ||
    (heroSection?.content as Record<string, unknown>)?.backgroundImage ||
    content.account?.logo;

  return {
    title: {
      default: content.seo?.title || siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: Array.isArray(content.seo?.keywords)
      ? content.seo.keywords
      : content.seo?.keywords?.split(',').map((k: string) => k.trim()),
    openGraph: {
      title: content.seo?.title || siteName,
      description,
      siteName: siteName,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage as string }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: content.seo?.title || siteName,
      description,
      ...(ogImage ? { images: [ogImage as string] } : {}),
    },
    robots: {
      index: website.status === 'published',
      follow: website.status === 'published',
    },
  };
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  // If website not found or not published, show 404
  if (!website || website.status !== 'published') {
    notFound();
  }

  // Fetch dynamic navigation (RPC), fallback to section-based defaults
  const navItems = await getWebsiteNavigation(subdomain);
  const basePath = getBasePath(subdomain, false);
  const navigation = navItems.length > 0
    ? buildNavTree(navItems)
    : getDefaultNavigation(website.sections, basePath);

  return (
    <M3ThemeProvider initialTheme={website.theme?.tokens ? { tokens: website.theme.tokens, profile: website.theme.profile } : undefined}>
      {/* Google Tag Manager and Analytics Scripts */}
      <GoogleTagManager analytics={website.analytics} />

      <SmoothScroll>
        <div className="min-h-screen flex flex-col">
          {/* GTM NoScript fallback */}
          <GoogleTagManagerBody analytics={website.analytics} />

          <SiteHeader website={website} navigation={navigation} />
          <main className="flex-1">
            {children}
          </main>
          <SiteFooter website={website} navigation={navigation} />
          <MobileStickyBar website={website} />
        </div>
      </SmoothScroll>
    </M3ThemeProvider>
  );
}

// Generate static paths for all published websites
export async function generateStaticParams() {
  // Import dynamically to avoid issues during build
  const { getAllWebsiteSubdomains } = await import('@/lib/supabase/get-website');
  const subdomains = await getAllWebsiteSubdomains();

  return subdomains.map((subdomain) => ({
    subdomain,
  }));
}

// Revalidate every 5 minutes
export const revalidate = 300;
