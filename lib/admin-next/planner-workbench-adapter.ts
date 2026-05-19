import {
  PlannerWorkbenchFixtureSchema,
  TravelOntologySnapshotSchema,
  type AdminDataSourceMode,
  type ItinerarySegment,
  type PlannerOpportunity,
  type PlannerWorkbenchFixture,
  type TravelOntologySnapshot,
} from '@bukeer/admin-contract';
import { plannerWorkbenchFixture } from '@/lib/admin-next/fixtures/planner-workbench';

type SupabaseReadResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseReadResponse<T>>;

interface SupabaseReadFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseReadFilter<T>;
  in(column: string, values: readonly unknown[]): SupabaseReadFilter<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseReadFilter<T>;
  limit(count: number): SupabaseReadFilter<T>;
}

interface SupabaseReadBuilder {
  select<T = unknown>(columns: string): SupabaseReadFilter<T>;
}

export interface AdminNextReadonlySupabaseClient {
  from(table: string): SupabaseReadBuilder;
}

export interface PlannerWorkbenchAdapter {
  readonly mode: AdminDataSourceMode;
  getWorkbench(): Promise<PlannerWorkbenchFixture>;
  getTravelOntologySnapshot(): Promise<TravelOntologySnapshot>;
}

export interface PlannerWorkbenchAdapterOptions {
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextReadonlySupabaseClient;
  readonly accountId?: string;
}

const GENERATED_AT = '2026-05-18T00:00:00.000Z';

export function createPlannerWorkbenchAdapter(
  options: AdminDataSourceMode | PlannerWorkbenchAdapterOptions = 'fixture',
): PlannerWorkbenchAdapter {
  const normalized = typeof options === 'string' ? { mode: options } : options;
  const mode = normalized.mode ?? 'fixture';

  if (mode === 'readonly' && normalized.supabase && normalized.accountId) {
    return new ReadonlyPlannerWorkbenchAdapter(
      normalized.supabase,
      normalized.accountId,
    );
  }

  return new FixturePlannerWorkbenchAdapter(mode);
}

class FixturePlannerWorkbenchAdapter implements PlannerWorkbenchAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getWorkbench(): Promise<PlannerWorkbenchFixture> {
    return plannerWorkbenchFixture;
  }

  async getTravelOntologySnapshot(): Promise<TravelOntologySnapshot> {
    return buildFixtureTravelOntologySnapshot(this.mode);
  }
}

interface ReadonlyItineraryRow {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  id_contact: string | null;
  passenger_count: number | null;
  currency_type: string | null;
  total_amount: number | null;
  total_cost: number | null;
  total_markup: number | null;
  account_id: string | null;
  updated_at: string | null;
  created_at: string | null;
  contacts?: {
    id?: string | null;
    name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface ReadonlyItineraryItemRow {
  id: string;
  id_itinerary: string | null;
  date: string | null;
  day_number: string | null;
  destination: string | null;
  product_name: string | null;
  product_type: string | null;
  total_price: number | null;
  total_cost: number | null;
  profit_percentage: number | null;
  profit: string | null;
  id_product: string | null;
}

class ReadonlyPlannerWorkbenchAdapter implements PlannerWorkbenchAdapter {
  readonly mode = 'readonly' as const;

  constructor(
    private readonly supabase: AdminNextReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getWorkbench(): Promise<PlannerWorkbenchFixture> {
    const snapshot = await this.getReadonlySnapshot();

    if (!snapshot) {
      return annotateFixtureForReadonlyFallback(
        'No readable itinerary rows were available for this account.',
      );
    }

    return snapshot.workbench;
  }

  async getTravelOntologySnapshot(): Promise<TravelOntologySnapshot> {
    const snapshot = await this.getReadonlySnapshot();

    if (!snapshot) {
      return buildFixtureTravelOntologySnapshot('readonly');
    }

    return snapshot.ontology;
  }

  private async getReadonlySnapshot(): Promise<{
    workbench: PlannerWorkbenchFixture;
    ontology: TravelOntologySnapshot;
  } | null> {
    const itineraries = await readLatestItineraries(this.supabase, this.accountId);

    if (itineraries.length === 0) return null;

    const items = await readItineraryItems(
      this.supabase,
      itineraries.map((itinerary) => itinerary.id),
    );

    return buildReadonlyPlannerSnapshot(this.accountId, itineraries, items);
  }
}

async function readLatestItineraries(
  supabase: AdminNextReadonlySupabaseClient,
  accountId: string,
): Promise<ReadonlyItineraryRow[]> {
  const response = await supabase
    .from('itineraries')
    .select<ReadonlyItineraryRow[]>(
      [
        'id',
        'name',
        'start_date',
        'end_date',
        'status',
        'id_contact',
        'passenger_count',
        'currency_type',
        'total_amount',
        'total_cost',
        'total_markup',
        'account_id',
        'updated_at',
        'created_at',
        'contacts!itineraries_id_contact_fkey(id, name, last_name, email, phone)',
      ].join(', '),
    )
    .eq('account_id', accountId)
    .order('updated_at', { ascending: false })
    .limit(3);

  if (response.error) return [];
  return response.data ?? [];
}

async function readItineraryItems(
  supabase: AdminNextReadonlySupabaseClient,
  itineraryIds: readonly string[],
): Promise<ReadonlyItineraryItemRow[]> {
  if (itineraryIds.length === 0) return [];

  const response = await supabase
    .from('itinerary_items')
    .select<ReadonlyItineraryItemRow[]>(
      [
        'id',
        'id_itinerary',
        'date',
        'day_number',
        'destination',
        'product_name',
        'product_type',
        'total_price',
        'total_cost',
        'profit_percentage',
        'profit',
        'id_product',
      ].join(', '),
    )
    .in('id_itinerary', itineraryIds)
    .order('date', { ascending: true })
    .limit(24);

  if (response.error) return [];
  return response.data ?? [];
}

function buildReadonlyPlannerSnapshot(
  accountId: string,
  itineraries: readonly ReadonlyItineraryRow[],
  items: readonly ReadonlyItineraryItemRow[],
): {
  workbench: PlannerWorkbenchFixture;
  ontology: TravelOntologySnapshot;
} {
  const opportunity = itineraryToOpportunity(itineraries[0]!);
  const opportunities = itineraries.map(itineraryToOpportunity);
  const selectedItems = items.filter(
    (item) => item.id_itinerary === itineraries[0]?.id,
  );
  const itinerarySegments =
    selectedItems.length > 0
      ? selectedItems.slice(0, 6).map(itineraryItemToSegment)
      : plannerWorkbenchFixture.itinerarySegments.map((segment) => ({
          ...segment,
          traceId: `trace-readonly-${segment.id}`,
        }));
  const missingData = buildMissingData(opportunity, itinerarySegments);

  const workbench = PlannerWorkbenchFixtureSchema.parse({
    ...plannerWorkbenchFixture,
    opportunity,
    opportunities,
    itinerarySegments,
    missingData,
    blockedStates: [
      {
        ...plannerWorkbenchFixture.blockedStates[0]!,
        reason:
          missingData.length > 0
            ? 'Readonly admin data is available, but planner-critical fields remain incomplete before any customer-facing action.'
            : 'Readonly mode blocks public send and supplier operations until the production approval ledger is connected.',
        missingData,
        traceId: 'trace-readonly-admin-001',
      },
    ],
    approvals: [
      {
        ...plannerWorkbenchFixture.approvals[0]!,
        proposedAction: `Review readonly itinerary "${opportunity.leadName}" before enabling agentic execution`,
        missingData,
        traceId: 'trace-readonly-admin-001',
        agentRunId: 'run-readonly-admin-001',
      },
    ],
    traceSummary: {
      ...plannerWorkbenchFixture.traceSummary,
      traceId: 'trace-readonly-admin-001',
      agentRunId: 'run-readonly-admin-001',
      dataUsed: ['itineraries', 'itinerary_items', 'contacts relation'],
      sourceFreshness: 'Readonly server query during request',
      confidence: 0.64,
      permissionResult: 'requires_approval',
      policyResult: 'warning',
      auditLink: '/admin/prototype/planner-workbench#trace-readonly-admin-001',
    },
    traceEvents: [
      {
        id: 'trace-readonly-1',
        type: 'context_packet',
        title: 'Readonly admin data loaded',
        status: 'completed',
        timestamp: 'server',
        summary:
          'Itinerary, traveler and item context were read server-side using the authenticated account scope.',
      },
      {
        id: 'trace-readonly-2',
        type: 'guardrail',
        title: 'Write guard enforced',
        status: 'blocked',
        timestamp: 'server',
        summary:
          'Prototype mode allows inspection only. Public send, supplier holds, payments and writes remain disabled.',
      },
    ],
  });

  const ontology = buildTravelOntologySnapshotFromReadonlyRows(
    accountId,
    opportunity,
    itinerarySegments,
  );

  return { workbench, ontology };
}

function itineraryToOpportunity(row: ReadonlyItineraryRow): PlannerOpportunity {
  const contact = row.contacts;
  const leadName =
    [contact?.name, contact?.last_name].filter(Boolean).join(' ').trim() ||
    row.name ||
    'Readonly itinerary';
  const amount = row.total_amount ?? 0;
  const cost = row.total_cost ?? 0;
  const margin = amount > 0 ? ((amount - cost) / amount) * 100 : 0;
  const paxCount = Math.max(row.passenger_count ?? 1, 1);

  return {
    id: row.id,
    leadName,
    destination: row.name || 'Travel itinerary',
    sourceChannel: 'Bukeer admin readonly',
    tripDates: formatTripDates(row.start_date, row.end_date),
    durationLabel: formatDurationLabel(row.start_date, row.end_date),
    valueLabel: formatMoney(amount, row.currency_type ?? 'USD'),
    slaLabel: row.status ?? 'readonly',
    uiState: 'trace_available',
    actionState: 'observed',
    missingDataCount: 0,
    marginLabel: `${margin.toFixed(1)}%`,
    traveler: {
      name: leadName,
      email: contact?.email ?? undefined,
      phone: contact?.phone ?? undefined,
      pax: {
        adults: paxCount,
        children: 0,
      },
    },
  };
}

function itineraryItemToSegment(item: ReadonlyItineraryItemRow): ItinerarySegment {
  const price = item.total_price ?? 0;
  const cost = item.total_cost ?? 0;
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return {
    id: item.id,
    dayLabel: item.date || item.day_number || 'Readonly',
    title: item.product_name || item.destination || 'Itinerary item',
    supplier: item.product_type || 'Supplier pending',
    status: 'observed',
    priceLabel: formatMoney(price, 'USD'),
    marginLabel:
      item.profit_percentage != null
        ? `${item.profit_percentage.toFixed(1)}%`
        : `${margin.toFixed(1)}%`,
    traceId: `trace-readonly-${item.id}`,
  };
}

function buildMissingData(
  opportunity: PlannerOpportunity,
  segments: readonly ItinerarySegment[],
): string[] {
  const missing = new Set<string>();

  if (!opportunity.traveler.email) missing.add('Traveler email');
  if (!opportunity.traveler.phone) missing.add('Traveler phone');
  if (segments.length === 0) missing.add('Itinerary items');

  return [...missing];
}

function buildTravelOntologySnapshotFromReadonlyRows(
  accountId: string,
  opportunity: PlannerOpportunity,
  segments: readonly ItinerarySegment[],
): TravelOntologySnapshot {
  return TravelOntologySnapshotSchema.parse({
    version: 'travel_ontology_v1',
    sourceMode: 'readonly',
    generatedAt: GENERATED_AT,
    accountId,
    opportunities: [
      {
        ref: {
          kind: 'opportunity',
          id: opportunity.id,
          label: opportunity.leadName,
        },
        traveler: {
          kind: 'traveler',
          id: `${opportunity.id}:traveler`,
          label: opportunity.traveler.name,
        },
        destination: opportunity.destination,
        pax: opportunity.traveler.pax,
        sourceChannel: opportunity.sourceChannel,
        readonlyReason:
          'Readonly adapter maps live admin records for inspection only; writes remain disabled.',
      },
    ],
    itinerarySegments: segments.map((segment) => ({
      ref: {
        kind: 'itinerary_segment',
        id: segment.id,
        label: segment.title,
      },
      opportunity: {
        kind: 'opportunity',
        id: opportunity.id,
        label: opportunity.leadName,
      },
      supplier: {
        kind: 'supplier',
        id: segment.supplier.toLowerCase().replaceAll(/\s+/g, '-'),
        label: segment.supplier,
      },
      status: segment.status,
      trace: {
        kind: 'trace',
        id: segment.traceId,
      },
    })),
    missingData: buildMissingData(opportunity, segments),
  });
}

function buildFixtureTravelOntologySnapshot(
  sourceMode: AdminDataSourceMode,
): TravelOntologySnapshot {
  const opportunity = plannerWorkbenchFixture.opportunity;

  return TravelOntologySnapshotSchema.parse({
    version: 'travel_ontology_v1',
    sourceMode,
    generatedAt: GENERATED_AT,
    opportunities: [
      {
        ref: {
          kind: 'opportunity',
          id: opportunity.id,
          label: opportunity.leadName,
        },
        traveler: {
          kind: 'traveler',
          id: `${opportunity.id}:traveler`,
          label: opportunity.traveler.name,
        },
        destination: opportunity.destination,
        pax: opportunity.traveler.pax,
        budget: {
          amount: 4800,
          currency: 'USD',
        },
        sourceChannel: opportunity.sourceChannel,
        readonlyReason:
          sourceMode === 'readonly'
            ? 'Sprint 0.25D readonly adapter is not connected to live admin data yet.'
            : undefined,
      },
    ],
    itinerarySegments: plannerWorkbenchFixture.itinerarySegments.map((segment) => ({
      ref: {
        kind: 'itinerary_segment',
        id: segment.id,
        label: segment.title,
      },
      opportunity: {
        kind: 'opportunity',
        id: opportunity.id,
        label: opportunity.leadName,
      },
      supplier: {
        kind: 'supplier',
        id: segment.supplier.toLowerCase().replaceAll(' ', '-'),
        label: segment.supplier,
      },
      status: segment.status,
      trace: {
        kind: 'trace',
        id: segment.traceId,
      },
    })),
    missingData: plannerWorkbenchFixture.missingData,
  });
}

function annotateFixtureForReadonlyFallback(reason: string): PlannerWorkbenchFixture {
  return PlannerWorkbenchFixtureSchema.parse({
    ...plannerWorkbenchFixture,
    traceSummary: {
      ...plannerWorkbenchFixture.traceSummary,
      traceId: 'trace-readonly-fallback',
      agentRunId: 'run-readonly-fallback',
      dataUsed: ['fixture fallback'],
      sourceFreshness: 'Live readonly query returned no usable rows',
      auditLink: '/admin/prototype/planner-workbench#trace-readonly-fallback',
    },
    traceEvents: [
      {
        id: 'trace-readonly-fallback-1',
        type: 'guardrail',
        title: 'Readonly fallback applied',
        status: 'warning',
        timestamp: 'server',
        summary: reason,
      },
      ...plannerWorkbenchFixture.traceEvents,
    ],
  });
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
}

function formatTripDates(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  if (startDate) return startDate;
  if (endDate) return endDate;
  return 'Dates pending';
}

function formatDurationLabel(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return 'Dates pending';

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.max(Math.round(diffMs / 86_400_000) + 1, 1);

  return `${days}D / ${Math.max(days - 1, 0)}N`;
}
