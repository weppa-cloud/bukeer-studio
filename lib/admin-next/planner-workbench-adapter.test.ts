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
        ],
        error: null,
      },
      itinerary_items: {
        data: [
          {
            id: 'item-transfer-live',
            id_itinerary: 'itinerary-cartagena-live',
            date: '2026-07-12',
            day_number: '1',
            destination: 'Cartagena',
            product_name: 'Private airport transfer',
            product_type: 'Ground operator',
            total_price: 85,
            total_cost: 70,
            profit_percentage: 17.6,
            profit: '15',
            id_product: 'product-transfer',
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
    expect(workbench.itinerarySegments).toEqual([
      expect.objectContaining({
        id: 'item-transfer-live',
        title: 'Private airport transfer',
        supplier: 'Ground operator',
        traceId: 'trace-readonly-item-transfer-live',
      }),
    ]);
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
    expect(ontology.opportunities[0]?.readonlyReason).toContain(
      'writes remain disabled',
    );
  });

  it('falls back safely when readonly queries return no usable rows', async () => {
    const adapter = createPlannerWorkbenchAdapter({
      mode: 'readonly',
      supabase: createReadonlySupabaseMock({
        itineraries: { data: [], error: null },
      }),
      accountId: 'acct-1',
    });

    const workbench = await adapter.getWorkbench();

    expect(workbench.traceSummary).toMatchObject({
      traceId: 'trace-readonly-fallback',
      sourceFreshness: 'Live readonly query returned no usable rows',
    });
    expect(workbench.traceEvents[0]?.title).toBe('Readonly fallback applied');
  });
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
