const KNOWN_CITIES = [
  'Cartagena de Indias',
  'Santa Rosa de Cabal',
  'Villa de Leyva',
  'San Andres',
  'San Andrés',
  'Santa Marta',
  'Medellin',
  'Medellín',
  'Cartagena',
  'Bogota',
  'Bogotá',
  'Pereira',
  'Salento',
  'Guatape',
  'Guatapé',
  'Barichara',
  'Zipaquira',
  'Zipaquirá',
  'Cali',
  'Leticia',
] as const;

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
    .toLowerCase();
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
    const pos = normalizedText.indexOf(normalize(city));
    if (pos >= 0) found.push({ city, pos });
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
  const fromItinerary = dedupePreservingOrder(
    (itineraryItems || [])
      .flatMap((item) => extractCitiesFromText(`${item.title || ''} ${item.description || ''}`))
  );
  if (fromItinerary.length > 0) return fromItinerary;

  const fromName = extractCitiesFromText(name || '');
  if (fromName.length > 0) return fromName;

  const fromDestination = extractCitiesFromText(destination || '');
  if (fromDestination.length > 0) return fromDestination;

  return dedupePreservingOrder(fallbackStops);
}

export function formatCircuitStops(stops: string[], maxVisible = 3): string {
  if (stops.length === 0) return '';
  if (stops.length <= maxVisible) return stops.join(' \u2192 ');
  const hidden = stops.length - maxVisible;
  return `${stops.slice(0, maxVisible).join(' \u2192 ')} +${hidden}`;
}

