/**
 * editorial-v1 Guarantee Badges section.
 *
 * Port of the `trust-row` pattern from designer reference details.jsx.
 * Renders a grid of credibility/guarantee badges — icon + bold label +
 * optional description — used to reinforce trust below the hero or near CTAs.
 *
 * Content contract:
 *   title?:   string  — optional section heading
 *   badges:   Array<{ icon, label, description? }>
 *
 * Icon mapping (from content `icon` string → Icons primitive):
 *   rotate_ccw, refresh → check
 *   lock, secure        → shield
 *   dollar, money, price → check
 *   headphones, support → users
 *   <unknown>           → shield (safe fallback)
 *
 * Server component. No client JS.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { Icons, type IconName } from '../primitives/icons';
import { localizeEditorialText } from '../i18n';

export interface EditorialGuaranteeBadgesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface BadgeItem {
  icon: string;
  label: string;
  description?: string;
}

interface GuaranteeBadgesContent {
  title?: string;
  badges?: BadgeItem[];
}

/**
 * Map authored icon string → available IconName.
 * Falls back to 'shield' for unknowns.
 */
function resolveIconName(raw: string): IconName {
  const key = (raw ?? '').toLowerCase().trim();

  const ICON_MAP: Record<string, IconName> = {
    rotate_ccw: 'check',
    refresh: 'check',
    dollar: 'check',
    money: 'check',
    price: 'check',
    payment: 'check',
    lock: 'shield',
    secure: 'shield',
    safety: 'shield',
    headphones: 'users',
    support: 'users',
    people: 'users',
    team: 'users',
    clock: 'clock',
    time: 'clock',
    heart: 'heart',
    award: 'award',
    star: 'star',
    globe: 'globe',
    leaf: 'leaf',
    compass: 'compass',
    sparkle: 'sparkle',
    check: 'check',
    shield: 'shield',
    users: 'users',
  };

  return ICON_MAP[key] ?? 'shield';
}

function BadgeCard({ badge, website }: { badge: BadgeItem; website: WebsiteData }): ReactElement {
  const iconName = resolveIconName(badge.icon);
  const IconFn = Icons[iconName] as (p?: { size?: number }) => ReactElement;
  const label = localizeEditorialText(website, badge.label);
  const description = badge.description
    ? localizeEditorialText(website, badge.description)
    : '';

  return (
    <div
      className="gb-card"
      style={{
        background: 'var(--c-surface, #f9fafb)',
        border: '1px solid var(--c-border, #e5e7eb)',
        borderRadius: 12,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span
        className="gb-icon"
        aria-hidden="true"
        style={{
          color: 'var(--c-primary, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          background: 'var(--c-primary-10, rgba(59,130,246,0.1))',
          borderRadius: 8,
        }}
      >
        {IconFn({ size: 20 })}
      </span>

      <b className="label" style={{ fontWeight: 700, color: 'var(--c-ink, #111)' }}>
        {label}
      </b>

      {description ? (
        <p
          className="body-md"
          style={{ margin: 0, color: 'var(--c-ink-2, #6b7280)', fontSize: '0.875rem' }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function GuaranteeBadgesSection({
  section,
  website,
}: EditorialGuaranteeBadgesSectionProps): ReactElement | null {
  const content = (section.content || {}) as GuaranteeBadgesContent;

  const badges: BadgeItem[] = Array.isArray(content.badges)
    ? content.badges.filter(
        (b): b is BadgeItem => !!b && typeof b.label === 'string' && b.label.trim().length > 0,
      )
    : [];

  if (badges.length === 0) return null;

  const title = localizeEditorialText(website, content.title?.trim() || '');

  return (
    <section
      className="ev-section ev-guarantee-badges"
      data-screen-label="GuaranteeBadges"
      aria-label={title || 'Garantías'}
    >
      <div className="ev-container">
        {title ? (
          <header className="ev-section-head" style={{ marginBottom: 28 }}>
            <h2 className="headline-lg">{title}</h2>
          </header>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
            gap: 16,
          }}
        >
          {badges.map((badge, i) => (
            <BadgeCard key={`${badge.label}-${i}`} badge={badge} website={website} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default GuaranteeBadgesSection;
