/**
 * editorial-v1 — Hotel detail page.
 *
 * Mounted by the `TemplateSlot` dispatcher when the website opts into
 * `editorial-v1`. Composes the generic `ProductLandingPage` body and
 * layers editorial chrome on top.
 *
 * Reused primitives:
 *   - p1/hero-split + p1/gallery-strip + p1/summary-sidebar (inherited)
 *   - site/meeting-point-map (inherited)
 *   - p3/related-carousel (inherited)
 *   - site/trust-badges (inherited)
 *   - editorial-v1 `Breadcrumbs`, `Eyebrow`
 *
 * SEO: `ProductSchema` + `OrganizationSchema` + FAQ JSON-LD continue to
 * emit from the generic body. We do NOT re-emit them here.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface EditorialHotelDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
}

interface EditorialHotelDetailProps {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}

function normalizeStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): string => {
      if (typeof entry === 'string') return sanitizeProductCopy(entry);
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const label = record.label;
        if (typeof label === 'string') return sanitizeProductCopy(label);
      }
      return '';
    })
    .filter((entry) => entry.length > 0)
    .slice(0, max);
}

export function EditorialHotelDetail({
  website: _website,
  payload,
  children,
}: EditorialHotelDetailProps) {
  const resolvedPayload = payload as EditorialHotelDetailPayload | undefined;

  if (!resolvedPayload || !resolvedPayload.product) {
    return <>{children}</>;
  }

  const { product, basePath, displayName, displayLocation } = resolvedPayload;
  const amenities = normalizeStringList(product.amenities, 12);
  const highlights = normalizeStringList(product.highlights, 8);
  const starRating = typeof product.star_rating === 'number'
    ? Math.max(1, Math.min(5, Math.round(product.star_rating)))
    : 0;

  const breadcrumbItems = [
    { label: editorialText('editorialBreadcrumbHome'), href: `${basePath}/` },
    { label: editorialText('editorialBreadcrumbHotels'), href: `${basePath}/hoteles` },
    { label: displayName },
  ];

  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="hotel-detail"
      className="editorial-hotel-detail"
    >
      {/* Generic body: hero, gallery, summary sidebar, amenities, meeting-point
          map, reviews, FAQ, trust badges, SEO schemas. */}
      {children}

      {/* Editorial overlay sections. */}
      <div className="mx-auto max-w-7xl px-6 pb-16 space-y-16">
        <section data-testid="editorial-hotel-breadcrumbs" className="pt-4">
          <Breadcrumbs items={breadcrumbItems} />
          <div
            className="mt-3 flex flex-wrap items-center gap-3 text-sm"
            style={{ color: 'var(--c-ink-2)' }}
          >
            {starRating > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink)',
                }}
                aria-label={`${starRating} ${editorialText('editorialHotelStarsSuffix')}`}
              >
                {'★'.repeat(starRating)}
              </span>
            ) : null}
            {displayLocation ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink)',
                }}
              >
                {displayLocation}
              </span>
            ) : null}
          </div>
        </section>

        {amenities.length > 0 ? (
          <section data-testid="editorial-hotel-amenities">
            <div className="mb-6">
              <Eyebrow>{editorialText('editorialHotelAmenitiesEyebrow')}</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialHotelAmenitiesTitle')}</h2>
            </div>
            <ul
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
            >
              {amenities.map((amenity, idx) => (
                <li
                  key={`amenity-${idx}-${amenity}`}
                  className="rounded-xl border p-3 text-sm"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-line)',
                    color: 'var(--c-ink-2)',
                  }}
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {highlights.length > 0 ? (
          <section data-testid="editorial-hotel-highlights">
            <div className="mb-6">
              <Eyebrow>{editorialText('editorialHotelHighlightsEyebrow')}</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialHotelHighlightsTitle')}</h2>
            </div>
            <ul
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
            >
              {highlights.map((highlight, idx) => (
                <li
                  key={`highlight-${idx}-${highlight}`}
                  className="rounded-xl border p-4 text-sm"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-line)',
                    color: 'var(--c-ink-2)',
                  }}
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
