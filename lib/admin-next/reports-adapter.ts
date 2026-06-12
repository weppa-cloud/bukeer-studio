import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  reportsFixture,
  type ReportChartPoint,
  type ReportDefinition,
  type ReportInsight,
  type ReportRow,
  type ReportTone,
  type ReportsFixture,
} from "@/lib/admin-next/fixtures/reports";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseReportsFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseReportsFilter<T>;
  is(column: string, value: null): SupabaseReportsFilter<T>;
  not(column: string, operator: string, value: unknown): SupabaseReportsFilter<T>;
  gte(column: string, value: unknown): SupabaseReportsFilter<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseReportsFilter<T>;
  limit(count: number): SupabaseReportsFilter<T>;
}

interface SupabaseReportsBuilder {
  select<T = unknown>(columns: string): SupabaseReportsFilter<T>;
}

export interface AdminNextReportsReadonlySupabaseClient {
  from(
    table: "itineraries" | "itinerary_items" | "transactions",
  ): SupabaseReportsBuilder;
}

export interface ReportsAdapter {
  readonly mode: AdminDataSourceMode;
  getReports(): Promise<ReportsFixture>;
}

export interface ReportsAdapterOptions {
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextReportsReadonlySupabaseClient;
  readonly accountId?: string;
}

type NumericValue = number | string | null | undefined;

type ItineraryReportRow = {
  id: string;
  id_fm: string | null;
  name: string | null;
  agent: string | null;
  status: string | null;
  total_amount: NumericValue;
  total_cost: NumericValue;
  total_markup: NumericValue;
  paid: NumericValue;
  pending_paid: NumericValue;
  created_at: string | null;
  confirmed_at: string | null;
  confirmation_date: string | null;
  valid_until: string | null;
};

type ItineraryItemReportRow = {
  id: string;
  id_itinerary: string | null;
  product_type: string | null;
  product_name: string | null;
  total_price: NumericValue;
  total_cost: NumericValue;
  profit: NumericValue;
  pending_paid_cost: NumericValue;
  reservation_status: boolean | string | null;
  date: string | null;
};

type TransactionReportRow = {
  id: number;
  id_itinerary: string | null;
  type: string | null;
  value: NumericValue;
  total_paid: NumericValue;
  fee_amount: NumericValue;
  payment_method: string | null;
  date: string | null;
  created_at: string | null;
};

const ITINERARY_COLUMNS =
  "id,id_fm,name,agent,status,total_amount,total_cost,total_markup,paid,pending_paid,created_at,confirmed_at,confirmation_date,valid_until";
const ITINERARY_ITEM_COLUMNS =
  "id,id_itinerary,product_type,product_name,total_price,total_cost,profit,pending_paid_cost,reservation_status,date";
const TRANSACTION_COLUMNS =
  "id,id_itinerary,type,value,total_paid,fee_amount,payment_method,date,created_at";
const READONLY_REPORT_LIMIT = 250;

export function createReportsAdapter(
  options: AdminDataSourceMode | ReportsAdapterOptions = "fixture",
): ReportsAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlyReportsAdapter(normalized.supabase, normalized.accountId);
  }

  return new FixtureReportsAdapter(mode);
}

class FixtureReportsAdapter implements ReportsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getReports(): Promise<ReportsFixture> {
    return reportsFixture;
  }
}

class ReadonlyReportsAdapter implements ReportsAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextReportsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getReports(): Promise<ReportsFixture> {
    const since = toIsoDate(addDays(new Date(), -90));
    const [itinerariesResult, itemsResult, transactionsResult] =
      await Promise.all([
        this.supabase
          .from("itineraries")
          .select<ItineraryReportRow[]>(ITINERARY_COLUMNS)
          .eq("account_id", this.accountId)
          .is("deleted_at", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(READONLY_REPORT_LIMIT),
        this.supabase
          .from("itinerary_items")
          .select<ItineraryItemReportRow[]>(ITINERARY_ITEM_COLUMNS)
          .eq("account_id", this.accountId)
          .is("deleted_at", null)
          .gte("date", since)
          .order("date", { ascending: false })
          .limit(READONLY_REPORT_LIMIT),
        this.supabase
          .from("transactions")
          .select<TransactionReportRow[]>(TRANSACTION_COLUMNS)
          .eq("account_id", this.accountId)
          .is("deleted_at", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(READONLY_REPORT_LIMIT),
      ]);

    assertReadableResponse("itineraries", itinerariesResult.error);
    assertReadableResponse("itinerary_items", itemsResult.error);
    assertReadableResponse("transactions", transactionsResult.error);

    return buildReadonlyReportsFixture({
      itineraries: itinerariesResult.data ?? [],
      items: itemsResult.data ?? [],
      transactions: transactionsResult.data ?? [],
    });
  }
}

function buildReadonlyReportsFixture({
  itineraries,
  items,
  transactions,
}: {
  itineraries: readonly ItineraryReportRow[];
  items: readonly ItineraryItemReportRow[];
  transactions: readonly TransactionReportRow[];
}): ReportsFixture {
  if (itineraries.length === 0 && items.length === 0 && transactions.length === 0) {
    return reportsFixture;
  }

  const revenue = sum(itineraries.map((row) => moneyValue(row.total_amount)));
  const paid = sum(itineraries.map((row) => moneyValue(row.paid))) +
    sum(transactions.map(transactionAmount));
  const receivables = sum(
    itineraries.map((row) => {
      const explicitPending = moneyValue(row.pending_paid);
      if (explicitPending > 0) return explicitPending;
      const total = moneyValue(row.total_amount);
      const rowPaid = moneyValue(row.paid);
      return Math.max(total - rowPaid, 0);
    }),
  );
  const cost = sum(itineraries.map((row) => moneyValue(row.total_cost)));
  const markup = sum(
    itineraries.map((row) => {
      const explicitMarkup = moneyValue(row.total_markup);
      if (explicitMarkup !== 0) return explicitMarkup;
      return Math.max(moneyValue(row.total_amount) - moneyValue(row.total_cost), 0);
    }),
  );
  const confirmed = itineraries.filter(isConfirmedItinerary).length;
  const conversionPct =
    itineraries.length > 0 ? Math.round((confirmed / itineraries.length) * 100) : 0;
  const marginPct = revenue > 0 ? Math.round((markup / revenue) * 1000) / 10 : 0;
  const supplierPending = items.filter(
    (item) => moneyValue(item.pending_paid_cost) > 0 || !isReserved(item.reservation_status),
  ).length;
  const totalFees = sum(transactions.map((row) => moneyValue(row.fee_amount)));
  const responseWatch = itineraries.filter((row) => !isConfirmedItinerary(row)).length;

  return {
    ...reportsFixture,
    reports: [
      buildReport("sales", "Ventas", "Ingresos reales por itinerarios recientes.", formatMoney(revenue), `${itineraries.length} itinerarios`, "primary"),
      buildReport("profitability", "Rentabilidad", "Margen bruto desde total, costo y markup.", `${formatDecimal(marginPct)}%`, `${formatMoney(markup)} margen`, marginPct >= 20 ? "success" : "warning"),
      buildReport("receivables", "Cuentas por cobrar", "Saldo pendiente por cobrar a clientes.", formatMoney(receivables), `${countPositiveReceivables(itineraries)} pendientes`, receivables > 0 ? "warning" : "success"),
      buildReport("sales-intelligence", "Sales Intelligence", "Conversión de cotizaciones en ventas confirmadas.", `${conversionPct}%`, `${confirmed}/${itineraries.length} confirmados`, conversionPct >= 30 ? "success" : "danger"),
      buildReport("response-time", "Tiempo de respuesta", "Watch operativo basado en itinerarios aún abiertos.", `${responseWatch}`, "requieren seguimiento", responseWatch > 0 ? "live" : "success"),
      buildReport("payments-treasury", "Pagos y tesoreria", "Pagos y fees visibles en transacciones.", formatMoney(paid), `${transactions.length} movimientos`, paid > 0 ? "primary" : "warning"),
      buildReport("operations-suppliers", "Operaciones y proveedores", "Servicios con pago o reserva pendiente.", `${supplierPending}`, `${items.length} servicios leidos`, supplierPending > 0 ? "warning" : "success"),
    ],
    insights: [
      {
        id: "gross-margin",
        label: "Margen bruto",
        value: `${formatDecimal(marginPct)}%`,
        detail: `${formatMoney(markup)} margen sobre ${formatMoney(revenue)} en ventas recientes.`,
        tone: marginPct >= 20 ? "success" : "warning",
      },
      {
        id: "cash-risk",
        label: "Riesgo de caja",
        value: formatMoney(receivables),
        detail: `${countPositiveReceivables(itineraries)} itinerarios conservan saldo pendiente.`,
        tone: receivables > 0 ? "warning" : "success",
      },
      {
        id: "payment-fees",
        label: "Fees registrados",
        value: formatMoney(totalFees),
        detail: "Lectura de fee_amount en transacciones del backend compartido.",
        tone: totalFees > 0 ? "live" : "primary",
      },
    ],
    tableRows: buildReportRows(itineraries),
    chart: buildChart(itineraries),
    aiSignals: [
      {
        id: "readonly-source",
        label: "Backend compartido",
        value: "Readonly",
        detail: "Reportes calculados desde itineraries, itinerary_items y transactions.",
        tone: "primary",
      },
      {
        id: "supplier-watch",
        label: "Proveedores",
        value: `${supplierPending} watches`,
        detail: "Servicios con reserva o pago proveedor pendiente antes de corte.",
        tone: supplierPending > 0 ? "warning" : "success",
      },
      {
        id: "parity-watch",
        label: "RPC Flutter",
        value: "Pendiente",
        detail: "Este slice prueba lectura real; paridad final requiere comparar RPC/reporte Flutter.",
        tone: "danger",
      },
    ],
  };
}

function buildReport(
  id: ReportDefinition["id"],
  label: string,
  description: string,
  value: string,
  delta: string,
  tone: ReportTone,
): ReportDefinition {
  return {
    id,
    label,
    description,
    value,
    delta,
    tone,
    href: `/admin/reports?report=${id}&range=90d`,
  };
}

function buildReportRows(rows: readonly ItineraryReportRow[]): ReportRow[] {
  return rows
    .slice()
    .sort((left, right) => moneyValue(right.total_amount) - moneyValue(left.total_amount))
    .slice(0, 5)
    .map((row) => {
      const total = moneyValue(row.total_amount);
      const pending = moneyValue(row.pending_paid) || Math.max(total - moneyValue(row.paid), 0);
      return {
        id: row.id,
        label: firstNonEmpty(row.name, row.id_fm, row.id),
        owner: firstNonEmpty(row.agent, "Sin asesor"),
        amount: formatMoney(total),
        status: pending > 0 ? `Pendiente ${formatMoney(pending)}` : normalizeStatus(row.status),
        tone: pending > 0 ? "warning" : isConfirmedItinerary(row) ? "success" : "primary",
      };
    });
}

function buildChart(rows: readonly ItineraryReportRow[]): ReportChartPoint[] {
  const buckets = new Map<string, { revenue: number; margin: number }>();

  for (const row of rows) {
    const key = monthKey(row.confirmed_at ?? row.confirmation_date ?? row.created_at);
    if (!key) continue;
    const current = buckets.get(key) ?? { revenue: 0, margin: 0 };
    current.revenue += moneyValue(row.total_amount);
    current.margin += moneyValue(row.total_markup) ||
      Math.max(moneyValue(row.total_amount) - moneyValue(row.total_cost), 0);
    buckets.set(key, current);
  }

  const values = Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6);
  const maxRevenue = Math.max(...values.map(([, value]) => value.revenue), 1);
  const maxMargin = Math.max(...values.map(([, value]) => value.margin), 1);

  if (values.length === 0) return reportsFixture.chart;

  return values.map(([key, value]) => ({
    label: monthLabel(key),
    primaryPct: Math.max(Math.round((value.revenue / maxRevenue) * 100), 8),
    secondaryPct: Math.max(Math.round((value.margin / maxMargin) * 100), 8),
  }));
}

function countPositiveReceivables(rows: readonly ItineraryReportRow[]): number {
  return rows.filter((row) => {
    const total = moneyValue(row.total_amount);
    const pending = moneyValue(row.pending_paid) || Math.max(total - moneyValue(row.paid), 0);
    return pending > 0;
  }).length;
}

function transactionAmount(row: TransactionReportRow): number {
  return moneyValue(row.total_paid) || moneyValue(row.value);
}

function isConfirmedItinerary(row: ItineraryReportRow): boolean {
  const status = row.status?.trim().toLowerCase() ?? "";
  return Boolean(row.confirmed_at || row.confirmation_date) ||
    ["confirmed", "confirmado", "paid", "pagado", "won"].includes(status);
}

function isReserved(value: boolean | string | null): boolean {
  if (typeof value === "boolean") return value;
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "confirmado" || normalized === "confirmed";
}

function normalizeStatus(value: string | null): string {
  return firstNonEmpty(value, "Sin estado");
}

function moneyValue(value: NumericValue): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

function formatDecimal(value: number): string {
  return value.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return "";
}

function monthKey(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 7);
}

function monthLabel(key: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${key}-01T00:00:00Z`))
    .replace(".", "");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function assertReadableResponse(
  source: string,
  error: { message?: string } | null,
): void {
  if (error) {
    throw new Error(
      `Reports readonly adapter failed for ${source}: ${error.message ?? "unknown error"}`,
    );
  }
}
