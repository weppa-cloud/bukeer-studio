/**
 * Cache orchestrator tests. All IO is mocked:
 *   - `caches.default` via a minimal in-memory implementation
 *   - `@supabase/supabase-js` via jest.mock
 *   - `geocodeViaMaptiler` via jest.mock
 */

type CacheLike = {
  match: (req: Request) => Promise<Response | undefined>;
  put: (req: Request, res: Response) => Promise<void>;
};

function makeMemoryCache(): CacheLike {
  const store = new Map<string, string>();
  return {
    async match(req: Request) {
      const key = req.url;
      const body = store.get(key);
      return body
        ? new Response(body, { headers: { 'content-type': 'application/json' } })
        : undefined;
    },
    async put(req: Request, res: Response) {
      store.set(req.url, await res.text());
    },
  };
}

let memoryCache: CacheLike;

const selectMaybeSingle = jest.fn();
const upsert = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: selectMaybeSingle }),
      }),
      upsert,
    }),
  })),
}));

jest.mock('@/lib/geocoding/maptiler', () => ({
  geocodeViaMaptiler: jest.fn(),
}));

import { geocodePlace } from '@/lib/geocoding/geocode';
import { geocodeViaMaptiler } from '@/lib/geocoding/maptiler';

const DEPS = {
  supabaseUrl: 'https://project.supabase.co',
  supabaseServiceRoleKey: 'service-role-key',
  maptilerKey: 'mt-key',
};

beforeEach(() => {
  jest.clearAllMocks();
  memoryCache = makeMemoryCache();
  (globalThis as unknown as { caches: { default: CacheLike } }).caches = {
    default: memoryCache,
  };
  upsert.mockResolvedValue({ error: null });
});

afterEach(() => {
  delete (globalThis as unknown as { caches?: unknown }).caches;
});

describe('geocodePlace — three-tier cache', () => {
  it('returns the CF cache hit without touching DB or MapTiler', async () => {
    const row = {
      normalized_name: 'cartagena',
      lat: 10.391,
      lng: -75.4794,
      source: 'static' as const,
      country_code: 'CO' as string | null,
      updated_at: new Date().toISOString(),
    };
    await memoryCache.put(
      new Request('https://bukeer-geocode.internal/place/cartagena'),
      new Response(JSON.stringify(row), {
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await geocodePlace('Cartagena', { deps: DEPS });

    expect(result).toEqual({
      lat: 10.391,
      lng: -75.4794,
      source: 'static',
      country_code: 'CO',
    });
    expect(selectMaybeSingle).not.toHaveBeenCalled();
    expect(geocodeViaMaptiler).not.toHaveBeenCalled();
  });

  it('returns the DB hit and warms the CF cache', async () => {
    selectMaybeSingle.mockResolvedValue({
      data: {
        normalized_name: 'medellin',
        lat: 6.2442,
        lng: -75.5812,
        source: 'manual',
        country_code: 'CO',
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await geocodePlace('Medellín', { deps: DEPS });

    expect(result).toMatchObject({
      lat: 6.2442,
      lng: -75.5812,
      source: 'manual',
      country_code: 'CO',
    });
    expect(geocodeViaMaptiler).not.toHaveBeenCalled();

    // Warmed CF cache on read-through.
    const warm = await memoryCache.match(
      new Request('https://bukeer-geocode.internal/place/medellin'),
    );
    expect(warm).toBeDefined();
  });

  it('falls back to MapTiler on miss and writes both caches', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null });
    (geocodeViaMaptiler as jest.Mock).mockResolvedValue({
      lat: 4.6383,
      lng: -75.4958,
      country_code: 'CO',
      source: 'maptiler',
    });

    const result = await geocodePlace('Valle de Cocora', { deps: DEPS });

    expect(result).toEqual({
      lat: 4.6383,
      lng: -75.4958,
      source: 'maptiler',
      country_code: 'CO',
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const upserted = upsert.mock.calls[0][0];
    expect(upserted.normalized_name).toBe('valle de cocora');
    expect(upserted.source).toBe('maptiler');

    const warm = await memoryCache.match(
      new Request('https://bukeer-geocode.internal/place/valle%20de%20cocora'),
    );
    expect(warm).toBeDefined();
  });
});
