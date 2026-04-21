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

const HERO_EYEBROW = 'HOTELES';
const HERO_TITLE = 'Estancias';
const HERO_EMPHASIS = 'curadas por ciudad.';
const HERO_SUBTITLE =
  'Fincas, boutiques y resorts seleccionados por nuestros planners. Cambia de categoría sin reconstruir el viaje.';

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
  const basePath = getBasePath(website.subdomain, Boolean(website.custom_domain));
  const siteTitleTrail = website.content?.siteName || website.subdomain;

  const items = hotels.map(toListItem);

  return (
    <div data-screen-label="HotelesList" data-testid="editorial-hoteles-list">
      <section className="page-hero" style={heroStyle}>
        <div className="ev-container" style={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs
            items={[
              { label: siteTitleTrail, href: basePath || '/' },
              { label: 'Hoteles' },
            ]}
          />
          <div style={{ marginTop: 24 }}>
            <Eyebrow tone="light">{HERO_EYEBROW}</Eyebrow>
            <h1 className="display-lg" style={heroTitleStyle}>
              {HERO_TITLE}{' '}
              <em style={heroEmphasisStyle}>{HERO_EMPHASIS}</em>
            </h1>
            <p style={heroSubtitleStyle}>{HERO_SUBTITLE}</p>
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
