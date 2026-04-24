/**
 * editorial-v1 — <DestinationsSection />
 *
 * Port of designer `Destinations` / `DestinationsF1` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Server component. Owns normalization and the list-view markup; the
 * toggle + map view hydrate client-side. Layout follows the designer's
 * asymmetric 12-column feature grid:
 *
 *   row 1: c-12-4 (hero tile)       + c-5-4
 *   row 2: c-4    c-4-tall   c-4
 *   row 3: c-4    c-4        c-4
 *
 * Contract:
 *  - `section.content` is snake_case-normalized by the section-registry
 *    dispatcher before it reaches this component. We still tolerate
 *    snake_case inside the destinations array because the hydration
 *    source of truth (`sectionDynamicDestinations`) mirrors the DB
 *    RPC payload (`hotel_count`, `activity_count`, ...).
 *  - `destinations[]` is hydrated by `lib/sections/hydrate-sections.ts`.
 *
 * Opt-in: mounted only when the website's theme profile declares
 * `metadata.templateSet = 'editorial-v1'` (see `section-registry.ts`).
 */

import type { ReactElement } from 'react';
import Image from 'next/image';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import {
  COLOMBIA_CITIES,
  resolveColombiaRegion,
  type ColombiaRegion,
} from '@/lib/maps/colombia-cities';

import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { getEditorialTextGetter, localizeEditorialText } from '../i18n';

import { DestinationsViewToggle } from './destinations-view-toggle.client';

import {
  DestinationsMapView,
  type MapDestination,
} from './destinations-map-view.client';

// ---------- Props ----------
export interface DestinationsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// ---------- Content shape ----------
interface RawDestination {
  id?: string;
  name?: string;
  slug?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  state?: string | null;
  region?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  hotel_count?: number | null;
  hotelCount?: number | null;
  activity_count?: number | null;
  activityCount?: number | null;
  package_count?: number | null;
  packageCount?: number | null;
  packagesCount?: number | null;
  activitiesCount?: number | null;
  total?: number | null;
}

interface DestinationsContent {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  destinations?: RawDestination[] | null;
  view?: 'list' | 'map' | null;
  enableToggle?: boolean | null;
}

interface NormalizedDestination extends MapDestination {
  country?: string;
}

// ---------- Defaults ----------
const DEFAULT_EMPTY_KEY = 'editorialDestinationsEmpty';

// Designer's feature layout — repeats after 8 slots so we can tile
// arbitrary-length destination arrays without losing the rhythm.
const GRID_LAYOUT: readonly string[] = [
  'c-12-4',
  'c-5-4',
  'c-4',
  'c-4',
  'c-4-tall',
  'c-4',
  'c-4',
  'c-4',
];

// ---------- Helpers ----------
function firstString(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function firstNumber(...values: Array<number | null | undefined>): number {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return 0;
}

function coordsFromName(
  name: string,
): { lat: number; lng: number; region?: ColombiaRegion } | undefined {
  const entry = COLOMBIA_CITIES[name];
  if (entry) return entry;
  const target = name.trim().toLowerCase();
  for (const [city, data] of Object.entries(COLOMBIA_CITIES)) {
    if (city.toLowerCase() === target) return data;
  }
  return undefined;
}

function normalizeDestination(
  raw: RawDestination,
  index: number,
): NormalizedDestination {
  const name = firstString(raw.name) || `Destino ${index + 1}`;
  const slug = firstString(raw.slug);
  const imageUrl = firstString(raw.imageUrl, raw.image) || null;

  const activitiesCount = firstNumber(
    raw.activitiesCount,
    raw.activity_count,
    raw.activityCount,
  );
  const packagesCount = firstNumber(
    raw.packagesCount,
    raw.package_count,
    raw.packageCount,
  );

  // Prefer explicit lat/lng, fall back to our known-cities catalog so
  // the map can still draw a pin even when the DB payload omits coords.
  const lookup = coordsFromName(name);
  const lat =
    typeof raw.lat === 'number' && Number.isFinite(raw.lat)
      ? raw.lat
      : lookup?.lat;
  const lng =
    typeof raw.lng === 'number' && Number.isFinite(raw.lng)
      ? raw.lng
      : lookup?.lng;
  const region = resolveColombiaRegion({
    region: raw.region,
    state: raw.state,
    name,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
  }) ?? lookup?.region;

  return {
    id: firstString(raw.id, slug) || `destination-${index}`,
    name,
    slug: slug || undefined,
    imageUrl,
    region,
    country: firstString(raw.country) || undefined,
    activitiesCount,
    packagesCount,
    lat: typeof lat === 'number' ? lat : undefined,
    lng: typeof lng === 'number' ? lng : undefined,
  };
}

function destinationHref(
  dest: NormalizedDestination,
  basePath: string,
): string {
  if (dest.slug) {
    return `${basePath}/destinos/${encodeURIComponent(dest.slug)}`;
  }
  return `${basePath}/destinos`;
}

// ---------- Server Component ----------
export function DestinationsSection({
  section,
  website,
}: DestinationsSectionProps): ReactElement {
  const editorialText = getEditorialTextGetter(website);
  const content = (section.content || {}) as DestinationsContent;
  const basePath = getBasePath(website.subdomain, false);

  const eyebrow = localizeEditorialText(
    website,
    firstString(content.eyebrow) || editorialText('editorialDestinationsEyebrowFallback'),
  );
  const title = localizeEditorialText(
    website,
    firstString(content.title) || editorialText('editorialDestinationsTitleFallback'),
  );
  const subtitle = localizeEditorialText(website, firstString(content.subtitle));
  const labels = {
    viewList: editorialText('editorialDestinationsViewList'),
    viewMap: editorialText('editorialDestinationsViewMap'),
    activitiesWord: editorialText('editorialActivitiesWord'),
    packagesWord: editorialText('editorialPackagesWord'),
  } as const;

  const rawList = Array.isArray(content.destinations)
    ? content.destinations.filter(
        (x): x is RawDestination => !!x && typeof x === 'object',
      )
    : [];
  const destinations: NormalizedDestination[] = rawList.map((raw, i) =>
    normalizeDestination(raw, i),
  );

  const defaultView: 'list' | 'map' =
    content.view === 'map' ? 'map' : 'list';
  const enableToggle = content.enableToggle !== false;

  const hasDestinations = destinations.length > 0;

  // The section header block — shared by both toggle-on and toggle-off
  // paths. Kept as a subtree so the client toggle can re-use the exact
  // server markup without re-implementing eyebrow / title / subtitle.
  const headerNode = (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="display-md" dangerouslySetInnerHTML={{ __html: title }} />
      {subtitle ? (
        <p
          className="body-md"
          style={{ maxWidth: '42ch', marginTop: 12 }}
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      ) : null}
    </>
  );

  const listView = hasDestinations ? (
    <DestinationsListView
      destinations={destinations}
      basePath={basePath}
      activitiesWord={labels.activitiesWord}
      packagesWord={labels.packagesWord}
    />
  ) : null;

  const mapView = hasDestinations ? (
    <DestinationsMapView
      destinations={destinations}
      basePath={basePath}
      activitiesWord={labels.activitiesWord}
      packagesWord={labels.packagesWord}
    />
  ) : null;

  return (
    <section
      className="ev-section ev-destinations"
      data-screen-label="destinations"
    >
      <div className="ev-container">
        {!hasDestinations ? (
          <>
            <div className="ev-section-head">
              <div>{headerNode}</div>
            </div>
            <p className="body-md" style={{ textAlign: 'center', opacity: 0.7 }}>
              {editorialText(DEFAULT_EMPTY_KEY)}
            </p>
          </>
        ) : enableToggle ? (
          <DestinationsViewToggle
            headerNode={headerNode}
            listView={listView}
            mapView={mapView}
            defaultView={defaultView}
            labels={{ list: labels.viewList, map: labels.viewMap }}
          />
        ) : (
          <>
            <div className="ev-section-head">
              <div>{headerNode}</div>
            </div>
            {defaultView === 'map' ? mapView : listView}
          </>
        )}
      </div>
    </section>
  );
}

// ---------- List view (pure server) ----------
interface DestinationsListViewProps {
  destinations: NormalizedDestination[];
  basePath: string;
  activitiesWord: string;
  packagesWord: string;
}

function DestinationsListView({
  destinations,
  basePath,
  activitiesWord,
  packagesWord,
}: DestinationsListViewProps): ReactElement {
  return (
    <div className="dest-grid">
      {destinations.map((dest, i) => {
        const layoutClass = GRID_LAYOUT[i % GRID_LAYOUT.length];
        const href = destinationHref(dest, basePath);
        const isPrimary = layoutClass === 'c-12-4';
        const counts: string[] = [];
        if (dest.activitiesCount > 0) {
          counts.push(`${dest.activitiesCount} ${activitiesWord}`);
        }
        if (dest.packagesCount > 0) {
          counts.push(`${dest.packagesCount} ${packagesWord}`);
        }
        return (
          <a
            key={dest.id}
            href={href}
            className={`dest-card ${layoutClass}`}
            data-region={dest.region}
            data-destination-slug={dest.slug ?? dest.id}
          >
            <div className="dest-media" aria-hidden="true">
              {dest.imageUrl ? (
                <Image
                  src={dest.imageUrl}
                  alt=""
                  fill
                  priority={isPrimary}
                  sizes={
                    isPrimary
                      ? '(max-width: 720px) 100vw, (max-width: 1100px) 100vw, 720px'
                      : '(max-width: 720px) 50vw, (max-width: 1100px) 33vw, 360px'
                  }
                />
              ) : (
                <div className="dest-fallback" />
              )}
            </div>
            <div className="wash" />
            {dest.region ? (
              <span className="top-tag">{dest.region}</span>
            ) : null}
            <div className="content">
              <div>
                {counts.length > 0 ? (
                  <small>{counts.join(' · ')}</small>
                ) : null}
                <h3>{dest.name}</h3>
              </div>
              <div className="cta-pill" aria-hidden="true">
                <Icons.arrowUpRight size={16} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default DestinationsSection;
