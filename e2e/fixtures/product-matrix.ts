/**
 * EPIC #214 · W6 #220 — Product detail matrix fixture.
 *
 * Structured mirror of `docs/product/product-detail-matrix.md` (W1 #215). Rows
 * 1-48 cover Sections A-L + Section M (booking — DEFER behind `PILOT_BOOKING_ENABLED`),
 * Section N (editor mapping — non-render), Section O (Flutter gaps — not a render row),
 * and Section P (blog — NEW in v2).
 *
 * Consumed by the matrix specs under `e2e/tests/pilot/matrix/` — iterators filter
 * the fixture by `types.{pkg,act,hotel,blog}` and emit structural assertions
 * (role-first, testid fallback) per matrix row.
 *
 * Design notes:
 *   - Row numbering is canonical (1-48 matrix + P1-P11 blog). Do NOT renumber.
 *   - `types` cells carry `status` ('ok' | 'conditional' | 'na') to model the
 *     matrix nuances (e.g. "n/a con nota", "si <2 stops"). `note` is free-form.
 *   - `blog` key is optional: present only on rows that apply to the blog surface.
 *   - Selectors prefer `role` when the block has semantic HTML. CSS-class
 *     fallbacks are banned inside specs (lint in the iterator) — the `fallback`
 *     field is fixture-only.
 *   - Section M (booking) rows carry `envFlag: 'PILOT_BOOKING_ENABLED'`. With the
 *     flag unset/false (authoritative per ADR-024), specs emit `defer-skip`.
 */

export type TypeCellStatus = 'ok' | 'conditional' | 'na';

export interface TypeCell {
  status: TypeCellStatus;
  condition?: string;
  note?: string;
  editable?: boolean; // true → spec must exercise the Studio editable loop
}

export interface MatrixBlock {
  id: string;
  row: number | string;
  section: string;
  block: string;
  selectors: {
    primary: string;
    fallback?: string;
  };
  viewports: Array<'desktop' | 'mobile'>;
  types: {
    pkg: TypeCell;
    act: TypeCell;
    hotel: TypeCell;
    blog?: TypeCell;
  };
  emptyStateExpected?: boolean;
  source: string;
  envFlag?: 'PILOT_BOOKING_ENABLED';
  flaky?: { issue: string; expires: string };
}

// --- Helpers ---------------------------------------------------------------

const OK: TypeCell = { status: 'ok' };
const NA: TypeCell = { status: 'na' };

export const PRODUCT_MATRIX: MatrixBlock[] = [
  // ── Section A. Hero ──────────────────────────────────────────────────────
  {
    id: 'detail-hero',
    row: 1,
    section: 'A. Hero',
    block: 'Imagen de portada + wrapper hero',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: OK, act: OK, hotel: OK, blog: NA },
    source: 'docs/product/product-detail-matrix.md#row-1',
  },
  {
    id: 'detail-hero-title',
    row: 2,
    section: 'A. Hero',
    block: 'Título del producto (H1)',
    selectors: { primary: '[data-testid="detail-hero"] h1' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'ok', editable: true, note: 'HeroOverrideEditor' },
      act: { status: 'ok', editable: true, note: 'HeroOverrideEditor — activity parity via W2' },
      hotel: { status: 'ok', note: 'as-is Flutter-owner — read-only' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-2',
  },
  {
    id: 'detail-hero-subtitle',
    row: 3,
    section: 'A. Hero',
    block: 'Subtítulo / ubicación bajo H1',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'displayLocation defined' },
      act: { status: 'conditional', condition: 'displayLocation defined' },
      hotel: { status: 'conditional', condition: 'displayLocation defined' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-3',
  },
  {
    id: 'detail-hero-category',
    row: 4,
    section: 'A. Hero',
    block: 'Categoría (etiqueta hardcoded)',
    selectors: { primary: '[data-testid="detail-hero"] p' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: OK, act: OK, hotel: OK, blog: NA },
    source: 'docs/product/product-detail-matrix.md#row-4',
  },
  {
    id: 'detail-hero-chip-duration',
    row: 5,
    section: 'A. Hero',
    block: 'Chip duración',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'packageDuration defined' },
      act: { status: 'conditional', condition: 'product.duration defined' },
      hotel: NA,
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-5',
  },
  {
    id: 'detail-hero-chip-location',
    row: 6,
    section: 'A. Hero',
    block: 'Chip ubicación (hero)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'product.location defined' },
      hotel: { status: 'conditional', condition: 'product.location defined' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-6',
  },
  {
    id: 'detail-hero-chip-rating',
    row: 7,
    section: 'A. Hero',
    block: 'Chip rating (★ + user_rating)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'packageRating defined' },
      act: { status: 'conditional', condition: 'activityRatingLabel defined' },
      hotel: { status: 'conditional', condition: 'product.user_rating defined' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-7',
  },
  {
    id: 'detail-hero-chip-group',
    row: 8,
    section: 'A. Hero',
    block: 'Chip tamaño de grupo (regex)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'packageGroupSize regex match' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-8',
  },
  {
    id: 'detail-hero-chips-inclusions',
    row: 9,
    section: 'A. Hero',
    block: 'Chips inclusiones destacadas (act)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'activityInclusionHighlights.length > 0' },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-9',
  },
  {
    id: 'detail-hero-hotel-stars',
    row: 10,
    section: 'A. Hero',
    block: 'Estrellas hotel (1–5)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: NA,
      hotel: { status: 'conditional', condition: 'hotelStars > 0', note: 'Flutter-owner' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-10',
  },
  {
    id: 'detail-hero-price-from',
    row: 11,
    section: 'A. Hero',
    block: 'Precio "Desde $X"',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'price defined' },
      act: { status: 'conditional', condition: 'price defined' },
      hotel: { status: 'conditional', condition: 'price defined' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-11',
  },
  {
    id: 'detail-hero-cta-whatsapp',
    row: 12,
    section: 'A. Hero',
    block: 'Botón WhatsApp (hero CTA)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'websites.content.whatsapp defined' },
      act: { status: 'conditional', condition: 'websites.content.whatsapp defined' },
      hotel: { status: 'conditional', condition: 'websites.content.whatsapp defined' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-12',
  },
  {
    id: 'detail-hero-cta-phone',
    row: 13,
    section: 'A. Hero',
    block: 'Botón Teléfono (hero CTA)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'websites.content.phone defined' },
      act: { status: 'conditional', condition: 'websites.content.phone defined' },
      hotel: { status: 'conditional', condition: 'websites.content.phone defined' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-13',
  },
  {
    id: 'detail-hero-video-button',
    row: 14,
    section: 'A. Hero',
    block: 'Botón "Ver video" (ProductVideoHero)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'video_url defined', editable: true },
      act: { status: 'conditional', condition: 'video_url defined', editable: true },
      hotel: { status: 'conditional', condition: 'video_url defined', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-14',
  },

  // ── Section B. Navegación / ruta ────────────────────────────────────────
  {
    id: 'detail-breadcrumb',
    row: 15,
    section: 'B. Navegación',
    block: 'Miga de pan (category back link)',
    selectors: { primary: 'a[href*="/paquetes"], a[href*="/actividades"], a[href*="/hoteles"]' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: OK, act: OK, hotel: OK, blog: NA },
    source: 'docs/product/product-detail-matrix.md#row-15',
  },
  {
    id: 'detail-sticky-cta',
    row: 16,
    section: 'B. Navegación',
    block: 'Sticky CTA bar (tras scroll)',
    selectors: { primary: '[data-testid="mobile-sticky-bar"]', fallback: 'section' },
    viewports: ['mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'CTAs configured' },
      act: { status: 'conditional', condition: 'CTAs configured' },
      hotel: { status: 'conditional', condition: 'CTAs configured' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-16',
  },

  // ── Section C. Contenido principal ──────────────────────────────────────
  {
    id: 'detail-highlights',
    row: 17,
    section: 'C. Contenido principal',
    block: 'Grid de highlights',
    selectors: { primary: '[data-testid="detail-highlights"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'highlights.length > 0', editable: true },
      act: { status: 'conditional', condition: 'highlights.length > 0', editable: true },
      hotel: { status: 'conditional', condition: 'highlights.length > 0', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-17',
  },
  {
    id: 'detail-gallery',
    row: 18,
    section: 'C. Contenido principal',
    block: 'Galería (grid + lightbox)',
    selectors: { primary: '[data-testid="detail-gallery"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'images.length > 1', editable: true },
      act: { status: 'conditional', condition: 'images.length > 1', editable: true },
      hotel: { status: 'conditional', condition: 'images.length > 1', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-18',
  },
  {
    id: 'detail-description',
    row: 19,
    section: 'C. Contenido principal',
    block: 'Descripción larga (prose)',
    selectors: { primary: '[data-testid="detail-description"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'descriptionText defined', editable: true },
      act: { status: 'conditional', condition: 'descriptionText defined', editable: true },
      hotel: { status: 'conditional', condition: 'descriptionText defined', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-19',
  },
  {
    id: 'detail-video-modal',
    row: 20,
    section: 'C. Contenido principal',
    block: 'Video modal (lightbox)',
    selectors: { primary: '[data-testid="detail-hero"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'video_url defined', editable: true },
      act: { status: 'conditional', condition: 'video_url defined', editable: true },
      hotel: { status: 'conditional', condition: 'video_url defined', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-20',
  },

  // ── Section D. Activity-specific ────────────────────────────────────────
  {
    id: 'detail-recommendations',
    row: 21,
    section: 'D. Activity-specific',
    block: 'Recomendaciones (lista)',
    selectors: {
      primary: 'text=/Recomendaciones/',
      fallback: 'section',
    },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'recommendations defined', editable: true },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-21',
  },
  {
    id: 'detail-base-rate',
    row: 22,
    section: 'D. Activity-specific',
    block: 'Tarifa base (panel "Desde $X")',
    selectors: { primary: '[data-testid="detail-sidebar"]' },
    viewports: ['desktop'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'price defined' },
      hotel: NA,
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-22',
  },
  {
    id: 'detail-schedule-act',
    row: 23,
    section: 'D. Activity-specific',
    block: 'Programa (timeline act)',
    selectors: { primary: '[data-testid="section-program-timeline"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'schedule.length > 0' },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-23',
  },

  // ── Section E. Package-specific ─────────────────────────────────────────
  {
    id: 'detail-circuit-map-pkg',
    row: 24,
    section: 'E. Package-specific',
    block: 'Mapa ruta del paquete',
    selectors: { primary: '[data-testid="section-package-circuit-map"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary_items.length >= 2' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-24',
  },
  {
    id: 'detail-itinerary',
    row: 25,
    section: 'E. Package-specific',
    block: 'Día a día (itinerary items)',
    selectors: { primary: '[data-testid="detail-itinerary"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary_items defined' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-25',
  },
  {
    id: 'detail-itinerary-hotel',
    row: 26,
    section: 'E. Package-specific',
    block: 'Día (hotel badges)',
    selectors: { primary: '[data-testid="detail-itinerary"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary contains hotel' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-26',
  },
  {
    id: 'detail-itinerary-activity',
    row: 27,
    section: 'E. Package-specific',
    block: 'Día (actividad accordion)',
    selectors: { primary: '[data-testid="detail-itinerary"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary contains activity' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-27',
  },
  {
    id: 'detail-itinerary-transport',
    row: 28,
    section: 'E. Package-specific',
    block: 'Día (transporte line)',
    selectors: { primary: '[data-testid="detail-itinerary"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary contains transfer' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-28',
  },
  {
    id: 'detail-itinerary-flight',
    row: 29,
    section: 'E. Package-specific',
    block: 'Día (vuelo line)',
    selectors: { primary: '[data-testid="detail-itinerary"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'itinerary contains flight' },
      act: NA,
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-29',
  },

  // ── Section F. Inclusiones / exclusiones ────────────────────────────────
  {
    id: 'detail-inclusions',
    row: 30,
    section: 'F. Inclusiones',
    block: 'Qué incluye (grid ✓)',
    selectors: { primary: 'text=/incluye|Qué incluye/i' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'inclusions.length > 0', editable: true },
      act: { status: 'conditional', condition: 'inclusions.length > 0', editable: true },
      hotel: { status: 'conditional', condition: 'inclusions.length > 0', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-30',
  },
  {
    id: 'detail-exclusions',
    row: 31,
    section: 'F. Inclusiones',
    block: 'Qué no incluye (grid ✗)',
    selectors: { primary: 'text=/No incluye|Qué no incluye/i' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'exclusions.length > 0', editable: true },
      act: { status: 'conditional', condition: 'exclusions.length > 0', editable: true },
      hotel: { status: 'conditional', condition: 'exclusions.length > 0', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-31',
  },

  // ── Section G. Mapa / ubicación ─────────────────────────────────────────
  {
    id: 'detail-circuit-map-act',
    row: 32,
    section: 'G. Mapa',
    block: 'Circuito multi-stop de actividad',
    selectors: { primary: '[data-testid="section-activity-circuit-map"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: NA,
      act: { status: 'conditional', condition: 'activityCircuitStops.length >= 2' },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-32',
  },
  {
    id: 'detail-meeting-point',
    row: 33,
    section: 'G. Mapa',
    block: 'Punto de encuentro (map static)',
    selectors: { primary: '[data-testid="section-meeting-point-map"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'no circuito' },
      act: { status: 'conditional', condition: 'circuit stops < 2' },
      hotel: { status: 'conditional', condition: 'meeting_point defined' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-33',
  },

  // ── Section H. Precios / opciones ───────────────────────────────────────
  {
    id: 'detail-options-table',
    row: 34,
    section: 'H. Opciones',
    block: 'Tabla de opciones (ActivityOption)',
    selectors: { primary: '[data-testid="detail-options"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'options.length > 0 (raro)' },
      act: { status: 'conditional', condition: 'options.length > 0' },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-34',
  },

  // ── Section I. Conversión / confianza ───────────────────────────────────
  {
    id: 'detail-faq',
    row: 35,
    section: 'I. Conversión',
    block: 'Preguntas frecuentes (FAQ accordion)',
    selectors: { primary: '[data-testid="detail-faq"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: OK,
      act: OK,
      hotel: { status: 'ok', note: 'as-is Flutter-owner for content, accordion still renders' },
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-35',
  },
  {
    id: 'detail-trust',
    row: 36,
    section: 'I. Conversión',
    block: 'Trust badges',
    selectors: { primary: '[data-testid="detail-trust"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'websites.content.trust configured' },
      act: { status: 'conditional', condition: 'websites.content.trust configured' },
      hotel: { status: 'conditional', condition: 'websites.content.trust configured' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-36',
  },
  {
    id: 'detail-reviews',
    row: 37,
    section: 'I. Conversión',
    block: 'Google reviews (cards)',
    selectors: { primary: '[data-testid="detail-reviews"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'account.google_reviews_enabled && place_id' },
      act: { status: 'conditional', condition: 'account.google_reviews_enabled && place_id' },
      hotel: { status: 'conditional', condition: 'account.google_reviews_enabled && place_id' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-37',
  },

  // ── Section J. Sidebar ──────────────────────────────────────────────────
  {
    id: 'detail-sidebar',
    row: 38,
    section: 'J. Sidebar',
    block: 'Resumen lateral (sticky desktop)',
    selectors: { primary: '[data-testid="detail-sidebar"]' },
    viewports: ['desktop'],
    types: {
      pkg: OK,
      act: OK,
      hotel: OK,
      blog: NA,
    },
    source: 'docs/product/product-detail-matrix.md#row-38',
  },

  // ── Section K. Cierre ───────────────────────────────────────────────────
  {
    id: 'detail-cta-final',
    row: 39,
    section: 'K. Cierre',
    block: 'CTA final ("¿Listo para vivir esta experiencia?")',
    selectors: { primary: '[data-testid="detail-cta-final"]' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: OK, act: OK, hotel: OK, blog: NA },
    source: 'docs/product/product-detail-matrix.md#row-39',
  },
  {
    id: 'detail-similares',
    row: 40,
    section: 'K. Cierre',
    block: 'Similares (carousel)',
    selectors: { primary: '[data-testid="detail-similares"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'conditional', condition: 'similares.length >= 1' },
      act: { status: 'conditional', condition: 'similares.length >= 1' },
      hotel: { status: 'conditional', condition: 'similares.length >= 1' },
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-40',
  },

  // ── Section L. SEO / metadata ───────────────────────────────────────────
  {
    id: 'detail-seo-title',
    row: 41,
    section: 'L. SEO',
    block: 'Título SEO (<title>)',
    selectors: { primary: 'head > title' },
    viewports: ['desktop'],
    types: { pkg: OK, act: OK, hotel: OK, blog: OK },
    source: 'docs/product/product-detail-matrix.md#row-41',
  },
  {
    id: 'detail-seo-description',
    row: 42,
    section: 'L. SEO',
    block: 'Meta description',
    selectors: { primary: 'head meta[name="description"]' },
    viewports: ['desktop'],
    types: { pkg: OK, act: OK, hotel: OK, blog: OK },
    source: 'docs/product/product-detail-matrix.md#row-42',
  },
  {
    id: 'detail-seo-og-image',
    row: 43,
    section: 'L. SEO',
    block: 'Open Graph image',
    selectors: { primary: 'head meta[property="og:image"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'social_image or fallback', editable: true },
      act: { status: 'conditional', condition: 'social_image or fallback', editable: true },
      hotel: { status: 'conditional', condition: 'social_image or fallback', note: 'as-is Flutter-owner' },
      blog: { status: 'conditional', condition: 'featured_image defined' },
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-43',
  },
  {
    id: 'detail-jsonld-product',
    row: 44,
    section: 'L. SEO',
    block: 'JSON-LD Product schema',
    selectors: { primary: 'script[type="application/ld+json"]' },
    viewports: ['desktop'],
    types: { pkg: OK, act: OK, hotel: OK, blog: NA },
    source: 'docs/product/product-detail-matrix.md#row-44',
  },
  {
    id: 'detail-jsonld-breadcrumb',
    row: 45,
    section: 'L. SEO',
    block: 'JSON-LD BreadcrumbList',
    selectors: { primary: 'script[type="application/ld+json"]' },
    viewports: ['desktop'],
    types: { pkg: OK, act: OK, hotel: OK, blog: OK },
    source: 'docs/product/product-detail-matrix.md#row-45',
  },
  {
    id: 'detail-jsonld-faq',
    row: 46,
    section: 'L. SEO',
    block: 'JSON-LD FAQPage',
    selectors: { primary: 'script[type="application/ld+json"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'custom_faq.length > 0' },
      act: { status: 'conditional', condition: 'custom_faq.length > 0' },
      hotel: NA,
      blog: NA,
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-46',
  },
  {
    id: 'detail-jsonld-video',
    row: 47,
    section: 'L. SEO',
    block: 'JSON-LD VideoObject',
    selectors: { primary: 'script[type="application/ld+json"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'video_url defined' },
      act: { status: 'conditional', condition: 'video_url defined' },
      hotel: { status: 'conditional', condition: 'video_url defined', note: 'as-is Flutter-owner' },
      blog: NA,
    },
    emptyStateExpected: true,
    flaky: { issue: '#234', expires: '2026-06-30' }, // RPC `get_website_product_page` missing video_url JOIN
    source: 'docs/product/product-detail-matrix.md#row-47',
  },
  {
    id: 'detail-robots-noindex',
    row: 48,
    section: 'L. SEO',
    block: 'Robots noindex meta',
    selectors: { primary: 'head meta[name="robots"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'conditional', condition: 'robots_noindex set' },
      act: { status: 'conditional', condition: 'robots_noindex set' },
      hotel: { status: 'conditional', condition: 'robots_noindex set' },
      blog: { status: 'conditional', condition: 'robots_noindex set' },
    },
    emptyStateExpected: true,
    source: 'docs/product/product-detail-matrix.md#row-48',
  },

  // ── Section M. Booking / checkout (DEFER per ADR-024) ───────────────────
  {
    id: 'detail-booking-trigger',
    row: 'M1',
    section: 'M. Booking (DEFER)',
    block: 'BookingTrigger',
    selectors: { primary: '[data-testid="booking-trigger"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'na', note: 'W3 DEFER per ADR-024 — PILOT_BOOKING_ENABLED=false authoritative' },
      act: { status: 'na', note: 'W3 DEFER per ADR-024' },
      hotel: { status: 'na', note: 'W3 DEFER per ADR-024' },
      blog: NA,
    },
    envFlag: 'PILOT_BOOKING_ENABLED',
    source: 'docs/product/product-detail-matrix.md#M',
  },
  {
    id: 'detail-booking-date-picker',
    row: 'M2',
    section: 'M. Booking (DEFER)',
    block: 'BookingDatePicker',
    selectors: { primary: '[data-testid="booking-date-picker"]' },
    viewports: ['desktop', 'mobile'],
    types: {
      pkg: { status: 'na', note: 'W3 DEFER' },
      act: { status: 'na', note: 'W3 DEFER' },
      hotel: { status: 'na', note: 'W3 DEFER' },
      blog: NA,
    },
    envFlag: 'PILOT_BOOKING_ENABLED',
    source: 'docs/product/product-detail-matrix.md#M',
  },
  {
    id: 'detail-cal-booking-cta',
    row: 'M3',
    section: 'M. Booking (DEFER)',
    block: 'CalBookingCTA',
    selectors: { primary: '[data-testid="cal-booking-cta"]' },
    viewports: ['desktop'],
    types: {
      pkg: { status: 'na', note: 'W3 DEFER' },
      act: { status: 'na', note: 'W3 DEFER' },
      hotel: { status: 'na', note: 'W3 DEFER' },
      blog: NA,
    },
    envFlag: 'PILOT_BOOKING_ENABLED',
    source: 'docs/product/product-detail-matrix.md#M',
  },

  // ── Section P. Blog transcreate scope (v2) ──────────────────────────────
  {
    id: 'detail-blog',
    row: 'P0',
    section: 'P. Blog',
    block: 'Blog detail wrapper (article)',
    selectors: { primary: '[data-testid="detail-blog"]' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P',
  },
  {
    id: 'detail-blog-title',
    row: 'P1',
    section: 'P. Blog',
    block: 'Blog H1 title',
    selectors: { primary: '[data-testid="detail-blog"] h1' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P1',
  },
  {
    id: 'detail-blog-excerpt',
    row: 'P3',
    section: 'P. Blog',
    block: 'Blog excerpt (meta description fallback)',
    selectors: { primary: 'head meta[name="description"]' },
    viewports: ['desktop'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P3',
  },
  {
    id: 'detail-blog-body',
    row: 'P4',
    section: 'P. Blog',
    block: 'Blog body (SafeHtml prose)',
    selectors: { primary: '[data-testid="detail-blog"] .blog-prose', fallback: '[data-testid="detail-blog"] article, [data-testid="detail-blog"] div.blog-prose' },
    viewports: ['desktop', 'mobile'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P4',
  },
  {
    id: 'detail-blog-seo-title',
    row: 'P5',
    section: 'P. Blog',
    block: 'Blog SEO title (<title>)',
    selectors: { primary: 'head > title' },
    viewports: ['desktop'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P5',
  },
  {
    id: 'detail-blog-hreflang',
    row: 'P-hreflang',
    section: 'P. Blog',
    block: 'hreflang alternates',
    selectors: { primary: 'head link[rel="alternate"][hreflang]' },
    viewports: ['desktop'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P3-hreflang',
  },
  {
    id: 'detail-blog-jsonld-article',
    row: 'P-jsonld',
    section: 'P. Blog',
    block: 'JSON-LD BlogPosting / Article (inLanguage)',
    selectors: { primary: 'script[type="application/ld+json"]' },
    viewports: ['desktop'],
    types: { pkg: NA, act: NA, hotel: NA, blog: OK },
    source: 'docs/product/product-detail-matrix.md#P4-jsonld',
  },
];

// --- Iterators / filters ---------------------------------------------------

export type ContentType = 'pkg' | 'act' | 'hotel' | 'blog';

export function rowsFor(type: ContentType): MatrixBlock[] {
  return PRODUCT_MATRIX.filter((row) => {
    const cell = row.types[type];
    return Boolean(cell);
  });
}

export function applicableRows(type: ContentType): MatrixBlock[] {
  // Skip na for this type and booking rows when PILOT_BOOKING_ENABLED is off.
  const bookingEnabled = (process.env.PILOT_BOOKING_ENABLED ?? 'false').toLowerCase() === 'true';
  return rowsFor(type).filter((row) => {
    const cell = row.types[type];
    if (!cell) return false;
    if (cell.status === 'na') return false;
    if (row.envFlag === 'PILOT_BOOKING_ENABLED' && !bookingEnabled) return false;
    return true;
  });
}

export function bookingDeferredRows(): MatrixBlock[] {
  return PRODUCT_MATRIX.filter((row) => row.envFlag === 'PILOT_BOOKING_ENABLED');
}

/**
 * Canonical matrix row count (excludes Section M booking + Section P blog).
 * Used by the parity lint to assert fixture/doc drift.
 */
export const CANONICAL_MATRIX_ROW_COUNT = 48;
