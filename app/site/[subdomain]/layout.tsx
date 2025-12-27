import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain, WebsiteData } from '@/lib/supabase/get-website';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { GoogleTagManager, GoogleTagManagerBody } from '@/components/analytics/google-tag-manager';
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

  return {
    title: {
      default: content.seo?.title || content.siteName,
      template: `%s | ${content.siteName}`,
    },
    description: content.seo?.description || content.tagline,
    keywords: Array.isArray(content.seo?.keywords)
      ? content.seo.keywords
      : content.seo?.keywords?.split(',').map((k: string) => k.trim()),
    openGraph: {
      title: content.seo?.title || content.siteName,
      description: content.seo?.description || content.tagline,
      siteName: content.siteName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.seo?.title || content.siteName,
      description: content.seo?.description || content.tagline,
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

  return (
    <M3ThemeProvider initialTheme={website.theme}>
      {/* Google Tag Manager and Analytics Scripts */}
      <GoogleTagManager analytics={website.analytics} />

      <div className="min-h-screen flex flex-col">
        {/* GTM NoScript fallback */}
        <GoogleTagManagerBody analytics={website.analytics} />

        <SiteHeader website={website} />
        <main className="flex-1">
          {children}
        </main>
        <SiteFooter website={website} />
      </div>
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
