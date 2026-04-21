'use client';

/**
 * <ColombiaMapLibre> — real MapLibre GL map for the "Ocho Colombias" section.
 *
 * Uses @vis.gl/react-maplibre (React wrapper) + CartoDB Positron tiles.
 * Colombia is highlighted with a GeoJSON fill layer using the editorial
 * accent color. Surrounding countries visible for geographic context.
 *
 * Same external props as <ColombiaMapClient> so ExploreMapClient can
 * swap implementations without changes.
 */

import { useCallback, useMemo } from 'react';
import { Map, Marker, Source, Layer } from '@vis.gl/react-maplibre';
import type { LayerProps } from '@vis.gl/react-maplibre';
import type { EditorialRegion } from './colombia-map-shared';

// ---------- Types ----------

export interface ColombiaMapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  region?: EditorialRegion;
}

export interface ColombiaMapLibreProps {
  pins?: ReadonlyArray<ColombiaMapPin>;
  highlightedRegions?: ReadonlyArray<EditorialRegion>;
  activePinId?: string | null;
  onPinClick?: (id: string) => void;
  onPinHover?: (id: string | null) => void;
  height?: string | number;
  ariaLabel?: string;
  showLabels?: boolean;
  showRidges?: boolean;
  showRivers?: boolean;
}

// ---------- Colombia GeoJSON (Natural Earth 110m simplified) ----------

const COLOMBIA_GEOJSON = {
  type: 'Feature' as const,
  properties: { name: 'Colombia' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[
      [-71.66, 12.46], [-71.99, 12.25], [-72.17, 12.20],
      [-72.91, 11.54], [-74.20, 11.24], [-74.80, 10.96],
      [-75.28, 10.65], [-75.55, 10.42], [-75.63, 9.55],
      [-76.24, 8.87], [-77.18, 8.64],
      [-77.34, 8.25], [-77.76, 7.10],
      [-77.40, 6.22], [-77.56, 5.58], [-77.56, 5.46],
      [-77.38, 4.59], [-77.09, 3.88], [-77.27, 3.72],
      [-77.88, 2.57], [-78.76, 1.81], [-78.85, 1.45],
      [-78.20, 1.10], [-77.52, 0.74], [-77.05, 0.52],
      [-76.50, 0.25], [-75.28, 0.00],
      [-75.26, -0.09], [-75.27, -1.56], [-75.29, -2.16],
      [-70.09, -4.01], [-69.94, -4.21],
      [-70.01, -3.50], [-70.01, -2.00],
      [-69.87, -0.73], [-67.78, 0.74], [-66.85, 1.34],
      [-67.53, 2.01], [-68.22, 2.04], [-69.83, 1.68],
      [-70.21, 2.72], [-67.73, 3.25],
      [-67.64, 4.26], [-67.77, 5.27],
      [-67.48, 6.18], [-68.38, 6.89],
      [-69.94, 7.57], [-72.52, 7.89], [-72.08, 8.01],
      [-73.01, 8.70], [-73.02, 9.42],
      [-72.67, 9.84], [-73.00, 10.47], [-72.30, 11.12],
      [-71.66, 12.46],
    ]],
  },
};

// ---------- Map layers ----------

const colombiaFillLayer: LayerProps = {
  id: 'colombia-fill',
  type: 'fill',
  paint: {
    'fill-color': '#EDE8DC',   // editorial cream — matches --c-map-land
    'fill-opacity': 0.95,
  },
};

const colombiaOutlineLayer: LayerProps = {
  id: 'colombia-outline',
  type: 'line',
  paint: {
    'line-color': '#C8A97A',   // editorial warm border
    'line-width': 1.5,
    'line-opacity': 0.8,
  },
};

// ---------- Pin element ----------

function PinDot({
  pin,
  active,
  dimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  pin: ColombiaMapPin;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={pin.label}
      data-region={pin.region}
      style={{
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 200ms ease',
        transform: active ? 'scale(1.25)' : 'scale(1)',
        transformOrigin: 'bottom center',
      }}
    >
      {/* Pin dot */}
      <span
        style={{
          display: 'block',
          width: active ? 16 : 12,
          height: active ? 16 : 12,
          borderRadius: '50%',
          background: active
            ? 'var(--co-accent, #E8611A)'
            : 'var(--co-pin, #E8611A)',
          border: `2px solid white`,
          boxShadow: active
            ? '0 0 0 4px rgba(232,97,26,0.25), 0 2px 8px rgba(0,0,0,0.25)'
            : '0 2px 6px rgba(0,0,0,0.2)',
          transition: 'all 200ms ease',
        }}
      />
      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: active ? 'var(--co-accent, #E8611A)' : 'var(--co-ink, #1C1C1A)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(4px)',
          padding: '1px 5px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}
      >
        {pin.label}
      </span>
    </button>
  );
}

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
  const highlighted = useMemo(() => new Set(highlightedRegions), [highlightedRegions]);

  const handlePinClick = useCallback(
    (id: string) => onPinClick?.(id),
    [onPinClick],
  );

  const containerStyle = useMemo(
    () => ({
      width: '100%',
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius: 16,
      overflow: 'hidden',
    }),
    [height],
  );

  return (
    <div
      style={containerStyle}
      role="img"
      aria-label={ariaLabel}
    >
      <Map
        // Dynamic import prevents SSR crash — maplibre-gl needs window
        mapLib={import('maplibre-gl')}
        initialViewState={{
          longitude: -72.5,
          latitude: 4.0,
          zoom: 4.2,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        // Lock the viewport to keep the editorial static look
        scrollZoom={false}
        dragPan={false}
        dragRotate={false}
        keyboard={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        attributionControl={false}
      >
        {/* Colombia fill + outline overlay */}
        <Source id="colombia" type="geojson" data={COLOMBIA_GEOJSON}>
          <Layer {...colombiaFillLayer} />
          <Layer {...colombiaOutlineLayer} />
        </Source>

        {/* Destination pins */}
        {pins.map((pin) => {
          const active = pin.id === activePinId;
          const dimmed =
            highlighted.size > 0 &&
            !!pin.region &&
            !highlighted.has(pin.region);
          return (
            <Marker
              key={pin.id}
              longitude={pin.lng}
              latitude={pin.lat}
              anchor="bottom"
            >
              <PinDot
                pin={pin}
                active={active}
                dimmed={dimmed}
                onClick={() => handlePinClick(pin.id)}
                onMouseEnter={() => onPinHover?.(pin.id)}
                onMouseLeave={() => onPinHover?.(null)}
              />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
