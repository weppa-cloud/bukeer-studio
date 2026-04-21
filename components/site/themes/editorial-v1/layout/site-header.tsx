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
import { Logo } from '../primitives/logo';
import { Icons } from '../primitives/icons';
import { MobileNavToggle } from './site-header.client';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface EditorialSiteHeaderProps {
  website: WebsiteData;
  navigation?: NavigationItem[];
  isCustomDomain?: boolean;
}

const DEFAULT_NAV_LABELS = {
  destinos: 'Destinos',
  paquetes: 'Paquetes',
  experiencias: 'Experiencias',
  planners: 'Travel Planners',
  blog: 'Blog',
};

export function EditorialSiteHeader({
  website,
  navigation,
  isCustomDomain = false,
}: EditorialSiteHeaderProps) {
  const { content, subdomain } = website;
  const basePath = getBasePath(subdomain, isCustomDomain);
  const siteName = content.account?.name || content.siteName;
  const logoUrl = content.account?.logo || content.logo || null;

  // Fallback to designer canonical nav labels if no navigation prop is passed.
  const fallbackNav: NavigationItem[] = [
    { slug: 'destinations', label: DEFAULT_NAV_LABELS.destinos, page_type: 'anchor', href: `${basePath}/#destinations`, target: '_self' },
    { slug: 'packages', label: DEFAULT_NAV_LABELS.paquetes, page_type: 'anchor', href: `${basePath}/#packages`, target: '_self' },
    { slug: 'experiences', label: DEFAULT_NAV_LABELS.experiencias, page_type: 'anchor', href: `${basePath}/#activities`, target: '_self' },
    { slug: 'planners', label: DEFAULT_NAV_LABELS.planners, page_type: 'custom', href: `${basePath}/planners`, target: '_self' },
    { slug: 'blog', label: DEFAULT_NAV_LABELS.blog, page_type: 'custom', href: `${basePath}/blog`, target: '_self' },
  ];
  const navItems = navigation && navigation.length > 0 ? navigation : fallbackNav;

  // TODO(editorial-v1 wave 2): read `website.contact_whatsapp` once the
  // column ships. For now, reuse the existing `content.social.whatsapp`.
  const whatsappRaw = content.social?.whatsapp || content.account?.phone || '';
  const whatsappHref = whatsappRaw
    ? `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, '')}`
    : `${basePath}/#cta`;
  const whatsappExternal = Boolean(whatsappRaw);

  const mobilePanelId = 'ev-nav-mobile-panel';

  return (
    <header className="ev-header" data-screen-label="Header">
      <div className="ev-container">
        <div className="nav nav-inner">
          <Link href={`${basePath}/`} className="nav-logo" aria-label={siteName}>
            <Logo
              imageUrl={logoUrl}
              name={siteName}
              showTagline={true}
            />
          </Link>

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
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="nav-cta">
            <a
              href={whatsappHref}
              target={whatsappExternal ? '_blank' : undefined}
              rel={whatsappExternal ? 'noopener noreferrer' : undefined}
              className="btn btn-ink btn-sm"
            >
              {editorialText('editorialHeaderQuoteCta')}
              <Icons.arrow size={14} />
            </a>
            <MobileNavToggle
              panelId={mobilePanelId}
              openLabel={editorialText('editorialHeaderMenuOpen')}
              closeLabel={editorialText('editorialHeaderMenuClose')}
            />
          </div>
        </div>

        {/* Mobile menu panel — toggled by MobileNavToggle via .open class */}
        <div
          id={mobilePanelId}
          className="nav-mobile-panel"
          aria-label={editorialText('editorialHeaderMobileMenuAria')}
        >
          {navItems.map((link) => {
            const href = resolveNavHref(link, basePath);
            return (
              <Link
                key={`m-${link.slug}`}
                href={href}
                target={link.target === '_blank' ? '_blank' : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={whatsappHref}
            target={whatsappExternal ? '_blank' : undefined}
            rel={whatsappExternal ? 'noopener noreferrer' : undefined}
            className="btn btn-accent btn-sm"
            style={{ marginTop: 8, justifyContent: 'center' }}
          >
            <Icons.whatsapp size={16} />
            {editorialText('editorialHeaderQuoteCta')}
          </a>
        </div>
      </div>
    </header>
  );
}
