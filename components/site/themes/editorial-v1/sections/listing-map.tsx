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

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';

import type {
  ColombiaMapLibreProps,
  ColombiaMapPin,
} from '@/components/site/themes/editorial-v1/maps/colombia-maplibre.client';
import type { EditorialRegion } from '@/components/site/themes/editorial-v1/maps/colombia-map-shared';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

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
  /** Accessibility label for the map — defaults to a locale-aware text key. */
  ariaLabel?: string;
  /** Extra classes tacked onto the outer wrapper. */
  className?: string;
  /** Height of the map stage — CSS length. Defaults to `720px`. */
  mapHeight?: string | number;
  /** Locale used by fallback labels when `ariaLabel` is omitted. */
  locale?: string;
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
  ariaLabel,
  className,
  mapHeight = 720,
  locale = 'es-CO',
}: ListingMapProps<T>) {
  const editorialText = getPublicUiExtraTextGetter(locale);
  const resolvedAriaLabel = ariaLabel ?? editorialText('editorialListingMapAriaFallback');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [MapComponent, setMapComponent] = useState<ComponentType<ColombiaMapLibreProps> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    const stage = mapStageRef.current;
    if (!stage || mapVisible) return;

    const reveal = () => setMapVisible(true);
    if (!('IntersectionObserver' in window)) {
      const id = setTimeout(reveal, 3500);
      return () => clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [mapVisible]);

  useEffect(() => {
    if (!mapVisible || MapComponent) return;
    let cancelled = false;
    import('@/components/site/themes/editorial-v1/maps/colombia-maplibre.client').then((mod) => {
      if (!cancelled) {
        setMapComponent(() => mod.ColombiaMapLibre);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mapVisible, MapComponent]);

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
      <div ref={mapStageRef} className="listing-map-stage">
        {MapComponent ? (
          <MapComponent
            pins={pins}
            activePinId={activeId}
            onPinHover={handlePinHover}
            onPinClick={onItemClick ? handlePinClick : undefined}
            height={mapHeight}
            ariaLabel={resolvedAriaLabel}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', minHeight: 480, background: '#F5F1E8', borderRadius: 16 }} />
        )}
      </div>
    </div>
  );
}

export default ListingMap;
