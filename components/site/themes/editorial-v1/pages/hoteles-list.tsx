/**
 * editorial-v1 — Hotels listing page variant.
 *
 * Route: `/hoteles` on a site whose theme opts into editorial-v1. This is a
 * "sister" component to `paquetes-list.tsx` — the designer reference has no
 * dedicated hotels listing page, so the layout follows the same pattern
 * (page hero + breadcrumbs + filter toolbar + grid + list/map toggle) with
 * hotel-specific filters (city / stars / amenities).
 *
 * Reused primitives:
 *  - HotelCard (`product-detail/p2/hotel-card`) `variant="card"` — Wave 2.8
 *  - ListingMap — Wave 3.13
 *  - Breadcrumbs / Eyebrow — editorial-v1 primitives
 *
 * Copy: uses the hero catalog entry ("HOTELES" eyebrow + "Estancias curadas
 * por ciudad." title). Wire-level copy lives in the grid client leaf.
 *
 * Server component.
 */

import type { CSSProperties } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';

import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { getBasePath } from '@/lib/utils/base-path';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import {
  HotelesListGrid,
  type HotelesListItem,
} from './hoteles-list-grid.client';

// -------------------- Props --------------------

export interface EditorialHotelesListPagePayload {
  hotels: ProductData[];
}

export interface EditorialHotelesListPageProps {
  website: WebsiteData;
  hotels: ProductData[];
}

// -------------------- Copy --------------------
function getHeroCopy(localeLike: string): {
  eyebrow: string;
  title: string;
  emphasis: string;
  subtitle: string;
} {
  const locale = localeLike.toLowerCase();
  if (locale.startsWith('en')) {
    return {
      eyebrow: 'HOTELS',
      title: 'Stays',
      emphasis: 'curated by city.',
      subtitle:
        'Fincas, boutiques, and resorts selected by our planners. Switch categories without rebuilding the whole trip.',
    };
  }
  return {
    eyebrow: 'HOTELES',
    title: 'Estancias',
    emphasis: 'curadas por ciudad.',
    subtitle:
      'Fincas, boutiques y resorts seleccionados por nuestros planners. Cambia de categoría sin reconstruir el viaje.',
  };
}

// -------------------- Helpers --------------------

function toListItem(product: ProductData): HotelesListItem {
  const image =
    product.image || (Array.isArray(product.images) ? product.images[0] : null) || null;

  return {
    id: product.id,
    slug: product.slug ?? null,
    name: product.name,
    image,
    description: product.description ?? null,
    city: product.city ?? null,
    country: product.country ?? null,
    location: product.location ?? null,
    starRating:
      typeof product.star_rating === 'number' && Number.isFinite(product.star_rating)
        ? product.star_rating
        : null,
    amenities: Array.isArray(product.amenities) ? product.amenities : null,
    category: null,
    lat: typeof product.latitude === 'number' ? product.latitude : null,
    lng: typeof product.longitude === 'number' ? product.longitude : null,
  };
}

// -------------------- Page --------------------

export function EditorialHotelesListPage({
  website,
  hotels,
}: EditorialHotelesListPageProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ?? website.default_locale ?? website.content?.locale ?? 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const heroCopy = getHeroCopy(resolvedLocale);
  const basePath = getBasePath(website.subdomain, false);
  const siteTitleTrail = website.content?.siteName || website.subdomain;

  const items = hotels.map(toListItem);

  return (
    <div data-screen-label="HotelesList" data-testid="editorial-hoteles-list">
      <section className="page-hero" style={heroStyle}>
        <div className="ev-container" style={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs
            tone="inverse"
            className="pkg-hero-breadcrumb"
            items={[
              { label: siteTitleTrail, href: basePath || '/' },
              { label: editorialText('editorialBreadcrumbHotels') },
            ]}
          />
          <div style={{ marginTop: 24 }}>
            <Eyebrow tone="light">{heroCopy.eyebrow}</Eyebrow>
            <h1 className="display-lg" style={heroTitleStyle}>
              {heroCopy.title}{' '}
              <em style={heroEmphasisStyle}>{heroCopy.emphasis}</em>
            </h1>
            <p style={heroSubtitleStyle}>{heroCopy.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="ev-section" style={{ paddingTop: 56 }}>
        <div className="ev-container">
          <HotelesListGrid hotels={items} basePath={basePath} />
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

export default EditorialHotelesListPage;
