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
}

function buildDefaultItems(
  claims: BrandClaims | null | undefined,
  content: TrustBarContent,
  editorialText: (key: PublicUiExtraTextKey) => string,
  locale: string,
): TrustBarItem[] {
  const items: TrustBarItem[] = [];

  // 1. Live / planners online (always show)
  items.push({
    live: true,
    bold: content.liveLabel?.trim() || editorialText('editorialTrustLiveLabel'),
    body: content.liveResponseTime?.trim()
      ? `${editorialText('editorialTrustResponsePrefix')}${content.liveResponseTime.trim()}`
      : editorialText('editorialTrustResponseFallback'),
  });

  // 2. Years in operation (if available)
  if (claims?.yearsInOperation && claims.yearsInOperation > 0) {
    items.push({
      icon: 'shield',
      bold: `${claims.yearsInOperation} ${editorialText('editorialTrustYearsSuffix')}`,
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
  const locale = (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale || 'es-CO';
  const content = (section.content || {}) as TrustBarContent;

  const authoredItems: TrustBarItem[] = Array.isArray(content.items)
    ? content.items.filter(
        (item): item is TrustBarItem => !!item && (item.bold ?? item.body) != null,
      )
    : [];

  const items =
    authoredItems.length > 0
      ? authoredItems
      : buildDefaultItems(content.brandClaims, content, editorialText, locale);

  if (items.length === 0) return null;

  return (
    <section
      className="trust-bar-f1"
      data-screen-label="TrustBar"
      aria-label={editorialText('editorialTrustAriaLabel')}
    >
      <div className="ev-container inner">
        {items.map((item, i) => (
          <span className="item" key={`${item.bold}-${i}`}>
            {renderItemIcon(item)}
            {item.bold ? <b>{item.bold}</b> : null}
            {item.bold && item.body ? ' · ' : ''}
            {item.body ? <span>{item.body}</span> : null}
          </span>
        ))}
      </div>
    </section>
  );
}

export default TrustBarSection;
