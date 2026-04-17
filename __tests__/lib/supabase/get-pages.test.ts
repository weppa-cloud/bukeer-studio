const mockRpc = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: jest.fn(),
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

import {
  getCategoryProducts,
  getProductPage,
  getProductPageBySlug,
} from '@/lib/supabase/get-pages';

describe('get-pages RPC parsing fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns legacy product fields and logs warning when getProductPage payload is malformed', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({
      data: {
        product: {
          id: 'prod-1',
          name: 'Rafting',
          slug: 'rafting',
          type: 'activity',
        },
        page: {
          id: 'page-1',
          custom_sections: [],
          sections_order: [],
          hidden_sections: [],
          custom_faq: [{ question: 'What should I bring?' }],
          is_published: true,
        },
      },
      error: null,
    });

    const result = await getProductPage('demo', 'activity', 'rafting');

    expect(result).not.toBeNull();
    expect(result?.product.name).toBe('Rafting');
    expect(result?.page?.id).toBe('page-1');
    expect(warnSpy).toHaveBeenCalledWith(
      '[product.v2-parse] Schema mismatch',
      expect.objectContaining({ scope: 'getProductPage' })
    );

    warnSpy.mockRestore();
  });

  it('returns typed V2 fields through getProductPageBySlug alias on valid payload', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({
      data: {
        product: {
          id: 'prod-2',
          name: 'City Tour',
          slug: 'city-tour',
          type: 'activity',
          schedule: [{ title: 'Day 1' }],
          meeting_point: { city: 'Cartagena' },
          options: [
            {
              id: 'opt-1',
              name: 'Shared',
              pricing_per: 'UNIT',
              prices: [
                {
                  unit_type_code: 'ADT',
                  season: 'regular',
                  price: 99,
                  currency: 'USD',
                },
              ],
            },
          ],
        },
        page: {
          id: 'page-2',
          custom_sections: [],
          sections_order: [],
          hidden_sections: [],
          custom_faq: [{ question: 'Q1', answer: 'A1' }],
          is_published: true,
        },
      },
      error: null,
    });

    const result = await getProductPageBySlug('demo', 'activity', 'city-tour');

    expect(result).not.toBeNull();
    expect(result?.product.schedule?.[0]?.title).toBe('Day 1');
    expect(result?.product.meeting_point?.city).toBe('Cartagena');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('falls back to empty items and numeric total for malformed category payload', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({
      data: {
        items: 'invalid-items',
        total: '7',
      },
      error: null,
    });

    const result = await getCategoryProducts('demo', 'activities');

    expect(result).toEqual({
      items: [],
      total: 7,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[product.v2-parse] Schema mismatch',
      expect.objectContaining({ scope: 'getCategoryProducts' })
    );

    warnSpy.mockRestore();
  });

  it('accepts legacy array payload for category products via normalized parse', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'prod-3',
          name: 'Hotel Caribe',
          slug: 'hotel-caribe',
          type: 'hotel',
        },
      ],
      error: null,
    });

    const result = await getCategoryProducts('demo', 'hotels');

    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('Hotel Caribe');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
