import {
  createReportsAdapter,
  type AdminNextReportsReadonlySupabaseClient,
} from '@/lib/admin-next/reports-adapter';

describe('admin-next reports adapter', () => {
  it('feeds Reports from fixture source by default', async () => {
    const adapter = createReportsAdapter();

    await expect(adapter.getReports()).resolves.toMatchObject({
      reports: expect.arrayContaining([
        expect.objectContaining({ id: 'sales' }),
        expect.objectContaining({ id: 'receivables' }),
      ]),
      tableRows: expect.any(Array),
    });
  });

  it('maps readonly financial tables into report cards and risks', async () => {
    const supabase = createReadonlySupabaseMock({
      itineraries: {
        data: [
          {
            id: 'it-1',
            id_fm: '2647',
            name: 'San Andres familiar',
            agent: 'Carolina',
            status: 'confirmed',
            total_amount: 10000000,
            total_cost: 7500000,
            total_markup: 2500000,
            paid: 6000000,
            pending_paid: 4000000,
            created_at: '2026-06-01T10:00:00Z',
            confirmed_at: '2026-06-03T10:00:00Z',
            confirmation_date: null,
            valid_until: null,
          },
          {
            id: 'it-2',
            id_fm: '2648',
            name: 'Cartagena ejecutivo',
            agent: 'Daniel',
            status: 'draft',
            total_amount: 5000000,
            total_cost: 4200000,
            total_markup: 800000,
            paid: 0,
            pending_paid: 5000000,
            created_at: '2026-06-04T10:00:00Z',
            confirmed_at: null,
            confirmation_date: null,
            valid_until: null,
          },
        ],
        error: null,
      },
      itinerary_items: {
        data: [
          {
            id: 'item-1',
            id_itinerary: 'it-1',
            product_type: 'Hotel',
            product_name: 'Hotel Las Islas',
            total_price: 4000000,
            total_cost: 3200000,
            profit: 800000,
            pending_paid_cost: 600000,
            reservation_status: false,
            date: '2026-06-10',
          },
        ],
        error: null,
      },
      transactions: {
        data: [
          {
            id: 1,
            id_itinerary: 'it-1',
            type: 'payment',
            value: 2500000,
            total_paid: null,
            fee_amount: 75000,
            payment_method: 'card',
            date: '2026-06-05',
            created_at: '2026-06-05T10:00:00Z',
          },
        ],
        error: null,
      },
    });
    const adapter = createReportsAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const fixture = await adapter.getReports();

    expect(supabase.calls).toEqual([
      expect.objectContaining({
        table: 'itineraries',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['deleted_at:is', null],
        ]),
        limit: 250,
      }),
      expect.objectContaining({
        table: 'itinerary_items',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['deleted_at:is', null],
        ]),
        limit: 250,
      }),
      expect.objectContaining({
        table: 'transactions',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['deleted_at:is', null],
        ]),
        limit: 250,
      }),
    ]);
    expect(fixture.reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sales',
          value: '$15.000.000',
          delta: '2 itinerarios',
        }),
        expect.objectContaining({
          id: 'receivables',
          value: '$9.000.000',
          delta: '2 pendientes',
        }),
        expect.objectContaining({
          id: 'payments-treasury',
          value: '$8.500.000',
          delta: '1 movimientos',
        }),
      ]),
    );
    expect(fixture.tableRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'it-1',
          label: 'San Andres familiar',
          owner: 'Carolina',
          amount: '$10.000.000',
          status: 'Pendiente $4.000.000',
        }),
      ]),
    );
    expect(fixture.aiSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'readonly-source', value: 'Readonly' }),
        expect.objectContaining({ id: 'supplier-watch', value: '1 watches' }),
      ]),
    );
  });

  it('throws when readonly report reads return an error', async () => {
    const adapter = createReportsAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        itineraries: {
          data: null,
          error: { message: 'permission denied' },
        },
        itinerary_items: { data: [], error: null },
        transactions: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    await expect(adapter.getReports()).rejects.toThrow(
      'Reports readonly adapter failed for itineraries: permission denied',
    );
  });
});

function createReadonlySupabaseMock(rows: {
  itineraries: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  itinerary_items: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  transactions: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextReportsReadonlySupabaseClient & {
  calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }>;
} {
  const calls: Array<{
    table: string;
    columns: string;
    filters: Array<[string, unknown]>;
    orders: Array<[string, { ascending?: boolean } | undefined]>;
    limit: number | null;
  }> = [];

  return {
    calls,
    from(table: 'itineraries' | 'itinerary_items' | 'transactions') {
      return {
        select(columns: string) {
          const call = {
            table,
            columns,
            filters: [] as Array<[string, unknown]>,
            orders: [] as Array<[string, { ascending?: boolean } | undefined]>,
            limit: null as number | null,
          };
          calls.push(call);
          const query = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return query;
            },
            is(column: string, value: null) {
              call.filters.push([`${column}:is`, value]);
              return query;
            },
            not(column: string, operator: string, value: unknown) {
              call.filters.push([`${column}:not:${operator}`, value]);
              return query;
            },
            gte(column: string, value: unknown) {
              call.filters.push([`${column}:gte`, value]);
              return query;
            },
            order(column: string, options?: { ascending?: boolean }) {
              call.orders.push([column, options]);
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
  } as unknown as AdminNextReportsReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending?: boolean } | undefined]>;
      limit: number | null;
    }>;
  };
}
