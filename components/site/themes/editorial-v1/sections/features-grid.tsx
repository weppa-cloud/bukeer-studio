/**
 * editorial-v1 Features Grid.
 *
 * Responsive 2×2 / 2×3 grid of feature cards. Each card renders a mapped
 * icon (Material icon name → Icons primitive), a bold title, and body text.
 * Unknown icon names fall back to `Icons.shield`.
 *
 * Content contract:
 *   title?:   string
 *   items:    Array<{ icon: string; title: string; description: string }>
 *
 * Server component. No state, no interactivity.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { localizeEditorialText } from '../i18n';
import { Icons, type IconName } from '../primitives/icons';
import { editorialHtml } from '../primitives/rich-heading';

export interface EditorialFeaturesGridSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface FeatureItem {
  icon?: string;
  title?: string;
  description?: string;
}

interface FeaturesGridContent {
  title?: string;
  items?: FeatureItem[];
}

/**
 * Maps Material Design icon names (as stored in DB) to Icons primitive keys.
 * Unmapped names fall back to 'shield'.
 */
const ICON_MAP: Record<string, IconName> = {
  // Material icon name → IconName
  verified: 'shield',
  security: 'shield',
  verified_user: 'shield',
  shield: 'shield',
  support_agent: 'users',
  people: 'users',
  group: 'users',
  local_offer: 'sparkle',
  sell: 'sparkle',
  star: 'star',
  star_rate: 'star',
  grade: 'star',
  award: 'award',
  emoji_events: 'award',
  public: 'globe',
  language: 'globe',
  map: 'map',
  place: 'pin',
  location_on: 'pin',
  room: 'pin',
  nature: 'leaf',
  eco: 'leaf',
  explore: 'compass',
  navigation: 'compass',
  search: 'search',
  favorite: 'heart',
  favorite_border: 'heart',
  schedule: 'clock',
  access_time: 'clock',
  timer: 'clock',
  event: 'calendar',
  date_range: 'calendar',
  check_circle: 'check',
  done: 'check',
  done_all: 'check',
  close: 'close',
  cancel: 'close',
  add: 'plus',
  add_circle: 'plus',
  grid_view: 'grid',
  dashboard: 'grid',
  auto_awesome: 'sparkle',
  flare: 'sparkle',
};

function resolveIcon(rawName?: string): IconName {
  if (!rawName) return 'shield';
  const key = rawName.toLowerCase().trim();
  return ICON_MAP[key] ?? (key in Icons ? (key as IconName) : 'shield');
}

export function FeaturesGridSection({
  section,
  website,
}: EditorialFeaturesGridSectionProps): ReactElement | null {
  const content = (section.content || {}) as FeaturesGridContent;

  const items: FeatureItem[] = Array.isArray(content.items)
    ? content.items.filter(
        (item): item is FeatureItem =>
          !!item && (!!item.title?.trim() || !!item.description?.trim()),
      )
    : [];

  if (items.length === 0) return null;

  const title = localizeEditorialText(website, content.title?.trim() || '');

  return (
    <section
      className="ev-section ev-features-grid"
      data-screen-label="FeaturesGrid"
    >
      <div className="ev-container">
        {title ? (
          <div className="ev-section-head">
            <h2 className="headline-md" dangerouslySetInnerHTML={editorialHtml(title)} />
          </div>
        ) : null}

        <div className="features-grid">
          {items.map((item, i) => {
            const iconKey = resolveIcon(item.icon);
            const IconFn = Icons[iconKey];
            const itemTitle = localizeEditorialText(website, item.title?.trim() || '');
            const description = localizeEditorialText(website, item.description?.trim() || '');

            return (
              <div key={`${itemTitle}-${i}`} className="feature-card">
                <span className="feature-card-icon" aria-hidden="true">
                  {IconFn({ size: 28 })}
                </span>
                {itemTitle ? (
                  <h3 className="title-lg" dangerouslySetInnerHTML={editorialHtml(itemTitle)} />
                ) : null}
                {description ? (
                  <p className="body-md" dangerouslySetInnerHTML={editorialHtml(description)} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGridSection;
