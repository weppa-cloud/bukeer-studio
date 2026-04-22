'use client';

/**
 * editorial-v1 — Packages listing grid + filter toolbar (client leaf).
 *
 * Filter state is URL-synced (`?country=&location=&duration=&q=&view=`) so it
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
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { convertCurrencyAmount, type CurrencyConfig } from '@/lib/site/currency';
import { usePreferredCurrency } from '@/lib/site/use-preferred-currency';
import type { WebsiteData } from '@/lib/supabase/get-website';

// -------------------- Types --------------------

export interface PaquetesListItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  description?: string | null;
  location?: string | null;
  country?: string | null;
  destination?: string | null;
  duration?: string | null;
  durationDays?: number | null;
  price?: string | null;
  priceValue?: number | null;
  priceCurrency?: string | null;
  featured?: boolean | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PaquetesListGridProps {
  packages: PaquetesListItem[];
  basePath: string;
  account?: WebsiteData['content']['account'] | null;
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
  locationLabel: 'Ubicación',
  keywordLabel: 'Palabra clave',
  keywordPlaceholder: 'Buscar por palabra clave',
  durationLabel: 'Duración',
  durationAny: 'Cualquiera',
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

export function PaquetesListGrid({ packages, basePath, account = null }: PaquetesListGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencyConfig, preferredCurrency } = usePreferredCurrency(account);

  // Unique country chips (derived from data).
  const countries = useMemo(() => {
    const seen = new Set<string>();
    packages.forEach((p) => {
      const c = (p.country ?? '').toString().trim();
      if (c) seen.add(c);
    });
    return Array.from(seen).sort();
  }, [packages]);

  const locations = useMemo(() => {
    const seen = new Set<string>();
    packages.forEach((p) => {
      const value = (p.location ?? '').toString().trim();
      if (value) seen.add(value);
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
  const activeLocations = toArray(searchParams?.get('location'));
  const activeDuration = searchParams?.get('duration') ?? 'all';
  const query = searchParams?.get('q') ?? '';
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
    (paramKey: 'country' | 'location', value: string) => {
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

  const setDuration = useCallback(
    (value: string) => {
      updateParams((p) => {
        if (!value || value === 'all') p.delete('duration');
        else p.set('duration', value);
      });
    },
    [updateParams],
  );

  const setKeyword = useCallback(
    (value: string) => {
      updateParams((p) => {
        const next = value.trim();
        if (!next) {
          p.delete('q');
          return;
        }
        p.set('q', next);
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
      p.delete('location');
      p.delete('duration');
      p.delete('q');
    });
  }, [updateParams]);

  // Filter logic.
  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      if (activeCountries.length > 0) {
        if (!activeCountries.some((c) => normalize(pkg.country) === normalize(c))) return false;
      }
      if (activeLocations.length > 0) {
        const location = normalize(pkg.location);
        if (!activeLocations.some((l) => location === normalize(l))) return false;
      }
      if (activeDuration !== 'all') {
        const days = parseDurationDays(pkg);
        if (days === null) return false;
        const bucket = DURATION_BUCKETS.find((b) => b.key === activeDuration);
        const matchesBucket = bucket ? bucket.test(days) : false;
        if (!matchesBucket) return false;
      }
      if (query.trim()) {
        const haystack = [
          pkg.name,
          pkg.description,
          pkg.location,
          pkg.destination,
          pkg.country,
          pkg.duration,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [packages, activeCountries, activeLocations, activeDuration, query]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = visible.length < filtered.length;
  const anyFilterActive =
    activeCountries.length + activeLocations.length > 0
    || activeDuration !== 'all'
    || !!query.trim();

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

        {locations.length > 0 && (
          <div className="pql-filter-group">
            <label className="pql-filter-label">{COPY.locationLabel}</label>
            <div className="pql-chip-row" role="group" aria-label={COPY.locationLabel}>
              {locations.map((location) => {
                const isOn = activeLocations.map(normalize).includes(normalize(location));
                return (
                  <button
                    key={location}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => toggleMulti('location', location)}
                  >
                    {location}
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
              {[{ key: 'all', label: COPY.durationAny }, ...durationChips].map((b) => {
                const isOn = activeDuration === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`chip-filter${isOn ? ' on' : ''}`}
                    aria-pressed={isOn}
                    onClick={() => setDuration(b.key)}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pql-filter-group">
          <label htmlFor="paquetes-keyword" className="pql-filter-label">{COPY.keywordLabel}</label>
          <input
            id="paquetes-keyword"
            type="text"
            value={query}
            onChange={(event) => setKeyword(event.target.value)}
            className="listing-keyword-input"
            placeholder={COPY.keywordPlaceholder}
            aria-label={COPY.keywordLabel}
          />
        </div>
      </div>

      {/* ── LISTING TOP: count + view toggle ──────────────────────────── */}
      <div className="listing-top pql-listing-top">
        <div className="count" data-testid="paquetes-count">
          <b>{filtered.length}</b> de {packages.length}{' '}
          {packages.length === 1 ? COPY.countSingular : COPY.countPlural}
          {anyFilterActive && (
            <>
              {' · '}
              <button
                type="button"
                onClick={clearFilters}
                style={{ color: 'var(--c-accent)' }}
                className="chip-filter"
              >
                {COPY.clearLink}
              </button>
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
            return (
              <PackageListCard
                pkg={pkg}
                basePath={basePath}
                preferredCurrency={preferredCurrency}
                currencyConfig={currencyConfig}
              />
            );
          }}
        />
      ) : (
        <>
          <div className="pack-grid" data-testid="paquetes-grid">
            {visible.map((pkg) => (
              <PackageListCard
                key={pkg.id}
                pkg={pkg}
                basePath={basePath}
                preferredCurrency={preferredCurrency}
                currencyConfig={currencyConfig}
              />
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
  preferredCurrency?: string | null;
  currencyConfig?: CurrencyConfig | null;
}

function resolvePriceLabel(
  pkg: PaquetesListItem,
  preferredCurrency: string | null | undefined,
  currencyConfig: CurrencyConfig | null | undefined,
): string {
  if (typeof pkg.priceValue === 'number' && Number.isFinite(pkg.priceValue) && pkg.priceValue > 0) {
    const sourceCurrency = pkg.priceCurrency ?? null;
    const targetCurrency = preferredCurrency ?? sourceCurrency;
    const converted = convertCurrencyAmount(pkg.priceValue, sourceCurrency, targetCurrency, currencyConfig ?? null);
    return formatPriceOrConsult(converted, targetCurrency ?? sourceCurrency, { fallback: COPY.consultPrice });
  }
  const label = (pkg.price ?? '').toString().trim();
  return label || COPY.consultPrice;
}

function PackageListCard({
  pkg,
  basePath,
  preferredCurrency,
  currencyConfig,
}: PackageListCardProps) {
  const slug = (pkg.slug ?? '').toString().trim();
  const href = slug
    ? `${basePath}/paquetes/${encodeURIComponent(slug)}`
    : `${basePath}/paquetes`;
  const showPopular = pkg.featured === true;
  const priceLabel = resolvePriceLabel(pkg, preferredCurrency, currencyConfig);
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
            <strong>{priceLabel}</strong>
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
