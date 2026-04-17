/**
 * Direct MapTiler Geocoding API client (no SDK, no cache).
 * Server-only — the API key must never leak to the client bundle (ADR-005).
 *
 * SPEC #164 — Activity circuit maps (fallback path when both CF cache and
 * Supabase `places_cache` miss).
 */
import type { PlaceSource } from '@bukeer/website-contract';

export interface MaptilerGeocodeResult {
  lat: number;
  lng: number;
  country_code: string | null;
  source: PlaceSource; // always 'maptiler'
}

const BASE_URL = 'https://api.maptiler.com/geocoding';

interface MaptilerFeatureContext {
  short_code?: string;
}

interface MaptilerFeature {
  center?: [number, number];
  context?: MaptilerFeatureContext[];
}

interface MaptilerResponse {
  features?: MaptilerFeature[];
}

/**
 * Geocode a free-form toponym via MapTiler.
 *
 * - Returns `null` when API key is missing, name is empty, the HTTP call fails,
 *   or no feature has a valid `center` tuple.
 * - Biases the query by ISO 3166-1 alpha-2 country code when provided.
 * - Derives `country_code` from the first 2-char `short_code` present in the
 *   feature `context` (MapTiler returns these as `iso:XX` or plain codes).
 */
export async function geocodeViaMaptiler(
  name: string,
  opts: { countryCode?: string; apiKey: string; signal?: AbortSignal } = { apiKey: '' },
): Promise<MaptilerGeocodeResult | null> {
  const { countryCode, apiKey, signal } = opts;
  if (!apiKey || !name.trim()) return null;

  const url = new URL(`${BASE_URL}/${encodeURIComponent(name.trim())}.json`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('limit', '5');
  if (countryCode) url.searchParams.set('country', countryCode.toLowerCase());

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      console.warn('[maptiler] non-ok', res.status, name);
      return null;
    }
    const data = (await res.json()) as MaptilerResponse;
    const feature = data.features?.find(
      (f) => Array.isArray(f.center) && f.center.length === 2,
    );
    if (!feature?.center) return null;
    const [lng, lat] = feature.center;
    const inferredCountry =
      feature.context?.find(
        (c) => typeof c.short_code === 'string' && c.short_code.length === 2,
      )?.short_code ?? null;
    return {
      lat,
      lng,
      country_code: inferredCountry ? inferredCountry.toUpperCase() : null,
      source: 'maptiler',
    };
  } catch (error) {
    console.warn('[maptiler] fetch failed', { name, error });
    return null;
  }
}
