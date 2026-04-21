'use client';

/**
 * editorial-v1 — Hotels listing grid + filter toolbar (client leaf).
 *
 * Sister component to `paquetes-list-grid.client.tsx`. Filter state is
 * URL-synced (`?city=&stars=&amenity=&view=`) so it's bookmarkable.
 *
 * Reused primitives:
 *  - HotelCard (product-detail/p2/hotel-card) with `variant="card"` — the
 *    card shape shipped in Wave 2.8 for editorial hotels.
 *  - ListingMap (sections/listing-map) — map + card-sync toggle.
 *  - Icons primitive.
 */

import { useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { ListingMap } from '@/components/site/themes/editorial-v1/sections/listing-map';
import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';

// -------------------- Types --------------------

export interface HotelesListItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  starRating?: number | null;
  amenities?: string[] | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface HotelesListGridProps {
  hotels: HotelesListItem[];
  basePath: string;
}

// -------------------- Copy (verbatim — listing page) --------------------

const COPY = {
  cityLabel: 'Ciudad',
  starsLabel: 'Estrellas',
  amenityLabel: 'Servicios',
  viewList: 'Lista',
  viewMap: 'Mapa',
  loadMore: 'Cargar más',
  emptyHeading: 'Ningún hotel con esos filtros',
  emptyBody: 'Prueba ensanchando el rango o limpiando filtros.',
  emptyCta: 'Limpiar filtros',
  clearLink: 'limpiar filtros',
  countSingular: 'hotel',
  countPlural: 'hoteles',
};

const PAGE_SIZE = 9;
const TOP_AMENITIES_MAX = 8;

// -------------------- Helpers --------------------

function toArray(param: string | null | undefined): string[] {
  if (!param) return [];
  return param.split(',').map((s) => s.trim()).filter(Boolean);
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function hotelCity(h: HotelesListItem): string {
  const explicit = (h.city ?? '').toString().trim();
  if (explicit) return explicit;
  const fromLocation = (h.location ?? '').toString().split(',')[0]?.trim();
  return fromLocation || '';
}

// -------------------- Component --------------------

export function HotelesListGrid({ hotels, basePath }: HotelesListGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Unique cities (from explicit `city` or first component of `location`).
  const cities = useMemo(() => {
    const seen = new Set<string>();
    hotels.forEach((h) => {
      const c = hotelCity(h);
      if (c) seen.add(c);
    });
    return Array.from(seen).sort();
  }, [hotels]);

  // Star buckets present in data.
  const starOptions = useMemo(() => {
    const seen = new Set<number>();
    hotels.forEach((h) => {
      if (typeof h.starRating === 'number' && h.starRating >= 1 && h.starRating <= 5) {
        seen.add(Math.round(h.starRating));
      }
    });
    return Array.from(seen).sort((a, b) => b - a);
  }, [hotels]);

  // Top N amenities (by frequency).
  const amenityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    hotels.forEach((h) => {
      if (Array.isArray(h.amenities)) {
        h.amenities.forEach((a) => {
          const key = (a ?? '').toString().trim();
          if (!key) return;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_AMENITIES_MAX)
      .map(([k]) => k);
  }, [hotels]);

  // URL-synced state.
  const activeCities = toArray(searchParams?.get('city'));
  const activeStars = toArray(searchParams?.get('stars'));
  const activeAmenities = toArray(searchParams?.get('amenity'));
  const view = searchParams?.get('view') === 'map' ? 'map' : 'list';

  const [page, setPage] = useState(1);

  const updateParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      mutator(next);
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
      setPage(1);
    },
    [router, searchParams],
  );

  const toggleMulti = useCallback(
    (paramKey: 'city' | 'stars' | 'amenity', value: string) => {
      updateParams((p) => {
        const current = toArray(p.get(paramKey));
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (next.length === 0) p.delete(paramKey);
        else p.set(paramKey, next.join(','));
      });
    },
    [updateParams],
  );

  const setView = useCallback(
    (v: 'list' | 'map') => {
      updateParams((p) => {
        if (v === 'map') p.set('view', 'map');
        else p.delete('view');
      });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    updateParams((p) => {
      p.delete('city');
      p.delete('stars');
      p.delete('amenity');
    });
  }, [updateParams]);

  // Filter logic.
  const filtered = useMemo(() => {
    return hotels.filter((h) => {
      if (activeCities.length > 0) {
        const c = normalize(hotelCity(h));
        if (!activeCities.some((x) => normalize(x) === c)) return false;
      }
      if (activeStars.length > 0) {
        const s = typeof h.starRating === 'number' ? Math.round(h.starRating) : null;
        if (s === null || !activeStars.map((x) => parseInt(x, 10)).includes(s)) return false;
      }
      if (activeAmenities.length > 0) {
        const pool = (h.amenities ?? []).map(normalize);
        if (!activeAmenities.every((a) => pool.includes(normalize(a)))) return false;
      }
      return true;
    });
  }, [hotels, activeCities, activeStars, activeAmenities]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;
  const anyFilterActive =
    activeCities.length + activeStars.length + activeAmenities.length > 0;

  return (
    <>
      {/* ── FILTER TOOLBAR ────────────────────────────────────────────── */}
      <div className="pql-toolbar" data-testid="hoteles-filterbar">
        {cities.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.cityLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.cityLabel}>
              {cities.map((c) => {
                const isOn = activeCities.map(normalize).includes(normalize(c));
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('city', c)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {starOptions.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.starsLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.starsLabel}>
              {starOptions.map((s) => {
                const key = String(s);
                const isOn = activeStars.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('stars', key)}
                  >
                    {s}★
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {amenityOptions.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.amenityLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.amenityLabel}>
              {amenityOptions.map((a) => {
                const isOn = activeAmenities.map(normalize).includes(normalize(a));
                return (
                  <button
                    key={a}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('amenity', a)}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── LISTING TOP: count + view toggle ──────────────────────────── */}
      <div className="listing-top pql-listing-top">
        <div className="count" data-testid="hoteles-count">
          <b>{filtered.length}</b> de {hotels.length}{' '}
          {hotels.length === 1 ? COPY.countSingular : COPY.countPlural}
          {anyFilterActive && (
            <>
              {' · '}
              <a
                onClick={clearFilters}
                style={{ cursor: 'pointer', color: 'var(--c-accent)' }}
              >
                {COPY.clearLink}
              </a>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="view-toggle pql-view-toggle" role="tablist" aria-label="Vista">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={view === 'list' ? 'on' : ''}
              onClick={() => setView('list')}
            >
              <Icons.grid size={14} aria-hidden /> {COPY.viewList}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'map'}
              className={view === 'map' ? 'on' : ''}
              onClick={() => setView('map')}
            >
              <Icons.pin size={14} aria-hidden /> {COPY.viewMap}
            </button>
          </div>
        </div>
      </div>

      {/* ── RESULTS ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="pql-empty" data-testid="hoteles-empty">
          <div className="pql-empty-heading">{COPY.emptyHeading}</div>
          <p className="body-md" style={{ marginBottom: 20 }}>{COPY.emptyBody}</p>
          {anyFilterActive && (
            <button type="button" className="btn btn-ink" onClick={clearFilters}>
              {COPY.emptyCta}
            </button>
          )}
        </div>
      ) : view === 'map' ? (
        <ListingMap
          items={filtered.map((h) => ({
            id: h.id,
            slug: h.slug,
            name: h.name,
            lat: h.lat,
            lng: h.lng,
          }))}
          renderCard={(item) => {
            const h = filtered.find((c) => c.id === item.id);
            if (!h) return null;
            return <HotelesCardWrapper hotel={h} basePath={basePath} />;
          }}
        />
      ) : (
        <>
          <div className="hoteles-grid" data-testid="hoteles-grid">
            {visible.map((h) => (
              <HotelesCardWrapper key={h.id} hotel={h} basePath={basePath} />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPage((p) => p + 1)}
                data-testid="hoteles-load-more"
              >
                {COPY.loadMore} <Icons.arrow size={14} aria-hidden />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// -------------------- Card wrapper --------------------

/**
 * Wraps the existing `HotelCard` (`variant="card"`) used by Wave 2.8, adding
 * the editorial-v1 listing-specific `data-testid` + slug-relative hrefs.
 * `HotelCard` itself builds the `/hoteles/{slug}` link from `hotelSlug`.
 */
function HotelesCardWrapper({
  hotel,
  basePath: _basePath,
}: {
  hotel: HotelesListItem;
  basePath: string;
}) {
  return (
    <div data-testid="hotel-list-card">
      <HotelCard
        variant="card"
        title={hotel.name}
        starRating={typeof hotel.starRating === 'number' ? hotel.starRating : null}
        amenities={hotel.amenities ?? null}
        hotelSlug={hotel.slug ?? null}
        description={hotel.description ?? null}
        imageUrl={hotel.image ?? null}
        city={hotelCity(hotel) || null}
        category={hotel.category ?? null}
      />
    </div>
  );
}

export default HotelesListGrid;
