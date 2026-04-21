'use client';

/**
 * editorial-v1 — <DestinationsMapView />
 *
 * Map-centric view of the destinations section. Composes the
 * interactive `<ColombiaMapClient>` with a side list of cards. Hover
 * or focus on a card highlights its pin (and vice-versa). Click on
 * the card navigates to the destination detail; click on the pin
 * fires analytics but does not navigate — the designer uses hover
 * highlighting and expects the dedicated side list for navigation.
 *
 * Only destinations that resolve to `lat` + `lng` (from explicit
 * fields or the `COLOMBIA_CITIES` lookup) contribute a pin. Cards
 * without coordinates still appear in the side list — they render
 * without a pin highlight.
 */

import { useCallback, useState } from 'react';
import Image from 'next/image';

import { ColombiaMapClient } from '@/components/site/themes/editorial-v1/maps/colombia-map.client';
import type { ColombiaMapPin } from '@/components/site/themes/editorial-v1/maps/colombia-map';
import type { EditorialRegion } from '@/components/site/themes/editorial-v1/maps/colombia-map-shared';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface MapDestination {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  region?: EditorialRegion;
  activitiesCount: number;
  packagesCount: number;
  lat?: number;
  lng?: number;
}

export interface DestinationsMapViewProps {
  destinations: MapDestination[];
  basePath: string;
  activitiesWord?: string;
  packagesWord?: string;
  ariaLabel?: string;
  locale?: string | null;
}

function destinationHref(d: MapDestination, basePath: string): string {
  if (d.slug) return `${basePath}/destinos/${encodeURIComponent(d.slug)}`;
  return `${basePath}/destinos`;
}

export function DestinationsMapView({
  destinations,
  basePath,
  activitiesWord,
  packagesWord,
  ariaLabel,
  locale,
}: DestinationsMapViewProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const resolvedActivitiesWord = activitiesWord ?? editorialText('editorialActivitiesWord');
  const resolvedPackagesWord = packagesWord ?? editorialText('editorialPackagesWord');
  const resolvedAriaLabel = ariaLabel ?? editorialText('editorialDestinationsMapAriaFallback');
  const [activeId, setActiveId] = useState<string | null>(null);

  const pins: ColombiaMapPin[] = destinations
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => ({
      id: d.id,
      label: d.name,
      lat: d.lat as number,
      lng: d.lng as number,
      region: d.region,
    }));

  const handlePinHover = useCallback(
    (id: string | null) => {
      setActiveId(id);
      if (!id) return;
      const match = destinations.find((d) => d.id === id);
      if (!match) return;
      trackEvent('region_filter_change', {
        region: match.region ?? 'unknown',
        destinationId: match.id,
      });
    },
    [destinations],
  );

  const handlePinClick = useCallback(
    (id: string) => {
      setActiveId(id);
      const match = destinations.find((d) => d.id === id);
      if (!match) return;
      trackEvent('destination_card_click', {
        destinationSlug: match.slug ?? match.id,
        region: match.region ?? 'unknown',
        source: 'map_pin',
      });
      if (typeof window !== 'undefined') {
        window.location.href = destinationHref(match, basePath);
      }
    },
    [destinations, basePath],
  );

  const handleCardClick = useCallback(
    (d: MapDestination) => {
      trackEvent('destination_card_click', {
        destinationSlug: d.slug ?? d.id,
        region: d.region ?? 'unknown',
        source: 'map_side_card',
      });
    },
    [],
  );

  return (
    <div className="dest-map-view">
      <div className="dest-map-stage">
        <ColombiaMapClient
          pins={pins}
          activePinId={activeId}
          onPinHover={handlePinHover}
          onPinClick={handlePinClick}
          showLabels
          showRidges
          showRivers
          height={660}
          ariaLabel={resolvedAriaLabel}
        />
      </div>
      <div className="dest-map-side" role="list">
        {destinations.map((d, i) => {
          const href = destinationHref(d, basePath);
          const active = activeId === d.id;
          const counts: string[] = [];
          if (d.activitiesCount > 0) {
            counts.push(`${d.activitiesCount} ${resolvedActivitiesWord}`);
          }
          if (d.packagesCount > 0) {
            counts.push(`${d.packagesCount} ${resolvedPackagesWord}`);
          }
          const summary = counts.join(' · ');
          return (
            <a
              key={d.id}
              href={href}
              className={`dest-side-card${active ? ' on' : ''}`}
              data-region={d.region}
              data-destination-slug={d.slug ?? d.id}
              role="listitem"
              onMouseEnter={() => setActiveId(d.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(d.id)}
              onBlur={() => setActiveId(null)}
              onClick={() => handleCardClick(d)}
            >
              <div className="dest-side-thumb" aria-hidden="true">
                {d.imageUrl ? (
                  <Image
                    src={d.imageUrl}
                    alt=""
                    fill
                    sizes="84px"
                  />
                ) : null}
              </div>
              <div className="dest-side-body">
                {d.region ? <div className="region">{d.region}</div> : null}
                <b>{d.name}</b>
                {summary ? <small>{summary}</small> : null}
              </div>
              <span className="dest-side-num" aria-hidden="true">
                {i + 1}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
