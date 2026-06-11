import {
  createProductsAdapter,
  type AdminNextProductsReadonlySupabaseClient,
} from '@/lib/admin-next/products-adapter';

describe('products adapter', () => {
  it('feeds Products from the fixture source by default', async () => {
    const adapter = createProductsAdapter();

    await expect(adapter.getProducts()).resolves.toMatchObject({
      selected: {
        name: 'Hotel Las Islas',
      },
      products: expect.arrayContaining([
        expect.objectContaining({
          id: 'prd-0148',
        }),
      ]),
    });
  });

  it('maps readonly catalog RPC rows into the Products contract', async () => {
    const rpc = jest.fn((fn: string) => {
      if (fn === 'list_account_hotels') {
        return Promise.resolve({
          data: [
            {
              id: 'hotel-live-1',
              custom_name: 'Casa Baru Preferred',
              hotel_name: 'Casa Baru',
              hotel_city: 'Baru',
              hotel_country: 'Colombia',
              hotel_description: 'Hotel frente al mar',
              custom_description: null,
              hotel_photos: [{ url: 'one.jpg' }, { url: 'two.jpg' }],
              hotel_star_rating: 4.7,
              min_price: 720000,
              provider_name: 'Operador Caribe',
              provider_email: 'reservas@example.test',
              rates_count: 2,
            },
          ],
          error: null,
        });
      }

      if (fn === 'list_account_activities') {
        return Promise.resolve({
          data: [
            {
              id: 'activity-live-1',
              custom_name: null,
              activity_name: 'Tour manglares',
              activity_city: 'Cartagena',
              custom_description: 'Recorrido natural',
              master_photos: { images: [{ url: 'mangrove.jpg' }] },
              min_price: '180000',
              provider_name: 'Eco Tours',
              provider_email: 'ops@example.test',
              options_count: 0,
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected RPC ${fn}`);
    });
    const supabase = {
      rpc,
    } as unknown as AdminNextProductsReadonlySupabaseClient;
    const adapter = createProductsAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const fixture = await adapter.getProducts();

    expect(Object.keys(supabase)).toEqual(['rpc']);
    expect('from' in supabase).toBe(false);
    expect(rpc).toHaveBeenCalledWith('list_account_hotels', {
      p_account_id: 'acct-1',
      p_active_only: true,
      p_search: '',
    });
    expect(rpc).toHaveBeenCalledWith('list_account_activities', {
      p_account_id: 'acct-1',
      p_active_only: true,
      p_limit: 25,
      p_offset: 0,
      p_search: '',
    });
    expect(fixture.categories).toEqual([
      expect.objectContaining({ key: 'all', count: 2 }),
      expect.objectContaining({ key: 'hotels', count: 1 }),
      expect.objectContaining({ key: 'activities', count: 1 }),
      expect.objectContaining({ key: 'transfers', count: 0 }),
      expect.objectContaining({ key: 'flights', count: 0 }),
    ]);
    expect(fixture.products).toEqual([
      expect.objectContaining({
        id: 'hotel-live-1',
        name: 'Casa Baru Preferred',
        type: 'Hoteles',
        location: 'Baru, Colombia',
        provider: 'Operador Caribe',
        providerKey: 'operador-caribe',
        fromPrice: '$720.000',
        priceAmount: 720000,
        rateState: 'active',
        imageCount: 2,
      }),
      expect.objectContaining({
        id: 'activity-live-1',
        name: 'Tour manglares',
        type: 'Actividades',
        location: 'Cartagena',
        provider: 'Eco Tours',
        fromPrice: '$180.000',
        rateState: 'review',
        tone: 'warning',
        imageCount: 1,
      }),
    ]);
    expect(fixture.selected).toEqual(
      expect.objectContaining({
        id: 'hotel-live-1',
        code: 'HOTEL-LIVE-1',
        description: 'Hotel frente al mar',
        providerEmail: 'reservas@example.test',
      }),
    );
  });

  it('throws when readonly RPC returns an error', async () => {
    const supabase = {
      rpc: jest.fn((fn: string) =>
        Promise.resolve({
          data: fn === 'list_account_activities' ? [] : null,
          error:
            fn === 'list_account_hotels'
              ? { message: 'permission denied' }
              : null,
        }),
      ),
    } as unknown as AdminNextProductsReadonlySupabaseClient;
    const adapter = createProductsAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    await expect(adapter.getProducts()).rejects.toThrow(
      'list_account_hotels readonly query failed: permission denied',
    );
  });
});
