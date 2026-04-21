'use client';

/**
 * <ColombiaMapLibre> — real MapLibre map replacing the hand-drawn SVG
 * for the "Ocho Colombias" editorial section.
 *
 * Uses CartoDB Voyager tiles (free, no API key). Pins are rendered as
 * custom HTML markers styled with editorial CSS classes. Region
 * highlighting is passed as a prop and dims pins not belonging to the
 * active region via CSS data-attribute targeting.
 *
 * Accepts the same external props as <ColombiaMapClient> so that
 * <ExploreMapClient> can swap implementations without changing its
 * own code.
 */

import { useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { EditorialRegion } from './colombia-map-shared';

// ---------- Public types ----------

export interface ColombiaMapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Optional region tag — used for CSS `data-region` on the marker element. */
  region?: EditorialRegion;
}

export interface ColombiaMapLibreProps {
  /** Destination pins to render as markers. */
  pins?: ReadonlyArray<ColombiaMapPin>;
  /** Regions whose pins should be visually emphasised. Others are dimmed. */
  highlightedRegions?: ReadonlyArray<EditorialRegion>;
  /** Controlled active pin id. */
  activePinId?: string | null;
  /** Click handler — receives the pin id. */
  onPinClick?: (id: string) => void;
  /** Hover handler — fires with null when pointer leaves all pins. */
  onPinHover?: (id: string | null) => void;
  /** Map container height (px or CSS string). Defaults to 580. */
  height?: string | number;
  /** Accessible label for the map container. */
  ariaLabel?: string;
  // The SVG variant accepts showLabels / showRidges / showRivers. We
  // accept (and silently ignore) them so callers don't need to strip them.
  showLabels?: boolean;
  showRidges?: boolean;
  showRivers?: boolean;
}

// ---------- Constants ----------

const CARTO_VOYAGER =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// Colombia bounding box: [west, south, east, north]
const COLOMBIA_BOUNDS: [number, number, number, number] = [
  -82.5, -4.8, -66.5, 13.2,
];

// ---------- Component ----------

export function ColombiaMapLibre({
  pins = [],
  highlightedRegions = [],
  activePinId = null,
  onPinClick,
  onPinHover,
  height = 580,
  ariaLabel = 'Mapa interactivo de Colombia',
}: ColombiaMapLibreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Track markers by pin id so we can add/remove/update efficiently.
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  // Keep latest callbacks in a ref so effects don't re-run on every render.
  const onPinClickRef = useRef(onPinClick);
  const onPinHoverRef = useRef(onPinHover);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { onPinHoverRef.current = onPinHover; }, [onPinHover]);

  // ---------- Map init ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_VOYAGER,
      center: [-74.0, 4.5],
      zoom: 4.8,
      attributionControl: false,
      // Disable compass / rotation for a clean editorial look.
      bearingSnap: 0,
    });

    // Fit to Colombia on first load.
    map.fitBounds(COLOMBIA_BOUNDS, {
      padding: 32,
      animate: false,
    });

    // Minimal attribution in bottom-right corner.
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Sync pins → markers ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const incomingIds = new Set(pins.map((p) => p.id));

    // Remove stale markers.
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    }

    // Add or update markers.
    for (const pin of pins) {
      if (markersRef.current.has(pin.id)) {
        // Update position in case props changed.
        markersRef.current.get(pin.id)!.setLngLat([pin.lng, pin.lat]);
      } else {
        const el = buildPinElement(pin);

        el.addEventListener('mouseenter', () => {
          onPinHoverRef.current?.(pin.id);
        });
        el.addEventListener('mouseleave', () => {
          onPinHoverRef.current?.(null);
        });
        el.addEventListener('focus', () => {
          onPinHoverRef.current?.(pin.id);
        });
        el.addEventListener('blur', () => {
          onPinHoverRef.current?.(null);
        });
        el.addEventListener('click', () => {
          onPinClickRef.current?.(pin.id);
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPinClickRef.current?.(pin.id);
          }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);

        markersRef.current.set(pin.id, marker);
      }
    }
  }, [pins]);

  // ---------- Sync active pin ----------
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement();
      if (activePinId === id) {
        el.classList.add('on');
      } else {
        el.classList.remove('on');
      }
    }
  }, [activePinId]);

  // ---------- Sync highlighted regions (dim unrelated pins) ----------
  useEffect(() => {
    const hasFilter = highlightedRegions.length > 0;
    const regionSet = new Set(highlightedRegions);

    for (const [, marker] of markersRef.current) {
      const el = marker.getElement();
      const region = el.dataset.region as EditorialRegion | undefined;

      if (!hasFilter) {
        el.classList.remove('dimmed');
      } else if (region && regionSet.has(region)) {
        el.classList.remove('dimmed');
      } else {
        el.classList.add('dimmed');
      }
    }
  }, [highlightedRegions]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      role="img"
      aria-label={ariaLabel}
    />
  );
}

// ---------- Helpers ----------

/**
 * Build the custom HTML element used for each map pin marker.
 * Styled via editorial-v1.css `.co-pin` rules + inline fallbacks.
 */
function buildPinElement(pin: ColombiaMapPin): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'co-pin';
  if (pin.region) wrapper.dataset.region = pin.region;
  wrapper.style.cursor = 'pointer';
  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', pin.label);

  const core = document.createElement('div');
  core.className = 'co-pin-core';
  // Inline fallback styles so the pin is visible even before CSS loads.
  core.style.cssText = [
    'width:18px',
    'height:18px',
    'border-radius:50%',
    'background:var(--c-pin,#E8611A)',
    'border:2px solid white',
    'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    'transition:transform 0.15s ease, box-shadow 0.15s ease',
  ].join(';');

  wrapper.appendChild(core);
  return wrapper;
}

// Re-export ColombiaMapPin type under the name expected by the SVG module
// so callers can use either component without changing their type imports.
export type { EditorialRegion };
