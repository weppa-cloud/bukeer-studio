/**
 * Workers-safe geocoding cache orchestrator.
 *
 * Layered lookup:
 *   1. Hot cache    → `caches.default` (Cloudflare Workers edge cache, per-colo)
 *   2. Canonical    → Supabase `places_cache` table
 *   3. Fallback     → MapTiler Geocoding API (writes both caches on success)
 *
 * SPEC #164 — Activity circuit maps.
 * ADR-007 — no module-scope `Map`, no Node-only APIs. All state lives in
 * `caches.default` / Supabase; safe to run inside a Cloudflare Worker.
 * ADR-003 — consumes `PlaceCacheRowSchema` from `@bukeer/website-contract`.
 * ADR-005 — service role + MapTiler key are server-only.
 */
import {
  PlaceCacheRowSchema,
  type PlaceCacheRow,
  type PlaceSource,
} from '@bukeer/website-contract';
import { createClient } from '@supabase/supabase-js';
import { normalizePlaceName } from './normalize';
import { geocodeViaMaptiler } from './maptiler';

export interface GeocodedPlace {
  lat: number;
  lng: number;
  source: PlaceSource;
  country_code: string | null;
}

export interface GeocoderDeps {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  maptilerKey: string;
}

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * The Cloudflare Workers runtime exposes a non-standard `caches.default`
 * alongside the standard `CacheStorage` API. The Web TS lib doesn't know
 * about it, so we narrow via a small helper instead of augmenting globals.
 */
interface CfCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

function getCfCache(): CfCache | null {
  if (typeof caches === 'undefined') return null;
  const cfCaches = caches as unknown as { default?: CfCache };
  return cfCaches.default ?? null;
}

function cacheKey(normalized: string): Request {
  return new Request(
    `https://bukeer-geocode.internal/place/${encodeURIComponent(normalized)}`,
  );
}

async function readCfCache(normalized: string): Promise<GeocodedPlace | null> {
  const cache = getCfCache();
  if (!cache) return null;
  try {
    const res = await cache.match(cacheKey(normalized));
    if (!res) return null;
    const row = await res.json();
    const parsed = PlaceCacheRowSchema.safeParse(row);
    if (!parsed.success) return null;
    return {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      source: parsed.data.source,
      country_code: parsed.data.country_code,
    };
  } catch {
    return null;
  }
}

async function writeCfCache(
  normalized: string,
  row: PlaceCacheRow,
): Promise<void> {
  const cache = getCfCache();
  if (!cache) return;
  try {
    await cache.put(
      cacheKey(normalized),
      new Response(JSON.stringify(row), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      }),
    );
  } catch (error) {
    console.warn('[geocode] cf cache write failed', { normalized, error });
  }
}

async function readDb(
  normalized: string,
  deps: GeocoderDeps,
): Promise<PlaceCacheRow | null> {
  const client = createClient(deps.supabaseUrl, deps.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client
    .from('places_cache')
    .select('normalized_name,lat,lng,source,country_code,updated_at')
    .eq('normalized_name', normalized)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = PlaceCacheRowSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function writeDb(row: PlaceCacheRow, deps: GeocoderDeps): Promise<void> {
  const client = createClient(deps.supabaseUrl, deps.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const { error } = await client
    .from('places_cache')
    .upsert(row, { onConflict: 'normalized_name' });
  if (error) console.warn('[geocode] db upsert failed', { row, error });
}

/**
 * Resolve a toponym to coordinates through the three-tier cache.
 * Returns `null` when every layer fails (e.g. unknown toponym + no MapTiler key).
 */
export async function geocodePlace(
  rawName: string,
  opts: { countryCode?: string; deps: GeocoderDeps; signal?: AbortSignal },
): Promise<GeocodedPlace | null> {
  const normalized = normalizePlaceName(rawName);
  if (!normalized) return null;

  const hot = await readCfCache(normalized);
  if (hot) return hot;

  const dbRow = await readDb(normalized, opts.deps);
  if (dbRow) {
    await writeCfCache(normalized, dbRow);
    return {
      lat: dbRow.lat,
      lng: dbRow.lng,
      source: dbRow.source,
      country_code: dbRow.country_code,
    };
  }

  const mt = await geocodeViaMaptiler(rawName, {
    apiKey: opts.deps.maptilerKey,
    countryCode: opts.countryCode,
    signal: opts.signal,
  });
  if (!mt) return null;

  const row: PlaceCacheRow = {
    normalized_name: normalized,
    lat: mt.lat,
    lng: mt.lng,
    source: mt.source,
    country_code: mt.country_code,
    updated_at: new Date().toISOString(),
  };
  await Promise.all([writeDb(row, opts.deps), writeCfCache(normalized, row)]);
  return {
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    country_code: row.country_code,
  };
}
