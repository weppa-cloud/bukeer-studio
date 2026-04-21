'use client';

/**
 * <ColombiaMapClient> — thin `'use client'` wrapper around the server
 * `<ColombiaMap>` that adds interactive hover + click handling for pins.
 *
 * Reach for this variant only when you need pointer interaction
 * (destinos page, itinerary map, listing map). The plain
 * `<ColombiaMap>` from `./colombia-map` is a server component and is
 * the preferred entry point for editorial art and landing banners.
 */

import { useCallback, useState } from 'react';

import { ColombiaMap, type ColombiaMapProps } from './colombia-map';
import { MAP_BOX, project } from './colombia-map-shared';

export interface ColombiaMapClientProps extends ColombiaMapProps {
  /** Controlled active pin — overrides internal hover state when set. */
  activePinId?: string | null;
  /** Click handler. Receives the pin id. */
  onPinClick?: (id: string) => void;
  /** Hover handler — fires with null when the pointer leaves all pins. */
  onPinHover?: (id: string | null) => void;
}

export function ColombiaMapClient({
  pins = [],
  activePinId = null,
  onPinClick,
  onPinHover,
  showLabels = true,
  ...rest
}: ColombiaMapClientProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const handleEnter = useCallback(
    (id: string) => {
      setHoverId(id);
      onPinHover?.(id);
    },
    [onPinHover]
  );
  const handleLeave = useCallback(() => {
    setHoverId(null);
    onPinHover?.(null);
  }, [onPinHover]);

  const effectiveActiveId = activePinId ?? hoverId;

  return (
    <ColombiaMap
      {...rest}
      // Suppress the server-rendered pins; we render interactive copies below.
      pins={[]}
      activePinId={null}
      showLabels={false}
    >
      {pins.map((pin) => {
        const { x, y } = project(pin);
        const active = pin.id === effectiveActiveId;
        const labelX = x > MAP_BOX.w * 0.7 ? -14 : 14;
        const labelAnchor = x > MAP_BOX.w * 0.7 ? 'end' : 'start';
        return (
          <g
            key={pin.id}
            className={`co-pin${active ? ' on' : ''}`}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            data-pin-id={pin.id}
            data-region={pin.region}
            onMouseEnter={() => handleEnter(pin.id)}
            onMouseLeave={handleLeave}
            onFocus={() => handleEnter(pin.id)}
            onBlur={handleLeave}
            onClick={() => onPinClick?.(pin.id)}
            style={{ cursor: onPinClick ? 'pointer' : 'default' }}
            tabIndex={onPinClick ? 0 : -1}
            role={onPinClick ? 'button' : undefined}
            aria-label={pin.label}
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
      })}
    </ColombiaMap>
  );
}
