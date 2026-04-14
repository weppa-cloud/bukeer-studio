'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { resolveNavHref } from '@/lib/utils/navigation';
import type { NavigationItem, HeaderCTA } from '@bukeer/website-contract';

interface SiteHeaderProps {
  website: WebsiteData;
  isCustomDomain?: boolean;
  navigation?: NavigationItem[];
}

export function SiteHeader({ website, isCustomDomain = false, navigation }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const { content, subdomain } = website;
  const basePath = getBasePath(subdomain, isCustomDomain);

  const siteName = content.account?.name || content.siteName;
  const siteLogo = content.account?.logo || content.logo;
  const headerCta: HeaderCTA | undefined = content.headerCta;
  const phone = content.account?.phone || content.social?.whatsapp;

  // Fallback navigation
  const navFallback: NavigationItem[] = [
    { slug: 'destinations', label: 'Destinos', page_type: 'anchor', href: `${basePath}/#destinations`, target: '_self' },
    { slug: 'packages', label: 'Paquetes', page_type: 'anchor', href: `${basePath}/#packages`, target: '_self' },
    { slug: 'activities', label: 'Experiencias', page_type: 'anchor', href: `${basePath}/#activities`, target: '_self' },
    { slug: 'about', label: 'Nosotros', page_type: 'anchor', href: `${basePath}/#about`, target: '_self' },
    { slug: 'cta', label: 'Asesoría', page_type: 'anchor', href: `${basePath}/#cta`, target: '_self' },
  ];
  const navLinks: NavigationItem[] = (navigation || navFallback)
    .filter((link) => !(link.slug?.toLowerCase() === 'contact' && link.page_type === 'anchor'))
    .map((link) => {
      if (link.slug?.toLowerCase() !== 'contact') return link;
      return {
        ...link,
        slug: 'cta',
        label: 'Asesoría',
        href: `${basePath}/#cta`,
      };
    });

  // Scroll detection — always active for immersive header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change / resize
  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // WhatsApp URL
  const whatsappUrl = content.social?.whatsapp
    ? `https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`
    : phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
        data-scrolled={scrolled}
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--bg, hsl(var(--background))) 88%, transparent)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)',
          backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border-subtle, hsl(var(--border)))' : 'none',
          boxShadow: scrolled ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <nav className={`container relative transition-all duration-500 ${scrolled ? 'h-14' : 'h-20'}`}>
          {/* Mobile: 3 fixed zones (menu left, centered logo, CTA right) */}
          <div className="lg:hidden h-full relative flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
              style={{ color: scrolled ? 'var(--text-heading, hsl(var(--foreground)))' : 'white' }}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>

            <Link href={`${basePath}/`} className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 shrink-0 group">
              {siteLogo ? (
                <img
                  src={siteLogo}
                  alt={siteName}
                  className={`w-auto object-contain transition-all duration-500 ${scrolled ? 'h-8' : 'h-10'}`}
                />
              ) : (
                <span
                  className={`font-bold tracking-tight transition-all duration-500 ${scrolled ? 'text-base' : 'text-lg'}`}
                  style={{ color: scrolled ? 'var(--text-heading, hsl(var(--foreground)))' : 'white', textShadow: scrolled ? 'none' : '0 1px 3px rgba(0,0,0,0.3)' }}
                >
                  {siteName}
                </span>
              )}
            </Link>

            <div className="flex items-center justify-end min-w-10">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              ) : (
                <Link
                  href={`${basePath}/#cta`}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  aria-label="Asesoría"
                >
                  <CalendarIcon className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex h-full items-center justify-between">
            <Link href={`${basePath}/`} className="flex items-center gap-2 shrink-0 group">
              {siteLogo ? (
                <img
                  src={siteLogo}
                  alt={siteName}
                  className={`w-auto object-contain transition-all duration-500 ${scrolled ? 'h-8' : 'h-11'}`}
                />
              ) : (
                <span
                  className={`font-bold tracking-tight transition-all duration-500 ${scrolled ? 'text-lg' : 'text-xl'}`}
                  style={{ color: scrolled ? 'var(--text-heading, hsl(var(--foreground)))' : 'white', textShadow: scrolled ? 'none' : '0 1px 3px rgba(0,0,0,0.3)' }}
                >
                  {siteName}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const href = resolveNavHref(link, basePath);
              const hasChildren = link.children && link.children.length > 0;

              if (hasChildren) {
                return (
                  <div
                    key={link.slug}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(link.slug)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1"
                      style={{
                        color: scrolled ? 'var(--text-secondary, hsl(var(--muted-foreground)))' : 'rgba(255,255,255,0.9)',
                        textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    >
                      {link.label}
                      <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openDropdown === link.slug && (
                      <div className="absolute top-full left-0 pt-2 min-w-48 z-50">
                        <div className="bg-background/95 backdrop-blur-lg border rounded-xl shadow-xl py-2">
                          <Link href={href} className="block px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors rounded-lg mx-1">{link.label}</Link>
                          <div className="border-t mx-3 my-1" />
                          {link.children!.map((child) => (
                            <Link key={child.slug} href={resolveNavHref(child, basePath)} target={child.target === '_blank' ? '_blank' : undefined} rel={child.target === '_blank' ? 'noopener noreferrer' : undefined} className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg mx-1">{child.label}</Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.slug}
                  href={href}
                  target={link.target === '_blank' ? '_blank' : undefined}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10"
                  style={{
                    color: scrolled ? 'var(--text-secondary, hsl(var(--muted-foreground)))' : 'rgba(255,255,255,0.9)',
                    textShadow: scrolled ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    if (scrolled) e.currentTarget.style.color = 'var(--accent, hsl(var(--primary)))';
                    else e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = scrolled ? 'var(--text-secondary, hsl(var(--muted-foreground)))' : 'rgba(255,255,255,0.9)';
                    if (!scrolled) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="w-px h-5 mx-2" style={{ background: scrolled ? 'var(--border-subtle, hsl(var(--border)))' : 'rgba(255,255,255,0.25)' }} />

            {/* WhatsApp CTA */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'var(--accent, hsl(var(--primary)))',
                  color: 'var(--accent-text, white)',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--accent, hsl(var(--primary))) 50%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)'; }}
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>Planear mi viaje</span>
              </a>
            ) : (
              <HeaderCtaButton cta={headerCta} />
            )}
          </div>
          </div>
        </nav>

        {/* Mobile Menu — fullscreen overlay */}
        {mobileMenuOpen && (
          <>
            {/* Dark backdrop */}
            <div
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0, 0, 0, 0.5)' }}
              onClick={closeMobile}
              aria-hidden="true"
            />
            {/* Menu panel */}
            <div
              className="lg:hidden fixed inset-0 top-14 z-50 overflow-y-auto"
              style={{
                background: 'var(--bg, hsl(var(--background)))',
                top: scrolled ? '56px' : '80px',
              }}
            >
              <nav className="container py-6 flex flex-col gap-1">
              {navLinks.map((link, i) => {
                const href = resolveNavHref(link, basePath);
                return (
                  <Link
                    key={link.slug}
                    href={href}
                    onClick={closeMobile}
                    className="py-4 px-4 rounded-xl text-base font-medium transition-all hover:bg-muted/50 flex items-center justify-between"
                    style={{
                      color: 'var(--text-heading, hsl(var(--foreground)))',
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    {link.label}
                    <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}

              {/* Mobile CTA */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold transition-all"
                  style={{
                    background: 'var(--accent, hsl(var(--primary)))',
                    color: 'var(--accent-text, white)',
                  }}
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  Planear mi viaje por WhatsApp
                </a>
              )}

              {/* Phone */}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="mt-2 flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-medium border transition-all"
                  style={{
                    borderColor: 'var(--border-subtle, hsl(var(--border)))',
                    color: 'var(--text-heading, hsl(var(--foreground)))',
                  }}
                >
                  <PhoneIcon className="w-5 h-5" />
                  Llamar ahora
                </a>
              )}
            </nav>
          </div>
          </>
        )}
      </header>

      {/* Spacer for non-transparent headers — not needed since we're always fixed+transparent over hero */}
    </>
  );
}

/** Header CTA button — configurable or fallback */
function HeaderCtaButton({ cta }: { cta?: HeaderCTA }) {
  if (cta?.enabled && cta.label && cta.href) {
    const isExternal = cta.variant === 'whatsapp' || cta.href.startsWith('http');
    return (
      <a
        href={cta.href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: 'var(--accent, hsl(var(--primary)))',
          color: 'var(--accent-text, white)',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)',
        }}
      >
        {cta.icon === 'whatsapp' && <WhatsAppIcon className="w-4 h-4" />}
        {cta.icon === 'phone' && <PhoneIcon className="w-4 h-4" />}
        {cta.icon === 'mail' && <MailIcon className="w-4 h-4" />}
        {cta.icon === 'calendar' && <CalendarIcon className="w-4 h-4" />}
        {cta.label}
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
