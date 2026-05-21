/**
 * editorial-v1 Site Footer
 *
 * Server component. Ports designer `Footer` from
 * themes/references/claude design 1/project/sections.jsx.
 *
 * Copy sourced from `docs/editorial-v1/copy-catalog.md` (verbatim designer
 * columns: Destinos / Viajar / Agencia / Recibe historias). The spec doc
 * earlier uses "Explora / Compañía / Ayuda / Legal" — we prefer the copy-
 * catalog version per the plan rule: "Editorial copy must come verbatim
 * from the designer."
 *
 * Dynamic:
 *   - social links from `website.content.social`
 *   - WhatsApp href from `content.social.whatsapp`
 *   - legal links from `content.account.legal`
 *
 * Newsletter form persists signups through the site newsletter route.
 */

import type { ReactElement } from 'react';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { NavigationItem } from '@bukeer/website-contract';
import { getBasePath } from '@/lib/utils/base-path';
import {
  CATEGORY_CANONICAL_SEGMENT,
  buildLegalPagePath,
  localeToLanguage,
  type CategoryLanguage,
  type LegalPageType,
} from '@/lib/seo/locale-routing';
import { Icons } from '../primitives/icons';
import { FooterSwitcher } from './footer-switcher';
import { FooterNewsletterForm } from './footer-newsletter-form';
import { getEditorialTextGetter } from '../i18n';
import { WaflowCTAButton } from '../waflow/cta-button';

export interface EditorialSiteFooterProps {
  website: WebsiteData;
  navigation?: NavigationItem[];
  isCustomDomain?: boolean;
  isLanding?: boolean;
}

function legalHref(
  basePath: string,
  slug: LegalPageType,
  resolvedLocale: string,
  defaultLocale: string,
): string {
  return `${basePath}${buildLegalPagePath(slug, resolvedLocale, defaultLocale)}`;
}

function isColombiaToursWebsite(website: WebsiteData): boolean {
  const subdomain = website.subdomain?.toLowerCase() ?? '';
  const customDomain = website.custom_domain?.toLowerCase() ?? '';
  const siteName = website.content?.siteName?.toLowerCase() ?? '';

  return (
    subdomain === 'colombiatours' ||
    customDomain === 'colombiatours.travel' ||
    siteName.includes('colombiatours')
  );
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCopy(value: string | null | undefined): string {
  return stripDiacritics(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/g, '')
    .trim();
}

function localizeKnownEditorialFooterCopy(
  value: string | null | undefined,
  fallback: string,
  language: string,
): string {
  if (!value) return fallback;

  const normalized = normalizeCopy(value);
  if (language === 'fr' && normalized === 'descubre colombia con expertos locales') {
    const suffix = value.trim().endsWith('.') ? '.' : '';
    return `Découvrez la Colombie avec des experts locaux${suffix}`;
  }

  return value;
}

function localizedCategorySegment(
  productType: keyof typeof CATEGORY_CANONICAL_SEGMENT,
  language: string,
): string {
  const segments = CATEGORY_CANONICAL_SEGMENT[productType];
  return segments[language as CategoryLanguage] ?? segments.es;
}

export function EditorialSiteFooter({
  website,
  isCustomDomain = false,
  isLanding = false,
}: EditorialSiteFooterProps) {
  const editorialText = getEditorialTextGetter(website);
  const { content, subdomain } = website;
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    ?? content.locale
    ?? website.default_locale
    ?? 'es-CO';
  const defaultLocale = website.default_locale ?? content.locale ?? 'es-CO';
  const language = localeToLanguage(resolvedLocale);
  const basePath = getBasePath(subdomain, isCustomDomain, resolvedLocale || undefined);
  const currentYear = new Date().getFullYear();
  const siteName = content.account?.name || content.siteName;
  const social = content.social || {};
  const legal = content.account?.legal;

  const logoUrl = content.account?.logo || content.logo || null;
  const tagline = localizeKnownEditorialFooterCopy(
    content.tagline,
    editorialText('editorialFooterTaglineFallback'),
    language,
  );
  // WebsiteContent exposes `tagline` + account.* but no top-level
  // `description`. Pull from SEO description as a soft fallback.
  const aboutBlurb = localizeKnownEditorialFooterCopy(
    content.seo?.description,
    editorialText('editorialFooterAboutFallback'),
    language,
  );
  const destinationSegment = localizedCategorySegment('destination', language);
  const packageSegment = localizedCategorySegment('package', language);

  const destinosLinks = [
    { label: 'Cartagena', href: `${basePath}/${destinationSegment}/cartagena` },
    { label: 'Eje Cafetero', href: `${basePath}/${destinationSegment}/eje-cafetero` },
    { label: 'Tayrona', href: `${basePath}/${destinationSegment}/tayrona` },
    { label: 'San Andrés', href: `${basePath}/${destinationSegment}/san-andres` },
    { label: 'Amazonas', href: `${basePath}/${destinationSegment}/amazonas` },
    { label: editorialText('editorialFooterViewAll'), href: `${basePath}/#destinations` },
  ];
  const viajarLinks = language === 'fr' ? [
    { label: 'Forfaits', href: `${basePath}/${packageSegment}` },
    { label: editorialText('editorialFooterSearch'), href: `${basePath}/buscar` },
    { label: 'Hôtels boutique', href: `${basePath}/#hotels` },
    { label: 'Voyages de noces', href: `${basePath}/${packageSegment}?tipo=luna-de-miel` },
    { label: 'Groupes et entreprises', href: `${basePath}/#cta` },
  ] : [
    { label: 'Paquetes', href: `${basePath}/${packageSegment}` },
    { label: editorialText('editorialFooterSearch'), href: `${basePath}/buscar` },
    { label: 'Hoteles boutique', href: `${basePath}/#hotels` },
    { label: 'Luna de miel', href: `${basePath}/${packageSegment}?tipo=luna-de-miel` },
    { label: 'Grupos y corporativo', href: `${basePath}/#cta` },
  ];
  const agenciaLinks = language === 'fr' ? [
    { label: 'À propos', href: `${basePath}/#about` },
    { label: 'Nos planners', href: `${basePath}/planners` },
    { label: 'Blog', href: `${basePath}/blog` },
    { label: 'Presse', href: `${basePath}/presse` },
    { label: 'Contact', href: `${basePath}/#cta` },
  ] : [
    { label: 'Sobre nosotros', href: `${basePath}/#about` },
    { label: 'Nuestros planners', href: `${basePath}/planners` },
    { label: 'Blog', href: `${basePath}/blog` },
    { label: 'Prensa', href: `${basePath}/prensa` },
    { label: 'Contacto', href: `${basePath}/#cta` },
  ];

  const whatsappRaw = social.whatsapp || content.account?.phone || '';
  const whatsappHref = whatsappRaw
    ? `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, '')}`
    : null;

  const socialRow: Array<{
    label: string;
    href: string;
    icon: (props: { size?: number; className?: string }) => ReactElement;
  }> = [];
  if (whatsappHref) {
    socialRow.push({
      label: 'WhatsApp',
      href: whatsappHref,
      icon: Icons.whatsapp,
    });
  }
  if (social.instagram) {
    socialRow.push({
      label: 'Instagram',
      href: social.instagram,
      icon: Icons.ig,
    });
  }
  if (social.facebook) {
    socialRow.push({
      label: 'Facebook',
      href: social.facebook,
      icon: Icons.fb,
    });
  }
  if (social.tiktok) {
    socialRow.push({
      label: 'TikTok',
      href: social.tiktok,
      icon: Icons.tiktok,
    });
  }

  const legalPrivacy = editorialText('editorialFooterLegalPrivacy');
  const legalTerms = editorialText('editorialFooterLegalTerms');
  const legalCancellation = editorialText('editorialFooterLegalCancellation');
  const legalLinks: Array<{ label: string; href: string }> = [
    { label: legalPrivacy, href: legalHref(basePath, 'privacy', resolvedLocale, defaultLocale) },
    { label: legalTerms, href: legalHref(basePath, 'terms', resolvedLocale, defaultLocale) },
    { label: legalCancellation, href: legalHref(basePath, 'cancellation', resolvedLocale, defaultLocale) },
  ];
  const rntDocumentHref = isColombiaToursWebsite(website)
    ? '/tenant-assets/colombiatours/legal/rnt-2026-act.pdf'
    : null;

  return (
    <footer className="ev-footer" data-screen-label="Footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div className="footer-brand">
            {logoUrl ? (
              <div className="logo-foot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ height: 52, width: 'auto', filter: 'brightness(1.05)' }}
                />
              </div>
            ) : null}
            <p className="footer-tagline">{tagline}</p>
            <p>{aboutBlurb}</p>
            {socialRow.length > 0 ? (
              <div className="footer-social">
                {socialRow.map((item) => {
                  const IconComp = item.icon;
                  if (item.label === 'WhatsApp') {
                    return (
                      <WaflowCTAButton
                        key={item.label}
                        variant="A"
                        fallbackHref={item.href}
                        className="icon-btn"
                        ariaLabel={item.label}
                      >
                        <IconComp size={18} />
                      </WaflowCTAButton>
                    );
                  }
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-btn"
                      aria-label={item.label}
                    >
                      <IconComp size={18} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {!isLanding && (
            <>
              <div className="footer-col">
                <div className="footer-col-title">{editorialText('editorialFooterColDestinos')}</div>
                <ul>
                  {destinosLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-col">
                <div className="footer-col-title">{editorialText('editorialFooterColViajar')}</div>
                <ul>
                  {viajarLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-col">
                <div className="footer-col-title">{editorialText('editorialFooterColAgencia')}</div>
                <ul>
                  {agenciaLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-col">
                <div className="footer-col-title">{editorialText('editorialFooterColNewsletter')}</div>
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,.6)',
                    marginBottom: 14,
                  }}
                >
                  {editorialText('editorialFooterNewsletterHint')}
                </p>
                <FooterNewsletterForm
                  action={`${basePath}/api/newsletter`}
                  subdomain={subdomain}
                  locale={(website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? content.locale ?? null}
                  emailLabel={editorialText('editorialFooterEmailLabel')}
                  emailPlaceholder={editorialText('editorialFooterEmailPlaceholder')}
                  submitLabel={editorialText('editorialFooterSubscribe')}
                  submittingLabel="Enviando..."
                  successLabel="Gracias. Ya guardamos tu correo."
                  errorLabel="No pudimos guardar tu correo. Intenta de nuevo."
                />
              </div>
            </>
          )}
        </div>

        <div className="footer-bottom">
          <div>
            © {currentYear} {siteName}
            {rntDocumentHref ? (
              <>
                {' · '}
                <a
                  href={rntDocumentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-rnt-link"
                >
                  RNT 35323
                </a>
              </>
            ) : legal?.terms_conditions || content.tagline ? (
              ' · '
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>
          <FooterSwitcher website={website} />
          <div className="credit">
            Creado con <em>Bukeer</em>
          </div>
        </div>
      </div>
    </footer>
  );
}
