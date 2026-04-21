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
 * Newsletter form is a stub — submission wiring deferred to Wave 4+.
 */

import type { ReactElement } from 'react';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { NavigationItem } from '@bukeer/website-contract';
import { getBasePath } from '@/lib/utils/base-path';
import { Icons } from '../primitives/icons';
import { FooterSwitcher } from './footer-switcher';
import { getEditorialTextGetter } from '../i18n';

export interface EditorialSiteFooterProps {
  website: WebsiteData;
  navigation?: NavigationItem[];
  isCustomDomain?: boolean;
}

export function EditorialSiteFooter({
  website,
  isCustomDomain = false,
}: EditorialSiteFooterProps) {
  const editorialText = getEditorialTextGetter(website);
  const { content, subdomain } = website;
  const basePath = getBasePath(subdomain, isCustomDomain);
  const currentYear = new Date().getFullYear();
  const siteName = content.account?.name || content.siteName;
  const social = content.social || {};
  const legal = content.account?.legal;

  const logoUrl = content.account?.logo || content.logo || null;
  const tagline = content.tagline || editorialText('editorialFooterTaglineFallback');
  // WebsiteContent exposes `tagline` + account.* but no top-level
  // `description`. Pull from SEO description as a soft fallback.
  const aboutBlurb =
    content.seo?.description ||
    editorialText('editorialFooterAboutFallback');

  const destinosLinks = [
    { label: 'Cartagena', href: `${basePath}/destinos/cartagena` },
    { label: 'Eje Cafetero', href: `${basePath}/destinos/eje-cafetero` },
    { label: 'Tayrona', href: `${basePath}/destinos/tayrona` },
    { label: 'San Andrés', href: `${basePath}/destinos/san-andres` },
    { label: 'Amazonas', href: `${basePath}/destinos/amazonas` },
    { label: editorialText('editorialFooterViewAll'), href: `${basePath}/#destinations` },
  ];
  const viajarLinks = [
    { label: 'Paquetes', href: `${basePath}/paquetes` },
    { label: editorialText('editorialFooterSearch'), href: `${basePath}/buscar` },
    { label: 'Hoteles boutique', href: `${basePath}/#hotels` },
    { label: 'Luna de miel', href: `${basePath}/paquetes?tipo=luna-de-miel` },
    { label: 'Grupos y corporativo', href: `${basePath}/#cta` },
  ];
  const agenciaLinks = [
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
  const legalLinks: Array<{ label: string; href: string }> = [];
  if (legal?.privacy_policy) {
    legalLinks.push({ label: legalPrivacy, href: legal.privacy_policy });
  } else {
    legalLinks.push({ label: legalPrivacy, href: `${basePath}/privacy` });
  }
  if (legal?.terms_conditions) {
    legalLinks.push({ label: legalTerms, href: legal.terms_conditions });
  } else {
    legalLinks.push({ label: legalTerms, href: `${basePath}/terms` });
  }
  if (legal?.cancellation_policy) {
    legalLinks.push({
      label: legalCancellation,
      href: legal.cancellation_policy,
    });
  } else {
    legalLinks.push({
      label: legalCancellation,
      href: `${basePath}/cancellation`,
    });
  }

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
            <h4>{tagline}</h4>
            <p>{aboutBlurb}</p>
            {socialRow.length > 0 ? (
              <div className="footer-social">
                {socialRow.map((item) => {
                  const IconComp = item.icon;
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

          <div className="footer-col">
            <h5>{editorialText('editorialFooterColDestinos')}</h5>
            <ul>
              {destinosLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>{editorialText('editorialFooterColViajar')}</h5>
            <ul>
              {viajarLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>{editorialText('editorialFooterColAgencia')}</h5>
            <ul>
              {agenciaLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>{editorialText('editorialFooterColNewsletter')}</h5>
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,.6)',
                marginBottom: 14,
              }}
            >
              {editorialText('editorialFooterNewsletterHint')}
            </p>
            {/* Newsletter stub — wiring in Wave 4+ */}
            <form
              method="post"
              action={`${basePath}/api/newsletter`}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <label className="sr-only" htmlFor="ev-footer-email">
                {editorialText('editorialFooterEmailLabel')}
              </label>
              <input
                id="ev-footer-email"
                type="email"
                name="email"
                required
                placeholder={editorialText('editorialFooterEmailPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.16)',
                  background: 'rgba(255,255,255,.06)',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
              <button type="submit" className="btn btn-accent">
                {editorialText('editorialFooterSubscribe')}
                <Icons.arrow size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {currentYear} {siteName}
            {legal?.terms_conditions || content.tagline
              ? ' · '
              : null}
            {/* Legal line: RNT/NIT are site-specific — if not supplied, omit. */}
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
