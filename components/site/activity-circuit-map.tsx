'use client';

import { useMemo } from 'react';
import { CircuitMap, type CircuitMapStop } from '@/components/site/circuit-map';
import type { ActivityCircuitStop } from '@/lib/products/activity-circuit';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface ActivityCircuitMapProps {
  stops: ActivityCircuitStop[];
  /**
   * Currently-highlighted stop (mirrored from the schedule list). `null`
   * disables the highlighted chip in the fallback renderer.
   */
  activeIndex?: number | null;
  /**
   * Fires whenever the user taps a pin (webgl) or a fallback chip.
   * Use this to scroll the schedule list to the matching step.
   */
  onStopSelect?: (index: number) => void;
  className?: string;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Adapts `ActivityCircuitStop` (schedule-step based) to the shared
 * `<CircuitMap>` primitive. Thin wrapper — no map rendering logic here.
 *
 * Mirrors `<PackageCircuitMap>` bidirectional-sync contract:
 *   - `activeIndex` is forwarded to the underlying primitive
 *   - `onPinClick(index)` triggers analytics + `onStopSelect`
 *
 * SPEC #164 — Activity circuit maps.
 */
export function ActivityCircuitMap({
  stops,
  activeIndex = null,
  onStopSelect,
  className = '',
  analyticsContext,
}: ActivityCircuitMapProps) {
  const text = getPublicUiExtraTextGetter('es-CO');
  const circuitStops = useMemo<CircuitMapStop[]>(
    () =>
      stops.map((stop) => ({
        id: stop.id,
        lat: stop.lat,
        lng: stop.lng,
        label: stop.label,
        order: stop.order,
      })),
    [stops],
  );

  if (circuitStops.length === 0) return null;

  return (
    <section data-testid="section-activity-circuit-map" className={className}>
      <h2 className="text-2xl font-bold mb-4">{text('activityCircuitMapTitle')}</h2>
      <CircuitMap
        stops={circuitStops}
        activeIndex={activeIndex}
        onPinClick={(index) => {
          const stop = stops[index];
          if (!stop) return;
          trackEvent('map_marker_click', {
            ...(analyticsContext ?? {}),
            label: stop.label,
            step: stop.sourceStep,
          });
          onStopSelect?.(index);
        }}
      />
    </section>
  );
}
