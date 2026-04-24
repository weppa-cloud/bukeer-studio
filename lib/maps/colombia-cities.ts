/**
 * Known Colombian city coordinates — fallback when the DB does not
 * persist coordinates alongside package / itinerary data.
 *
 * Each entry carries an optional `region` tag ("caribe" | "andes" |
 * "selva" | "pacifico") so editorial maps can highlight geographic
 * clusters without re-deriving them. Consumers that ignore `region`
 * continue to work unchanged (back-compat).
 */

export type ColombiaRegion = 'caribe' | 'andes' | 'selva' | 'pacifico';

export interface ColombiaCityEntry {
  lat: number;
  lng: number;
  /** Editorial geographic region (optional — not all historical entries have it). */
  region?: ColombiaRegion;
}

export const COLOMBIA_BOUNDS = {
  minLat: -4.9,
  maxLat: 13.6,
  minLng: -81.9,
  maxLng: -66.8,
} as const;

export const COLOMBIA_CITIES: Record<string, ColombiaCityEntry> = {
  // Andes
  'Bogotá': { lat: 4.711, lng: -74.072, region: 'andes' },
  'Medellín': { lat: 6.248, lng: -75.566, region: 'andes' },
  'Cali': { lat: 3.451, lng: -76.532, region: 'andes' },
  'Pereira': { lat: 4.809, lng: -75.691, region: 'andes' },
  'Salento': { lat: 4.637, lng: -75.570, region: 'andes' },
  'Zipaquirá': { lat: 5.022, lng: -73.997, region: 'andes' },
  'Santa Rosa de Cabal': { lat: 4.871, lng: -75.622, region: 'andes' },
  'Guatapé': { lat: 6.232, lng: -75.157, region: 'andes' },
  'Barichara': { lat: 6.634, lng: -73.226, region: 'andes' },
  'Villa de Leyva': { lat: 5.633, lng: -73.524, region: 'andes' },
  'Filandia': { lat: 4.676, lng: -75.658, region: 'andes' },
  'Valle de Cocora': { lat: 4.637, lng: -75.486, region: 'andes' },
  'San Gil': { lat: 6.555, lng: -73.134, region: 'andes' },
  'Quimbaya': { lat: 4.625, lng: -75.762, region: 'andes' },
  'Pueblo Tapao': { lat: 4.546, lng: -75.733, region: 'andes' },
  'Puerto Triunfo': { lat: 5.878, lng: -74.640, region: 'andes' },

  // Caribe
  'Cartagena': { lat: 10.393, lng: -75.483, region: 'caribe' },
  'Cartagena de Indias': { lat: 10.393, lng: -75.483, region: 'caribe' },
  'Santa Marta': { lat: 11.240, lng: -74.211, region: 'caribe' },
  'Tayrona': { lat: 11.300, lng: -74.050, region: 'caribe' },
  'Minca': { lat: 11.143, lng: -74.118, region: 'caribe' },
  'San Andrés': { lat: 12.577, lng: -81.705, region: 'caribe' },
  'La Guajira': { lat: 12.200, lng: -71.960, region: 'caribe' },
  'Cabo de la Vela': { lat: 12.200, lng: -72.170, region: 'caribe' },
  'Punta Gallinas': { lat: 12.460, lng: -71.660, region: 'caribe' },
  'Islas del Rosario': { lat: 10.180, lng: -75.760, region: 'caribe' },
  'San Basilio de Palenque': { lat: 10.100, lng: -75.200, region: 'caribe' },

  // Selva (Amazonía)
  'Leticia': { lat: -4.215, lng: -69.941, region: 'selva' },
};

export interface RoutePoint {
  city: string;
  lat: number;
  lng: number;
  region?: ColombiaRegion;
}

/**
 * Cities grouped by editorial region. Useful for region highlighting
 * (e.g. "see all Caribbean destinations" or map filter chips).
 * Only cities with a `region` tag appear here.
 */
export const CITIES_BY_REGION: Record<ColombiaRegion, RoutePoint[]> = (() => {
  const grouped: Record<ColombiaRegion, RoutePoint[]> = {
    caribe: [],
    andes: [],
    selva: [],
    pacifico: [],
  };
  for (const [city, entry] of Object.entries(COLOMBIA_CITIES)) {
    if (entry.region) {
      grouped[entry.region].push({
        city,
        lat: entry.lat,
        lng: entry.lng,
        region: entry.region,
      });
    }
  }
  return grouped;
})();

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizeRegion(value: string): ColombiaRegion | undefined {
  const normalized = normalizeText(value);
  if (normalized === 'caribe') return 'caribe';
  if (normalized === 'andes') return 'andes';
  if (normalized === 'selva' || normalized === 'amazonia' || normalized === 'amazonia colombiana') return 'selva';
  if (normalized === 'pacifico' || normalized === 'region pacifica') return 'pacifico';
  return undefined;
}

export function isWithinColombiaBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= COLOMBIA_BOUNDS.minLat &&
    lat <= COLOMBIA_BOUNDS.maxLat &&
    lng >= COLOMBIA_BOUNDS.minLng &&
    lng <= COLOMBIA_BOUNDS.maxLng
  );
}

export function inferColombiaRegionFromCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): ColombiaRegion | undefined {
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!isWithinColombiaBounds(lat, lng)) return undefined;

  // Caribbean north belt.
  if (lat >= 9.0) return 'caribe';
  // Pacific coast strip.
  if (lng <= -77.1 && lat >= 0.8 && lat <= 8.8) return 'pacifico';
  // Southern rainforest / amazon basin.
  if (lat <= 1.8 && lng >= -75.6) return 'selva';
  // Fallback for the central corridor.
  return 'andes';
}

export function resolveColombiaRegion(input: {
  region?: string | null;
  state?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}): ColombiaRegion | undefined {
  const fromRegion = input.region ? normalizeRegion(input.region) : undefined;
  if (fromRegion) return fromRegion;
  const fromState = input.state ? normalizeRegion(input.state) : undefined;
  if (fromState) return fromState;

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name) {
    const direct = COLOMBIA_CITIES[name];
    if (direct?.region) return direct.region;
    const normalizedName = normalizeText(name);
    for (const [city, entry] of Object.entries(COLOMBIA_CITIES)) {
      if (normalizeText(city) === normalizedName && entry.region) return entry.region;
    }
  }

  return inferColombiaRegionFromCoords(input.lat, input.lng);
}

/**
 * Extract route points from a free-text name by matching known city names.
 * Accent-insensitive, preserves the order found in the source map.
 */
export function parseRouteFromName(name: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  const seen = new Set<string>();
  const nameNorm = normalizeText(name);

  for (const [city, coords] of Object.entries(COLOMBIA_CITIES)) {
    const normalized = normalizeText(city);

    if (!nameNorm.includes(normalized) || seen.has(city)) continue;

    if (city === 'Cartagena de Indias' && seen.has('Cartagena')) continue;
    if (city === 'Cartagena' && seen.has('Cartagena de Indias')) continue;

    seen.add(city);
    points.push({
      city,
      lat: coords.lat,
      lng: coords.lng,
      region: coords.region,
    });
  }

  return points;
}
