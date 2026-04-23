/**
 * editorial-v1 Site Header
 *
 * Server component. Mirrors designer F1 nav: Logo (left) + nav-links (center)
 * + "Cotizar viaje" WhatsApp CTA (right). Mobile hamburger is delegated to
 * the tiny `MobileNavToggle` client leaf.
 *
 * Reads:
 *   - `navigation` → existing `NavigationItem[]` prop (same shape as the
 *      generic `SiteHeader`)
 *   - `website.content.social.whatsapp` → CTA target
 *   - `website.content.account.logo` → logo image URL (falls back to text
 *      wordmark)
 *
 * Does NOT access `website.contact_whatsapp` — that column is not on the
 * current contract (see `.claude/plans/piped-finding-popcorn.md`, schema
 * additions deferred to Wave 2). When no WhatsApp is configured, the CTA
 * falls back to an internal `#cta` anchor and we mark a TODO here.
 */

import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { NavigationItem } from '@bukeer/website-contract';
import { getBasePath } from '@/lib/utils/base-path';
import { resolveNavHref } from '@/lib/utils/navigation';
import { extractWebsiteLocaleSettings } from '@/lib/seo/locale-routing';
import { Logo } from '../primitives/logo';
import { Icons } from '../primitives/icons';
import { HeaderScrollState, MobileNavToggle } from './site-header.client';
import { MarketSwitcher } from './market-switcher';
import { getEditorialTextGetter } from '../i18n';
import { WaflowCTAButton } from '../waflow/cta-button';

export interface EditorialSiteHeaderProps {
  website: WebsiteData;
  navigation?: NavigationItem[];
  isCustomDomain?: boolean;
  isLanding?: boolean;
}

export function EditorialSiteHeader({
  website,
  navigation,
  isCustomDomain = false,
  isLanding = false,
}: EditorialSiteHeaderProps) {
  const editorialText = getEditorialTextGetter(website);
  const localeSettings = extractWebsiteLocaleSettings(website);
  const resolvedLocale = (
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    ?? localeSettings.defaultLocale
  );
  const isEnglish = resolvedLocale.startsWith('en');
  const { content, subdomain } = website;
  const basePath = getBasePath(subdomain, isCustomDomain);
  const siteName = content.account?.name || content.siteName;
  const logoUrl = content.account?.logo || content.logo || null;

  // Fallback to designer canonical nav labels if no navigation prop is passed.
  const fallbackNav: NavigationItem[] = [
    { slug: 'destinations', label: isEnglish ? 'Destinations' : 'Destinos', page_type: 'anchor', href: `${basePath}/#destinations`, target: '_self' },
    { slug: 'packages', label: isEnglish ? 'Packages' : 'Paquetes', page_type: 'anchor', href: `${basePath}/#packages`, target: '_self' },
    { slug: 'experiences', label: isEnglish ? 'Experiences' : 'Experiencias', page_type: 'anchor', href: `${basePath}/#activities`, target: '_self' },
    { slug: 'blog', label: 'Blog', page_type: 'custom', href: `${basePath}/blog`, target: '_self' },
  ];
  const rawNavItems = navigation && navigation.length > 0 ? navigation : fallbackNav;
  const canonicalOrder = ['destinations', 'packages', 'experiences', 'blog'] as const;
  type CanonicalNavKey = (typeof canonicalOrder)[number];
  const toCanonicalNavKey = (item: NavigationItem): CanonicalNavKey | null => {
    const key = `${item.slug} ${item.label} ${item.href ?? ''}`.toLowerCase();
    if (key.includes('destinations') || key.includes('destinos')) return 'destinations';
    if (key.includes('packages') || key.includes('paquetes')) return 'packages';
    if (
      key.includes('experiences')
      || key.includes('experiencias')
      || key.includes('activities')
      || key.includes('actividades')
    ) return 'experiences';
    if (key.includes('blog')) return 'blog';
    return null;
  };
  const navByKey = new Map<CanonicalNavKey, NavigationItem>();
  for (const item of rawNavItems) {
    const key = toCanonicalNavKey(item);
    if (key && !navByKey.has(key)) navByKey.set(key, item);
  }
  for (const item of fallbackNav) {
    const key = toCanonicalNavKey(item);
    if (key && !navByKey.has(key)) navByKey.set(key, item);
  }
  const navItems = canonicalOrder
    .map((key) => navByKey.get(key))
    .filter((item): item is NavigationItem => Boolean(item));
  const navLabelForLocale = (label: string): string => {
    if (!isEnglish) return label;
    const normalized = label.trim().toLowerCase();
    if (normalized === 'destinos') return 'Destinations';
    if (normalized === 'paquetes') return 'Packages';
    if (normalized === 'experiencias') return 'Experiences';
    if (normalized === 'nosotros' || normalized === 'sobre nosotros') return 'About';
    return label;
  };

  // TODO(editorial-v1 wave 2): read `website.contact_whatsapp` once the
  // column ships. For now, reuse the existing `content.social.whatsapp`.
  const whatsappRaw = content.social?.whatsapp || content.account?.phone || '';
  const whatsappHref = whatsappRaw
    ? `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, '')}`
    : `${basePath}/#cta`;
  const whatsappExternal = Boolean(whatsappRaw);
  const headerCtaLabel = whatsappExternal
    ? editorialText('editorialHeaderWhatsappCta')
    : editorialText('editorialHeaderQuoteCta');

  const mobilePanelId = 'ev-nav-mobile-panel';
  const headerId = 'ev-header-root';

  return (
    <header id={headerId} className="ev-header" data-screen-label="Header">
      <HeaderScrollState headerId={headerId} />
      <div className="ev-container">
        <div className="nav nav-inner">
          {!isLanding && (
            <MobileNavToggle
              panelId={mobilePanelId}
              openLabel={editorialText('editorialHeaderMenuOpen')}
              closeLabel={editorialText('editorialHeaderMenuClose')}
            />
          )}

          <Link href={isLanding ? '#top' : `${basePath}/`} className="nav-logo" aria-label={siteName}>
            <Logo
              imageUrl={logoUrl}
              name={siteName}
              showTagline={false}
            />
          </Link>

          {!isLanding && (
            <nav className="nav-links" aria-label={editorialText('editorialHeaderNavAria')}>
              {navItems.map((link) => {
                const href = resolveNavHref(link, basePath);
                return (
                  <Link
                    key={link.slug}
                    href={href}
                    target={link.target === '_blank' ? '_blank' : undefined}
                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                    className="nav-link"
                  >
                    {navLabelForLocale(link.label)}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="nav-cta">
            <div className="nav-market-desktop">
              <MarketSwitcher website={website} />
            </div>
            {whatsappExternal ? (
              <>
                <WaflowCTAButton
                  variant="A"
                  fallbackHref={whatsappHref}
                  className="btn btn-ink btn-sm nav-whatsapp-desktop"
                >
                  <Icons.whatsapp size={16} />
                  {headerCtaLabel}
                  <Icons.arrow size={14} />
                </WaflowCTAButton>
                <WaflowCTAButton
                  variant="A"
                  fallbackHref={whatsappHref}
                  className="nav-whatsapp-mobile"
                >
                  <span className="sr-only">{headerCtaLabel}</span>
                  <Icons.whatsapp size={20} />
                </WaflowCTAButton>
              </>
            ) : (
              <>
                <a
                  href={`${basePath}/#cta`}
                  className="btn btn-ink btn-sm nav-whatsapp-desktop"
                >
                  {headerCtaLabel}
                  <Icons.arrow size={14} />
                </a>
                <a
                  href={`${basePath}/#cta`}
                  className="nav-whatsapp-mobile"
                  aria-label={headerCtaLabel}
                >
                  <Icons.whatsapp size={20} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu panel — toggled by MobileNavToggle via .open class */}
        {!isLanding && (
          <div
            id={mobilePanelId}
            className="nav-mobile-panel"
            aria-label={editorialText('editorialHeaderMobileMenuAria')}
          >
            <div className="nav-mobile-market">
              <MarketSwitcher website={website} />
            </div>
            {navItems.map((link) => {
              const href = resolveNavHref(link, basePath);
              return (
                <Link
                  key={`m-${link.slug}`}
                  href={href}
                  target={link.target === '_blank' ? '_blank' : undefined}
                  className="nav-link"
                >
                  {navLabelForLocale(link.label)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
