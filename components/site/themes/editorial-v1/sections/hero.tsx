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
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

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
  featuredDestinations?: Array<{
    slug?: string | null;
    headline?: string | null;
    heroImageUrl?: string | null;
    featuredOrder?: number | null;
  }>;
}

// ---------- Constants ----------
// Kept as module-level getters so the server component pays the lookup once.
const DEFAULT_FALLBACK_SLIDES: HeroRotatorSlide[] = [
  { city: 'Cartagena', region: 'Caribe', imageUrl: null, alt: 'Cartagena · Colombia' },
  { city: 'Tayrona', region: 'Sierra', imageUrl: null, alt: 'Tayrona · Colombia' },
  { city: 'Eje Cafetero', region: 'Andes', imageUrl: null, alt: 'Eje Cafetero · Colombia' },
  { city: 'Medellín', region: 'Antioquia', imageUrl: null, alt: 'Medellín · Colombia' },
];

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

function humanizeSlug(slug: string | undefined | null): string {
  if (!slug) return '';
  const decoded = decodeURIComponent(slug);
  return decoded
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const editorialText = getEditorialTextGetter(website);
  const defaultEyebrow = editorialText('editorialHeroEyebrowFallback');
  const defaultSideListLabel = editorialText('editorialHeroSideListLabel');
  const content = (section.content || {}) as HeroContent;
  const basePath = getBasePath(website.subdomain, false);

  const eyebrow = localizeEditorialText(website, content.eyebrow?.trim() || defaultEyebrow);
  const sanitizedHeadline = sanitizeHeadline(localizeEditorialText(website, content.headline));
  const subtitle = localizeEditorialText(website, content.subtitle?.trim() || '');
  const trustChip = content.trustChip;

  const authoredSlides: HeroRotatorSlide[] = Array.isArray(content.slides)
    ? content.slides
        .filter((s) => s && (s.imageUrl || s.city))
        .map((s) => ({
          imageUrl: s.imageUrl || null,
          city: s.city,
          alt: s.alt,
          region: s.region || s.city,
        }))
    : [];

  const featuredSlides: HeroRotatorSlide[] = Array.isArray(content.featuredDestinations)
    ? [...content.featuredDestinations]
        .sort((a, b) => Number(a?.featuredOrder ?? 9999) - Number(b?.featuredOrder ?? 9999))
        .map((dest) => {
          const city = (dest?.headline ?? '').toString().trim() || humanizeSlug(dest?.slug);
          if (!city && !dest?.heroImageUrl) return null;
          return {
            imageUrl: dest?.heroImageUrl || null,
            city,
            alt: city ? `${city} · Colombia` : undefined,
            region: city || undefined,
          } as HeroRotatorSlide;
        })
        .filter((slide): slide is HeroRotatorSlide => Boolean(slide))
    : [];

  const slides: HeroRotatorSlide[] = authoredSlides.length > 0
    ? authoredSlides
    : featuredSlides.length > 0
      ? featuredSlides
      : DEFAULT_FALLBACK_SLIDES;

  const ctas: HeroCtaContent[] = Array.isArray(content.ctas)
    ? content.ctas
        .filter((c) => c && c.label)
        .map((c) => ({ ...c, label: localizeEditorialText(website, c.label) }))
    : [];

  const authoredSideList: HeroSideListItem[] = Array.isArray(content.sideList)
    ? content.sideList.filter((x) => x && x.label)
    : [];

  const sideListFromSlides: HeroSideListItem[] =
    authoredSideList.length === 0
      ? slides
          .map((slide, index) => ({
            label: (slide.city ?? '').trim(),
            badge: (slide.region ?? '').trim() || String(index + 1).padStart(2, '0'),
          }))
          .filter((item) => item.label.length > 0)
          .slice(0, 4)
      : [];

  const sideList: HeroSideListItem[] =
    authoredSideList.length > 0 ? authoredSideList : sideListFromSlides;

  const searchEnabled = content.search?.enabled === true;
  const placeholders = searchPlaceholders(content.search);

  const hasSlides = slides.length > 0;

  return (
    <section className="hero" data-screen-label="Hero">
      {hasSlides ? (
        <HeroRotator
          slides={slides}
          ariaLabel={editorialText('editorialHeroSlidesAria')}
          locale={(website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? website.default_locale ?? website.content?.locale ?? 'es-CO'}
        />
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
              {ctas.map((cta, i) => {
                const resolvedHref = resolveCtaHref(cta.href, website, basePath);
                const isWhatsApp = cta.href === '{{whatsapp}}' || cta.href === 'whatsapp' || resolvedHref.includes('wa.me');
                return (
                  <a
                    key={`${cta.label}-${i}`}
                    href={resolvedHref}
                    className={ctaClassFor(cta.variant)}
                  >
                    {isWhatsApp ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    ) : null}
                    {cta.label}
                    {!isWhatsApp ? <Icons.arrow size={14} /> : null}
                  </a>
                );
              })}
            </div>
          ) : null}

          {searchEnabled ? (
            <div style={{ marginTop: 36, maxWidth: 720 }}>
              <HeroSearch
                placeholders={placeholders}
                basePath={basePath}
                locale={(website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? website.default_locale ?? website.content?.locale ?? 'es-CO'}
              />
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
                {defaultSideListLabel}
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
