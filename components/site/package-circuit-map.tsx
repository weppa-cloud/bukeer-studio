'use client';

import { useMemo } from 'react';
import { CircuitMap, type CircuitMapStop } from '@/components/site/circuit-map';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

/**
 * Public shape used by the package landing flow.
 * Kept for backwards compatibility with existing consumers; adapted to the
 * shared `<CircuitMap>` primitive inside this wrapper.
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
 * Adapts the package-specific stop shape (day-based ordering) to the shared
 * `<CircuitMap>` primitive. Zero behavioral regression — existing package
 * pages render identically.
 */
export function PackageCircuitMap({
  stops,
  className = '',
  analyticsContext,
}: PackageCircuitMapProps) {
  const text = getPublicUiExtraTextGetter('es-CO');
  const orderedStops = useMemo(() => orderByDay(stops), [stops]);

  const circuitStops = useMemo<CircuitMapStop[]>(
    () =>
      orderedStops.map((stop, index) => ({
        id: `${stop.city}-${stop.day ?? index + 1}`,
        lat: stop.lat,
        lng: stop.lng,
        label: stop.city,
        order: typeof stop.day === 'number' ? stop.day : index + 1,
      })),
    [orderedStops]
  );

  if (circuitStops.length === 0) {
    return null;
  }

  return (
    <section data-testid="section-package-circuit-map" className={className}>
      <h2 className="text-2xl font-bold mb-4">{text('packageCircuitMapTitle')}</h2>
      <CircuitMap
        stops={circuitStops}
        onPinClick={(index) => {
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
