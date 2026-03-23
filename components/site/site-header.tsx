'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { resolveNavHref } from '@/lib/utils/navigation';
import type { NavigationItem, HeaderCTA, HeaderVariant, SiteParts } from '@bukeer/website-contract';

interface SiteHeaderProps {
  website: WebsiteData;
  isCustomDomain?: boolean;
  navigation?: NavigationItem[];
}

export function SiteHeader({ website, isCustomDomain = false, navigation }: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const { content, theme: siteTheme, subdomain, site_parts: siteParts } = website;
  const profile = siteTheme?.profile as Record<string, unknown> | undefined;
  const layout = profile?.layout as Record<string, string> | undefined;
  const navStyle = layout?.navStyle || 'sticky';
  const basePath = getBasePath(subdomain, isCustomDomain);

  const siteName = content.account?.name || content.siteName;
  const siteLogo = content.account?.logo || content.logo;

  const headerVariant: HeaderVariant = siteParts?.header?.variant || 'left-logo';
  const shrinkOnScroll = siteParts?.header?.shrinkOnScroll ?? false;

  // Fallback to hardcoded links if no navigation prop
  const navLinks: NavigationItem[] = navigation || [
    { slug: '', label: 'Inicio', page_type: 'custom', href: `${basePath}/`, target: '_self' },
    { slug: 'destinations', label: 'Destinos', page_type: 'anchor', href: `${basePath}/#destinations`, target: '_self' },
    { slug: 'hotels', label: 'Hoteles', page_type: 'anchor', href: `${basePath}/#hotels`, target: '_self' },
    { slug: 'blog', label: 'Blog', page_type: 'custom', href: `${basePath}/blog`, target: '_self' },
    { slug: 'contact', label: 'Contacto', page_type: 'anchor', href: `${basePath}/#contact`, target: '_self' },
  ];

  const headerCta: HeaderCTA | undefined = content.headerCta;

  // Shrink-on-scroll
  useEffect(() => {
    if (!shrinkOnScroll || navStyle !== 'sticky') return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [shrinkOnScroll, navStyle]);

  // Nav style → CSS classes
  const headerBaseClasses: Record<string, string> = {
    sticky: 'sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b',
    static: 'bg-background border-b',
    transparent: 'absolute top-0 left-0 right-0 z-50 bg-transparent',
    hidden: 'hidden',
  };

  // Transparent-hero variant forces transparent nav style
  const effectiveNavStyle = headerVariant === 'transparent-hero' ? 'transparent' : navStyle;
  const headerClass = `${headerBaseClasses[effectiveNavStyle] || headerBaseClasses.sticky} transition-all duration-300`;
  const navHeight = scrolled ? 'h-14' : 'h-16 lg:h-20';

  // Shared components
  const Logo = (
    <Link href={`${basePath}/`} className="flex items-center gap-3 shrink-0">
      {siteLogo ? (
        <img src={siteLogo} alt={siteName} className={`${scrolled ? 'h-8' : 'h-10'} w-auto object-contain transition-all duration-300`} />
      ) : (
        <span className={`${scrolled ? 'text-lg' : 'text-xl'} font-bold transition-all duration-300`}>{siteName}</span>
      )}
    </Link>
  );

  const ThemeToggle = (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      aria-label="Cambiar tema"
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );

  const BurgerButton = (
    <button
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      className={`${headerVariant === 'minimal-burger' ? '' : 'lg:hidden'} p-2 rounded-lg hover:bg-muted transition-colors`}
      aria-label="Menu"
    >
      {mobileMenuOpen ? (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </button>
  );

  // Desktop nav links renderer
  const DesktopNav = (
    <div className="hidden lg:flex items-center gap-8">
      {navLinks.map((link) => {
        const href = resolveNavHref(link, basePath);
        const hasChildren = link.children && link.children.length > 0;

        if (hasChildren) {
          return (
            <div
              key={link.slug}
              className="relative group"
              onMouseEnter={() => setOpenDropdown(link.slug)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                {link.label}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openDropdown === link.slug && (
                <div className="absolute top-full left-0 pt-2 min-w-48 z-50">
                  <div className="bg-background border rounded-lg shadow-lg py-1">
                    <Link href={href} className="block px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">{link.label}</Link>
                    <div className="border-t mx-2 my-1" />
                    {link.children!.map((child) => (
                      <Link key={child.slug} href={resolveNavHref(child, basePath)} target={child.target === '_blank' ? '_blank' : undefined} rel={child.target === '_blank' ? 'noopener noreferrer' : undefined} className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{child.label}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <Link key={link.slug} href={href} target={link.target === '_blank' ? '_blank' : undefined} rel={link.target === '_blank' ? 'noopener noreferrer' : undefined} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
        );
      })}
    </div>
  );

  // Mobile menu (shared across all variants)
  const MobileMenu = mobileMenuOpen && (
    <div className={`${headerVariant === 'minimal-burger' ? '' : 'lg:hidden'} border-t bg-background`}>
      <nav className="container py-4 flex flex-col gap-2">
        {navLinks.map((link) => {
          const href = resolveNavHref(link, basePath);
          const hasChildren = link.children && link.children.length > 0;
          return (
            <div key={link.slug}>
              <Link href={href} onClick={() => !hasChildren && setMobileMenuOpen(false)} className="py-3 px-4 rounded-lg text-sm font-medium hover:bg-muted transition-colors block">{link.label}</Link>
              {hasChildren && (
                <div className="pl-6">
                  {link.children!.map((child) => (
                    <Link key={child.slug} href={resolveNavHref(child, basePath)} onClick={() => setMobileMenuOpen(false)} target={child.target === '_blank' ? '_blank' : undefined} className="py-2 px-4 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors block">{child.label}</Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-4 pt-4 border-t mt-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 rounded-lg hover:bg-muted transition-colors">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button>
        </div>
        <div className="pt-2"><HeaderCtaButton cta={headerCta} content={content} /></div>
      </nav>
    </div>
  );

  // --- VARIANT LAYOUTS ---

  // left-logo (default) + transparent-hero: [Logo] — [Nav] — [ThemeToggle + CTA]
  if (headerVariant === 'left-logo' || headerVariant === 'transparent-hero') {
    return (
      <header className={headerClass}>
        <nav className={`container flex items-center justify-between ${navHeight} transition-all duration-300`}>
          {Logo}
          <div className="hidden lg:flex items-center gap-8">
            {DesktopNav}
            {ThemeToggle}
            <HeaderCtaButton cta={headerCta} content={content} />
          </div>
          {BurgerButton}
        </nav>
        {MobileMenu}
      </header>
    );
  }

  // centered-logo: [Nav left] — [Logo] — [Nav right + ThemeToggle + CTA]
  if (headerVariant === 'centered-logo') {
    const mid = Math.ceil(navLinks.length / 2);
    const leftNav = navLinks.slice(0, mid);
    const rightNav = navLinks.slice(mid);

    return (
      <header className={headerClass}>
        <nav className={`container flex items-center justify-between ${navHeight} transition-all duration-300`}>
          {/* Left nav */}
          <div className="hidden lg:flex items-center gap-6 flex-1">
            {leftNav.map((link) => (
              <Link key={link.slug} href={resolveNavHref(link, basePath)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
            ))}
          </div>
          {/* Center logo */}
          <div className="flex-shrink-0">{Logo}</div>
          {/* Right nav + actions */}
          <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
            {rightNav.map((link) => (
              <Link key={link.slug} href={resolveNavHref(link, basePath)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
            ))}
            {ThemeToggle}
            <HeaderCtaButton cta={headerCta} content={content} />
          </div>
          {BurgerButton}
        </nav>
        {MobileMenu}
      </header>
    );
  }

  // split: [Logo + Nav] — [CTA + Social + ThemeToggle]
  if (headerVariant === 'split') {
    return (
      <header className={headerClass}>
        <nav className={`container flex items-center justify-between ${navHeight} transition-all duration-300`}>
          <div className="flex items-center gap-8">
            {Logo}
            {DesktopNav}
          </div>
          <div className="hidden lg:flex items-center gap-4">
            {ThemeToggle}
            <HeaderCtaButton cta={headerCta} content={content} />
          </div>
          {BurgerButton}
        </nav>
        {MobileMenu}
      </header>
    );
  }

  // minimal-burger: [Logo] — [Burger] (always, even on desktop)
  if (headerVariant === 'minimal-burger') {
    return (
      <header className={headerClass}>
        <nav className={`container flex items-center justify-between ${navHeight} transition-all duration-300`}>
          {Logo}
          <div className="flex items-center gap-4">
            {ThemeToggle}
            <HeaderCtaButton cta={headerCta} content={content} />
            {BurgerButton}
          </div>
        </nav>
        {MobileMenu}
      </header>
    );
  }

  // Fallback: left-logo
  return (
    <header className={headerClass}>
      <nav className={`container flex items-center justify-between ${navHeight} transition-all duration-300`}>
        {Logo}
        <div className="hidden lg:flex items-center gap-8">
          {DesktopNav}
          {ThemeToggle}
          <HeaderCtaButton cta={headerCta} content={content} />
        </div>
        {BurgerButton}
      </nav>
      {MobileMenu}
    </header>
  );
}

/** Header CTA button — configurable or fallback to WhatsApp */
function HeaderCtaButton({ cta, content }: { cta?: HeaderCTA; content: WebsiteData['content'] }) {
  if (cta?.enabled && cta.label && cta.href) {
    const isExternal = cta.variant === 'whatsapp' || cta.href.startsWith('http');
    const ctaClasses = cta.variant === 'outline'
      ? 'inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors'
      : 'inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors';
    return (
      <a href={cta.href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined} className={ctaClasses}>
        {cta.icon === 'whatsapp' && <WhatsAppIcon className="w-4 h-4" />}
        {cta.icon === 'phone' && <PhoneIcon className="w-4 h-4" />}
        {cta.icon === 'mail' && <MailIcon className="w-4 h-4" />}
        {cta.icon === 'calendar' && <CalendarIcon className="w-4 h-4" />}
        {cta.label}
      </a>
    );
  }
  if (content.social?.whatsapp) {
    return (
      <a href={`https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
        <WhatsAppIcon className="w-4 h-4" />Contactanos
      </a>
    );
  }
  return null;
}

// Icons
function WhatsAppIcon({ className }: { className?: string }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>; }
function PhoneIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>; }
function MailIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function CalendarIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
