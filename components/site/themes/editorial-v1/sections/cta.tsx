/**
 * editorial-v1 CTA band.
 *
 * Port of designer `CtaBanner` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Full-width banner with primary-colored background, large accent "blur
 * blob" top-right, split 2-col copy/actions grid. Copy column gets:
 *   - eyebrow (light over primary)
 *   - h2 with `<em>` serif italic in accent-2
 *   - subtitle paragraph
 * Actions column stacks primary + secondary CTAs vertically on desktop
 * (row-wrapping on mobile — see editorial-v1.css).
 *
 * Optional `backgroundImageUrl`: renders under the primary colour with a
 * `--c-hero-wash` gradient overlay so the text remains legible.
 *
 * Server component.
 *
 * Content contract:
 *   eyebrow?:              string
 *   title:                 string  (supports `<em>` + `<br>`)
 *   subtitle?:             string
 *   ctas?:                 Array<{ label, href?, variant? }>
 *   backgroundImageUrl?:   string
 *   ctaText?, ctaUrl?:     legacy single-CTA aliases (back-compat)
 */

import type { ReactElement } from 'react';
import Image from 'next/image';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

import { Icons } from '../primitives/icons';
import { WaflowCTAButton } from '../waflow/cta-button';

export interface EditorialCtaSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface CtaButton {
  label?: string;
  href?: string;
  variant?: 'primary' | 'accent' | 'ghost' | 'outline' | 'ink';
}

interface CtaContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctas?: CtaButton[];
  backgroundImageUrl?: string;
  backgroundImage?: string;
  // Legacy single-CTA aliases
  ctaText?: string;
  ctaUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

const DEFAULT_TITLE_KEY = 'editorialCtaTitleFallback';

const ALLOWED_TITLE_TAGS = new Set(['em', 'br']);
function sanitizeTitle(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, name) => {
      const tag = String(name).toLowerCase();
      if (!ALLOWED_TITLE_TAGS.has(tag)) return '';
      const isClosing = match.startsWith('</');
      if (tag === 'br') return '<br>';
      return isClosing ? `</${tag}>` : `<${tag}>`;
    });
}

function resolveWhatsAppHref(website: WebsiteData, fallback: string): string {
  const raw = website.content?.social?.whatsapp || '';
  if (!raw) return fallback;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : fallback;
}

function resolveCtaHref(
  href: string | undefined,
  website: WebsiteData,
  basePath: string,
): string {
  if (!href) return `${basePath}/#cta`;
  if (/^(https?:|mailto:|tel:|wa\.me)/.test(href)) return href;
  if (href === '{{whatsapp}}' || href === 'whatsapp') {
    return resolveWhatsAppHref(website, `${basePath}/#cta`);
  }
  if (href.startsWith('#') || href.startsWith('/')) return `${basePath}${href}`;
  return href;
}

function ctaClassFor(
  variant: CtaButton['variant'],
  primaryIndex: number,
): string {
  // First CTA defaults to accent, subsequent to ghost (over dark background).
  const fallback = primaryIndex === 0 ? 'accent' : 'ghost';
  const resolved = variant || fallback;
  switch (resolved) {
    case 'primary':
      return 'btn btn-primary btn-lg';
    case 'ghost':
      return 'btn btn-ghost btn-lg';
    case 'outline':
      return 'btn btn-outline btn-lg';
    case 'ink':
      return 'btn btn-ink btn-lg';
    case 'accent':
    default:
      return 'btn btn-accent btn-lg';
  }
}

function normalizeCtas(content: CtaContent): CtaButton[] {
  const authored = Array.isArray(content.ctas)
    ? content.ctas.filter((c): c is CtaButton => !!c && typeof c.label === 'string' && c.label.trim().length > 0)
    : [];
  if (authored.length > 0) return authored.slice(0, 3);

  // Legacy fallback — map old ctaText/ctaUrl + secondary* into buttons.
  const legacy: CtaButton[] = [];
  if (content.ctaText) {
    legacy.push({ label: content.ctaText, href: content.ctaUrl, variant: 'accent' });
  }
  if (content.secondaryButtonText) {
    legacy.push({
      label: content.secondaryButtonText,
      href: content.secondaryButtonUrl,
      variant: 'ghost',
    });
  }
  return legacy;
}

export function CtaSection({
  section,
  website,
}: EditorialCtaSectionProps): ReactElement {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as CtaContent;
  const basePath = getBasePath(website.subdomain, false);

  const eyebrow = localizeEditorialText(website, content.eyebrow?.trim() || '');
  const sanitizedTitle = sanitizeTitle(
    localizeEditorialText(website, content.title)
    || localizeEditorialText(website, editorialText(DEFAULT_TITLE_KEY)),
  );
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');
  const ctas = normalizeCtas(content).map((cta) => ({
    ...cta,
    label: localizeEditorialText(website, cta.label),
  }));

  const bgImage = content.backgroundImageUrl || content.backgroundImage || '';

  return (
    <section
      className="ev-section ev-cta"
      data-screen-label="CTA"
      aria-label={eyebrow || editorialText('editorialCtaAriaFallback')}
    >
      <div className="ev-container">
        <div className="cta-banner">
          {bgImage ? (
            <div className="cta-bg" aria-hidden="true">
              <Image
                src={bgImage}
                alt=""
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                priority={false}
              />
            </div>
          ) : null}

          <div className="cta-body">
            {eyebrow ? (
              <span className="eyebrow cta-eyebrow">{eyebrow}</span>
            ) : null}
            <h2
              className="display-md"
              dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
            />
            {subtitle ? <p className="body-lg">{subtitle}</p> : null}
          </div>

          {ctas.length > 0 ? (
            <div className="actions">
              {ctas.map((cta, i) => {
                const resolvedHref = resolveCtaHref(cta.href, website, basePath);
                const isWhatsApp =
                  cta.href === '{{whatsapp}}' || cta.href === 'whatsapp' || resolvedHref.includes('wa.me');
                if (isWhatsApp) {
                  return (
                    <WaflowCTAButton
                      key={`${cta.label}-${i}`}
                      variant="A"
                      fallbackHref={resolvedHref}
                      className={ctaClassFor(cta.variant, i)}
                    >
                      {cta.label}
                      {Icons.whatsapp({ size: 16 })}
                    </WaflowCTAButton>
                  );
                }
                return (
                  <a
                    key={`${cta.label}-${i}`}
                    href={resolvedHref}
                    className={ctaClassFor(cta.variant, i)}
                    style={i > 0 && !cta.variant ? { color: '#fff' } : undefined}
                  >
                    {cta.label}
                    {cta.variant === 'ghost' ? (
                      Icons.whatsapp({ size: 16 })
                    ) : (
                      Icons.arrow({ size: 14 })
                    )}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CtaSection;
