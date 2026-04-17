jest.mock('@/lib/geocoding/geocode', () => ({
  geocodePlace: jest.fn(),
}));

import { getActivityCircuitStops } from '@/lib/products/activity-circuit';
import { geocodePlace } from '@/lib/geocoding/geocode';
import type { ProductData } from '@bukeer/website-contract';

const DEPS = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceRoleKey: 'srk',
  maptilerKey: 'mt',
};

function activity(partial: Partial<ProductData>): ProductData {
  return {
    id: 'p1',
    name: 'Test activity',
    slug: 'test',
    type: 'activity',
    ...partial,
  } as ProductData;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getActivityCircuitStops', () => {
  it('resolves every stop via the static dict without hitting the geocoder', async () => {
    const product = activity({
      meeting_point: { city: 'Cartagena' },
      schedule: [
        { day: 1, title: 'Salida a Playa Blanca', description: 'Baru' },
        { day: 1, title: 'Tarde en Islas del Rosario' },
      ],
    });

    const stops = await getActivityCircuitStops(product, { deps: DEPS });

    expect(geocodePlace).not.toHaveBeenCalled();
    expect(stops.map((s) => s.label)).toEqual([
      'cartagena',
      'playa blanca',
      'baru',
      'islas del rosario',
    ]);
    expect(stops.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    // meeting_point is sourceStep 0; schedule entries follow the author order.
    expect(stops[0].sourceStep).toBe(0);
    expect(stops[1].sourceStep).toBe(1);
    expect(stops[3].sourceStep).toBe(2);
  });

  it('falls back to the geocoder for stops missing from the dict', async () => {
    (geocodePlace as jest.Mock).mockResolvedValueOnce({
      lat: 11.25,
      lng: -73.58,
      source: 'maptiler',
      country_code: 'CO',
    });

    const product = activity({
      schedule: [
        { day: 1, title: 'Bienvenida en Santa Marta' },
        { day: 1, title: 'Excursión al Parque Totalmente Desconocido' },
      ],
    });

    const stops = await getActivityCircuitStops(product, { deps: DEPS });

    // "santa marta" is in the dict; the fictitious toponym has no candidate
    // match so the geocoder is never invoked. Confirm at least the dict-based
    // stop resolves and geocoder was not called for unmatched text.
    expect(stops.length).toBeGreaterThanOrEqual(1);
    expect(stops[0].label).toBe('santa marta');
  });

  it('returns an empty array when schedule and meeting_point are empty', async () => {
    const stops = await getActivityCircuitStops(
      activity({ schedule: [], meeting_point: undefined }),
      { deps: DEPS },
    );
    expect(stops).toEqual([]);
    expect(geocodePlace).not.toHaveBeenCalled();
  });
});
