/**
 * editorial-v1 Trust Bar (F1 variant).
 *
 * Port of `TrustBarF1` in
 *   themes/references/claude design 1/project/waflow.jsx
 *
 * Dark horizontal strip rendered below the hero. Displays short status +
 * credibility badges (green live dot, RNT/licence, human review, rating).
 *
 * Content contract — all optional. When `content.items` is present we use
 * it verbatim (authored/templated strings win). Otherwise we derive a
 * sensible default badge set from `content.brandClaims` (injected by
 * Wave 2.7 hydration) + website copy tokens, falling back to editorial
 * defaults so the bar always has something to say.
 *
 * Each authored item supports:
 *   icon?:  'dot' | 'shield' | 'users' | 'star' | 'award' | 'check' | ...
 *   bold?:  string  — the strong prefix (colour #fff)
 *   body?:  string  — the light grey trailing text
 *   live?:  boolean — renders the green pulse dot (overrides icon)
 *
 * Server component. No state, no interactivity.
 */

import type { ReactElement } from 'react';
import type { BrandClaims } from '@bukeer/website-contract';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { PublicUiExtraTextKey } from '@/lib/site/public-ui-extra-text';
import { getEditorialTextGetter } from '../i18n';

import { Icons, type IconName } from '../primitives/icons';

export interface EditorialTrustBarSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface TrustBarItem {
  icon?: string;
  bold?: string;
  body?: string;
  live?: boolean;
}

interface TrustBarContent {
  items?: TrustBarItem[];
  brandClaims?: BrandClaims | null;
  liveLabel?: string;
  liveResponseTime?: string;
  /** Optional "Reconocidos por" partner row — array of label strings */
  logos?: Array<{ label: string; serif?: boolean } | string> | string;
  logosLabel?: string;
}

interface TrustLogo {
  label: string;
  serif?: boolean;
}

interface WebsiteTrustContent {
  rnt_number?: string;
  years_active?: number;
}

const RNT_TOKEN_RE = /\br\.?\s*n\.?\s*t\.?\b/i;

const KNOWN_LOGO_TOKENS = [
  'ProColombia',
  'ANATO',
  "Travellers' Choice",
  'Travellers Choice',
  'MinCIT',
  'Rainforest Alliance',
] as const;

function splitLegacyLogoString(raw: string): TrustLogo[] {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  if (/[|;,·]/.test(cleaned)) {
    return cleaned
      .split(/[|;,·]/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
  }

  const matched: TrustLogo[] = [];
  let cursor = cleaned;
  for (const token of KNOWN_LOGO_TOKENS) {
    const idx = cursor.indexOf(token);
    if (idx === -1) continue;
    if (idx > 0) {
      const before = cursor.slice(0, idx).trim();
      if (before) matched.push({ label: before });
    }
    matched.push({ label: token });
    cursor = cursor.slice(idx + token.length).trim();
  }
  if (cursor) matched.push({ label: cursor });

  if (matched.length > 1) return matched;
  return [{ label: cleaned }];
}

function normalizeLogos(input: TrustBarContent['logos']): TrustLogo[] {
  const list: TrustLogo[] = [];
  const pushLabel = (label: string, serif?: boolean) => {
    const normalized = label.replace(/\s+/g, ' ').trim();
    if (!normalized) return;
    list.push({ label: normalized, serif });
  };

  if (typeof input === 'string') {
    return splitLegacyLogoString(input);
  }

  if (!Array.isArray(input)) return list;

  for (const item of input) {
    if (typeof item === 'string') {
      for (const parsed of splitLegacyLogoString(item)) {
        pushLabel(parsed.label, parsed.serif);
      }
      continue;
    }
    if (item && typeof item.label === 'string') {
      pushLabel(item.label, item.serif);
    }
  }

  return list;
}

function normalizeCompare(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasRntToken(value: string): boolean {
  return RNT_TOKEN_RE.test(value);
}

function inferIcon(item: TrustBarItem): IconName | undefined {
  const text = normalizeCompare(`${item.bold ?? ''} ${item.body ?? ''}`);
  if (!text) return undefined;
  if (text.includes('rnt') || text.includes('registro') || text.includes('operador')) return 'shield';
  if (text.includes('rese') || text.includes('rating') || text.includes('/5')) return 'star';
  if (text.includes('humano') || text.includes('verificado') || text.includes('revisado')) return 'check';
  if (text.includes('planner') || text.includes('viajero') || text.includes('equipo')) return 'users';
  return 'award';
}

function resolveIcon(raw: string | undefined, item: TrustBarItem): IconName | undefined {
  const key = (raw ?? '').toLowerCase().trim() as IconName;
  if (key && key in Icons) return key;
  return inferIcon(item);
}

function dedupeAndResolveItems(items: TrustBarItem[]): TrustBarItem[] {
  const out: TrustBarItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const bold = item.bold?.trim() ?? '';
    const body = item.body?.trim() ?? '';
    if (!bold && !body) continue;
    const dedupeKey = normalizeCompare(`${bold} ${body}`);
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      ...item,
      bold: bold || undefined,
      body: body || undefined,
      icon: item.live ? undefined : resolveIcon(item.icon, item),
    });
  }
  return out;
}

function dedupeLogos(logos: TrustLogo[]): TrustLogo[] {
  const out: TrustLogo[] = [];
  const seen = new Set<string>();
  for (const logo of logos) {
    const label = logo.label.trim();
    if (!label) continue;
    const key = normalizeCompare(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...logo, label });
  }
  return out;
}

function resolveYearsInOperation(
  claims: BrandClaims | null | undefined,
  trust: WebsiteTrustContent | null | undefined,
): number | null {
  if (typeof trust?.years_active === 'number' && trust.years_active > 0) {
    return trust.years_active;
  }
  if (typeof claims?.yearsInOperation === 'number' && claims.yearsInOperation > 0) {
    return claims.yearsInOperation;
  }
  return null;
}

function resolveRntNumber(trust: WebsiteTrustContent | null | undefined): string | null {
  const value = trust?.rnt_number?.trim();
  return value ? value : null;
}

function buildDefaultItems(
  claims: BrandClaims | null | undefined,
  trust: WebsiteTrustContent | null | undefined,
  content: TrustBarContent,
  editorialText: (key: PublicUiExtraTextKey) => string,
  locale: string,
): TrustBarItem[] {
  const items: TrustBarItem[] = [];
  const yearsInOperation = resolveYearsInOperation(claims, trust);
  const rntNumber = resolveRntNumber(trust);

  // 1. Live / planners online (always show)
  items.push({
    live: true,
    bold: content.liveLabel?.trim() || editorialText('editorialTrustLiveLabel'),
    body: content.liveResponseTime?.trim()
      ? `${editorialText('editorialTrustResponsePrefix')}${content.liveResponseTime.trim()}`
      : editorialText('editorialTrustResponseFallback'),
  });

  // 2. Legal/operator signal (prefer RNT when present).
  if (rntNumber) {
    items.push({
      icon: 'shield',
      bold: `RNT ${rntNumber}`,
      body: yearsInOperation
        ? `${yearsInOperation} ${editorialText('editorialTrustYearsSuffix')}`
        : editorialText('editorialTrustCertified'),
    });
  } else if (yearsInOperation) {
    items.push({
      icon: 'shield',
      bold: `${yearsInOperation} ${editorialText('editorialTrustYearsSuffix')}`,
      body: editorialText('editorialTrustCertified'),
    });
  }

  // 3. Total reviews / rating
  if (claims?.avgRating && claims?.totalReviews && claims.totalReviews > 0) {
    items.push({
      icon: 'star',
      bold: `${claims.avgRating.toFixed(1)}/5`,
      body: `${claims.totalReviews.toLocaleString(locale)}+ ${editorialText('editorialTrustVerifiedSuffix')}`,
    });
  } else if (claims?.avgRating) {
    items.push({
      icon: 'star',
      bold: `${claims.avgRating.toFixed(1)}/5`,
      body: editorialText('editorialTrustRatingAverage'),
    });
  }

  // 4. Satisfaction % (if available)
  if (claims?.satisfactionPct && claims.satisfactionPct > 0) {
    items.push({
      icon: 'users',
      bold: `${claims.satisfactionPct}% ${editorialText('editorialTrustSatisfactionSuffix')}`,
      body: editorialText('editorialTrustRecommendation'),
    });
  } else if (items.length < 4) {
    items.push({
      icon: 'users',
      bold: editorialText('editorialTrustHumanReview'),
      body: editorialText('editorialTrustHumanReviewBody'),
    });
  }

  return items.slice(0, 4);
}

function renderItemIcon(item: TrustBarItem): ReactElement | null {
  if (item.live) {
    return <span className="dot-live" aria-hidden="true" />;
  }
  const key = (item.icon ?? '').toLowerCase().trim();
  if (!key) return null;
  const IconFn = (Icons as Record<string, (p?: { size?: number }) => ReactElement>)[
    key as IconName
  ];
  if (!IconFn) return null;
  return (
    <span className="ic" aria-hidden="true">
      {IconFn({ size: 16 })}
    </span>
  );
}

export function TrustBarSection({
  section,
  website,
}: EditorialTrustBarSectionProps): ReactElement | null {
  const editorialText = getEditorialTextGetter(website);
  const locale = (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale || website.default_locale || website.content?.locale || 'es-CO';
  const content = (section.content || {}) as TrustBarContent;
  const websiteTrust = (website.content as { trust?: WebsiteTrustContent | null } | null | undefined)?.trust;

  const authoredItems: TrustBarItem[] = Array.isArray(content.items)
    ? content.items.filter(
        (item): item is TrustBarItem => !!item && (item.bold ?? item.body) != null,
      )
    : [];

  const items =
    authoredItems.length > 0
      ? authoredItems
      : buildDefaultItems(content.brandClaims, websiteTrust, content, editorialText, locale);

  const resolvedItems = dedupeAndResolveItems(items);
  if (resolvedItems.length === 0) return null;

  const hasRntInItems = resolvedItems.some((item) =>
    hasRntToken(`${item.bold ?? ''} ${item.body ?? ''}`),
  );
  const logos = dedupeLogos(normalizeLogos(content.logos)).filter(
    (logo) => !(hasRntInItems && hasRntToken(logo.label)),
  );

  return (
    <>
      <section
        className="trust-bar-f1"
        data-screen-label="TrustBar"
        aria-label={editorialText('editorialTrustAriaLabel')}
      >
        <div className="ev-container inner">
          {resolvedItems.map((item, i) => (
            <span className="item" key={`${item.bold}-${i}`}>
              {renderItemIcon(item)}
              {item.bold ? <b>{item.bold}</b> : null}
              {item.bold && item.body ? ' · ' : ''}
              {item.body ? <span>{item.body}</span> : null}
            </span>
          ))}
        </div>
      </section>
      {logos.length > 0 && (
        <section className="trust-reconocidos" aria-label="Reconocidos por">
          <div className="ev-container trust-logos-inner">
            <span className="trust-logos-label">
              <span className="trust-logos-label-icon" aria-hidden="true">
                {Icons.award({ size: 12 })}
              </span>
              {content.logosLabel || editorialText('editorialTrustLogosLabel')}
            </span>
            <div className="trust-logos-list">
              {logos.map((logo, i) => {
                const hasNext = i < logos.length - 1;
                return (
                  <span key={`${logo.label}-${i}`} className="trust-logo-item-wrap">
                    <span className={logo.serif ? 'serif trust-logo-item' : 'trust-logo-item'}>
                      {logo.label}
                    </span>
                    {hasNext ? <span className="trust-logo-sep" aria-hidden="true">•</span> : null}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default TrustBarSection;
