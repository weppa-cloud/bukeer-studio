import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getWebsiteBySubdomain, type WebsiteData } from '@/lib/supabase/get-website';
import { getWebsiteNavigation } from '@/lib/supabase/get-pages';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { SmoothScroll } from '@/components/ui/smooth-scroll';
import { GoogleTagManager, GoogleTagManagerBody } from '@/components/analytics/google-tag-manager';
import { buildNavTree, getDefaultNavigation } from '@/lib/utils/navigation';
import { getBasePath } from '@/lib/utils/base-path';
import type { ThemeInput } from '@/lib/theme/m3-theme-provider';
import { resolvePublicMetadataLocale } from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { WebsiteLocaleProvider } from '@/components/site/website-locale-provider';
import { resolveTemplateSet } from '@/lib/sections/template-set';
import {
  EditorialSiteHeader,
  EditorialSiteFooter,
  WaflowProvider,
} from '@/components/site/themes/editorial-v1';
import '@/app/globals.css';
// Editorial-v1 scoped CSS loads alongside globals but only emits rules under
// `[data-template-set="editorial-v1"]`, so generic sites stay untouched.
import '@/components/site/themes/editorial-v1/editorial-v1.css';

interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

function getInitialTheme(theme: { tokens: Record<string, unknown>; profile: Record<string, unknown> } | null | undefined): ThemeInput | undefined {
  if (!theme?.tokens || !theme?.profile) return undefined;
  return {
    tokens: theme.tokens as ThemeInput['tokens'],
    profile: theme.profile as ThemeInput['profile'],
  };
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
  const seoContent = content.seo as Record<string, unknown> | undefined;
  const siteName = content.account?.name || content.siteName;
  const description = content?.seo?.description
    || content?.tagline
    || `${content?.siteName || subdomain} - Tu agencia de viajes de confianza`;
  const localeContext = await resolvePublicMetadataLocale(website, '/');

  // Resolve og:image from: seo.image > hero backgroundImage > account logo
  const heroSection = website.sections?.find(
    (s: { section_type: string; is_enabled: boolean }) => s.section_type === 'hero' && s.is_enabled
  );
  const ogImage =
    (seoContent?.image as string | undefined) ||
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
      locale: localeToOgLocale(localeContext.resolvedLocale),
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
  const localeContext = await resolvePublicMetadataLocale(website, '/');
  const basePath = getBasePath(subdomain, false);
  const navigation = navItems.length > 0
    ? buildNavTree(navItems)
    : getDefaultNavigation(website.sections, basePath);
  const websiteWithEffectiveTheme = website as typeof website & {
    effective_theme?: { tokens: Record<string, unknown>; profile: Record<string, unknown> };
  };
  const initialTheme = getInitialTheme(websiteWithEffectiveTheme.effective_theme ?? website.theme);
  // Wave 1.1 plumbing: resolve opt-in template set (editorial-v1). When null we
  // skip the wrapper entirely to preserve byte-identical HTML for generic sites.
  // Wave 1.2: swap header/footer for the editorial variants when opted in.
  const templateSet = resolveTemplateSet(website);
  const isEditorial = templateSet === 'editorial-v1';

  const headerEl = isEditorial ? (
    <EditorialSiteHeader website={website} navigation={navigation} />
  ) : (
    <SiteHeader website={website} navigation={navigation} />
  );
  const footerEl = isEditorial ? (
    <EditorialSiteFooter website={website} navigation={navigation} />
  ) : (
    <SiteFooter website={website} navigation={navigation} />
  );

  const smoothScrollContent = (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        {/* GTM NoScript fallback */}
        <GoogleTagManagerBody analytics={website.analytics} />

        <Suspense fallback={null}>
          {headerEl}
        </Suspense>
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
        {footerEl}
      </div>
    </SmoothScroll>
  );

  // Resolve WhatsApp business number for the editorial waflow provider. The
  // Wave 2 schema adds `websites.contact_whatsapp` (preferred); we fall back
  // to the legacy `content.social.whatsapp` while tenants migrate.
  const websiteRecord = website as WebsiteData & { contact_whatsapp?: string | null };
  const waflowBusinessNumber =
    websiteRecord.contact_whatsapp ||
    website.content?.social?.whatsapp ||
    website.content?.account?.phone ||
    '';

  const templatedBody = isEditorial ? (
    <WaflowProvider
      businessNumber={waflowBusinessNumber}
      subdomain={subdomain}
      responseTime="3 min"
    >
      {smoothScrollContent}
    </WaflowProvider>
  ) : (
    smoothScrollContent
  );

  return (
    <WebsiteLocaleProvider locale={localeContext.resolvedLocale}>
      <M3ThemeProvider initialTheme={initialTheme}>
        {/* Google Tag Manager and Analytics Scripts */}
        <GoogleTagManager analytics={website.analytics} />

        {templateSet ? (
          <div data-template-set={templateSet}>{templatedBody}</div>
        ) : (
          templatedBody
        )}
      </M3ThemeProvider>
    </WebsiteLocaleProvider>
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
