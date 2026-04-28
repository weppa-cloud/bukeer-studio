import { lookupCityCoords } from '@/lib/products/city-coords';

const KNOWN_CITIES = [
  'Cartagena de Indias',
  'Santa Rosa de Cabal',
  'Villa de Leyva',
  'San Andres',
  'San Andrés',
  'Santa Marta',
  'Bahía Concha',
  'Bahia Concha',
  'Tayrona',
  'Taganga',
  'Minca',
  'Medellin',
  'Medellín',
  'Cartagena',
  'Barú',
  'Baru',
  'Islas del Rosario',
  'Playa Blanca',
  'Playa Tranquila',
  'Bogota',
  'Bogotá',
  'Nemocón',
  'Nemocon',
  'Pereira',
  'Salento',
  'Filandia',
  'Valle del Cocora',
  'Eje Cafetero',
  'Guatape',
  'Guatapé',
  'Jardín',
  'Jardin',
  'Barichara',
  'Zipaquira',
  'Zipaquirá',
  'Cali',
  'Leticia',
] as const;

export interface PackageCircuitStopWithCoords {
  city: string;
  lat: number;
  lng: number;
  day: number;
}

export interface PackageItineraryItem {
  day?: number;
  title?: string;
  description?: string;
}

interface PackageCircuitInput {
  itineraryItems?: PackageItineraryItem[] | null;
  name?: string | null;
  destination?: string | null;
  fallbackStops?: string[];
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(de indias|d\.c\.|dc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const key = normalize(value);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }

  return out;
}

function extractCitiesFromText(input: string): string[] {
  if (!input) return [];
  const normalizedText = normalize(input);
  const found: Array<{ city: string; pos: number }> = [];

  for (const city of KNOWN_CITIES) {
    const normalizedCity = normalize(city);
    if (normalizedCity === 'jardin' && /\bjardin botanico\b/.test(normalizedText)) {
      continue;
    }
    const escaped = normalizedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = normalizedText.match(new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`));
    if (match?.index !== undefined) {
      found.push({ city, pos: match.index });
    }
  }

  found.sort((a, b) => a.pos - b.pos);
  return dedupePreservingOrder(found.map((item) => item.city));
}

export function getPackageCircuitStops({
  itineraryItems,
  name,
  destination,
  fallbackStops = [],
}: PackageCircuitInput): string[] {
  const fromDestination = extractCitiesFromText(destination || '');
  if (fromDestination.length > 0) return fromDestination;

  const fromName = extractCitiesFromText(name || '');
  if (fromName.length > 0) return fromName;

  const fromItinerary = dedupePreservingOrder(
    (itineraryItems || [])
      .flatMap((item) => extractCitiesFromText(`${item.title || ''} ${item.description || ''}`))
  );
  if (fromItinerary.length > 0) return fromItinerary;

  return dedupePreservingOrder(fallbackStops);
}

export function formatCircuitStops(stops: string[], maxVisible = 3): string {
  if (stops.length === 0) return '';
  if (stops.length <= maxVisible) return stops.join(' \u2192 ');
  const hidden = stops.length - maxVisible;
  return `${stops.slice(0, maxVisible).join(' \u2192 ')} +${hidden}`;
}

export function withCoords(stops: string[]): PackageCircuitStopWithCoords[] {
  return dedupePreservingOrder(stops)
    .map((city, index) => {
      const coords = lookupCityCoords(city);
      if (!coords) {
        return null;
      }

      return {
        city,
        lat: coords.lat,
        lng: coords.lng,
        day: index + 1,
      };
    })
    .filter((stop): stop is PackageCircuitStopWithCoords => Boolean(stop));
}
