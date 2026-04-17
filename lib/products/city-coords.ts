const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  cartagena: { lat: 10.391, lng: -75.4794 },
  'cartagena de indias': { lat: 10.391, lng: -75.4794 },
  'santa rosa de cabal': { lat: 4.8692, lng: -75.6237 },
  'villa de leyva': { lat: 5.634, lng: -73.5258 },
  'san andres': { lat: 12.5567, lng: -81.7185 },
  'san andres isla': { lat: 12.5567, lng: -81.7185 },
  'santa marta': { lat: 11.2408, lng: -74.199 },
  medellin: { lat: 6.2442, lng: -75.5812 },
  bogota: { lat: 4.711, lng: -74.0721 },
  pereira: { lat: 4.8087, lng: -75.6906 },
  salento: { lat: 4.6378, lng: -75.5708 },
  guatape: { lat: 6.2328, lng: -75.1601 },
  barichara: { lat: 6.6356, lng: -73.2234 },
  zipaquira: { lat: 5.0221, lng: -74.0048 },
  cali: { lat: 3.4516, lng: -76.532 },
  leticia: { lat: -4.2153, lng: -69.9406 },
  'valle del cocora': { lat: 4.6383, lng: -75.4958 },
};

function normalizeCityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lookupCityCoords(city: string | null | undefined): { lat: number; lng: number } | null {
  if (!city || typeof city !== 'string') {
    return null;
  }

  const normalized = normalizeCityKey(city);
  if (!normalized) {
    return null;
  }

  if (CITY_COORDS[normalized]) {
    return CITY_COORDS[normalized];
  }

  const compact = normalized.replace(/\b(dia|dia\s+\d+|day|noche)\b/g, '').replace(/\s+/g, ' ').trim();
  if (CITY_COORDS[compact]) {
    return CITY_COORDS[compact];
  }

  const key = Object.keys(CITY_COORDS).find((candidate) => compact.includes(candidate));
  return key ? CITY_COORDS[key] : null;
}

export function cityCoordsEntries() {
  return CITY_COORDS;
}
