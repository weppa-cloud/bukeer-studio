'use client';

import { useEffect, useMemo, useState } from 'react';
import { RouteMap } from '@/components/ui/route-map';
import { trackEvent } from '@/lib/analytics/track';
import { supportsWebGL } from '@/lib/maps/theme';

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

function orderStops(stops: PackageCircuitStop[]): PackageCircuitStop[] {
  return [...stops].sort((a, b) => {
    const dayA = typeof a.day === 'number' ? a.day : Number.MAX_SAFE_INTEGER;
    const dayB = typeof b.day === 'number' ? b.day : Number.MAX_SAFE_INTEGER;
    return dayA - dayB;
  });
}

export function PackageCircuitMap({
  stops,
  className = '',
  analyticsContext,
}: PackageCircuitMapProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglAvailable(supportsWebGL());
  }, []);

  const orderedStops = useMemo(() => orderStops(stops), [stops]);
  const points = useMemo(
    () => orderedStops.map((stop) => ({ city: stop.city, lat: stop.lat, lng: stop.lng })),
    [orderedStops]
  );

  if (orderedStops.length === 0) {
    return null;
  }

  const canRenderMap = orderedStops.length >= 2 && webglAvailable === true;

  return (
    <section className={className}>
      <h2 className="text-2xl font-bold mb-4">Circuito del viaje</h2>

      {canRenderMap ? (
        <RouteMap
          points={points}
          className="rounded-2xl overflow-hidden"
          height={360}
          numberedLabels
          onPointClick={(point, index) => {
            const stop = orderedStops[index];
            trackEvent('map_marker_click', {
              ...(analyticsContext ?? {}),
              city: point.city,
              day: stop?.day ?? index + 1,
            });
          }}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Vista de circuito simplificada.
          </p>
          <ol className="space-y-3">
            {orderedStops.map((stop, index) => (
              <li key={`${stop.city}-${index}`}>
                <button
                  type="button"
                  onClick={() =>
                    trackEvent('map_marker_click', {
                      ...(analyticsContext ?? {}),
                      city: stop.city,
                      day: stop.day ?? index + 1,
                    })
                  }
                  className="w-full flex items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {stop.day ?? index + 1}
                  </span>
                  <span className="text-sm font-medium">{stop.city}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
