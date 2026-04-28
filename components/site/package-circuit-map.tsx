'use client';

import { useMemo } from 'react';
import { RouteMap } from '@/components/ui/route-map';
import { ColombiaMapStandalone } from '@/components/site/themes/editorial-v1/maps/colombia-map-standalone.client';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';

/**
 * Public shape used by the package landing flow.
 * Kept for backwards compatibility with existing consumers; rendered through
 * the editorial Colombia MapLibre surface used by the Home explore map.
 */
export interface PackageCircuitStop {
  city: string;
  lat: number;
  lng: number;
  day?: number;
  title?: string;
}

interface PackageCircuitMapProps {
  stops: PackageCircuitStop[];
  className?: string;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

function orderByDay(stops: PackageCircuitStop[]): PackageCircuitStop[] {
  return [...stops].sort((a, b) => {
    const dayA = typeof a.day === 'number' ? a.day : Number.MAX_SAFE_INTEGER;
    const dayB = typeof b.day === 'number' ? b.day : Number.MAX_SAFE_INTEGER;
    return dayA - dayB;
  });
}

/**
 * Adapts the package-specific stop shape (day-based ordering) to `<RouteMap>`
 * while swapping the map surface for the editorial Home map renderer.
 */
export function PackageCircuitMap({
  stops,
  className = '',
  analyticsContext,
}: PackageCircuitMapProps) {
  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);
  const orderedStops = useMemo(() => orderByDay(stops), [stops]);

  const routePoints = useMemo(
    () =>
      orderedStops.map((stop, index) => ({
        city: stop.city,
        lat: stop.lat,
        lng: stop.lng,
        order: typeof stop.day === 'number' ? stop.day : index + 1,
      })),
    [orderedStops]
  );

  if (routePoints.length === 0) {
    return null;
  }

  return (
    <section data-testid="section-package-circuit-map" className={className}>
      <h2 className="text-2xl font-bold mb-4">{text('packageCircuitMapTitle')}</h2>
      <RouteMap
        points={routePoints}
        className="circuit-map w-full max-sm:aspect-[4/3]"
        height={360}
        numberedLabels
        connectorStyle="dashed"
        renderMap={({ points, routePath }) => (
          <ColombiaMapStandalone
            pins={points.map((point, index) => ({
              id: `route-${index}`,
              label: `${index + 1}. ${point.city}`,
              lat: point.lat,
              lng: point.lng,
            }))}
            routePath={routePath}
            height={360}
            ariaLabel={text('packageCircuitMapTitle')}
            showLabels
          />
        )}
        onPointClick={(_point, index) => {
          const stop = orderedStops[index];
          if (!stop) return;
          trackEvent('map_marker_click', {
            ...(analyticsContext ?? {}),
            city: stop.city,
            day: stop.day ?? index + 1,
          });
        }}
      />
    </section>
  );
}
