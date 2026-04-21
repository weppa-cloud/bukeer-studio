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
 * Colombia silhouette — 60+ geographic points projected into the 800×1000
 * viewBox. Clockwise from Punta Gallinas (NE tip, La Guajira):
 *   Caribbean coast → Panama border → Pacific coast → Ecuador/Peru border
 *   → Leticia (S tip) → Brazil border → Venezuela border → back to start.
 *
 * Coordinates derived from real lat/lng via project():
 *   x = ((lng + 82.5) / 16) * 800
 *   y = 1000 - ((lat + 4.8) / 18) * 1000
 */
export const COLOMBIA_PATH = [
  // ── NE tip: Punta Gallinas / La Guajira peninsula ──
  'M 542 42',
  'L 525 53', 'L 516 56',
  // ── Caribbean coast going W ──
  'L 480 92',                        // Riohacha
  'L 423 104', 'L 415 108',          // Santa Marta
  'L 385 124',                       // Barranquilla
  'L 361 141',
  'L 348 154', 'L 345 164',          // Cartagena
  'L 344 202', 'L 348 220',          // Golfo Morrosquillo
  'L 314 241',                       // Arboletes
  'L 265 253',                       // Panama border (Cabo Tiburón)
  // ── Pacific coast going S ──
  'L 257 274', 'L 234 338',          // N Pacific
  'L 256 388',                       // Bahía Solano
  'L 248 424', 'L 248 430',          // Cabo Corrientes
  'L 257 480',
  'L 271 516', 'L 262 527',          // Buenaventura
  'L 225 591',                       // Guapi
  'L 187 631',                       // Tumaco
  'L 182 651',                       // Ecuador border (Pacific)
  // ── Ecuador border going E ──
  'L 216 669', 'L 250 685',
  'L 273 700', 'L 361 733',          // Ecuador–Peru tripoint
  // ── Peru border going SE toward Leticia ──
  'L 400 767',                       // along Putumayo
  'L 500 822',
  'L 550 878',
  'L 620 956',                       // Colombia–Peru–Brazil triple point
  'L 628 967',                       // Leticia (southernmost)
  // ── Brazil border going NE ──
  'L 624 933', 'L 623 844',
  'L 632 771',
  'L 783 659',                       // Brazil–Venezuela junction
  // ── Venezuela border going W/NW ──
  'L 749 622', 'L 714 621',
  'L 633 641',
  'L 737 553',                       // Inírida area
  'L 742 497', 'L 736 441',
  'L 750 391', 'L 705 351',
  'L 627 313',                       // Arauca llanos
  'L 499 295', 'L 521 288',          // Cúcuta area
  'L 474 249', 'L 474 209',          // Serranía del Perijá
  'L 492 186', 'L 475 152',
  'L 508 118',                       // back toward Guajira
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
  // Western cordillera (Chocó → Valle → Nariño)
  'M 310 280 Q 298 380 290 480 Q 284 560 280 630',
  // Central cordillera (Antioquia → Eje Cafetero → Huila)
  'M 360 275 Q 348 375 338 475 Q 330 555 322 630',
  // Eastern cordillera (Santander → Bogotá → Nariño)
  'M 470 258 Q 482 350 488 450 Q 492 530 488 610',
];

/** Rivers — Magdalena (north-bound), Amazonas (east), Orinoco (NE llanos). */
export const RIVERS: ReadonlyArray<string> = [
  // Río Magdalena — flows N from Andes into Caribbean near Barranquilla
  'M 420 640 Q 418 540 420 440 Q 422 360 380 240',
  // Río Amazonas / Putumayo — eastward across south
  'M 490 820 Q 560 840 628 880',
  // Río Orinoco / Meta — NE through llanos
  'M 627 313 Q 670 360 700 390',
];

/**
 * Approximate polygons for the four editorial regions. Traced over the
 * silhouette so that `data-region` painting stays inside the landmass.
 * NOT a cartographic boundary — purely illustrative.
 */
export const REGION_PATHS: Record<EditorialRegion, string> = {
  // Caribbean coastal strip — N Colombia, y < ~280
  caribe: 'M 542 42 L 265 253 L 310 280 L 400 270 L 474 249 L 508 118 Z',
  // Pacific coastal strip — narrow W coast
  pacifico: 'M 265 253 L 182 651 L 310 640 L 340 430 L 310 280 Z',
  // Andean mountain belt — central Colombia (Medellín, Bogotá, Cali corridor)
  andes: 'M 310 280 L 310 640 L 361 733 L 490 820 L 520 620 L 500 380 L 474 249 L 400 270 Z',
  // Amazon / Orinoco lowlands — SE large area
  selva: 'M 500 380 L 520 620 L 490 820 L 628 967 L 783 659 L 736 441 L 627 313 L 474 249 Z',
};
