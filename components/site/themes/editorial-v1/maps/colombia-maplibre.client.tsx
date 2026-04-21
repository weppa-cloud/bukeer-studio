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

// Natural Earth 1:10m admin-0 boundary for Colombia — 97-point polygon
const COLOMBIA_GEOJSON = {
  type: 'Feature' as const,
  properties: { name: 'Colombia' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[
      [-75.373223, -0.152032], [-75.801466, 0.084801], [-76.292314, 0.416047],
      [-76.57638, 0.256936], [-77.424984, 0.395687], [-77.668613, 0.825893],
      [-77.855061, 0.809925], [-78.855259, 1.380924], [-78.990935, 1.69137],
      [-78.617831, 1.766404], [-78.662118, 2.267355], [-78.42761, 2.629556],
      [-77.931543, 2.696606], [-77.510431, 3.325017], [-77.12769, 3.849636],
      [-77.496272, 4.087606], [-77.307601, 4.667984], [-77.533221, 5.582812],
      [-77.318815, 5.845354], [-77.476661, 6.691116], [-77.881571, 7.223771],
      [-77.753414, 7.70984], [-77.431108, 7.638061], [-77.242566, 7.935278],
      [-77.474723, 8.524286], [-77.353361, 8.670505], [-76.836674, 8.638749],
      [-76.086384, 9.336821], [-75.6746, 9.443248], [-75.664704, 9.774003],
      [-75.480426, 10.61899], [-74.906895, 11.083045], [-74.276753, 11.102036],
      [-74.197223, 11.310473], [-73.414764, 11.227015], [-72.627835, 11.731972],
      [-72.238195, 11.95555], [-71.75409, 12.437303], [-71.399822, 12.376041],
      [-71.137461, 12.112982], [-71.331584, 11.776284], [-71.973922, 11.608672],
      [-72.227575, 11.108702], [-72.614658, 10.821975], [-72.905286, 10.450344],
      [-73.027604, 9.73677], [-73.304952, 9.152], [-72.78873, 9.085027],
      [-72.660495, 8.625288], [-72.439862, 8.405275], [-72.360901, 8.002638],
      [-72.479679, 7.632506], [-72.444487, 7.423785], [-72.198352, 7.340431],
      [-71.960176, 6.991615], [-70.674234, 7.087785], [-70.093313, 6.960376],
      [-69.38948, 6.099861], [-68.985319, 6.206805], [-68.265052, 6.153268],
      [-67.695087, 6.267318], [-67.34144, 6.095468], [-67.521532, 5.55687],
      [-67.744697, 5.221129], [-67.823012, 4.503937], [-67.621836, 3.839482],
      [-67.337564, 3.542342], [-67.303173, 3.318454], [-67.809938, 2.820655],
      [-67.447092, 2.600281], [-67.181294, 2.250638], [-66.876326, 1.253361],
      [-67.065048, 1.130112], [-67.259998, 1.719999], [-67.53781, 2.037163],
      [-67.868565, 1.692455], [-69.816973, 1.714805], [-69.804597, 1.089081],
      [-69.218638, 0.985677], [-69.252434, 0.602651], [-69.452396, 0.706159],
      [-70.015566, 0.541414], [-70.020656, -0.185156], [-69.577065, -0.549992],
      [-69.420486, -1.122619], [-69.444102, -1.556287], [-69.893635, -4.298187],
      [-70.394044, -3.766591], [-70.692682, -3.742872], [-70.047709, -2.725156],
      [-70.813476, -2.256865], [-71.413646, -2.342802], [-71.774761, -2.16979],
      [-72.325787, -2.434218], [-73.070392, -2.308954], [-73.659504, -1.260491],
      [-74.122395, -1.002833], [-74.441601, -0.53082], [-75.106625, -0.057205],
      [-75.373223, -0.152032],
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
