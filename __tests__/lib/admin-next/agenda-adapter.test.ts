import {
  createAgendaAdapter,
  type AdminNextAgendaReadonlySupabaseClient,
} from '@/lib/admin-next/agenda-adapter';

describe('admin-next agenda adapter', () => {
  it('feeds Agenda from fixture source by default', async () => {
    const adapter = createAgendaAdapter();

    await expect(adapter.getAgenda()).resolves.toMatchObject({
      days: expect.arrayContaining([
        expect.objectContaining({ id: 'jun-12' }),
      ]),
      signals: expect.any(Array),
    });
  });

  it('maps readonly itinerary_items into grouped agenda days', async () => {
    const supabase = createReadonlySupabaseMock({
      itinerary_items: {
        data: [
          {
            id: 'item-1',
            id_itinerary: 'it-1',
            product_type: 'Hotel',
            product_name: 'Hotel Las Islas',
            rate_name: 'Premium',
            date: '2026-06-18',
            total_price: 1450000,
            paid_cost: 500000,
            pending_paid_cost: 250000,
            reservation_status: false,
            provider_contact_id: 'provider-1',
            canonical_provider_contact_id: null,
            itineraries: {
              id: 'it-1',
              id_fm: '2647',
              name: 'San Andres familiar',
              id_contact: 'client-1',
            },
          },
          {
            id: 'item-2',
            id_itinerary: 'it-1',
            product_type: 'Actividad',
            product_name: 'Tour Johnny Cay',
            rate_name: null,
            date: '2026-06-18',
            total_price: 180000,
            paid_cost: 180000,
            pending_paid_cost: 0,
            reservation_status: true,
            provider_contact_id: 'provider-2',
            canonical_provider_contact_id: null,
            itineraries: {
              id: 'it-1',
              id_fm: '2647',
              name: 'San Andres familiar',
              id_contact: 'client-1',
            },
          },
        ],
        error: null,
      },
      contacts: {
        data: [
          {
            id: 'provider-1',
            name: 'Hotel',
            last_name: 'Proveedor',
            email: 'hotel@example.test',
          },
          {
            id: 'provider-2',
            name: 'Tour',
            last_name: 'Operador',
            email: 'tour@example.test',
          },
          {
            id: 'client-1',
            name: 'Laura',
            last_name: 'Martinez',
            email: 'laura@example.test',
          },
        ],
        error: null,
      },
    });
    const adapter = createAgendaAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const fixture = await adapter.getAgenda();

    expect(supabase.calls).toEqual([
      expect.objectContaining({
        table: 'itinerary_items',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['itineraries.account_id', 'acct-1'],
          ['date:not:is', null],
        ]),
        limit: 80,
      }),
      expect.objectContaining({
        table: 'contacts',
        filters: expect.arrayContaining([
          ['account_id', 'acct-1'],
          ['id:in', ['provider-1', 'client-1', 'provider-2']],
        ]),
        limit: 3,
      }),
    ]);
    expect(fixture.days).toEqual([
      expect.objectContaining({
        id: '2026-06-18',
        meta: '2 servicios · $1.630.000',
        services: [
          expect.objectContaining({
            id: 'item-1',
            type: 'hotel',
            title: 'Hotel Las Islas',
            supplier: 'Hotel Proveedor',
            customer: 'Laura Martinez',
            itineraryId: 'it-1',
            supplierPayment: 'Proveedor pendiente',
            notification: 'Sin notificar',
            amount: '$1.450.000',
          }),
          expect.objectContaining({
            id: 'item-2',
            type: 'activity',
            supplier: 'Tour Operador',
            supplierPayment: 'Proveedor pagado',
            notification: 'Notificado',
            amount: '$180.000',
          }),
        ],
      }),
    ]);
    expect(fixture.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'notify-pending', label: '1 sin notificar' }),
        expect.objectContaining({ id: 'supplier-pending', label: '1 proveedores pendientes' }),
      ]),
    );
  });

  it('throws when readonly agenda reads return an error', async () => {
    const adapter = createAgendaAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        itinerary_items: {
          data: null,
          error: { message: 'permission denied' },
        },
        contacts: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    await expect(adapter.getAgenda()).rejects.toThrow(
      'Agenda readonly adapter failed: permission denied',
    );
  });
});

function createReadonlySupabaseMock(rows: {
  itinerary_items: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  contacts: {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
}): AdminNextAgendaReadonlySupabaseClient & {
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
    from(table: 'itinerary_items' | 'contacts') {
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
            in(column: string, values: readonly unknown[]) {
              call.filters.push([`${column}:in`, values]);
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
            lte(column: string, value: unknown) {
              call.filters.push([`${column}:lte`, value]);
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
  } as unknown as AdminNextAgendaReadonlySupabaseClient & {
    calls: Array<{
      table: string;
      columns: string;
      filters: Array<[string, unknown]>;
      orders: Array<[string, { ascending?: boolean } | undefined]>;
      limit: number | null;
    }>;
  };
}
