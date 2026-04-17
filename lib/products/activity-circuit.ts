/**
 * Activity-level circuit extractor. Walks `product.schedule[]` + the
 * `meeting_point` to derive ordered stops for the activity map.
 *
 * Resolution order per stop:
 *   1. Static dict (`lookupPlaceCoords`) — synchronous fast path.
 *   2. Workers-safe `geocodePlace` — only hit when the dict misses.
 *
 * Returns stops in schedule order, deduped by normalized toponym. SPEC #164.
 */
import type { ProductData } from '@bukeer/website-contract';
import { lookupPlaceCoords } from './place-coords';
import { normalizePlaceName } from '@/lib/geocoding/normalize';
import { geocodePlace, type GeocoderDeps } from '@/lib/geocoding/geocode';

export interface ActivityCircuitStop {
  id: string;
  lat: number;
  lng: number;
  label: string;
  order: number;
  /** Which schedule step (1-based) or 0 for meeting-point. */
  sourceStep: number;
}

/**
 * Canonical Colombian tourist stops we try to match inside free-form schedule
 * text. Longest phrases first so `"valle de cocora"` beats `"cocora"`.
 * Kept in sync with `place-coords.ts` + `city-coords.ts`.
 */
const CANDIDATE_TOPONYMS: readonly string[] = [
  // Multi-word (try first for longest-match)
  'parque nacional tayrona',
  'catedral de sal de zipaquira',
  'islas corales del rosario',
  'termales de santa rosa',
  'santa rosa de cabal',
  'cartagena de indias',
  'laguna de guatavita',
  'islas del rosario',
  'isla del rosario',
  'piedra del peñol',
  'piedra del penol',
  'valle del cocora',
  'valle de cocora',
  'villa de leyva',
  'catedral de sal',
  'parque tayrona',
  'parque del cafe',
  'cabo san juan',
  'ciudad perdida',
  'puerto nariño',
  'puerto narino',
  'bahia solano',
  'playa blanca',
  'san andres isla',
  'san andrés',
  'comuna 13',
  'johnny cay',
  'cayo acuario',
  'santa marta',
  'isla baru',
  'el penol',

  // Single-word
  'providencia',
  'barichara',
  'zipaquira',
  'filandia',
  'cartagena',
  'medellin',
  'guatavita',
  'monserrate',
  'guatape',
  'salento',
  'pereira',
  'bogota',
  'leticia',
  'baru',
  'cholon',
  'cocora',
  'minca',
  'palomino',
  'nuqui',
  'cali',
];

interface ExtractedToken {
  raw: string;
  normalized: string;
  step: number;
}

function pushUnique(acc: ExtractedToken[], token: ExtractedToken): void {
  if (acc.some((t) => t.normalized === token.normalized)) return;
  acc.push(token);
}

function extractFromText(text: string, step: number): ExtractedToken[] {
  if (!text) return [];
  const normalized = normalizePlaceName(text);
  if (!normalized) return [];

  const hits: Array<{ candidate: string; pos: number }> = [];
  for (const candidate of CANDIDATE_TOPONYMS) {
    const pos = normalized.indexOf(candidate);
    if (pos >= 0) hits.push({ candidate, pos });
  }
  hits.sort((a, b) => a.pos - b.pos);

  const out: ExtractedToken[] = [];
  for (const hit of hits) {
    pushUnique(out, { raw: hit.candidate, normalized: hit.candidate, step });
  }
  return out;
}

function extractStopTokens(product: ProductData): ExtractedToken[] {
  const tokens: ExtractedToken[] = [];

  // meeting_point (step 0) — bias for the start of the tour.
  const mp = product.meeting_point;
  if (mp) {
    const mpText = [mp.city, mp.address, mp.state].filter(Boolean).join(' ');
    for (const tok of extractFromText(mpText, 0)) pushUnique(tokens, tok);
  }

  // schedule entries (step 1..N) preserving author-provided order.
  const schedule = Array.isArray(product.schedule) ? product.schedule : [];
  schedule.forEach((entry, index) => {
    const step = index + 1;
    const text = `${entry.title ?? ''} ${entry.description ?? ''}`;
    for (const tok of extractFromText(text, step)) pushUnique(tokens, tok);
  });

  return tokens;
}

/**
 * Build an ordered list of map stops for an activity product.
 *
 * - Uses `lookupPlaceCoords` synchronously first (no network calls for
 *   well-known stops).
 * - Only calls `geocodePlace` for toponyms missing from the static dict.
 * - Preserves the order stops appear in the schedule; dedupes by normalized
 *   toponym.
 */
export async function getActivityCircuitStops(
  product: ProductData,
  opts: { deps: GeocoderDeps; signal?: AbortSignal },
): Promise<ActivityCircuitStop[]> {
  const tokens = extractStopTokens(product);
  if (tokens.length === 0) return [];

  const countryCode = (product.country ?? 'CO').slice(0, 2).toUpperCase();
  const stops: ActivityCircuitStop[] = [];
  let orderCounter = 0;

  for (const token of tokens) {
    const staticCoords = lookupPlaceCoords(token.raw);
    if (staticCoords) {
      orderCounter += 1;
      stops.push({
        id: `${token.normalized}-${orderCounter}`,
        lat: staticCoords.lat,
        lng: staticCoords.lng,
        label: token.raw,
        order: orderCounter,
        sourceStep: token.step,
      });
      continue;
    }

    const geocoded = await geocodePlace(token.raw, {
      countryCode,
      deps: opts.deps,
      signal: opts.signal,
    });
    if (!geocoded) continue;

    orderCounter += 1;
    stops.push({
      id: `${token.normalized}-${orderCounter}`,
      lat: geocoded.lat,
      lng: geocoded.lng,
      label: token.raw,
      order: orderCounter,
      sourceStep: token.step,
    });
  }

  return stops;
}
