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
const DEFAULT_CURRENCY = 'USD';
const TARGET_MARGIN_PERCENT = 18;

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
  total_amount: NumericValue;
  total_cost: NumericValue;
  total_markup: NumericValue;
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
  start_time: string | null;
  end_time: string | null;
  date: string | null;
  day_number: string | null;
  order: string | null;
  destination: string | null;
  product_name: string | null;
  rate_name: string | null;
  product_type: string | null;
  unit_cost: NumericValue;
  unit_price: NumericValue;
  quantity: NumericValue;
  total_price: NumericValue;
  total_cost: NumericValue;
  profit_percentage: NumericValue;
  profit: NumericValue;
  id_product: string | null;
  flight_departure: string | null;
  flight_arrival: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  flight_number: string | null;
  airline: string | null;
  reservation_status: boolean | null;
}

type NumericValue = number | string | null | undefined;

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
    try {
      const itineraries = await readLatestItineraries(
        this.supabase,
        this.accountId,
      );

      if (itineraries.length === 0) return null;

      const items = await readItineraryItems(
        this.supabase,
        itineraries.map((itinerary) => itinerary.id),
      );

      return buildReadonlyPlannerSnapshot(this.accountId, itineraries, items);
    } catch {
      return null;
    }
  }
}

async function readLatestItineraries(
  supabase: AdminNextReadonlySupabaseClient,
  accountId: string,
): Promise<ReadonlyItineraryRow[]> {
  try {
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
  } catch {
    return [];
  }
}

async function readItineraryItems(
  supabase: AdminNextReadonlySupabaseClient,
  itineraryIds: readonly string[],
): Promise<ReadonlyItineraryItemRow[]> {
  if (itineraryIds.length === 0) return [];

  try {
    const response = await supabase
      .from('itinerary_items')
      .select<ReadonlyItineraryItemRow[]>(
        [
          'id',
          'id_itinerary',
          'start_time',
          'end_time',
          'date',
          'day_number',
          'order',
          'destination',
          'product_name',
          'rate_name',
          'product_type',
          'unit_cost',
          'unit_price',
          'quantity',
          'total_price',
          'total_cost',
          'profit_percentage',
          'profit',
          'id_product',
          'flight_departure',
          'flight_arrival',
          'departure_time',
          'arrival_time',
          'flight_number',
          'airline',
          'reservation_status',
        ].join(', '),
      )
      .in('id_itinerary', itineraryIds)
      .order('date', { ascending: true })
      .limit(24);

    if (response.error) return [];
    return response.data ?? [];
  } catch {
    return [];
  }
}

function buildReadonlyPlannerSnapshot(
  accountId: string,
  itineraries: readonly ReadonlyItineraryRow[],
  items: readonly ReadonlyItineraryItemRow[],
): {
  workbench: PlannerWorkbenchFixture;
  ontology: TravelOntologySnapshot;
} {
  const itemsByItineraryId = groupItemsByItineraryId(items);
  const opportunities = itineraries.map((itinerary) =>
    itineraryToOpportunity(itinerary, itemsByItineraryId.get(itinerary.id) ?? []),
  );
  const opportunity = opportunities[0]!;
  const selectedItinerary = itineraries[0]!;
  const selectedItems = itemsByItineraryId.get(selectedItinerary.id) ?? [];
  const selectedCurrency = normalizeCurrency(selectedItinerary.currency_type);
  const itinerarySegments = selectedItems
    .slice(0, 6)
    .map((item) => itineraryItemToSegment(item, selectedCurrency));
  const missingData = buildMissingDataForItinerary(
    selectedItinerary,
    selectedItems,
  );

  const workbench = PlannerWorkbenchFixtureSchema.parse({
    ...plannerWorkbenchFixture,
    opportunity,
    opportunities,
    itinerarySegments,
    missingData,
    blockedStates: [
      {
        ...plannerWorkbenchFixture.blockedStates[0]!,
        state:
          missingData.length > 0 ? 'blocked_missing_data' : 'blocked_policy',
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
        riskFlags: buildReadonlyRiskFlags(missingData),
        missingData,
        traceId: 'trace-readonly-admin-001',
        agentRunId: 'run-readonly-admin-001',
      },
    ],
    traceSummary: {
      ...plannerWorkbenchFixture.traceSummary,
      traceId: 'trace-readonly-admin-001',
      agentRunId: 'run-readonly-admin-001',
      dataUsed: [
        'itineraries',
        'itinerary_items',
        'contacts relation',
        'itinerary financial totals',
      ],
      sourceFreshness: 'Readonly server query during request',
      confidence: missingData.length > 0 ? 0.64 : 0.72,
      permissionResult: 'requires_approval',
      policyResult: missingData.length > 0 ? 'warning' : 'passed',
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
    itineraries,
    opportunities,
    items,
    missingData,
  );

  return { workbench, ontology };
}

function itineraryToOpportunity(
  row: ReadonlyItineraryRow,
  items: readonly ReadonlyItineraryItemRow[],
): PlannerOpportunity {
  const contact = row.contacts;
  const leadName =
    [contact?.name, contact?.last_name].filter(Boolean).join(' ').trim() ||
    row.name ||
    'Readonly itinerary';
  const currency = normalizeCurrency(row.currency_type);
  const amount = readNumber(row.total_amount);
  const margin = calculateItineraryMarginPercent(row);
  const paxCount = Math.max(row.passenger_count ?? 1, 1);
  const missingData = buildMissingDataForItinerary(row, items);

  return {
    id: row.id,
    leadName,
    destination: row.name || 'Travel itinerary',
    sourceChannel: 'Bukeer admin readonly',
    tripDates: formatTripDates(row.start_date, row.end_date),
    durationLabel: formatDurationLabel(row.start_date, row.end_date),
    valueLabel:
      amount != null ? formatMoney(amount, currency) : `${currency} total pending`,
    slaLabel: row.status ?? 'readonly',
    uiState: 'trace_available',
    actionState: 'observed',
    missingDataCount: missingData.length,
    marginLabel: formatMarginLabel(margin),
    traveler: {
      name: leadName,
      email: nonEmptyString(contact?.email) ?? undefined,
      phone: nonEmptyString(contact?.phone) ?? undefined,
      pax: {
        adults: paxCount,
        children: 0,
      },
    },
  };
}

function itineraryItemToSegment(
  item: ReadonlyItineraryItemRow,
  currency: string,
): ItinerarySegment {
  const price = calculateItemTotalPrice(item);
  const margin = calculateItemMarginPercent(item);
  return {
    id: item.id,
    dayLabel: formatServiceDateLabel(item),
    title: formatItemTitle(item),
    supplier: formatSupplierLabel(item),
    status: 'observed',
    priceLabel:
      price != null ? formatMoney(price, currency) : `${currency} price pending`,
    marginLabel: formatMarginLabel(margin),
    traceId: `trace-readonly-${item.id}`,
  };
}

function buildMissingDataForItinerary(
  itinerary: ReadonlyItineraryRow,
  items: readonly ReadonlyItineraryItemRow[],
): string[] {
  const missing = new Set<string>();
  const contact = itinerary.contacts;

  if (!nonEmptyString(contact?.email)) missing.add('Traveler email');
  if (!nonEmptyString(contact?.phone)) missing.add('Traveler phone');
  if (!itinerary.start_date || !itinerary.end_date) {
    missing.add('Itinerary dates');
  }
  if (items.length === 0) missing.add('Itinerary items');

  const margin = calculateItineraryMarginPercent(itinerary);
  if (margin == null) {
    missing.add('Margin unknown');
  } else if (margin < TARGET_MARGIN_PERCENT) {
    missing.add('Margin below target');
  }

  return [...missing];
}

function buildTravelOntologySnapshotFromReadonlyRows(
  accountId: string,
  itineraries: readonly ReadonlyItineraryRow[],
  opportunities: readonly PlannerOpportunity[],
  items: readonly ReadonlyItineraryItemRow[],
  missingData: readonly string[],
): TravelOntologySnapshot {
  const opportunityById = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );
  const itineraryById = new Map(
    itineraries.map((itinerary) => [itinerary.id, itinerary]),
  );

  return TravelOntologySnapshotSchema.parse({
    version: 'travel_ontology_v1',
    sourceMode: 'readonly',
    generatedAt: GENERATED_AT,
    accountId,
    opportunities: opportunities.map((opportunity) => {
      const itinerary = itineraryById.get(opportunity.id);
      const budget = readNumber(itinerary?.total_amount);

      return {
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
        tripWindow:
          itinerary?.start_date && itinerary.end_date
            ? {
                startDate: itinerary.start_date,
                endDate: itinerary.end_date,
              }
            : undefined,
        pax: opportunity.traveler.pax,
        budget:
          budget != null
            ? {
                amount: Math.max(budget, 0),
                currency: normalizeCurrency(itinerary?.currency_type),
              }
            : undefined,
        sourceChannel: opportunity.sourceChannel,
        readonlyReason:
          'Readonly adapter maps live admin records for inspection only; writes remain disabled.',
      };
    }),
    itinerarySegments: items
      .map((item) => {
        const opportunity = item.id_itinerary
          ? opportunityById.get(item.id_itinerary)
          : undefined;
        const itinerary = item.id_itinerary
          ? itineraryById.get(item.id_itinerary)
          : undefined;

        if (!opportunity) return null;

        const price = calculateItemTotalPrice(item);
        const supplier = formatSupplierLabel(item);
        const productId = nonEmptyString(item.id_product);
        const productLabel = formatItemTitle(item);

        return {
          ref: {
            kind: 'itinerary_segment',
            id: item.id,
            label: productLabel,
          },
          opportunity: {
            kind: 'opportunity',
            id: opportunity.id,
            label: opportunity.leadName,
          },
          supplier: {
            kind: 'supplier',
            id: slugForEntity(supplier, `supplier-${item.id}`),
            label: supplier,
          },
          product: productId
            ? {
                kind: 'product',
                id: productId,
                label: productLabel,
              }
            : undefined,
          serviceDate: nonEmptyString(item.date) ?? undefined,
          status: 'observed',
          price:
            price != null
              ? {
                  amount: Math.max(price, 0),
                  currency: normalizeCurrency(itinerary?.currency_type),
                }
              : undefined,
          trace: {
            kind: 'trace',
            id: `trace-readonly-${item.id}`,
          },
        };
      })
      .filter(Boolean),
    missingData: [...missingData],
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

function groupItemsByItineraryId(
  items: readonly ReadonlyItineraryItemRow[],
): Map<string, ReadonlyItineraryItemRow[]> {
  const grouped = new Map<string, ReadonlyItineraryItemRow[]>();

  for (const item of items) {
    const itineraryId = nonEmptyString(item.id_itinerary);
    if (!itineraryId) continue;

    const current = grouped.get(itineraryId) ?? [];
    current.push(item);
    grouped.set(itineraryId, current);
  }

  return grouped;
}

function buildReadonlyRiskFlags(missingData: readonly string[]): string[] {
  const flags = new Set<string>(['Readonly write guard']);

  if (missingData.length > 0) {
    flags.add('Missing planner-critical data');
  }
  if (
    missingData.includes('Margin below target') ||
    missingData.includes('Margin unknown')
  ) {
    flags.add('Margin guard');
  }

  return [...flags];
}

function calculateItineraryMarginPercent(
  itinerary: ReadonlyItineraryRow,
): number | null {
  const amount = readNumber(itinerary.total_amount);
  if (amount == null || amount <= 0) return null;

  const markup = readNumber(itinerary.total_markup);
  if (markup != null) return (markup / amount) * 100;

  const cost = readNumber(itinerary.total_cost);
  if (cost != null) return ((amount - cost) / amount) * 100;

  return null;
}

function calculateItemTotalPrice(item: ReadonlyItineraryItemRow): number | null {
  const totalPrice = readNumber(item.total_price);
  if (totalPrice != null) return totalPrice;

  const unitPrice = readNumber(item.unit_price);
  const quantity = readNumber(item.quantity);
  if (unitPrice != null && quantity != null && quantity > 0) {
    return unitPrice * quantity;
  }

  return null;
}

function calculateItemTotalCost(item: ReadonlyItineraryItemRow): number | null {
  const totalCost = readNumber(item.total_cost);
  if (totalCost != null) return totalCost;

  const unitCost = readNumber(item.unit_cost);
  const quantity = readNumber(item.quantity);
  if (unitCost != null && quantity != null && quantity > 0) {
    return unitCost * quantity;
  }

  return null;
}

function calculateItemMarginPercent(item: ReadonlyItineraryItemRow): number | null {
  const explicitMargin = readNumber(item.profit_percentage);
  if (explicitMargin != null) return explicitMargin;

  const price = calculateItemTotalPrice(item);
  if (price == null || price <= 0) return null;

  const profit = readNumber(item.profit);
  if (profit != null) return (profit / price) * 100;

  const cost = calculateItemTotalCost(item);
  if (cost != null) return ((price - cost) / price) * 100;

  return null;
}

function formatMarginLabel(margin: number | null): string {
  return margin == null ? 'Margin unknown' : `${margin.toFixed(1)}%`;
}

function formatServiceDateLabel(item: ReadonlyItineraryItemRow): string {
  const date = nonEmptyString(item.date);
  const startTime =
    nonEmptyString(item.start_time) ?? nonEmptyString(item.departure_time);
  const dayNumber = nonEmptyString(item.day_number);

  if (date && startTime) return `${date} ${startTime}`;
  if (date) return date;
  if (dayNumber) return `Day ${dayNumber}`;

  return 'Date pending';
}

function formatItemTitle(item: ReadonlyItineraryItemRow): string {
  const title =
    nonEmptyString(item.product_name) ??
    nonEmptyString(item.rate_name) ??
    nonEmptyString(item.destination);
  const flightNumber = nonEmptyString(item.flight_number);

  if (title && flightNumber) return `${title} ${flightNumber}`;
  return title ?? 'Itinerary item';
}

function formatSupplierLabel(item: ReadonlyItineraryItemRow): string {
  return (
    nonEmptyString(item.airline) ??
    nonEmptyString(item.product_type) ??
    nonEmptyString(item.flight_departure) ??
    'Supplier pending'
  );
}

function normalizeCurrency(currency: string | null | undefined): string {
  const normalized = nonEmptyString(currency)?.toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : DEFAULT_CURRENCY;
}

function readNumber(value: NumericValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replaceAll(',', '');
    if (normalized.length === 0) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function nonEmptyString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugForEntity(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}
