/**
 * editorial-v1 — Stats bar for package detail pages.
 *
 * Extracted from `editorial-package-overlay.tsx` so it can be rendered
 * earlier (as `renderAfterHero`) in the product landing page layout.
 *
 * Server component — no 'use client'.
 */

import type { ProductData } from '@bukeer/website-contract';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { getPackageCircuitStops, withCoords } from '@/lib/products/package-circuit';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EditorialPackageStatsBarProps {
  product: ProductData;
  resolvedLocale?: string;
}

// ---------------------------------------------------------------------------
// Helpers (minimal — only what's needed for map pin count)
// ---------------------------------------------------------------------------

function getMapPinCount(product: ProductData): number {
  const itineraryItems = Array.isArray(product.itinerary_items)
    ? product.itinerary_items
    : [];
  const destinationHint =
    typeof (product as unknown as Record<string, unknown>).destination === 'string'
      ? String((product as unknown as Record<string, unknown>).destination)
      : product.location ?? null;
  const stops = getPackageCircuitStops({
    itineraryItems,
    name: product.name ?? null,
    destination: destinationHint,
  });
  return withCoords(stops).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditorialPackageStatsBar({
  product,
  resolvedLocale = 'es-CO',
}: EditorialPackageStatsBarProps) {
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);

  const hasDuration = (product.duration_days ?? 0) > 0 || (product.duration_nights ?? 0) > 0;
  const pinCount = getMapPinCount(product);
  const hasStats = hasDuration || pinCount > 0 || (product.rating ?? 0) > 0;

  if (!hasStats) return null;

  return (
    <section data-testid="editorial-package-stats" className="pt-4">
      <div className="pkg-meta" style={{ marginTop: 0 }}>
        {hasDuration ? (
          <div className="ov-item">
            <small>{editorialText('editorialPackageDurationLabel')}</small>
            <strong>
              {product.duration_days ? `${product.duration_days}d` : ''}
              {product.duration_days && product.duration_nights ? ' / ' : ''}
              {product.duration_nights ? `${product.duration_nights}n` : ''}
            </strong>
          </div>
        ) : null}
        {pinCount > 0 ? (
          <div className="ov-item">
            <small>{editorialText('editorialPackageDestinationsLabel')}</small>
            <strong>
              {pinCount} {pinCount === 1 ? 'ciudad' : 'ciudades'}
            </strong>
          </div>
        ) : null}
        {(product.rating ?? 0) > 0 ? (
          <div className="ov-item">
            <small>{editorialText('editorialPackageRatingLabel')}</small>
            <strong>
              {(product.rating as number).toFixed(1)} ★
              {(product.review_count ?? 0) > 0 ? ` · ${product.review_count}` : ''}
            </strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
