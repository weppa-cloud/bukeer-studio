/**
 * Known Colombian city coordinates — fallback when the DB does not
 * persist coordinates alongside package / itinerary data.
 */
export const COLOMBIA_CITIES: Record<string, { lat: number; lng: number }> = {
  'Bogotá': { lat: 4.711, lng: -74.072 },
  'Medellín': { lat: 6.248, lng: -75.566 },
  'Cartagena': { lat: 10.393, lng: -75.483 },
  'Cartagena de Indias': { lat: 10.393, lng: -75.483 },
  'Santa Marta': { lat: 11.240, lng: -74.211 },
  'Cali': { lat: 3.451, lng: -76.532 },
  'Pereira': { lat: 4.809, lng: -75.691 },
  'Salento': { lat: 4.637, lng: -75.570 },
  'San Andrés': { lat: 12.577, lng: -81.705 },
  'Zipaquirá': { lat: 5.022, lng: -73.997 },
  'Santa Rosa de Cabal': { lat: 4.871, lng: -75.622 },
  'Leticia': { lat: -4.215, lng: -69.941 },
  'Guatapé': { lat: 6.232, lng: -75.157 },
  'Barichara': { lat: 6.634, lng: -73.226 },
  'Villa de Leyva': { lat: 5.633, lng: -73.524 },
};

export interface RoutePoint {
  city: string;
  lat: number;
  lng: number;
}

/**
 * Extract route points from a free-text name by matching known city names.
 * Accent-insensitive, preserves the order found in the source map.
 */
export function parseRouteFromName(name: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  const seen = new Set<string>();
  const nameNorm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const [city, coords] of Object.entries(COLOMBIA_CITIES)) {
    const normalized = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (!nameNorm.includes(normalized) || seen.has(city)) continue;

    if (city === 'Cartagena de Indias' && seen.has('Cartagena')) continue;
    if (city === 'Cartagena' && seen.has('Cartagena de Indias')) continue;

    seen.add(city);
    points.push({ city, ...coords });
  }

  return points;
}
