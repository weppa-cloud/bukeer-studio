/**
 * editorial-v1 Promise section (about → promise editorial variant).
 *
 * Port of designer `Promise` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Two-column dark panel:
 *  - left: eyebrow + h2 (with `<em>` emphasis markers preserved) + subtitle
 *    + optional primary CTA.
 *  - right: ordered feature list. Each feature has icon (by key), title, desc.
 *    List items are divider-separated rows ported from the `.promise .feat`
 *    designer layout.
 *
 * Server component. No state, no hooks.
 *
 * Content contract (normalized camelCase):
 *   eyebrow?:     string
 *   title?:       string         — may contain `<em>` (kept verbatim in DOM)
 *   subtitle?:    string
 *   features?:    Array<{ icon?: string; title: string; description: string }>
 *   ctaLabel?:    string
 *   ctaUrl?:      string         — also accepts `{{whatsapp}}` magic token.
 *
 * Registered under `about` in `editorialV1SectionComponents`. Generic about
 * sections authored in the DB get this visual treatment when the website
 * template set resolves to `editorial-v1`.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';

import { Eyebrow } from '../primitives/eyebrow';
import { Icons, type IconName } from '../primitives/icons';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';
import { WaflowCTAButton } from '../waflow/cta-button';

export interface EditorialPromiseSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface PromiseFeature {
  icon?: string;
  title?: string;
  description?: string;
}

interface PromiseContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  features?: PromiseFeature[];
  ctaLabel?: string;
  ctaUrl?: string;
}

const DEFAULT_EYEBROW_KEY = 'editorialPromiseEyebrowFallback';
const DEFAULT_TITLE_KEY = 'editorialPromiseTitleFallback';
const DEFAULT_FEATURE_ICONS: IconName[] = ['pin', 'shield', 'leaf', 'sparkle', 'users', 'award'];

import { editorialHtml } from '../primitives/rich-heading';

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

function renderIcon(iconKey: string | undefined, fallback: IconName): ReactElement {
  const key = (iconKey ?? '').toLowerCase().trim();
  const Icon = (key && (Icons as Record<string, (p?: { size?: number }) => ReactElement>)[key]) || Icons[fallback];
  return Icon({ size: 22 });
}

export function PromiseSection({
  section,
  website,
}: EditorialPromiseSectionProps): ReactElement {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as PromiseContent;
  const basePath = getBasePath(website.subdomain, Boolean((website as { isCustomDomain?: boolean }).isCustomDomain));

  const eyebrow = localizeEditorialText(
    website,
    content.eyebrow?.trim() || editorialText(DEFAULT_EYEBROW_KEY),
  );
  const sanitizedTitle = editorialHtml(
    localizeEditorialText(website, content.title)
    || localizeEditorialText(website, editorialText(DEFAULT_TITLE_KEY)),
  );
  const subtitleHtml = editorialHtml(localizeEditorialText(website, content.subtitle?.trim() || ''));

  const features: PromiseFeature[] = Array.isArray(content.features)
    ? content.features
        .filter((f): f is PromiseFeature => !!f && typeof f.title === 'string' && f.title.trim().length > 0)
        .slice(0, 6)
    : [];

  const ctaLabel = localizeEditorialText(website, content.ctaLabel?.trim() || '');
  const ctaHref = ctaLabel ? resolveCtaHref(content.ctaUrl, website, basePath) : '';
  const isWhatsappCta =
    content.ctaUrl === '{{whatsapp}}' || content.ctaUrl === 'whatsapp' || ctaHref.includes('wa.me');

  return (
    <section
      className="ev-section ev-promise"
      data-screen-label="Promise"
      aria-label={eyebrow}
    >
      <div className="ev-container">
        <div className="promise">
          <div>
            <Eyebrow tone="light">{eyebrow}</Eyebrow>
            {sanitizedTitle ? (
              <h2
                className="display-md"
                dangerouslySetInnerHTML={sanitizedTitle}
              />
            ) : null}
            {subtitleHtml ? (
              <p className="lead" dangerouslySetInnerHTML={subtitleHtml} />
            ) : null}
            {ctaLabel ? (
              <div style={{ marginTop: 28 }}>
                {isWhatsappCta ? (
                  <WaflowCTAButton variant="A" fallbackHref={ctaHref} className="btn btn-accent">
                    {ctaLabel}
                    <Icons.arrow size={14} />
                  </WaflowCTAButton>
                ) : (
                  <a href={ctaHref} className="btn btn-accent">
                    {ctaLabel}
                    <Icons.arrow size={14} />
                  </a>
                )}
              </div>
            ) : null}
          </div>
          <div className="list" role="list">
            {features.map((f, i) => (
              <div className="feat" key={`${f.title}-${i}`} role="listitem">
                <div className="ic" aria-hidden="true">
                  {renderIcon(f.icon, DEFAULT_FEATURE_ICONS[i] ?? 'sparkle')}
                </div>
                <div>
                  <b>{localizeEditorialText(website, f.title)}</b>
                  {f.description ? <p>{localizeEditorialText(website, f.description)}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromiseSection;
