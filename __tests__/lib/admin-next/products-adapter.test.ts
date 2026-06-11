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

  it('maps readonly catalog table rows into the Products contract', async () => {
    const supabase = createReadonlySupabaseMock({
      account_hotels: {
        data: [
          {
            id: 'hotel-live-1',
            custom_name: 'Casa Baru Preferred',
            custom_description: null,
            is_active: true,
            provider_contact_id: 'provider-1',
            master_hotels: {
              id: 'master-hotel-1',
              name: 'Casa Baru',
              city: 'Baru',
              country: 'Colombia',
              description: 'Hotel frente al mar',
              photos: [{ url: 'one.jpg' }, { url: 'two.jpg' }],
              star_rating: 4.5,
              user_rating: 4.7,
              reviews_count: 83,
            },
            contacts: {
              id: 'provider-1',
              name: 'Operador',
              last_name: 'Caribe',
              email: 'reservas@example.test',
            },
            account_rates: [
              {
                id: 'rate-hotel-1',
                display_name: 'Suite vista mar',
                room_type_code: 'suite',
                meal_plan: 'Desayuno',
                unit_cost: 700000,
                price: 950000,
                profit_amount: 250000,
                profit_pct: 26.315,
                currency: 'COP',
                is_active: true,
              },
              {
                id: 'rate-hotel-2',
                display_name: 'Habitacion base',
                room_type_code: 'standard',
                meal_plan: 'Solo alojamiento',
                unit_cost: 560000,
                price: 720000,
                profit_amount: 160000,
                profit_pct: 22.222,
                currency: 'COP',
                is_active: true,
              },
              {
                id: 'rate-hotel-draft',
                price: 500000,
                currency: 'COP',
                is_active: false,
              },
            ],
          },
        ],
        error: null,
      },
      account_activities: {
        data: [
          {
            id: 'activity-live-1',
            custom_name: null,
            custom_description: 'Recorrido natural',
            is_active: true,
            provider_contact_id: 'provider-2',
            master_activities: {
              id: 'master-activity-1',
              name: 'Tour manglares',
              city: 'Cartagena',
              country: 'Colombia',
              description: 'Recorrido por ecosistema',
              description_short: 'Recorrido natural corto',
              photos: { images: [{ url: 'mangrove.jpg' }] },
              duration_minutes: 180,
              experience_type: 'nature',
            },
            contacts: {
              id: 'provider-2',
              name: 'Eco',
              last_name: 'Tours',
              email: 'ops@example.test',
            },
            activity_options: [
              {
                id: 'option-1',
                is_active: true,
                activity_prices: [
                  {
                    id: 'activity-price-1',
                    price: '180000',
                    currency: 'COP',
                    is_active: true,
                  },
                ],
              },
            ],
          },
        ],
        error: null,
      },
    });
    const adapter = createProductsAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const fixture = await adapter.getProducts();

    expect(typeof supabase.from).toBe('function');
    expect('rpc' in supabase).toBe(false);
    expect(supabase.calls).toEqual([
      {
        table: 'account_hotels',
        columns: expect.stringContaining('account_rates'),
        filters: [
          ['account_id', 'acct-1'],
          ['is_active', true],
        ],
        limit: 25,
      },
      {
        table: 'account_activities',
        columns: expect.stringContaining('activity_options'),
        filters: [
          ['account_id', 'acct-1'],
          ['is_active', true],
        ],
        limit: 25,
      },
    ]);
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
        reviews: 83,
        rateState: 'active',
        tone: 'primary',
        imageCount: 2,
      }),
      expect.objectContaining({
        id: 'activity-live-1',
        name: 'Tour manglares',
        type: 'Actividades',
        location: 'Cartagena, Colombia',
        provider: 'Eco Tours',
        fromPrice: '$180.000',
        priceAmount: 180000,
        rateState: 'active',
        tone: 'live',
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
    expect(fixture.rates).toEqual([
      {
        id: 'rate-hotel-2',
        name: 'Habitacion base',
        detail: 'Solo alojamiento',
        cost: '$560.000',
        margin: '22%',
        sale: '$720.000',
      },
      {
        id: 'rate-hotel-1',
        name: 'Suite vista mar',
        detail: 'Desayuno',
        cost: '$700.000',
        margin: '26%',
        sale: '$950.000',
      },
    ]);
  });

  it('throws when readonly table reads return an error', async () => {
    const adapter = createProductsAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        account_hotels: { data: null, error: { message: 'permission denied' } },
        account_activities: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    await expect(adapter.getProducts()).rejects.toThrow(
      'account_hotels readonly query failed: permission denied',
    );
  });
});

function createReadonlySupabaseMock(rows: {
  account_hotels: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  account_activities: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextProductsReadonlySupabaseClient & {
  calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    limit: number | null;
  }>;
} {
  const calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    limit: number | null;
  }> = [];

  return {
    calls,
    from(table: 'account_hotels' | 'account_activities') {
      return {
        select(columns: string) {
          const call: {
            table: string;
            columns: string;
            filters: Array<[string, unknown]>;
            limit: number | null;
          } = { table, columns, filters: [], limit: null };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            limit(count: number) {
              call.limit = count;
              return query;
            },
            then(
              resolve: (value: unknown) => unknown,
              reject?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve(rows[table]).then(resolve, reject);
            },
          };

          return query;
        },
      };
    },
  } as unknown as AdminNextProductsReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      limit: number | null;
    }>;
  };
}
