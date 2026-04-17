/**
 * Static toponym → coords dictionary shared by package + activity circuit maps.
 *
 * Re-exports everything from `city-coords.ts` for back-compat (existing
 * package flow) and adds well-known Colombian tourist stops used in activity
 * schedule steps (beaches, viewpoints, lakes, reserves). SPEC #164.
 *
 * Prefer this module in new code. Lookups are order-independent: both the
 * base `CITY_COORDS` map and this extended set are consulted via
 * `lookupPlaceCoords`.
 */
import { lookupCityCoords, cityCoordsEntries } from './city-coords';

export { lookupCityCoords, cityCoordsEntries };

/**
 * Activity-level stops (tourist spots, parks, beaches, natural wonders).
 * Keys are NFD-stripped, lowercased tokens consumed by the same normalizer
 * used in `city-coords.ts` (`normalizePlaceKey`).
 *
 * Coordinates sourced from OpenStreetMap public data.
 */
const ACTIVITY_STOP_COORDS: Record<string, { lat: number; lng: number }> = {
  // Caribbean coast / Cartagena
  baru: { lat: 10.1706, lng: -75.7194 },
  'isla baru': { lat: 10.1706, lng: -75.7194 },
  'playa blanca': { lat: 10.1753, lng: -75.6889 },
  'isla del rosario': { lat: 10.1833, lng: -75.75 },
  'islas del rosario': { lat: 10.1833, lng: -75.75 },
  'islas de rosario': { lat: 10.1833, lng: -75.75 },
  'islas corales del rosario': { lat: 10.1833, lng: -75.75 },
  'cholon': { lat: 10.1389, lng: -75.6956 },

  // Tayrona / Santa Marta
  'cabo san juan': { lat: 11.3244, lng: -74.0297 },
  'parque tayrona': { lat: 11.3097, lng: -74.0736 },
  'parque nacional tayrona': { lat: 11.3097, lng: -74.0736 },
  'ciudad perdida': { lat: 11.0383, lng: -73.9253 },
  minca: { lat: 11.1428, lng: -74.1167 },
  palomino: { lat: 11.2472, lng: -73.575 },

  // Eje Cafetero
  'valle de cocora': { lat: 4.6383, lng: -75.4958 },
  'valle del cocora': { lat: 4.6383, lng: -75.4958 },
  cocora: { lat: 4.6383, lng: -75.4958 },
  filandia: { lat: 4.6744, lng: -75.6597 },
  'termales de santa rosa': { lat: 4.85, lng: -75.5667 },
  'parque del cafe': { lat: 4.5425, lng: -75.7692 },

  // Antioquia
  'piedra del penol': { lat: 6.2208, lng: -75.1786 },
  'piedra del peñol': { lat: 6.2208, lng: -75.1786 },
  'el penol': { lat: 6.2208, lng: -75.1786 },
  'comuna 13': { lat: 6.2669, lng: -75.6144 },

  // Cundinamarca / Boyaca
  'laguna de guatavita': { lat: 4.9742, lng: -73.7772 },
  guatavita: { lat: 4.9342, lng: -73.8333 },
  'catedral de sal': { lat: 5.0194, lng: -74.0103 },
  'catedral de sal de zipaquira': { lat: 5.0194, lng: -74.0103 },
  monserrate: { lat: 4.6056, lng: -74.0561 },

  // Amazon / Pacific
  'puerto narino': { lat: -3.7697, lng: -70.3817 },
  'puerto nariño': { lat: -3.7697, lng: -70.3817 },
  nuqui: { lat: 5.7089, lng: -77.2711 },
  'bahia solano': { lat: 6.2231, lng: -77.4008 },

  // San Andres / Providencia
  providencia: { lat: 13.3564, lng: -81.3731 },
  'johnny cay': { lat: 12.5831, lng: -81.6889 },
  'cayo acuario': { lat: 12.5794, lng: -81.7033 },
};

function normalizePlaceKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Look up a toponym in the extended activity-stop dict first, then fall back
 * to the city-level dict. Returns `null` when no match is found.
 */
export function lookupPlaceCoords(
  place: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!place || typeof place !== 'string') return null;

  const normalized = normalizePlaceKey(place);
  if (!normalized) return null;

  if (ACTIVITY_STOP_COORDS[normalized]) {
    return ACTIVITY_STOP_COORDS[normalized];
  }

  // Partial match for activity stops (e.g. "llegamos a Cabo San Juan").
  const activityKey = Object.keys(ACTIVITY_STOP_COORDS).find((candidate) =>
    normalized.includes(candidate),
  );
  if (activityKey) return ACTIVITY_STOP_COORDS[activityKey];

  // Fall back to the city-level dict (covers Cartagena, Medellín, etc.).
  return lookupCityCoords(place);
}

export function activityStopCoordsEntries() {
  return ACTIVITY_STOP_COORDS;
}
