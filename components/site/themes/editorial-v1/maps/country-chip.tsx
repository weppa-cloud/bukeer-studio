/**
 * <CountryChip> — tiny inline chip with a Colombia silhouette + a single
 * glowing dot, used on package / destination cards to show which
 * destination the card refers to at a glance.
 *
 * Ported from `themes/references/claude design 1/project/maps.jsx`
 * (CountryChip). Server component.
 */

import {
  COLOMBIA_PATH,
  MAP_BOX,
  SAN_ANDRES_ISLANDS,
} from './colombia-map-shared';

export interface CountryChipProps {
  /** Latitude of the highlighted spot. */
  lat: number;
  /** Longitude of the highlighted spot. */
  lng: number;
  /** Destination / region label shown next to the silhouette. */
  label: string;
  /** Accessible title for the SVG (defaults to label). */
  title?: string;
  className?: string;
}

export function CountryChip({
  lat,
  lng,
  label,
  title,
  className,
}: CountryChipProps) {
  const { minLat, maxLat, minLng, maxLng, w, h } = MAP_BOX;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
  const chipTitle = title ?? label;

  return (
    <span
      className={['country-chip', className].filter(Boolean).join(' ')}
      title={chipTitle}
    >
      <svg
        viewBox={`0 0 ${MAP_BOX.w} ${MAP_BOX.h}`}
        className="country-chip-svg"
        aria-hidden="true"
        focusable="false"
      >
        <path d={COLOMBIA_PATH} className="country-chip-land" />
        {SAN_ANDRES_ISLANDS.map((island, k) => (
          <circle
            key={`chip-island-${k}`}
            cx={island.cx}
            cy={island.cy}
            r={island.r + 2}
            className="country-chip-land"
          />
        ))}
        <circle cx={x} cy={y} r="42" className="country-chip-halo" />
        <circle cx={x} cy={y} r="22" className="country-chip-dot" />
      </svg>
      <span className="country-chip-text">{label}</span>
    </span>
  );
}
