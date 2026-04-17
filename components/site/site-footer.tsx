'use client';

import Link from 'next/link';
import Image from 'next/image';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { resolveNavHref } from '@/lib/utils/navigation';
import type { NavigationItem, FooterVariant } from '@bukeer/website-contract';
import { LanguageSwitcher } from '@/components/site/language-switcher';
import {
  normalizeLanguageCode,
  resolveMarketExperienceConfig,
  resolveSiteMenuLocales,
} from '@/lib/site/currency';

interface SiteFooterProps {
  website: WebsiteData;
  isCustomDomain?: boolean;
  navigation?: NavigationItem[];
}

export function SiteFooter({ website, isCustomDomain = false, navigation }: SiteFooterProps) {
  const { content, subdomain, site_parts: siteParts } = website;
  const currentYear = new Date().getFullYear();
  const footerVariant: FooterVariant = siteParts?.footer?.variant || '4-column';
  const basePath = getBasePath(subdomain, isCustomDomain);

  // Check if website has a dedicated CTA section to avoid duplicating the footer CTA
  const hasDedicatedCta = website.sections?.some(s =>
    ['cta', 'cta_banner', 'cta_section'].includes(s.section_type)
  );

  const marketExperience = resolveMarketExperienceConfig(content);
  const localeOptions = resolveSiteMenuLocales({
    defaultLocale: website.default_locale ?? null,
    supportedLocales: website.supported_locales ?? null,
    contentLocale: content.locale ?? null,
  });
  const currentLocale = normalizeLanguageCode(content.locale)
    ?? normalizeLanguageCode(website.default_locale)
    ?? localeOptions[0]?.code
    ?? 'es';
  const showFooterLanguageSwitcher = marketExperience.showInFooter
    && marketExperience.showLanguage
    && localeOptions.length > 0;

  // Usar datos de account si están disponibles (fallback a content)
  const siteName = content.account?.name || content.siteName;
  const siteLogo = content.account?.logo || content.logo;
  const contactEmail = content.account?.email || content.contact?.email;
  const contactPhone = content.account?.phone || content.contact?.phone;

  const socialLinks = [
    { name: 'WhatsApp', url: content.social?.whatsapp ? `https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}` : null, icon: WhatsAppIcon },
    { name: 'Instagram', url: content.social?.instagram, icon: InstagramIcon },
    { name: 'Facebook', url: content.social?.facebook, icon: FacebookIcon },
    { name: 'TikTok', url: content.social?.tiktok, icon: TikTokIcon },
    { name: 'YouTube', url: content.social?.youtube, icon: YouTubeIcon },
    { name: 'Twitter', url: content.social?.twitter, icon: TwitterIcon },
    { name: 'LinkedIn', url: content.social?.linkedin, icon: LinkedInIcon },
  ].filter(link => link.url);

  const navFallback = [
    { slug: '', label: 'Inicio', page_type: 'custom' as const, href: `${basePath}/` },
    { slug: 'destinations', label: 'Destinos', page_type: 'anchor' as const, href: `${basePath}/#destinations` },
    { slug: 'hotels', label: 'Hoteles', page_type: 'anchor' as const, href: `${basePath}/#hotels` },
    { slug: 'blog', label: 'Blog', page_type: 'custom' as const, href: `${basePath}/blog` },
    { slug: 'cta', label: 'Asesoría', page_type: 'anchor' as const, href: `${basePath}/#cta` },
  ];
  const navItems = (navigation || navFallback)
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

  // Shared sub-components
  const LogoBlock = (
    <Link href={`${basePath}/`} className="inline-block">
      {siteLogo ? (
        <Image
          src={siteLogo}
          alt={siteName}
          width={192}
          height={48}
          sizes="192px"
          className="h-12 w-auto object-contain"
        />
      ) : (
        <span className="text-2xl font-bold">{siteName}</span>
      )}
    </Link>
  );

  const SocialBlock = socialLinks.length > 0 ? (
    <div className="flex gap-4">
      {socialLinks.map((link) => (
        <a key={link.name} href={link.url!} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors" aria-label={link.name}>
          <link.icon className="w-5 h-5" />
        </a>
      ))}
    </div>
  ) : null;

  const CopyrightBlock = (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-sm text-muted-foreground">&copy; {currentYear} {siteName}. Todos los derechos reservados.</p>
      <p className="text-sm text-muted-foreground">Creado con{' '}<a href="https://bukeer.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Bukeer</a></p>
    </div>
  );

  const NavBlock = (
    <nav className="flex flex-col gap-2">
      {navItems.map((link) => (
        <Link key={link.slug} href={resolveNavHref(link, basePath)} target={(link as NavigationItem).target === '_blank' ? '_blank' : undefined} rel={(link as NavigationItem).target === '_blank' ? 'noopener noreferrer' : undefined} className="text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
      ))}
    </nav>
  );

  const ContactBlock = (
    <div className="flex flex-col gap-3 text-muted-foreground">
      {contactEmail && <a href={`mailto:${contactEmail}`} className="hover:text-foreground transition-colors">{contactEmail}</a>}
      {contactPhone && <a href={`tel:${contactPhone}`} className="hover:text-foreground transition-colors">{contactPhone}</a>}
      {content.contact?.address && <p>{content.contact.address}</p>}
    </div>
  );

  const whatsappLink = content.social?.whatsapp
    ? `https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`
    : null;
  const primaryCtaHref = whatsappLink || `${basePath}/#cta`;
  const primaryCtaLabel = whatsappLink ? 'Hablar por WhatsApp' : 'Solicitar asesoría';
  const footerPalette = {
    surface: 'color-mix(in srgb, var(--text-heading) 84%, var(--bg) 16%)',
    border: 'color-mix(in srgb, var(--bg) 16%, transparent)',
    text: 'color-mix(in srgb, var(--bg) 96%, transparent)',
    muted: 'color-mix(in srgb, var(--bg) 74%, transparent)',
  };

  const taxonomyColumns = [
    {
      title: 'Explora',
      links: [
        { label: 'Destinos', href: `${basePath}/#destinations` },
        { label: 'Paquetes', href: `${basePath}/#packages` },
        { label: 'Actividades', href: `${basePath}/#activities` },
        { label: 'Hoteles', href: `${basePath}/#hotels` },
      ],
    },
    {
      title: 'Compañía',
      links: [
        { label: 'Nosotros', href: `${basePath}/#about` },
        { label: 'Reseñas', href: `${basePath}/#testimonials` },
        { label: 'Blog', href: `${basePath}/blog` },
        { label: 'Preguntas frecuentes', href: `${basePath}/#faq` },
      ],
    },
    {
      title: 'Ayuda',
      links: [
        { label: primaryCtaLabel, href: primaryCtaHref, external: Boolean(whatsappLink) },
        { label: 'Planear viaje', href: `${basePath}/#cta` },
        ...(contactEmail ? [{ label: contactEmail, href: `mailto:${contactEmail}`, external: true }] : []),
        ...(contactPhone ? [{ label: contactPhone, href: `tel:${contactPhone}`, external: true }] : []),
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Términos y Condiciones', href: `${basePath}/terms` },
        { label: 'Política de Privacidad', href: `${basePath}/privacy` },
        { label: 'Política de Cancelación', href: `${basePath}/cancellation` },
      ],
    },
  ];

  // --- MINIMAL VARIANT ---
  if (footerVariant === 'minimal') {
    return (
      <footer className="bg-muted/50 border-t">
        <div className="container py-8">
          <div className="flex flex-col items-center gap-4">
            {SocialBlock}
            {CopyrightBlock}
          </div>
        </div>
      </footer>
    );
  }

  // --- CENTERED VARIANT ---
  if (footerVariant === 'centered') {
    return (
      <footer className="bg-muted/50 border-t">
        <div className="container section-padding text-center">
          <div className="flex flex-col items-center gap-6">
            {LogoBlock}
            {content.tagline && <p className="text-muted-foreground max-w-md">{content.tagline}</p>}
            <nav className="flex flex-wrap justify-center gap-6">
              {navItems.map((link) => (
                <Link key={link.slug} href={resolveNavHref(link, basePath)} className="text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
              ))}
            </nav>
            {SocialBlock}
            {ContactBlock}
          </div>
          <div className="mt-12 pt-8 border-t">{CopyrightBlock}</div>
        </div>
      </footer>
    );
  }

  // --- 3-COLUMN VARIANT ---
  if (footerVariant === '3-column') {
    return (
      <footer className="bg-muted/50 border-t">
        <div className="container section-padding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              {LogoBlock}
              {content.tagline && <p className="mt-4 text-muted-foreground max-w-md">{content.tagline}</p>}
              <div className="mt-6">{SocialBlock}</div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Navegación</h3>
              {NavBlock}
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contacto</h3>
              {ContactBlock}
            </div>
          </div>
          <div className="mt-12 pt-8 border-t">{CopyrightBlock}</div>
        </div>
      </footer>
    );
  }

  // --- 4-COLUMN VARIANT (default) ---
  return (
    <footer style={{ backgroundColor: footerPalette.surface, color: footerPalette.text }}>
      {!hasDedicatedCta && (
        <div className="border-t" style={{ borderColor: footerPalette.border }}>
          <div className="container py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-xl leading-tight">Planifiquemos tu viaje por Colombia</p>
              <p className="text-sm mt-1" style={{ color: footerPalette.muted }}>
                Itinerarios, hoteles y actividades en una sola asesoría.
              </p>
            </div>
            <a
              href={primaryCtaHref}
              target={whatsappLink ? '_blank' : undefined}
              rel={whatsappLink ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {primaryCtaLabel}
            </a>
          </div>
        </div>
      )}

      <div className="border-t" style={{ borderColor: footerPalette.border }}>
        <div className="container py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm" style={{ color: footerPalette.muted }}>
            Síguenos para descubrir nuevas rutas y experiencias.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ border: `1px solid ${footerPalette.border}`, color: footerPalette.text }}
                  aria-label={link.name}
                >
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: footerPalette.border }}>
        <div className="container py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {taxonomyColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-heading text-sm uppercase tracking-[0.16em] mb-4" style={{ color: footerPalette.text }}>
                {column.title}
              </h3>
              <nav className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <Link
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm transition-opacity hover:opacity-90"
                    style={{ color: footerPalette.muted }}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: footerPalette.border }}>
        <div className="container py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm" style={{ color: footerPalette.muted }}>
            © {currentYear} {siteName}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm" style={{ color: footerPalette.muted }}>
            {showFooterLanguageSwitcher ? (
              <LanguageSwitcher
                currentLocale={currentLocale}
                locales={localeOptions}
                footerPalette={footerPalette}
                defaultLocale={website.default_locale ?? undefined}
                supportedLocales={website.supported_locales ?? undefined}
              />
            ) : null}
            <a href="https://bukeer.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Creado con Bukeer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Social Icons
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
