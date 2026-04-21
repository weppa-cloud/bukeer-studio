/**
 * <ColombiaMap> — editorial hand-drawn Colombia silhouette.
 *
 * Server-first SVG component. Renders the silhouette, San Andrés
 * islands, optional ridges/rivers/compass and an arbitrary set of
 * destination pins. Pure presentation — pass lat/lng and a label.
 *
 * Interactive uses (hover + click callbacks) should reach for the
 * `ColombiaMapClient` wrapper in `./colombia-map.client.tsx` which
 * ports the same SVG into a `'use client'` boundary.
 *
 * Ported from `themes/references/claude design 1/project/maps.jsx`
 * (ColombiaMap). Visual tokens come from the editorial-v1 --c-* scope
 * (see `components/site/themes/editorial-v1/editorial-v1.css`).
 */

import type { CSSProperties, ReactNode } from 'react';

import {
  ANDES_RIDGES,
  COLOMBIA_PATH,
  MAP_BOX,
  REGION_PATHS,
  RIVERS,
  SAN_ANDRES_ISLANDS,
  project,
  type EditorialRegion,
} from './colombia-map-shared';

export interface ColombiaMapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Optional region tag — sets `data-region` on the pin for CSS targeting. */
  region?: EditorialRegion;
}

export interface ColombiaMapProps {
  /** Regions to emphasise with a highlight overlay. */
  highlightedRegions?: ReadonlyArray<EditorialRegion>;
  /** Pin set projected into the editorial viewBox. */
  pins?: ReadonlyArray<ColombiaMapPin>;
  /** Currently active pin id — receives the halo ring. */
  activePinId?: string | null;
  /** Click handler — presence triggers client-side rendering (see client leaf). */
  onPinClick?: (id: string) => void;
  /** Extra class merged onto the outer wrapper (after `co-map co-map-editorial`). */
  className?: string;
  /** Whether to render the compass rose (default true). */
  showCompass?: boolean;
  /** Whether to render the Andes ridges (default true). */
  showRidges?: boolean;
  /** Whether to render the Magdalena/Amazonas/Orinoco rivers (default true). */
  showRivers?: boolean;
  /** Whether to render pin labels next to each pin (default true). */
  showLabels?: boolean;
  /** CSS height value — defaults to `540px`. */
  height?: string | number;
  /** Accessible label for the map (defaults to "Mapa de Colombia"). */
  ariaLabel?: string;
  /** Optional long-form description slot (rendered inside `<desc>`). */
  description?: string;
  /** Children slot projected into the SVG root — used by the client leaf for hover groups. */
  children?: ReactNode;
}

interface InternalPinProps {
  pin: ColombiaMapPin;
  active: boolean;
  showLabels: boolean;
}

/**
 * Single pin rendered inside the SVG. Pure — no hover state, no handlers.
 * The client leaf composes its own interactive pin group around this.
 */
export function ColombiaMapPin({ pin, active, showLabels }: InternalPinProps) {
  const { x, y } = project(pin);
  const labelAnchor = x > MAP_BOX.w * 0.7 ? 'end' : 'start';
  const labelX = x > MAP_BOX.w * 0.7 ? -14 : 14;
  return (
    <g
      className={`co-pin${active ? ' on' : ''}`}
      transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
      data-pin-id={pin.id}
      data-region={pin.region}
    >
      {active ? <circle r="22" className="co-pin-halo" /> : null}
      <circle r="9" className="co-pin-core" />
      <circle r="4" className="co-pin-dot" />
      {showLabels ? (
        <text
          className="co-pin-label"
          x={labelX}
          y={4}
          textAnchor={labelAnchor}
        >
          {pin.label}
        </text>
      ) : null}
    </g>
  );
}

/**
 * Server component. Renders the editorial Colombia SVG stage.
 *
 * When `onPinClick` is omitted (the common case — landing banners,
 * destination cards, static hero art) this renders without any
 * hydration cost. If callers need interactivity, they import
 * `ColombiaMapClient` from `./colombia-map.client` which wraps this
 * layout in a `'use client'` boundary.
 */
export function ColombiaMap({
  highlightedRegions,
  pins = [],
  activePinId = null,
  className,
  showCompass = true,
  showRidges = true,
  showRivers = true,
  showLabels = true,
  height = 540,
  ariaLabel = 'Mapa de Colombia',
  description,
  children,
}: ColombiaMapProps) {
  const wrapperClass = ['co-map', 'co-map-editorial', className]
    .filter(Boolean)
    .join(' ');
  const style: CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
  };
  const descText =
    description ??
    'Ilustración editorial de Colombia con paradas destacadas, cordillera andina y principales ríos.';
  const highlightSet = new Set(highlightedRegions ?? []);

  return (
    <div className={wrapperClass} style={style} role="img" aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${MAP_BOX.w} ${MAP_BOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="co-map-svg"
      >
        <title>{ariaLabel}</title>
        <desc>{descText}</desc>

        <defs>
          <pattern
            id="co-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.18"
            />
          </pattern>
          <radialGradient id="co-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <filter
            id="co-softshadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.28" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean glow background */}
        <rect
          x="0"
          y="0"
          width={MAP_BOX.w}
          height={MAP_BOX.h}
          fill="url(#co-glow)"
          className="co-ocean"
        />

        {/* Country silhouette with hatch fill */}
        <g filter="url(#co-softshadow)">
          <path d={COLOMBIA_PATH} className="co-land" fill="url(#co-hatch)" />
          <path d={COLOMBIA_PATH} className="co-land-stroke" fill="none" />

          {/* Region overlays (only visible when highlighted) */}
          {(Object.keys(REGION_PATHS) as EditorialRegion[]).map((region) => {
            const isOn = highlightSet.has(region);
            return (
              <path
                key={region}
                d={REGION_PATHS[region]}
                className={`co-region${isOn ? ' on' : ''}`}
                data-region={region}
                fill="none"
              />
            );
          })}

          {/* San Andrés & Providencia islands */}
          {SAN_ANDRES_ISLANDS.map((island, k) => (
            <g key={`island-${k}`}>
              <circle
                cx={island.cx}
                cy={island.cy}
                r={island.r}
                className="co-land"
                fill="url(#co-hatch)"
              />
              <circle
                cx={island.cx}
                cy={island.cy}
                r={island.r}
                className="co-land-stroke"
                fill="none"
              />
            </g>
          ))}

          {/* Dashed link showing the islands belong to the territory */}
          <path
            d="M 244 118 Q 340 150 440 210"
            className="co-link-dash"
            fill="none"
          />
        </g>

        {/* Andes ridges */}
        {showRidges
          ? ANDES_RIDGES.map((d, i) => (
              <path key={`ridge-${i}`} d={d} className="co-ridge" fill="none" />
            ))
          : null}

        {/* Rivers */}
        {showRivers
          ? RIVERS.map((d, i) => (
              <path key={`river-${i}`} d={d} className="co-river" fill="none" />
            ))
          : null}

        {/* Pins */}
        {pins.map((pin) => (
          <ColombiaMapPin
            key={pin.id}
            pin={pin}
            active={pin.id === activePinId}
            showLabels={showLabels}
          />
        ))}

        {/* Children slot — client leaf renders interactive pin overlays here */}
        {children}

        {/* Compass rose */}
        {showCompass ? (
          <g className="co-compass" transform="translate(720 940)">
            <circle r="28" className="co-compass-ring" fill="none" />
            <path
              d="M 0 -22 L 4 0 L 0 22 L -4 0 Z"
              className="co-compass-needle"
            />
            <text y="-34" textAnchor="middle" className="co-compass-n">
              N
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
