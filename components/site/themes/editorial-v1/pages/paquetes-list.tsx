/**
 * editorial-v1 — Packages listing page variant.
 *
 * Route: `/paquetes` on a site whose theme opts into editorial-v1.
 *
 * Port of designer `PackagesListing` from
 *   themes/references/claude design 1/project/pages.jsx
 * with:
 *  - Editorial page hero (dark ink block with eyebrow + emphasised title + subtitle)
 *  - Breadcrumbs
 *  - Filter toolbar (country + destination + duration chips, URL-synced)
 *  - Grid (reuses `.pack-grid` / `.pack-card` from editorial-v1.css)
 *  - List/map toggle (delegates to <ListingMap />)
 *  - "Cargar más" pagination
 *
 * Copy: verbatim from `docs/editorial-v1/copy-catalog.md` § "Package listing page".
 *
 * Server component. Interactive filter + grid is a small client leaf
 * (`paquetes-list-grid.client.tsx`) so the hero/shell stays server-rendered.
 */

import type { CSSProperties } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';

import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { getBasePath } from '@/lib/utils/base-path';
import { formatPrice } from '@/lib/products/format-price';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import {
  PaquetesListGrid,
  type PaquetesListItem,
} from './paquetes-list-grid.client';

// -------------------- Props --------------------

export interface EditorialPaquetesListPagePayload {
  packages: ProductData[];
}

export interface EditorialPaquetesListPageProps {
  website: WebsiteData;
  packages: ProductData[];
}

// -------------------- Copy --------------------
function getHeroCopy(localeLike: string): { emphasis: string; subtitle: string } {
  const locale = localeLike.toLowerCase();
  if (locale.startsWith('en')) {
    return {
      emphasis: 'across Colombia.',
      subtitle:
        'Journeys designed by local planners. Flexible and adjustable as the starting point for your trip.',
    };
  }
  return {
    emphasis: 'por toda Colombia.',
    subtitle:
      'Itinerarios diseñados por planners locales. Ajustables, flexibles, punto de partida para tu viaje.',
  };
}

// -------------------- Helpers --------------------

function toListItem(product: ProductData): PaquetesListItem {
  const itineraryCount = Array.isArray(product.itinerary_items)
    ? product.itinerary_items.length
    : null;
  const durationDays = itineraryCount && itineraryCount > 0 ? itineraryCount : null;
  const duration = durationDays
    ? `${durationDays} días`
    : typeof (product as unknown as { duration?: string }).duration === 'string'
    ? ((product as unknown as { duration?: string }).duration as string).trim() || null
    : null;

  const image =
    product.image || (Array.isArray(product.images) ? product.images[0] : null) || null;

  const destination = product.location
    || (product.city && product.country ? `${product.city}, ${product.country}` : null)
    || product.city
    || product.country
    || null;

  const country = product.country || null;

  const priceAmount = typeof product.price === 'number' ? product.price : null;
  const price =
    typeof product.price === 'string' && product.price.trim().length > 0
      ? product.price.trim()
      : priceAmount !== null
      ? formatPrice(priceAmount, (product.currency || 'USD').toUpperCase()) ?? null
      : null;

  return {
    id: product.id,
    slug: product.slug ?? null,
    name: product.name,
    image,
    description: product.description ?? null,
    country,
    destination,
    duration,
    durationDays,
    price,
    featured: product.is_featured === true,
    lat: typeof product.latitude === 'number' ? product.latitude : null,
    lng: typeof product.longitude === 'number' ? product.longitude : null,
  };
}

// -------------------- Page --------------------

export function EditorialPaquetesListPage({
  website,
  packages,
}: EditorialPaquetesListPageProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const heroCopy = getHeroCopy(resolvedLocale);
  const basePath = getBasePath(website.subdomain, false);
  const siteTitleTrail = website.content?.siteName || website.subdomain;

  const items = packages.map(toListItem);

  return (
    <div data-screen-label="PaquetesList" data-testid="editorial-paquetes-list">
      {/* Hero */}
      <section className="page-hero" style={heroStyle}>
        <div className="ev-container" style={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs
            items={[
              { label: siteTitleTrail, href: basePath || '/' },
              { label: editorialText('editorialBreadcrumbPackages') },
            ]}
          />
          <div style={{ marginTop: 24 }}>
            <Eyebrow tone="light">{editorialText('editorialPackagesEyebrowFallback')}</Eyebrow>
            <h1 className="display-lg" style={heroTitleStyle}>
              {editorialText('editorialPackagesTitleFallback')}{' '}
              <em style={heroEmphasisStyle}>{heroCopy.emphasis}</em>
            </h1>
            <p style={heroSubtitleStyle}>{heroCopy.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Listing body */}
      <section className="ev-section" style={{ paddingTop: 56 }}>
        <div className="ev-container">
          <PaquetesListGrid packages={items} basePath={basePath} />
        </div>
      </section>
    </div>
  );
}

// -------------------- Styles --------------------

const heroStyle: CSSProperties = {
  background: 'var(--c-ink)',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  padding: '80px 0 64px',
  borderRadius: '0 0 32px 32px',
};

const heroTitleStyle: CSSProperties = {
  color: '#fff',
  margin: '12px 0 14px',
};

const heroEmphasisStyle: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontStyle: 'italic',
  color: 'var(--c-accent-2)',
  fontWeight: 400,
};

const heroSubtitleStyle: CSSProperties = {
  color: 'rgba(255,255,255,.78)',
  fontSize: 17,
  lineHeight: 1.55,
  maxWidth: '60ch',
  margin: 0,
};

export default EditorialPaquetesListPage;
