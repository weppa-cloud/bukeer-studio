'use client';

/**
 * <ListingMap /> — generic map + card-list sync view.
 *
 * Editorial-v1 pattern. Left column is a scrollable list of cards; right
 * column is an interactive ColombiaMap. Hovering a card highlights the
 * matching pin and vice versa. Hovering a pin scrolls the matching card
 * into view (via `scrollIntoView` with `behavior: 'smooth'`).
 *
 * Port of designer `ListingMap` in `themes/references/claude design 1/project/maps.jsx`,
 * generalised so any editorial page (destinos, paquetes, experiencias) can
 * feed it `items` + `renderCard`.
 *
 * Items without `lat`/`lng` are listed in the left column but omitted from
 * the map — the designer behaviour.
 *
 * Ported verbatim from the copy catalog & designer spec:
 *   themes/references/claude design 1/project/maps.jsx (ListingMap)
 *   themes/references/claude design 1/project/maps.css  (.listing-map-*)
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { ColombiaMapClient } from '@/components/site/themes/editorial-v1/maps/colombia-map.client';
import type { ColombiaMapPin } from '@/components/site/themes/editorial-v1/maps/colombia-map';
import type { EditorialRegion } from '@/components/site/themes/editorial-v1/maps/colombia-map-shared';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface ListingMapItem {
  id: string;
  slug?: string | null;
  name: string;
  lat?: number | null;
  lng?: number | null;
  region?: EditorialRegion | string | null;
  [key: string]: unknown;
}

export interface ListingMapProps<T extends ListingMapItem> {
  items: readonly T[];
  /** Render function for the left-column card. `isActive` flips when the user hovers the matching pin. */
  renderCard: (item: T, context: { isActive: boolean }) => ReactNode;
  /** Optional click handler for a pin — fires the matching item. */
  onItemClick?: (item: T) => void;
  /** Accessibility label for the map — defaults to "Mapa de listado". */
  ariaLabel?: string;
  /** Extra classes tacked onto the outer wrapper. */
  className?: string;
  /** Height of the map stage — CSS length. Defaults to `720px`. */
  mapHeight?: string | number;
}

function isPinnable(item: ListingMapItem): boolean {
  return (
    typeof item.lat === 'number' &&
    typeof item.lng === 'number' &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng)
  );
}

function normaliseRegion(value: unknown): EditorialRegion | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.toLowerCase();
  if (v === 'caribe') return 'caribe';
  if (v === 'andes') return 'andes';
  if (v === 'pacifico' || v === 'pacífico') return 'pacifico';
  if (v === 'selva' || v === 'amazonia' || v === 'amazonía') return 'selva';
  return undefined;
}

export function ListingMap<T extends ListingMapItem>({
  items,
  renderCard,
  onItemClick,
  ariaLabel = editorialText('editorialListingMapAriaFallback'),
  className,
  mapHeight = 720,
}: ListingMapProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const pinnableItems = useMemo(
    () => items.filter((item) => isPinnable(item)),
    [items],
  );

  const pins: ColombiaMapPin[] = useMemo(
    () =>
      pinnableItems.map((item) => ({
        id: item.id,
        lat: item.lat as number,
        lng: item.lng as number,
        label: item.name,
        region: normaliseRegion(item.region),
      })),
    [pinnableItems],
  );

  const handlePinHover = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) {
      const el = cardRefs.current.get(id);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, []);

  const handlePinClick = useCallback(
    (id: string) => {
      if (!onItemClick) return;
      const item = items.find((candidate) => candidate.id === id);
      if (item) onItemClick(item);
    },
    [items, onItemClick],
  );

  return (
    <div
      className={`listing-map-view${className ? ` ${className}` : ''}`}
      data-testid="listing-map"
    >
      <div
        ref={listRef}
        className="listing-map-cards"
        role="list"
        aria-label={editorialText('editorialListingMapCardsAria')}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) cardRefs.current.set(item.id, el);
                else cardRefs.current.delete(item.id);
              }}
              className={`lm-card${isActive ? ' on' : ''}`}
              role="listitem"
              data-pin-id={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(item.id)}
              onBlur={() => setActiveId(null)}
            >
              {renderCard(item, { isActive })}
            </div>
          );
        })}
      </div>
      <div className="listing-map-stage">
        <ColombiaMapClient
          pins={pins}
          activePinId={activeId}
          onPinHover={handlePinHover}
          onPinClick={onItemClick ? handlePinClick : undefined}
          showLabels={false}
          showRidges
          showRivers={false}
          showCompass
          height={mapHeight}
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

export default ListingMap;
