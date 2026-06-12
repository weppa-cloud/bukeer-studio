import {
  createPlannerWorkbenchAdapter,
  type AdminNextReadonlySupabaseClient,
} from './planner-workbench-adapter';

describe('planner workbench adapter', () => {
  it('feeds Planner Workbench from the fixture source by default', async () => {
    const adapter = createPlannerWorkbenchAdapter();

    await expect(adapter.getWorkbench()).resolves.toMatchObject({
      opportunity: {
        id: 'opp-cartagena-family',
      },
    });
    await expect(adapter.getTravelOntologySnapshot()).resolves.toMatchObject({
      version: 'travel_ontology_v1',
      sourceMode: 'fixture',
    });
  });

  it('keeps readonly mode explicit without connecting live data', async () => {
    const adapter = createPlannerWorkbenchAdapter('readonly');
    const snapshot = await adapter.getTravelOntologySnapshot();

    expect(snapshot.sourceMode).toBe('readonly');
    expect(snapshot.opportunities[0]?.readonlyReason).toContain('not connected');
    expect(snapshot.itinerarySegments.length).toBeGreaterThan(0);
  });

  it('maps live readonly Supabase rows into the workbench contract', async () => {
    const supabase = createReadonlySupabaseMock({
      itineraries: {
        data: [
          {
            id: 'itinerary-cartagena-live',
            name: 'Cartagena + Islas del Rosario',
            start_date: '2026-07-12',
            end_date: '2026-07-16',
            status: 'draft',
            id_contact: 'contact-mariana',
            passenger_count: 4,
            currency_type: 'USD',
            total_amount: 4800,
            total_cost: 3900,
            total_markup: 900,
            account_id: 'acct-1',
            updated_at: '2026-05-18T10:00:00.000Z',
            created_at: '2026-05-18T09:00:00.000Z',
            contacts: {
              id: 'contact-mariana',
              name: 'Mariana',
              last_name: 'Rios',
              email: null,
              phone: '+57 300 555 0198',
            },
          },
          {
            id: 'itinerary-medellin-live',
            name: 'Medellin coffee escape',
            start_date: '2026-08-03',
            end_date: '2026-08-07',
            status: 'quote_sent',
            id_contact: 'contact-james',
            passenger_count: 2,
            currency_type: 'COP',
            total_amount: 2300000,
            total_cost: 1900000,
            total_markup: 400000,
            account_id: 'acct-1',
            updated_at: '2026-05-18T09:00:00.000Z',
            created_at: '2026-05-18T08:00:00.000Z',
            contacts: {
              id: 'contact-james',
              name: 'James',
              last_name: 'Carter',
              email: 'james@example.com',
              phone: '+1 555 0100',
            },
          },
        ],
        error: null,
      },
      itinerary_items: {
        data: [
          {
            id: 'item-transfer-live',
            id_itinerary: 'itinerary-cartagena-live',
            start_time: '09:30',
            end_time: null,
            date: '2026-07-12',
            day_number: '1',
            order: '1',
            destination: 'Cartagena',
            product_name: 'Private airport transfer',
            rate_name: 'Airport pickup',
            product_type: 'Ground operator',
            unit_cost: 70,
            unit_price: 85,
            quantity: 1,
            total_price: 85,
            total_cost: 70,
            profit_percentage: 17.6,
            profit: '15',
            id_product: 'product-transfer',
            flight_departure: null,
            flight_arrival: null,
            departure_time: null,
            arrival_time: null,
            flight_number: null,
            airline: null,
            reservation_status: false,
          },
          {
            id: 'item-medellin-hotel',
            id_itinerary: 'itinerary-medellin-live',
            start_time: null,
            end_time: null,
            date: '2026-08-03',
            day_number: '1',
            order: '1',
            destination: 'Medellin',
            product_name: 'Coffee region boutique hotel',
            rate_name: 'Double room',
            product_type: 'Hotel',
            unit_cost: 950000,
            unit_price: 1150000,
            quantity: 1,
            total_price: 1150000,
            total_cost: 950000,
            profit_percentage: 17.4,
            profit: '200000',
            id_product: 'product-medellin-hotel',
            flight_departure: null,
            flight_arrival: null,
            departure_time: null,
            arrival_time: null,
            flight_number: null,
            airline: null,
            reservation_status: false,
          },
        ],
        error: null,
      },
    });
    const adapter = createPlannerWorkbenchAdapter({
      mode: 'readonly',
      supabase,
      accountId: 'acct-1',
    });

    const workbench = await adapter.getWorkbench();
    const ontology = await adapter.getTravelOntologySnapshot();

    expect(Object.keys(supabase)).toEqual(['from']);
    expect('insert' in supabase).toBe(false);
    expect('update' in supabase).toBe(false);
    expect(workbench.opportunity).toMatchObject({
      id: 'itinerary-cartagena-live',
      leadName: 'Mariana Rios',
      uiState: 'trace_available',
      actionState: 'observed',
      traveler: {
        name: 'Mariana Rios',
        phone: '+57 300 555 0198',
      },
    });
    expect(workbench.opportunities.map((opportunity) => opportunity.id)).toEqual([
      'itinerary-cartagena-live',
      'itinerary-medellin-live',
    ]);
    expect(workbench.itinerarySegments).toHaveLength(1);
    expect(workbench.itinerarySegments[0]).toEqual(
      expect.objectContaining({
        id: 'item-transfer-live',
        dayLabel: '2026-07-12 09:30',
        title: 'Private airport transfer',
        supplier: 'Ground operator',
        priceLabel: 'USD 85',
        marginLabel: '17.6%',
        traceId: 'trace-readonly-item-transfer-live',
      }),
    );
    expect(workbench.itinerarySegments.map((segment) => segment.id)).not.toContain(
      'item-medellin-hotel',
    );
    expect(workbench.missingData).toEqual(['Traveler email']);
    expect(workbench.traceSummary).toMatchObject({
      traceId: 'trace-readonly-admin-001',
      permissionResult: 'requires_approval',
      policyResult: 'warning',
    });
    expect(ontology).toMatchObject({
      accountId: 'acct-1',
      sourceMode: 'readonly',
    });
    expect(ontology.opportunities.map((opportunity) => opportunity.ref.id)).toEqual([
      'itinerary-cartagena-live',
      'itinerary-medellin-live',
    ]);
    expect(ontology.itinerarySegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: expect.objectContaining({
            id: 'item-transfer-live',
            label: 'Private airport transfer',
          }),
          serviceDate: '2026-07-12',
          price: {
            amount: 85,
            currency: 'USD',
          },
          product: {
            kind: 'product',
            id: 'product-transfer',
            label: 'Private airport transfer',
          },
        }),
      ]),
    );
    expect(ontology.opportunities[0]?.readonlyReason).toContain(
      'writes remain disabled',
    );
  });

  it('surfaces traveler, date, item and unknown-margin missing data from readonly rows', async () => {
    const adapter = createPlannerWorkbenchAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        itineraries: {
          data: [
            {
              id: 'itinerary-incomplete-live',
              name: 'Incomplete itinerary',
              start_date: null,
              end_date: null,
              status: null,
              id_contact: 'contact-incomplete',
              passenger_count: null,
              currency_type: 'USD',
              total_amount: null,
              total_cost: null,
              total_markup: null,
              account_id: 'acct-1',
              updated_at: '2026-05-18T10:00:00.000Z',
              created_at: '2026-05-18T09:00:00.000Z',
              contacts: {
                id: 'contact-incomplete',
                name: 'Ava',
                last_name: null,
                email: '',
                phone: null,
              },
            },
          ],
          error: null,
        },
        itinerary_items: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    const workbench = await adapter.getWorkbench();

    expect(workbench.itinerarySegments).toEqual([]);
    expect(workbench.missingData).toEqual([
      'Traveler email',
      'Traveler phone',
      'Itinerary dates',
      'Itinerary items',
      'Margin unknown',
    ]);
    expect(workbench.opportunity).toMatchObject({
      id: 'itinerary-incomplete-live',
      tripDates: 'Dates pending',
      durationLabel: 'Dates pending',
      valueLabel: 'USD total pending',
      marginLabel: 'Margin unknown',
      missingDataCount: 5,
    });
  });

  it('surfaces low-margin guard data from readonly itinerary totals', async () => {
    const adapter = createPlannerWorkbenchAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        itineraries: {
          data: [
            {
              id: 'itinerary-low-margin-live',
              name: 'Low margin itinerary',
              start_date: '2026-09-10',
              end_date: '2026-09-12',
              status: 'draft',
              id_contact: 'contact-low-margin',
              passenger_count: 2,
              currency_type: 'USD',
              total_amount: 1000,
              total_cost: 900,
              total_markup: 100,
              account_id: 'acct-1',
              updated_at: '2026-05-18T10:00:00.000Z',
              created_at: '2026-05-18T09:00:00.000Z',
              contacts: {
                id: 'contact-low-margin',
                name: 'Sam',
                last_name: 'Lee',
                email: 'sam@example.com',
                phone: '+1 555 0199',
              },
            },
          ],
          error: null,
        },
        itinerary_items: {
          data: [
            {
              id: 'item-low-margin-live',
              id_itinerary: 'itinerary-low-margin-live',
              start_time: null,
              end_time: null,
              date: '2026-09-10',
              day_number: '1',
              order: '1',
              destination: 'Bogota',
              product_name: 'City tour',
              rate_name: null,
              product_type: 'Activity',
              unit_cost: 900,
              unit_price: 1000,
              quantity: 1,
              total_price: 1000,
              total_cost: 900,
              profit_percentage: null,
              profit: '100',
              id_product: 'product-city-tour',
              flight_departure: null,
              flight_arrival: null,
              departure_time: null,
              arrival_time: null,
              flight_number: null,
              airline: null,
              reservation_status: false,
            },
          ],
          error: null,
        },
      }),
      accountId: 'acct-1',
    });

    const workbench = await adapter.getWorkbench();

    expect(workbench.missingData).toEqual(['Margin below target']);
    expect(workbench.opportunity.marginLabel).toBe('10.0%');
    expect(workbench.approvals[0]?.riskFlags).toEqual(
      expect.arrayContaining(['Readonly write guard', 'Margin guard']),
    );
  });

  it.each<[string, AdminNextReadonlySupabaseClient]>([
    [
      'empty rows',
      createReadonlySupabaseMock({
        itineraries: { data: [], error: null },
      }),
    ],
    [
      'query errors',
      createReadonlySupabaseMock({
        itineraries: { data: null, error: { message: 'read failed' } },
      }),
    ],
    ['thrown read errors', createThrowingReadonlySupabaseMock()],
  ])(
    'falls back safely when readonly queries return %s',
    async (_case, supabase) => {
      const adapter = createPlannerWorkbenchAdapter({
        mode: 'readonly',
        supabase,
        accountId: 'acct-1',
      });

      const workbench = await adapter.getWorkbench();

      expect(workbench.traceSummary).toMatchObject({
        traceId: 'trace-readonly-fallback',
        sourceFreshness: 'Live readonly query returned no usable rows',
      });
      expect(workbench.traceEvents[0]?.title).toBe('Readonly fallback applied');
    },
  );
});

type MockReadResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

class MockSupabaseReadFilter<T>
  implements PromiseLike<MockReadResponse<T>>
{
  constructor(private readonly response: MockReadResponse<T>) {}

  eq() {
    return this;
  }

  in() {
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  then<TResult1 = MockReadResponse<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: MockReadResponse<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

function createReadonlySupabaseMock(
  responses: Record<string, MockReadResponse<unknown[]>>,
): AdminNextReadonlySupabaseClient {
  return {
    from(table: string) {
      return {
        select<T>() {
          return new MockSupabaseReadFilter(
            (responses[table] ?? { data: [], error: null }) as MockReadResponse<T>,
          );
        },
      };
    },
  };
}

function createThrowingReadonlySupabaseMock(): AdminNextReadonlySupabaseClient {
  return {
    from() {
      throw new Error('readonly read failed');
    },
  };
}
