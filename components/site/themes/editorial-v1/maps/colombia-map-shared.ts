/**
 * Colombia editorial map — shared geometry & projection primitives.
 *
 * Ported from the designer prototype at
 *   `themes/references/claude design 1/project/maps.jsx` (GEO, MAP_BOX,
 *   COLOMBIA_PATH, SAN_ANDRES_ISLANDS, ANDES_RIDGES, RIVERS).
 *
 * These values are hand-drawn editorial illustrations, not survey-grade
 * geography. They are intentionally stable — any change should be
 * coordinated with the designer because it will shift every pin.
 */

export type EditorialRegion = 'caribe' | 'andes' | 'selva' | 'pacifico';

/**
 * Bounding box the projection maps into the 800 × 1000 viewBox.
 * Latitudes [-4.8, 13.2], longitudes [-82.5, -66.5] — covers the
 * mainland plus breathing room for San Andrés (NW) and Leticia (SE).
 */
export const MAP_BOX = {
  minLat: -4.8,
  maxLat: 13.2,
  minLng: -82.5,
  maxLng: -66.5,
  w: 800,
  h: 1000,
} as const;

/** Simple equirectangular projection — fine at this editorial scale. */
export function project({ lat, lng }: { lat: number; lng: number }): {
  x: number;
  y: number;
} {
  const { minLat, maxLat, minLng, maxLng, w, h } = MAP_BOX;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
  return { x, y };
}

/**
 * Hand-built Colombia silhouette. Guajira peninsula pokes NE, Pacific
 * coast bulges W, Amazonas tapers SE. Coordinates live in the 800×1000
 * viewBox matching `project()`.
 */
export const COLOMBIA_PATH = [
  'M 580 92',
  'L 612 118',
  'L 602 160',
  'L 568 182',
  'L 540 186',
  'L 512 196',
  'L 486 208',
  'L 472 232',
  'L 450 258',
  'L 432 284',
  'L 402 312',
  'L 380 352',
  'L 362 404',
  'L 348 454',
  'L 338 498',
  'L 328 548',
  'L 352 576',
  'L 390 610',
  'L 432 636',
  'L 470 672',
  'L 508 710',
  'L 554 760',
  'L 598 812',
  'L 632 862',
  'L 656 906',
  'L 664 938',
  'L 700 910',
  'L 728 862',
  'L 748 806',
  'L 762 744',
  'L 756 684',
  'L 738 628',
  'L 718 578',
  'L 708 528',
  'L 702 478',
  'L 692 428',
  'L 678 386',
  'L 660 346',
  'L 640 304',
  'L 624 264',
  'L 612 220',
  'L 602 186',
  'L 598 156',
  'L 588 124',
  'Z',
].join(' ');

/** San Andrés & Providencia — drawn as circles off the NW coast. */
export const SAN_ANDRES_ISLANDS: ReadonlyArray<{
  cx: number;
  cy: number;
  r: number;
}> = [
  { cx: 232, cy: 68, r: 6 }, // Providencia
  { cx: 240, cy: 110, r: 9 }, // San Andrés (larger)
];

/**
 * Andes cordillera spine — Western, Central, Eastern branches.
 * Soft dashed lines in the editorial variant.
 */
export const ANDES_RIDGES: ReadonlyArray<string> = [
  'M 420 296 Q 408 400 396 498 Q 388 572 372 620',
  'M 468 260 Q 452 360 438 460 Q 428 542 420 610',
  'M 540 266 Q 556 360 568 456 Q 574 536 566 608',
];

/** Rivers — Magdalena (north-bound), Amazonas (east), Orinoco (NE llanos). */
export const RIVERS: ReadonlyArray<string> = [
  'M 500 580 Q 504 480 508 380 Q 510 300 512 212',
  'M 540 830 Q 600 850 660 900',
  'M 660 400 Q 700 350 740 320',
];

/**
 * Approximate polygons for the four editorial regions. Traced over the
 * silhouette so that `data-region` painting stays inside the landmass.
 * NOT a cartographic boundary — purely illustrative.
 */
export const REGION_PATHS: Record<EditorialRegion, string> = {
  caribe: [
    'M 486 208',
    'L 472 232',
    'L 450 258',
    'L 432 284',
    'L 540 186',
    'L 568 182',
    'L 602 160',
    'L 612 118',
    'L 580 92',
    'L 588 124',
    'L 598 156',
    'L 602 186',
    'L 612 220',
    'L 560 240',
    'L 512 196',
    'Z',
  ].join(' '),
  andes: [
    'M 432 284',
    'L 402 312',
    'L 380 352',
    'L 362 404',
    'L 348 454',
    'L 338 498',
    'L 328 548',
    'L 352 576',
    'L 390 610',
    'L 432 636',
    'L 500 580',
    'L 540 480',
    'L 540 380',
    'L 500 300',
    'L 460 270',
    'Z',
  ].join(' '),
  pacifico: [
    'M 432 284',
    'L 402 312',
    'L 380 352',
    'L 362 404',
    'L 348 454',
    'L 338 498',
    'L 328 548',
    'L 352 576',
    'L 380 540',
    'L 372 468',
    'L 392 400',
    'L 412 340',
    'Z',
  ].join(' '),
  selva: [
    'M 432 636',
    'L 470 672',
    'L 508 710',
    'L 554 760',
    'L 598 812',
    'L 632 862',
    'L 656 906',
    'L 664 938',
    'L 700 910',
    'L 728 862',
    'L 748 806',
    'L 762 744',
    'L 700 720',
    'L 620 700',
    'L 540 680',
    'Z',
  ].join(' '),
};
