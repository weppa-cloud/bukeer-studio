'use client';

import { useEffect, useMemo, useState } from 'react';
import { RouteMap } from '@/components/ui/route-map';
import { supportsWebGL } from '@/lib/maps/theme';

/**
 * Single stop in a circuit route (shared primitive — SPEC #164 Phase 1).
 * `order` is used as a stable sort key and as the numbered label on the pin.
 */
export interface CircuitMapStop {
  id: string;
  lat: number;
  lng: number;
  label: string;
  order: number;
}

export interface CircuitMapProps {
  stops: CircuitMapStop[];
  activeIndex?: number | null;
  onPinClick?: (index: number) => void;
  className?: string;
}

/**
 * Detects `prefers-reduced-motion` on the client. Returns `false` during SSR
 * and when the media query is not matched.
 */
function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mql.matches);

    const listener = (event: MediaQueryListEvent) => setPrefers(event.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  return prefers;
}

function orderByField(stops: CircuitMapStop[]): CircuitMapStop[] {
  return [...stops].sort((a, b) => a.order - b.order);
}

/**
 * <CircuitMap> — shared map primitive rendering an ordered route of stops.
 *
 * - Uses the MapLibre-backed `<RouteMap>` on capable clients (polyline +
 *   numbered pins, fitBounds handled by the underlying DestinationMap).
 * - Falls back to a simplified numbered chip list when WebGL is unavailable
 *   or when fewer than two stops are present.
 * - Respects `prefers-reduced-motion` by exposing a `data-reduced-motion`
 *   attribute consumers can target; the underlying MapLibre viewport change
 *   is instant (no explicit fly-to in this primitive).
 * - Mobile viewport (≤640px): aspect-ratio 4:3; larger viewports keep the
 *   fixed 360px height used by the package flow.
 *
 * Consumers wire bidirectional sync via `onPinClick(index)`.
 */
export function CircuitMap({
  stops,
  activeIndex = null,
  onPinClick,
  className = '',
}: CircuitMapProps) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setWebglAvailable(supportsWebGL());
  }, []);

  const orderedStops = useMemo(() => orderByField(stops), [stops]);
  const points = useMemo(
    () => orderedStops.map((stop) => ({ city: stop.label, lat: stop.lat, lng: stop.lng })),
    [orderedStops]
  );

  if (orderedStops.length === 0) {
    return null;
  }

  const canRenderMap = orderedStops.length >= 2 && webglAvailable === true;
  const rootClass = [
    'circuit-map w-full',
    'max-sm:aspect-[4/3]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      data-testid="circuit-map"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
    >
      {canRenderMap ? (
        <RouteMap
          points={points}
          className="rounded-2xl overflow-hidden touch-pan-y"
          height={360}
          numberedLabels
          onPointClick={(_point, index) => {
            onPinClick?.(index);
          }}
        />
      ) : (
        <div
          className="rounded-2xl border border-border bg-card p-4"
          data-testid="circuit-map-fallback"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Vista de circuito simplificada.
          </p>
          <ol className="space-y-3">
            {orderedStops.map((stop, index) => {
              const isActive = activeIndex === index;
              return (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => onPinClick?.(index)}
                    aria-current={isActive ? 'step' : undefined}
                    className={[
                      'w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border/80 bg-background hover:bg-muted/40',
                    ].join(' ')}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {stop.order}
                    </span>
                    <span className="text-sm font-medium">{stop.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
