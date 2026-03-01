import { notFound, redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { StaticPage } from '@/components/pages/static-page';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { GoogleTagManager, GoogleTagManagerBody } from '@/components/analytics/google-tag-manager';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getPageBySlug } from '@/lib/supabase/get-pages';

interface CustomDomainPageProps {
  params: Promise<{ host: string; slug?: string[] }>;
}

async function getWebsiteByCustomDomain(customDomain: string): Promise<WebsiteData | null> {
  // Normalize: lowercase + strip trailing dot (defense-in-depth, middleware also normalizes)
  const normalizedHost = customDomain.toLowerCase().replace(/\.$/, '');

  const { data: website, error } = await supabase
    .from('websites')
    .select(`
      id,
      subdomain,
      custom_domain,
      status,
      theme,
      content,
      analytics,
      template:website_templates (
        id,
        name,
        available_sections
      )
    `)
    .eq('custom_domain', normalizedHost)
    .eq('status', 'published')
    .is('deleted_at', null)
    .single();

  if (error || !website) {
    return null;
  }

  return website as unknown as WebsiteData;
}

export default async function CustomDomainPage({ params }: CustomDomainPageProps) {
  const { host, slug } = await params;
  const decodedHost = decodeURIComponent(host);
  const normalizedHost = decodedHost.toLowerCase().replace(/\.$/, '');

  // Look up website by custom domain
  const website = await getWebsiteByCustomDomain(normalizedHost);

  // Website not found for this custom domain
  if (!website) {
    redirect('https://bukeer.com/domain-not-found');
  }

  // Verify custom domain matches (gate: reject if DB domain doesn't match request)
  const websiteDomain = (website.custom_domain || '').toLowerCase().replace(/\.$/, '');
  if (!websiteDomain || websiteDomain !== normalizedHost) {
    redirect('https://bukeer.com/domain-not-verified');
  }

  // Parse the slug path
  const slugPath = slug?.join('/') || '';

  // Handle blog routes
  if (slugPath === 'blog') {
    // Blog listing page - redirect to subdomain for now
    redirect(`https://${website.subdomain}.bukeer.com/blog`);
  }

  if (slugPath.startsWith('blog/')) {
    // Blog post page - redirect to subdomain for now
    const postSlug = slugPath.replace('blog/', '');
    redirect(`https://${website.subdomain}.bukeer.com/blog/${postSlug}`);
  }

  // Get the page content
  const page = await getPageBySlug(website.subdomain, slugPath || 'home');

  if (!page && slugPath) {
    notFound();
  }

  return (
    <M3ThemeProvider initialTheme={website.theme}>
      {/* Google Tag Manager and Analytics Scripts */}
      <GoogleTagManager analytics={website.analytics} />

      <div className="min-h-screen flex flex-col">
        {/* GTM NoScript fallback */}
        <GoogleTagManagerBody analytics={website.analytics} />

        <SiteHeader website={website} isCustomDomain={true} />
        <main className="flex-1">
          {page && <StaticPage website={website} page={page} />}
        </main>
        <SiteFooter website={website} isCustomDomain={true} />
      </div>
    </M3ThemeProvider>
  );
}

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

// Generate metadata
export async function generateMetadata({ params }: CustomDomainPageProps) {
  const { host } = await params;
  const decodedHost = decodeURIComponent(host);
  const normalizedHost = decodedHost.toLowerCase().replace(/\.$/, '');

  const website = await getWebsiteByCustomDomain(normalizedHost);

  if (!website) {
    return { title: 'Sitio no encontrado' };
  }

  return {
    title: {
      default: website.content.seo?.title || website.content.siteName,
      template: `%s | ${website.content.siteName}`,
    },
    description: website.content.seo?.description || website.content.tagline,
  };
}
