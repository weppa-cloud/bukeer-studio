/**
 * editorial-v1 — <EditorialDestinosListPage />
 *
 * Replaces the generic `/destinos` listing body when the website opts into
 * `editorial-v1` (wired via `TemplateSlot name="destinos-list"`).
 *
 * Visual spec ported from designer `DestinationPageF1` / `PageHero` in
 *   themes/references/claude design 1/project/pages.jsx + sections.jsx
 * + copy catalog `docs/editorial-v1/copy-catalog.md` (Destinations / page-hero).
 *
 * Flow:
 *   - Ink hero band: breadcrumbs + eyebrow + title + subtitle.
 *   - Region legend (4 chips: Caribe / Andes / Selva / Pacífico).
 *   - Destinations grid using the same asymmetric `c-12-4 / c-5-4 / c-4 /
 *     c-4-tall` pattern as the home destinations section.
 *   - Empty state + JSON-LD (CollectionPage + BreadcrumbList).
 *
 * Data: consumes the `DestinationData[]` payload already fetched by
 * `app/site/[subdomain]/[...slug]/page.tsx` — no additional RPCs.
 */

import type { ReactElement, CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { WebsiteData } from '@/lib/supabase/get-website';
import type { DestinationData } from '@/lib/supabase/get-pages';
import { getBasePath } from '@/lib/utils/base-path';
import {
  resolveColombiaRegion,
  type ColombiaRegion,
} from '@/lib/maps/colombia-cities';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { editorialHtml } from '../primitives/rich-heading';
import { ColombiaMapStandalone } from '../maps/colombia-map-standalone.client';

// ----- types -----
export interface EditorialDestinosListPagePayload {
  destinations: DestinationData[];
}

interface EditorialDestinosListProps {
  website: WebsiteData;
  payload?: unknown;
}

interface NormalizedDestination {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  region: ColombiaRegion | undefined;
  image: string | null;
  hotelCount: number;
  activityCount: number;
  total: number;
  lat?: number;
  lng?: number;
}

// ----- constants -----
// Same asymmetric grid tiling as the home destinations section so the
// visual rhythm matches designer spec. Repeats every 8 cards.
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

const REGION_LEGEND: ReadonlyArray<{
  key: ColombiaRegion;
  labelKey:
    | 'editorialDestinosRegionCaribe'
    | 'editorialDestinosRegionAndes'
    | 'editorialDestinosRegionSelva'
    | 'editorialDestinosRegionPacifico';
  swatch: string;
}> = [
  { key: 'caribe', labelKey: 'editorialDestinosRegionCaribe', swatch: '#3fb6d6' },
  { key: 'andes', labelKey: 'editorialDestinosRegionAndes', swatch: '#c98b4a' },
  { key: 'selva', labelKey: 'editorialDestinosRegionSelva', swatch: '#4f9d5a' },
  { key: 'pacifico', labelKey: 'editorialDestinosRegionPacifico', swatch: '#6b7f9e' },
];

function normalize(dest: DestinationData): NormalizedDestination {
  const slug = (dest.slug ?? '').trim() || dest.id;
  return {
    id: dest.id,
    name: dest.name,
    slug,
    state: dest.state ?? null,
    region: resolveColombiaRegion({
      state: dest.state,
      name: dest.name,
      lat: Number.isFinite(Number(dest.lat)) ? Number(dest.lat) : null,
      lng: Number.isFinite(Number(dest.lng)) ? Number(dest.lng) : null,
    }),
    image: dest.image ?? null,
    hotelCount: Number(dest.hotel_count ?? 0),
    activityCount: Number(dest.activity_count ?? 0),
    total:
      Number(dest.total ?? 0) ||
      Number(dest.hotel_count ?? 0) + Number(dest.activity_count ?? 0),
    lat: Number.isFinite(Number(dest.lat)) ? Number(dest.lat) : undefined,
    lng: Number.isFinite(Number(dest.lng)) ? Number(dest.lng) : undefined,
  };
}

function dedupeBySlug(list: NormalizedDestination[]): NormalizedDestination[] {
  const bySlug = new Map<string, NormalizedDestination>();
  for (const entry of list) {
    const key = entry.slug || entry.id;
    const current = bySlug.get(key);
    if (!current || entry.total > current.total) {
      bySlug.set(key, entry);
    }
  }
  return Array.from(bySlug.values());
}

export function EditorialDestinosListPage({
  website,
  payload,
}: EditorialDestinosListProps): ReactElement {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? website.default_locale ?? website.content?.locale ?? 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const resolved = payload as EditorialDestinosListPagePayload | undefined;
  const destinations = Array.isArray(resolved?.destinations)
    ? resolved!.destinations
    : [];
  const basePath = getBasePath(website.subdomain, false);

  const normalized = dedupeBySlug(destinations.map(normalize));
  const hasDestinations = normalized.length > 0;
  const titleHtml = editorialHtml(editorialText('editorialDestinosListTitle'));

  const mapPins = normalized
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => ({
      id: d.id,
      label: d.name,
      lat: d.lat as number,
      lng: d.lng as number,
      region: d.region,
    }));

  const siteName =
    website.content?.account?.name ||
    website.content?.siteName ||
    website.subdomain;

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.bukeer.com`;

  const jsonLdCollection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${editorialText('editorialDestinoBreadcrumbDestinos')} | ${siteName}`,
    url: `${baseUrl}/destinos`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: normalized.length,
      itemListElement: normalized.slice(0, 20).map((dest, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: dest.name,
        url: `${baseUrl}/destinos/${dest.slug}`,
      })),
    },
  };
  const jsonLdBreadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: editorialText('editorialBreadcrumbHome'),
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: editorialText('editorialDestinoBreadcrumbDestinos'),
      },
    ],
  };

  return (
    <div
      data-screen-label="DestinosList"
      data-testid="editorial-destinos-list"
    >
      {hasDestinations ? (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLdCollection),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLdBreadcrumbs),
            }}
          />
        </>
      ) : null}

      {/* Hero */}
      <section className="page-hero" style={heroStyle} data-testid="destinos-list-hero">
        <div className="ev-page-hero-wash" />
        <div className="ev-container">
          <Breadcrumbs
            tone="inverse"
            className="pkg-hero-breadcrumb"
            items={[
              {
                label: editorialText('editorialBreadcrumbHome'),
                href: basePath || '/',
              },
              {
                label: editorialText('editorialDestinoBreadcrumbDestinos'),
              },
            ]}
          />
          <div style={{ marginTop: 24, maxWidth: '58ch' }}>
            <Eyebrow tone="light" className="ev-page-hero-eyebrow">
              {editorialText('editorialDestinosListEyebrow')}
            </Eyebrow>
            {titleHtml ? (
              <h1
                className="display-lg"
                dangerouslySetInnerHTML={titleHtml}
              />
            ) : null}
            <p style={heroSubtitleStyle} dangerouslySetInnerHTML={editorialHtml(editorialText('editorialDestinosListSubtitle'))} />
          </div>
        </div>
      </section>

      {/* Colombia map — all destinations as pins */}
      {mapPins.length > 0 ? (
        <section className="section" style={{ paddingTop: 0, paddingBottom: 0 }} data-testid="destinos-map">
          <div className="ev-container">
            <ColombiaMapStandalone
              pins={mapPins}
              height={420}
              ariaLabel={editorialText('editorialDestinationsMapAriaFallback')}
            />
          </div>
        </section>
      ) : null}

      {/* Legend + grid */}
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="ev-container">
          <div
            className="ev-destinos-legend"
            role="group"
            aria-label={editorialText('editorialDestinosLegendHeading')}
            data-testid="destinos-legend"
          >
            {REGION_LEGEND.map((region) => (
              <span
                key={region.key}
                className="chip-filter"
                data-region={region.key}
              >
                <span
                  className="region-swatch"
                  style={{ background: region.swatch }}
                  aria-hidden="true"
                />
                {editorialText(region.labelKey)}
              </span>
            ))}
          </div>

          {hasDestinations ? (
            <div className="dest-grid" data-testid="destinos-grid">
              {normalized.map((dest, i) => {
                const layoutClass = GRID_LAYOUT[i % GRID_LAYOUT.length];
                const isPrimary = layoutClass === 'c-12-4';
                const counts: string[] = [];
                if (dest.activityCount > 0) {
                  counts.push(
                    `${dest.activityCount} ${editorialText('editorialActivitiesWord')}`,
                  );
                }
                if (dest.hotelCount > 0) {
                  counts.push(
                    `${dest.hotelCount} ${editorialText('editorialDestinoQuickFactHotels').toLowerCase()}`,
                  );
                }
                return (
                  <Link
                    key={`${dest.id}-${i}`}
                    href={`${basePath}/destinos/${encodeURIComponent(dest.slug)}`}
                    className={`dest-card ${layoutClass}`}
                    data-region={dest.region}
                    data-destination-slug={dest.slug}
                  >
                    <div className="dest-media" aria-hidden="true">
                      {dest.image ? (
                        <Image
                          src={dest.image}
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
                  </Link>
                );
              })}
            </div>
          ) : (
            <div
              data-testid="destinos-empty"
              style={{
                padding: '80px 20px',
                textAlign: 'center',
                background: 'var(--c-surface)',
                borderRadius: 20,
                border: '1px solid var(--c-line)',
              }}
            >
              <p className="body-md" style={{ opacity: 0.75 }}>
                {editorialText('editorialDestinosListEmpty')}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const heroStyle: CSSProperties = {
  background: 'var(--c-ink)',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  padding: '80px 0 64px',
  borderRadius: '0 0 32px 32px',
};

const heroSubtitleStyle: CSSProperties = {
  color: 'rgba(255,255,255,.78)',
  fontSize: 17,
  lineHeight: 1.55,
  maxWidth: '60ch',
  margin: 0,
};

export default EditorialDestinosListPage;
