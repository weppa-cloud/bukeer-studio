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
import { compileTheme } from '@bukeer/theme-sdk';
import type { DesignTokens, ThemeProfile } from '@bukeer/theme-sdk';
import { resolvePublicMetadataLocale } from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveSiteIcons } from '@/lib/seo/site-icons';
import { WebsiteLocaleProvider } from '@/components/site/website-locale-provider';
import { resolveTemplateSet } from '@/lib/sections/template-set';
import { headers } from 'next/headers';
import { isLandingPage } from '@/lib/utils/landing-pages';
import { normalizeThemeInput } from '@/lib/theme/normalize-theme';
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

interface ThemeOutput {
  css: string;
  fontUrls: string[];
}

/**
 * Compute bridge CSS variables server-side by deriving them from the compiled
 * light-mode token map, mirroring `applyBridgeVariables` in m3-theme-provider.
 * Returns an array of `--name:value` strings ready to inject into `:root{}`.
 */
function computeBridgeVars(lightVars: Array<{ name: string; value: string }>): string[] {
  const m = new Map(lightVars.map((v) => [v.name, v.value]));
  const bg = m.get('background') || '';
  const card = m.get('card') || '';
  const fg = m.get('foreground') || '';
  const primary = m.get('primary') || '';
  const primaryFg = m.get('primary-foreground') || '';
  const accent = m.get('accent') || '';
  const accent2 = m.get('accent-2') || '';
  const accent3 = m.get('accent-3') || '';
  const mutedFg = m.get('muted-foreground') || '';
  const border = m.get('border') || '';
  if (!bg) return [];
  return [
    `--bg:hsl(${bg})`,
    `--bg-card:hsl(${card})`,
    `--accent:hsl(${primary})`,
    `--accent-hover:hsl(${primary} / 0.8)`,
    `--accent-text:hsl(${primaryFg})`,
    `--text-heading:hsl(${fg})`,
    `--text-primary:hsl(${fg})`,
    `--text-secondary:hsl(${mutedFg})`,
    `--text-muted:hsl(${mutedFg} / 0.7)`,
    `--border-subtle:hsl(${border} / 0.5)`,
    `--border-medium:hsl(${border})`,
    `--card-badge-bg:hsl(${bg} / 0.7)`,
    `--card-badge-border:hsl(${border} / 0.5)`,
    `--card-badge-text:hsl(${mutedFg})`,
    `--card-gradient:hsl(${card} / 0.6)`,
    `--card-meta:hsl(${mutedFg} / 0.7)`,
    `--nav-bg-scroll:hsl(${bg} / 0.8)`,
    `--nav-link:hsl(${mutedFg})`,
    `--nav-link-hover:hsl(${fg})`,
    `--nav-link-hover-bg:hsl(${fg} / 0.06)`,
    `--stat-border:hsl(${border} / 0.3)`,
    `--spotlight-color:hsl(${primary} / 0.08)`,
    `--c-primary:hsl(${primary})`,
    `--c-primary-ink:hsl(${primaryFg})`,
    `--c-accent:hsl(${accent || primary})`,
    `--c-accent-2:hsl(${accent2 || accent || primary})`,
    `--c-accent-3:hsl(${accent3 || accent || primary})`,
    `--c-ink:hsl(${fg})`,
    `--c-ink-2:hsl(${mutedFg})`,
    `--c-line:hsl(${border})`,
    `--c-surface:hsl(${card})`,
    `--c-bg:hsl(${bg})`,
    `--text-display-xl:clamp(3rem, 6vw, 6rem)`,
    `--text-display-lg:clamp(2.25rem, 4vw, 4rem)`,
    `--text-display-md:clamp(1.75rem, 3vw, 3rem)`,
    `--font-mono:"DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  ];
}

/**
 * Compile theme tokens into CSS variables + font URLs for server-side injection.
 * Includes invariant vars, light-mode color vars, and pre-computed bridge vars
 * so the client never needs to call `getComputedStyle` or `setProperty` on mount.
 * Also returns Google Fonts URLs so they're discoverable in the initial HTML parse.
 */
function generateThemeOutput(themeInput: ThemeInput | undefined): ThemeOutput {
  if (!themeInput) return { css: '', fontUrls: [] };
  try {
    const compiled = compileTheme(
      themeInput.tokens as DesignTokens,
      themeInput.profile as ThemeProfile,
      { target: 'web' },
    );
    if (!compiled.web) return { css: '', fontUrls: [] };
    const vars: string[] = [];
    for (const v of [...compiled.web.invariant, ...compiled.web.light]) {
      vars.push(`--${v.name}:${v.value}`);
    }
    for (const [k, v] of Object.entries(compiled.web.dataAttributes)) {
      vars.push(`--data-${k}:${v}`);
    }
    vars.push(...computeBridgeVars(compiled.web.light));
    vars.push('--theme-ssr:1');
    const css = vars.length ? `:root{${vars.join(';')}}` : '';
    return { css, fontUrls: compiled.web.fontImports ?? [] };
  } catch {
    return { css: '', fontUrls: [] };
  }
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
  const icons = resolveSiteIcons(website);

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
    ...(icons ? { icons } : {}),
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
  const websiteForRender = {
    ...website,
    resolvedLocale: localeContext.resolvedLocale,
    defaultLocale: localeContext.defaultLocale,
  };
  const basePath = getBasePath(subdomain, false);
  const navigation = navItems.length > 0
    ? buildNavTree(navItems)
    : getDefaultNavigation(website.sections, basePath);
  const websiteWithEffectiveTheme = website as typeof website & {
    effective_theme?: { tokens: Record<string, unknown>; profile: Record<string, unknown> };
  };
  const initialTheme = normalizeThemeInput(
    websiteWithEffectiveTheme.effective_theme ?? website.theme,
    { brandName: website.content?.siteName || website.subdomain },
  );
  const themeOutput = generateThemeOutput(initialTheme);
  const themeCSS = themeOutput.css;

  // Extract hero section background image for early preload hint in <head>.
  // Placing this preload early prevents 5+ second Load Delay caused by the
  // browser discovering it late in the RSC streaming payload (~65% into doc).
  const heroSection = website.sections?.find(
    (s: { section_type: string; is_enabled: boolean }) =>
      s.section_type?.startsWith('hero') && s.is_enabled
  );
  const heroImage = heroSection
    ? ((heroSection.content as Record<string, unknown>)?.backgroundImage as string | undefined)
    : undefined;
  // Wave 1.1 plumbing: resolve opt-in template set (editorial-v1). When null we
  // skip the wrapper entirely to preserve byte-identical HTML for generic sites.
  // Wave 1.2: swap header/footer for the editorial variants when opted in.

  // Detect if current route is a landing page to apply minimalist header/footer
  const headerList = await headers();
  const originalPathname = headerList.get('x-public-original-pathname') || '';
  const isLanding = isLandingPage(originalPathname);

  // Wave 1.1 plumbing: resolve opt-in template set (editorial-v1). When null we
  // skip the wrapper entirely to preserve byte-identical HTML for generic sites.
  // Wave 1.2: swap header/footer for the editorial variants when opted in.
  const templateSet = resolveTemplateSet(website) || (subdomain.toLowerCase().includes('colombiatours') ? 'editorial-v1' : null);
  const isEditorial = templateSet === 'editorial-v1';

  const headerEl = isEditorial ? (
    <EditorialSiteHeader
      website={websiteForRender}
      navigation={navigation}
      isLanding={isLanding}
    />
  ) : (
    <SiteHeader website={websiteForRender} navigation={navigation} />
  );
  const footerEl = isEditorial ? (
    <EditorialSiteFooter
      website={websiteForRender}
      navigation={navigation}
      isLanding={isLanding}
    />
  ) : (
    <SiteFooter website={websiteForRender} navigation={navigation} />
  );

  const smoothScrollContent = (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col">
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
      showFab={!isLanding}
    >
      {smoothScrollContent}
    </WaflowProvider>
  ) : (
    smoothScrollContent
  );

  return (
    <>
      {/* LCP hero image preload — must be first link in <head> to minimize Load Delay */}
      {heroImage ? (
        <link rel="preload" as="image" href={heroImage} fetchPriority="high" />
      ) : null}
      {/* Preconnect to common third-party origins */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* Preconnect to Supabase storage — hero images / assets served from here */}
      <link rel="preconnect" href="https://wzlxbpicdcdvxvdcvgas.supabase.co" crossOrigin="" />
      {/* Inject theme font imports (Google Fonts) */}
      {themeOutput.fontUrls.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
      {/* Inline theme CSS variables (incl. bridge vars) so they're available
          before JS, preventing mount-time style recalculation from delaying LCP. */}
      {themeCSS ? <style dangerouslySetInnerHTML={{ __html: themeCSS }} /> : null}
      {/* SSR sentinel — client reads this to skip re-applying theme on mount */}
      {themeCSS ? <meta name="x-theme-ssr" content="1" /> : null}
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
    </>
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
