'use client';

/**
 * editorial-v1 — Packages listing grid + filter toolbar (client leaf).
 *
 * Filter state is URL-synced (`?country=&duration=&destination=&view=`) so it
 * stays bookmarkable and crawlable. Chip multi-select uses comma-separated
 * values. The "Cargar más" pagination is in-memory (PAGE_SIZE × n) — server
 * already returns up to 100 rows.
 *
 * Reused primitives:
 *  - PackageCard (sections/packages-filters.client) — same pack-card shell
 *    used in the home teaser, with `pack-*` classes from `editorial-v1.css`.
 *  - ListingMap (sections/listing-map) — map + card-sync toggle.
 *  - Icons primitive (lucide-backed).
 */

import { useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { ListingMap } from '@/components/site/themes/editorial-v1/sections/listing-map';
import { trackEvent } from '@/lib/analytics/track';

// -------------------- Types --------------------

export interface PaquetesListItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  description?: string | null;
  country?: string | null;
  destination?: string | null;
  duration?: string | null;
  durationDays?: number | null;
  price?: string | null;
  featured?: boolean | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PaquetesListGridProps {
  packages: PaquetesListItem[];
  basePath: string;
}

// -------------------- Constants --------------------

const PAGE_SIZE = 9;

// Duration buckets — match designer copy ("1-3 días", "4-7 días", etc.).
const DURATION_BUCKETS: { key: string; label: string; test: (d: number) => boolean }[] = [
  { key: '1-3', label: '1-3 días', test: (d) => d >= 1 && d <= 3 },
  { key: '4-7', label: '4-7 días', test: (d) => d >= 4 && d <= 7 },
  { key: '8-14', label: '8-14 días', test: (d) => d >= 8 && d <= 14 },
  { key: '15+', label: '15+ días', test: (d) => d >= 15 },
];

// Copy verbatim from copy-catalog.md § "Package listing page".
const COPY = {
  filtersHeading: 'Filtros',
  clearLabel: 'Limpiar',
  clearLink: 'limpiar filtros',
  countryLabel: 'País',
  destinationLabel: 'Destino',
  durationLabel: 'Duración',
  viewList: 'Lista',
  viewMap: 'Mapa',
  loadMore: 'Cargar más',
  emptyHeading: 'Ningún paquete con esos filtros',
  emptyBody: 'Prueba ensanchando el rango o limpiando filtros.',
  emptyCta: 'Limpiar filtros',
  fromPrefix: 'Desde · por persona',
  consultPrice: 'Consultar',
  viewPackage: 'Ver',
  countSingular: 'paquete',
  countPlural: 'paquetes',
  foundSuffix: 'encontrados',
};

// -------------------- Helpers --------------------

function parseDurationDays(pkg: PaquetesListItem): number | null {
  if (typeof pkg.durationDays === 'number' && pkg.durationDays > 0) return pkg.durationDays;
  if (!pkg.duration) return null;
  const match = pkg.duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function toArray(param: string | null | undefined): string[] {
  if (!param) return [];
  return param.split(',').map((s) => s.trim()).filter(Boolean);
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

// -------------------- Component --------------------

export function PaquetesListGrid({ packages, basePath }: PaquetesListGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Unique country + destination chips (derived from data).
  const countries = useMemo(() => {
    const seen = new Set<string>();
    packages.forEach((p) => {
      const c = (p.country ?? '').toString().trim();
      if (c) seen.add(c);
    });
    return Array.from(seen).sort();
  }, [packages]);

  const destinations = useMemo(() => {
    const seen = new Set<string>();
    packages.forEach((p) => {
      const d = (p.destination ?? '').toString().trim();
      if (d) seen.add(d);
    });
    return Array.from(seen).sort();
  }, [packages]);

  // Duration buckets present in data.
  const durationChips = useMemo(() => {
    const durations = packages
      .map((p) => parseDurationDays(p))
      .filter((d): d is number => typeof d === 'number' && d > 0);
    return DURATION_BUCKETS.filter((b) => durations.some((d) => b.test(d)));
  }, [packages]);

  // URL-synced state.
  const activeCountries = toArray(searchParams?.get('country'));
  const activeDestinations = toArray(searchParams?.get('destination'));
  const activeDurations = toArray(searchParams?.get('duration'));
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
    (paramKey: 'country' | 'destination' | 'duration', value: string) => {
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
      p.delete('country');
      p.delete('destination');
      p.delete('duration');
    });
  }, [updateParams]);

  // Filter logic.
  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      if (activeCountries.length > 0) {
        if (!activeCountries.some((c) => normalize(pkg.country) === normalize(c))) return false;
      }
      if (activeDestinations.length > 0) {
        if (!activeDestinations.some((d) => normalize(pkg.destination) === normalize(d))) return false;
      }
      if (activeDurations.length > 0) {
        const days = parseDurationDays(pkg);
        if (days === null) return false;
        const matchesBucket = activeDurations.some((k) => {
          const bucket = DURATION_BUCKETS.find((b) => b.key === k);
          return bucket ? bucket.test(days) : false;
        });
        if (!matchesBucket) return false;
      }
      return true;
    });
  }, [packages, activeCountries, activeDestinations, activeDurations]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;
  const anyFilterActive =
    activeCountries.length + activeDestinations.length + activeDurations.length > 0;

  return (
    <>
      {/* ── FILTER TOOLBAR ────────────────────────────────────────────── */}
      <div className="pql-toolbar" data-testid="paquetes-filterbar">
        {/* Country chips */}
        {countries.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.countryLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.countryLabel}>
              {countries.map((c) => {
                const isOn = activeCountries.map(normalize).includes(normalize(c));
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('country', c)}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Destination chips */}
        {destinations.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.destinationLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.destinationLabel}>
              {destinations.map((d) => {
                const isOn = activeDestinations.map(normalize).includes(normalize(d));
                return (
                  <button
                    key={d}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('destination', d)}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Duration chips */}
        {durationChips.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.durationLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.durationLabel}>
              {durationChips.map((b) => {
                const isOn = activeDurations.includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('duration', b.key)}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── LISTING TOP: count + view toggle ──────────────────────────── */}
      <div className="listing-top pql-listing-top">
        <div className="count" data-testid="paquetes-count">
          <b>{filtered.length}</b> de {packages.length}{' '}
          {packages.length === 1 ? COPY.countSingular : COPY.countPlural}
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
        <div className="pql-empty" data-testid="paquetes-empty">
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
          items={filtered.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
          }))}
          renderCard={(item) => {
            const pkg = filtered.find((c) => c.id === item.id);
            if (!pkg) return null;
            return <PackageListCard pkg={pkg} basePath={basePath} />;
          }}
        />
      ) : (
        <>
          <div className="pack-grid" data-testid="paquetes-grid">
            {visible.map((pkg) => (
              <PackageListCard key={pkg.id} pkg={pkg} basePath={basePath} />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPage((p) => p + 1)}
                data-testid="paquetes-load-more"
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

// -------------------- Card --------------------

interface PackageListCardProps {
  pkg: PaquetesListItem;
  basePath: string;
}

function PackageListCard({ pkg, basePath }: PackageListCardProps) {
  const slug = (pkg.slug ?? '').toString().trim();
  const href = slug
    ? `${basePath}/paquetes/${encodeURIComponent(slug)}`
    : `${basePath}/paquetes`;
  const showPopular = pkg.featured === true;
  const priceLabel = (pkg.price ?? '').toString().trim();
  const country = (pkg.country ?? pkg.destination ?? '').toString().trim();

  const onClick = () => {
    trackEvent('package_card_click', {
      packageId: pkg.id,
      slug: slug || null,
    });
  };

  return (
    <article className="pack-card" data-testid="paquete-card">
      <div className="pack-media">
        {pkg.image ? (
          <Image
            src={pkg.image}
            alt={pkg.name}
            fill
            sizes="(max-width: 720px) 88vw, (max-width: 1100px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            className="pack-media-placeholder"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
            }}
          />
        )}
        {showPopular && (
          <span className="pack-popular" aria-label="Popular">
            Popular
          </span>
        )}
      </div>

      <div className="pack-body">
        <div>
          {country && (
            <div className="country-chip country-chip-simple" title={country}>
              <Icons.pin size={12} aria-hidden />
              <span className="country-chip-text">{country}</span>
            </div>
          )}
          <h3 className="pack-title">{pkg.name}</h3>
          {pkg.description && <p className="pack-description">{pkg.description}</p>}
        </div>

        {pkg.duration && (
          <div className="pack-meta">
            <span className="m">
              <Icons.calendar size={14} aria-hidden />
              {pkg.duration}
            </span>
          </div>
        )}

        <hr className="pack-divider" />

        <div className="pack-foot">
          <div className="pack-price">
            <small>{COPY.fromPrefix}</small>
            <strong>{priceLabel || COPY.consultPrice}</strong>
          </div>
          <Link
            href={href}
            className="pack-cta"
            aria-label={`${COPY.viewPackage}: ${pkg.name}`}
            onClick={onClick}
            data-testid="paquete-cta"
          >
            {COPY.viewPackage}
            <Icons.arrow size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default PaquetesListGrid;
