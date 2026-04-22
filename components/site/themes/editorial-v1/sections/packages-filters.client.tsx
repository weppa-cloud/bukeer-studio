/**
 * editorial-v1 — Packages section client leaf.
 *
 * Owns filter tab state + renders the grid/carousel of <PackageCard />.
 * Cards emit `trackEvent('package_card_click', { packageId, slug })` on
 * CTA click. Kept deliberately small — everything non-stateful (section
 * header, shell) stays in the server component.
 *
 * Filter strategy: `filterKey` on each tab is matched against the
 * `tags[]` array on each package (case-insensitive). The "all" tab
 * (`filterKey === 'all'`) always shows every card. When a package has
 * no tags, it is only visible under the "all" tab.
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import { trackEvent } from '@/lib/analytics/track';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { convertCurrencyAmount, type CurrencyConfig } from '@/lib/site/currency';
import { usePreferredCurrency } from '@/lib/site/use-preferred-currency';
import type { WebsiteData } from '@/lib/supabase/get-website';

export interface EditorialPackageItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  description?: string | null;
  category?: string | null;
  country?: string | null;
  destination?: string | null;
  duration?: string | null;
  stops?: string | null;
  price?: string | null;
  priceValue?: number | null;
  priceCurrency?: string | null;
  featured?: boolean | null;
  tags?: string[] | null;
  categoryKeys?: string[] | null;
}

export interface EditorialFilterTab {
  label: string;
  filterKey: string;
  count?: number;
}

interface PackagesFiltersProps {
  packages: EditorialPackageItem[];
  tabs: EditorialFilterTab[];
  basePath: string;
  account?: WebsiteData['content']['account'] | null;
  enableFilters: boolean;
  locale?: string | null;
  labels: {
    allTab: string;
    popularBadge: string;
    fromPrefix: string;
    consultPrice: string;
    viewPackage: string;
    emptyFallback: string;
  };
}

const ALL_KEY = 'all';

function normalizeTag(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

function matchesFilter(pkg: EditorialPackageItem, key: string): boolean {
  if (key === ALL_KEY) return true;
  const target = key.toLowerCase();
  const tagPool = [
    ...(pkg.tags ?? []),
    ...(pkg.categoryKeys ?? []),
    pkg.category ?? '',
    pkg.destination ?? '',
    pkg.country ?? '',
  ]
    .map(normalizeTag)
    .filter(Boolean);
  return tagPool.includes(target) || tagPool.includes(target.replace(/-/g, ' '));
}

export function PackagesFilters({
  packages,
  tabs,
  basePath,
  account = null,
  enableFilters,
  locale,
  labels,
}: PackagesFiltersProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const { currencyConfig, preferredCurrency } = usePreferredCurrency(account);
  const effectiveTabs = useMemo<EditorialFilterTab[]>(() => {
    if (!enableFilters) return [];
    const hasAllTab = tabs.some((t) => t.filterKey.toLowerCase() === ALL_KEY);
    if (hasAllTab) return tabs;
    return [
      { label: labels.allTab, filterKey: ALL_KEY, count: packages.length },
      ...tabs,
    ];
  }, [tabs, enableFilters, labels.allTab, packages.length]);

  const [activeKey, setActiveKey] = useState<string>(ALL_KEY);

  const filtered = useMemo(() => {
    if (!enableFilters) return packages;
    return packages.filter((pkg) => matchesFilter(pkg, activeKey));
  }, [packages, activeKey, enableFilters]);

  if (packages.length === 0) {
    return (
      <p
        className="ev-packages-empty"
        style={{
          textAlign: 'center',
          color: 'var(--c-ink-2)',
          fontSize: 15,
          padding: '48px 0',
        }}
      >
        {labels.emptyFallback}
      </p>
    );
  }

  return (
    <>
      {enableFilters && effectiveTabs.length > 0 && (
        <div
          className="filter-bar pack-filters"
          role="tablist"
          aria-label={editorialText('editorialPackagesFiltersAria')}
        >
          {effectiveTabs.map((tab) => {
            const isActive = tab.filterKey.toLowerCase() === activeKey;
            return (
              <button
                key={tab.filterKey}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`filter-tab${isActive ? ' active' : ''}`}
                onClick={() => setActiveKey(tab.filterKey.toLowerCase())}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="count">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p
          className="ev-packages-empty"
          style={{
            textAlign: 'center',
            color: 'var(--c-ink-2)',
            fontSize: 15,
            padding: '32px 0',
          }}
        >
          {labels.emptyFallback}
        </p>
      ) : (
        <>
          {/* Desktop/tablet grid */}
          <div className="pack-grid">
            {filtered.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                basePath={basePath}
                labels={labels}
                preferredCurrency={preferredCurrency}
                currencyConfig={currencyConfig}
              />
            ))}
          </div>

          {/* Mobile horizontal carousel (scroll-snap) */}
          <div
            className="pack-rail"
            role="list"
            aria-label={editorialText('editorialPackagesRailAria')}
          >
            {filtered.map((pkg) => (
              <div key={pkg.id} className="pack-rail-item" role="listitem">
                <PackageCard
                  pkg={pkg}
                  basePath={basePath}
                  labels={labels}
                  preferredCurrency={preferredCurrency}
                  currencyConfig={currencyConfig}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

interface PackageCardProps {
  pkg: EditorialPackageItem;
  basePath: string;
  labels: PackagesFiltersProps['labels'];
  preferredCurrency?: string | null;
  currencyConfig?: CurrencyConfig | null;
}

function resolvePackagePriceLabel(
  pkg: EditorialPackageItem,
  preferredCurrency: string | null | undefined,
  currencyConfig: CurrencyConfig | null | undefined,
  fallbackLabel: string,
): string {
  if (typeof pkg.priceValue === 'number' && Number.isFinite(pkg.priceValue) && pkg.priceValue > 0) {
    const sourceCurrency = pkg.priceCurrency ?? null;
    const targetCurrency = preferredCurrency ?? sourceCurrency;
    const converted = convertCurrencyAmount(pkg.priceValue, sourceCurrency, targetCurrency, currencyConfig ?? null);
    return formatPriceOrConsult(converted, targetCurrency ?? sourceCurrency, { fallback: fallbackLabel });
  }

  const rawPrice = (pkg as EditorialPackageItem & { price?: unknown }).price;
  if (typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0) {
    const sourceCurrency = pkg.priceCurrency ?? null;
    const targetCurrency = preferredCurrency ?? sourceCurrency;
    const converted = convertCurrencyAmount(rawPrice, sourceCurrency, targetCurrency, currencyConfig ?? null);
    return formatPriceOrConsult(converted, targetCurrency ?? sourceCurrency, { fallback: fallbackLabel });
  }

  const stringLabel = (pkg.price ?? '').toString().trim();
  return stringLabel || fallbackLabel;
}

function PackageCard({
  pkg,
  basePath,
  labels,
  preferredCurrency,
  currencyConfig,
}: PackageCardProps) {
  const slug = (pkg.slug ?? '').toString().trim();
  const href = slug
    ? `${basePath}/paquetes/${encodeURIComponent(slug)}`
    : `${basePath}/paquetes`;
  const country = (pkg.country ?? pkg.destination ?? '').toString().trim();
  const showPopular = pkg.featured === true;

  const onClick = () => {
    trackEvent('package_card_click', {
      packageId: pkg.id,
      slug: slug || null,
    });
  };

  const priceLabel = resolvePackagePriceLabel(pkg, preferredCurrency, currencyConfig, labels.consultPrice);

  return (
    <article className="pack-card">
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
            } as CSSProperties}
          />
        )}
        {showPopular && (
          <span className="pack-popular" aria-label={labels.popularBadge}>
            {labels.popularBadge}
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
          {pkg.description && (
            <p className="pack-description">{pkg.description}</p>
          )}
        </div>

        {(pkg.duration || pkg.stops) && (
          <div className="pack-meta">
            {pkg.duration && (
              <span className="m">
                <Icons.calendar size={14} aria-hidden />
                {pkg.duration}
              </span>
            )}
            {pkg.stops && (
              <span className="m">
                <Icons.pin size={14} aria-hidden />
                {pkg.stops}
              </span>
            )}
          </div>
        )}

        <hr className="pack-divider" />

        <div className="pack-foot">
          <div className="pack-price">
            <small>{labels.fromPrefix}</small>
            <strong>{priceLabel || labels.consultPrice}</strong>
          </div>
          <Link
            href={href}
            className="pack-cta"
            aria-label={`${labels.viewPackage}: ${pkg.name}`}
            onClick={onClick}
            data-testid="package-cta"
          >
            {labels.viewPackage}
            <Icons.arrow size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
