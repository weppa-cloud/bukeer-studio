/**
 * editorial-v1 Hero section.
 *
 * Port of designer `HeroF1` in
 *   themes/references/claude design 1/project/app_f1.jsx
 * + search panel from the legacy `Hero` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Server component. The slide rotation, dots and search form are delegated
 * to the two tiny client leaves (`HeroRotator`, `HeroSearch`) so the rest of
 * the markup stays server-rendered (good for LCP / SEO).
 *
 * Content shape lives under `section.content` and is camelCase — the parent
 * `renderSection` pipeline normalizes snake_case → camelCase before passing
 * the section in. Supported keys (all optional, sensible fallbacks apply):
 *
 *   eyebrow?:    string              — small kicker above H1
 *   headline?:   string              — may contain `<em>` and `<br>` markers
 *   subtitle?:   string              — lead paragraph
 *   ctas?:       { label, href, variant? }[]  — primary + ghost buttons
 *   sideList?:   { label, href?, badge? }[]   — right-column featured list
 *   slides?:     { imageUrl, city, alt? }[]   — background rotator
 *   search?:     { enabled, placeholder* }    — 3-field search form
 *   trustChip?:  { icon?, label }             — small trust indicator above H1
 *
 * WhatsApp CTA resolution: we read `website.content.social.whatsapp` (the
 * current contract). The plan calls out a future `websites.contact_whatsapp`
 * column — when it ships, resolve it here and prefer it over social. Until
 * then, if the operator hasn't configured WhatsApp, the CTA href falls back
 * to `#cta` so the button still renders with a visible TODO in code (not in
 * the DOM — users just see the button).
 */

import type { CSSProperties, ReactElement } from 'react';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { Icons } from '../primitives/icons';
import { HeroRotator, type HeroRotatorSlide } from './hero-rotator.client';
import { HeroSearch, type HeroSearchPlaceholders } from './hero-search.client';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

// ---------- Props ----------
export interface EditorialHeroSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface HeroCtaContent {
  label?: string;
  href?: string;
  variant?: 'primary' | 'ghost' | 'accent' | 'outline' | 'ink';
}

interface HeroSideListItem {
  label?: string;
  href?: string;
  badge?: string;
}

interface HeroSlideContent {
  imageUrl?: string | null;
  city?: string;
  alt?: string;
  region?: string;
}

interface HeroSearchContent {
  enabled?: boolean;
  placeholderDestino?: string;
  placeholderFechas?: string;
  placeholderViajeros?: string;
  placeholderCta?: string;
}

interface HeroTrustChipContent {
  icon?: string;
  label?: string;
}

interface HeroContent {
  eyebrow?: string;
  headline?: string;
  subtitle?: string;
  ctas?: HeroCtaContent[];
  sideList?: HeroSideListItem[];
  slides?: HeroSlideContent[];
  search?: HeroSearchContent;
  trustChip?: HeroTrustChipContent;
}

// ---------- Constants ----------
// Kept as module-level getters so the server component pays the lookup once.
const DEFAULT_EYEBROW = editorialText('editorialHeroEyebrowFallback');
const DEFAULT_SIDE_LIST_LABEL = editorialText('editorialHeroSideListLabel');

// ---------- Markup sanitizer for headline ----------
// Headlines come from the operator-controlled `section.content.headline` and
// are expected to carry `<em>` (serif italic accent-2) and `<br>` markers
// verbatim from the designer copy catalog. We trust the source but still
// enforce a very narrow allowlist — anything outside `<em>` / `<br>` is
// stripped. Comments and CDATA are rejected outright.
const ALLOWED_HEADLINE_TAGS = new Set(['em', 'br']);

function sanitizeHeadline(raw: string | undefined | null): string {
  if (!raw) return '';
  // Drop comments + CDATA wholesale.
  const noComments = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  // Replace any tag that isn't in the allowlist with nothing. Attributes on
  // the allowed tags are stripped: `<em class="x">` → `<em>`, `<br/>` → `<br>`.
  return noComments.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, name) => {
    const tag = String(name).toLowerCase();
    if (!ALLOWED_HEADLINE_TAGS.has(tag)) return '';
    const isClosing = match.startsWith('</');
    if (tag === 'br') return '<br>';
    return isClosing ? `</${tag}>` : `<${tag}>`;
  });
}

// ---------- Helpers ----------
function resolveWhatsAppHref(website: WebsiteData, fallback: string): string {
  // TODO(editorial-v1): prefer `website.contact_whatsapp` once that column
  // ships (see `.claude/plans/piped-finding-popcorn.md`, "Schema additions").
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
  // Passthrough absolute URLs and wa.me links untouched.
  if (/^(https?:|mailto:|tel:|wa\.me)/.test(href)) return href;
  // Magic token: `{{whatsapp}}` resolves to the site's WhatsApp URL.
  if (href === '{{whatsapp}}' || href === 'whatsapp') {
    return resolveWhatsAppHref(website, `${basePath}/#cta`);
  }
  if (href.startsWith('#') || href.startsWith('/')) return `${basePath}${href}`;
  return href;
}

function ctaClassFor(variant: HeroCtaContent['variant']): string {
  switch (variant) {
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

function searchPlaceholders(
  search: HeroSearchContent | undefined,
): HeroSearchPlaceholders {
  return {
    destino: search?.placeholderDestino,
    fechas: search?.placeholderFechas,
    viajeros: search?.placeholderViajeros,
    cta: search?.placeholderCta,
  };
}

// ---------- Section ----------
export function HeroSection({
  section,
  website,
}: EditorialHeroSectionProps): ReactElement {
  const content = (section.content || {}) as HeroContent;
  const basePath = getBasePath(website.subdomain, false);

  const eyebrow = content.eyebrow?.trim() || DEFAULT_EYEBROW;
  const sanitizedHeadline = sanitizeHeadline(content.headline);
  const subtitle = content.subtitle?.trim() || '';
  const trustChip = content.trustChip;

  const slides: HeroRotatorSlide[] = Array.isArray(content.slides)
    ? content.slides
        .filter((s) => s && (s.imageUrl || s.city))
        .map((s) => ({
          imageUrl: s.imageUrl || null,
          city: s.city,
          alt: s.alt,
          region: s.region || s.city,
        }))
    : [];

  const ctas: HeroCtaContent[] = Array.isArray(content.ctas)
    ? content.ctas.filter((c) => c && c.label)
    : [];

  const sideList: HeroSideListItem[] = Array.isArray(content.sideList)
    ? content.sideList.filter((x) => x && x.label)
    : [];

  const searchEnabled = content.search?.enabled === true;
  const placeholders = searchPlaceholders(content.search);

  const hasSlides = slides.length > 0;

  return (
    <section className="hero" data-screen-label="Hero">
      {hasSlides ? (
        <HeroRotator slides={slides} ariaLabel={editorialText('editorialHeroSlidesAria')} />
      ) : (
        <div className="hero-media" aria-hidden="true">
          <div className="scenic" />
        </div>
      )}

      <div className="ev-container hero-inner">
        <div className="hero-copy">
          {trustChip?.label ? (
            <span className="hero-trust-chip" style={trustChipStyle}>
              <span
                aria-hidden="true"
                style={trustChipDotStyle}
              />
              {trustChip.label}
            </span>
          ) : null}

          <span className="eyebrow hero-eyebrow">{eyebrow}</span>

          {sanitizedHeadline ? (
            <h1
              className="display-xl"
              dangerouslySetInnerHTML={{ __html: sanitizedHeadline }}
            />
          ) : null}

          {subtitle ? <p className="lead">{subtitle}</p> : null}

          {ctas.length > 0 ? (
            <div className="hero-cta">
              {ctas.map((cta, i) => (
                <a
                  key={`${cta.label}-${i}`}
                  href={resolveCtaHref(cta.href, website, basePath)}
                  className={ctaClassFor(cta.variant)}
                >
                  {cta.label}
                  <Icons.arrow size={14} />
                </a>
              ))}
            </div>
          ) : null}

          {searchEnabled ? (
            <div style={{ marginTop: 36, maxWidth: 720 }}>
              <HeroSearch placeholders={placeholders} basePath={basePath} />
            </div>
          ) : null}
        </div>

        {sideList.length > 0 ? (
          <aside>
            <div className="hero-side-list">
              <span
                className="eyebrow hero-eyebrow"
                style={{ marginBottom: 12 }}
              >
                {DEFAULT_SIDE_LIST_LABEL}
              </span>
              {sideList.map((item, i) => {
                const index = String(i + 1).padStart(2, '0');
                const node = (
                  <>
                    <b
                      style={{
                        opacity: 0.6,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {index}
                    </b>
                    <span>{item.label}</span>
                    {item.badge ? <span>{item.badge}</span> : <span />}
                  </>
                );
                return item.href ? (
                  <a key={i} href={item.href} className="item">
                    {node}
                  </a>
                ) : (
                  <div key={i} className="item">
                    {node}
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

// ---------- Inline styles (one-offs; keep trust chip visuals close to F1) ----
const trustChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: 'rgba(255,255,255,0.88)',
  fontSize: 13,
  marginBottom: 12,
};

const trustChipDotStyle: CSSProperties = {
  display: 'inline-block',
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: '#22c55e',
  boxShadow: '0 0 0 3px rgba(34,197,94,.25)',
};

export default HeroSection;
