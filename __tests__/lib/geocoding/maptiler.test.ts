import { geocodeViaMaptiler } from '@/lib/geocoding/maptiler';

const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  jest.restoreAllMocks();
});

describe('geocodeViaMaptiler', () => {
  it('returns null when the API key or name is missing', async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;

    expect(await geocodeViaMaptiler('', { apiKey: 'abc' })).toBeNull();
    expect(await geocodeViaMaptiler('Cartagena', { apiKey: '' })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('parses center + short_code from the first feature with a valid center', async () => {
    const payload = {
      features: [
        { center: null }, // skipped
        {
          center: [-75.4794, 10.391],
          context: [{ short_code: 'co' }, { short_code: 'bol' }],
        },
      ],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    }) as unknown as typeof fetch;

    const result = await geocodeViaMaptiler('Cartagena', {
      apiKey: 'key_abc',
      countryCode: 'CO',
    });

    expect(result).toEqual({
      lat: 10.391,
      lng: -75.4794,
      country_code: 'CO',
      source: 'maptiler',
    });

    const call = (global.fetch as jest.Mock).mock.calls[0][0] as URL;
    expect(call.toString()).toContain('/geocoding/Cartagena.json');
    expect(call.searchParams.get('country')).toBe('co');
    expect(call.searchParams.get('key')).toBe('key_abc');
  });
});
