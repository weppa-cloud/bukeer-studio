import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  agendaFixture,
  type AgendaDay,
  type AgendaFixture,
  type AgendaService,
  type AgendaTone,
} from "@/lib/admin-next/fixtures/agenda";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseAgendaFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseAgendaFilter<T>;
  in(column: string, values: readonly unknown[]): SupabaseAgendaFilter<T>;
  is(column: string, value: null): SupabaseAgendaFilter<T>;
  not(column: string, operator: string, value: unknown): SupabaseAgendaFilter<T>;
  gte(column: string, value: unknown): SupabaseAgendaFilter<T>;
  lte(column: string, value: unknown): SupabaseAgendaFilter<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseAgendaFilter<T>;
  limit(count: number): SupabaseAgendaFilter<T>;
}

interface SupabaseAgendaBuilder {
  select<T = unknown>(columns: string): SupabaseAgendaFilter<T>;
}

export interface AdminNextAgendaReadonlySupabaseClient {
  from(table: "itinerary_items" | "contacts"): SupabaseAgendaBuilder;
}

export interface AgendaAdapter {
  readonly mode: AdminDataSourceMode;
  getAgenda(): Promise<AgendaFixture>;
}

export interface AgendaAdapterOptions {
  readonly accountId?: string;
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextAgendaReadonlySupabaseClient;
}

type ItineraryItemAgendaRow = {
  id: string;
  id_itinerary: string | null;
  product_type: string | null;
  product_name: string | null;
  rate_name: string | null;
  date: string | null;
  total_price: number | null;
  paid_cost: number | null;
  pending_paid_cost: number | null;
  reservation_status: boolean | string | null;
  provider_contact_id: string | null;
  canonical_provider_contact_id: string | null;
  itineraries:
    | {
        id: string;
        id_fm: string | null;
        name: string | null;
        id_contact: string | null;
      }
    | Array<{
        id: string;
        id_fm: string | null;
        name: string | null;
        id_contact: string | null;
      }>
    | null;
};

type ContactRow = {
  id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
};

const AGENDA_ITEM_COLUMNS =
  "id, id_itinerary, product_type, product_name, rate_name, date, total_price, " +
  "paid_cost, pending_paid_cost, reservation_status, provider_contact_id, canonical_provider_contact_id, " +
  "itineraries!inner(id, id_fm, name, id_contact, account_id, deleted_at)";
const CONTACT_COLUMNS = "id, name, last_name, email";
const READONLY_AGENDA_LIMIT = 80;

export function createAgendaAdapter(
  options: AdminDataSourceMode | AgendaAdapterOptions = "fixture",
): AgendaAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlyAgendaAdapter(normalized.supabase, normalized.accountId);
  }

  return new FixtureAgendaAdapter(mode);
}

class FixtureAgendaAdapter implements AgendaAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getAgenda(): Promise<AgendaFixture> {
    return agendaFixture;
  }
}

class ReadonlyAgendaAdapter implements AgendaAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextAgendaReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getAgenda(): Promise<AgendaFixture> {
    const today = new Date();
    const start = toIsoDate(addDays(today, -7));
    const end = toIsoDate(addDays(today, 60));
    const { data, error } = await this.supabase
      .from("itinerary_items")
      .select<ItineraryItemAgendaRow[]>(AGENDA_ITEM_COLUMNS)
      .eq("account_id", this.accountId)
      .is("deleted_at", null)
      .eq("itineraries.account_id", this.accountId)
      .is("itineraries.deleted_at", null)
      .not("date", "is", null)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true })
      .limit(READONLY_AGENDA_LIMIT);

    if (error) {
      throw new Error(
        `Agenda readonly adapter failed: ${error.message ?? "unknown error"}`,
      );
    }

    const items = data ?? [];
    const contactMap = await this.readContacts(items);
    const days = buildAgendaDays(items, contactMap);

    return {
      rangeLabel: `${formatShortRangeDate(start)} - ${formatShortRangeDate(end)}`,
      days: days.length > 0 ? days : agendaFixture.days,
      signals: buildSignals(days),
    };
  }

  private async readContacts(
    items: readonly ItineraryItemAgendaRow[],
  ): Promise<ReadonlyMap<string, ContactRow>> {
    const ids = uniqueStrings(
      items.flatMap((item) => {
        const itinerary = firstRelation(item.itineraries);
        return [
          item.provider_contact_id,
          item.canonical_provider_contact_id,
          itinerary?.id_contact,
        ];
      }),
    );
    if (ids.length === 0) return new Map();

    const { data, error } = await this.supabase
      .from("contacts")
      .select<ContactRow[]>(CONTACT_COLUMNS)
      .eq("account_id", this.accountId)
      .in("id", ids)
      .limit(ids.length);

    if (error) {
      throw new Error(
        `Agenda contacts readonly adapter failed: ${error.message ?? "unknown error"}`,
      );
    }

    return new Map((data ?? []).map((contact) => [contact.id, contact]));
  }
}

function buildAgendaDays(
  rows: readonly ItineraryItemAgendaRow[],
  contactMap: ReadonlyMap<string, ContactRow>,
): AgendaDay[] {
  const grouped = new Map<string, InternalAgendaService[]>();

  for (const row of rows) {
    if (!row.date) continue;
    const dateKey = row.date.slice(0, 10);
    const existing = grouped.get(dateKey) ?? [];
    existing.push(mapAgendaService(row, contactMap));
    grouped.set(dateKey, existing);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, services]) => {
      const total = services.reduce((sum, service) => sum + service.amountValue, 0);
      return {
        id: dateKey,
        day: dateKey.slice(8, 10),
        month: monthLabel(dateKey),
        title: longDateLabel(dateKey),
        meta: `${services.length} servicios · ${formatMoney(total)}`,
        services: services.map((service) => {
          const { amountValue, ...agendaService } = service;
          void amountValue;
          return agendaService;
        }),
      };
    });
}

type InternalAgendaService = AgendaService & { amountValue: number };

function mapAgendaService(
  row: ItineraryItemAgendaRow,
  contactMap: ReadonlyMap<string, ContactRow>,
): InternalAgendaService {
  const itinerary = firstRelation(row.itineraries);
  const provider =
    contactLabel(contactMap.get(row.provider_contact_id ?? "")) ||
    contactLabel(contactMap.get(row.canonical_provider_contact_id ?? "")) ||
    "Proveedor pendiente";
  const customer =
    contactLabel(contactMap.get(itinerary?.id_contact ?? "")) ||
    itinerary?.name ||
    "Cliente por definir";
  const amountValue = readNumber(row.total_price) ?? 0;
  const type = normalizeServiceType(row.product_type);

  return {
    id: row.id,
    type,
    title: firstNonEmpty(row.product_name, row.rate_name, "Servicio sin nombre"),
    supplier: provider,
    customer,
    itineraryId: row.id_itinerary || itinerary?.id || row.id,
    customerPayment: amountValue > 0 ? "Cliente con saldo" : "Sin cobro",
    supplierPayment:
      (readNumber(row.pending_paid_cost) ?? 0) > 0
        ? "Proveedor pendiente"
        : (readNumber(row.paid_cost) ?? 0) > 0
          ? "Proveedor pagado"
          : "Proveedor por revisar",
    notification: normalizeReservationStatus(row.reservation_status)
      ? "Notificado"
      : "Sin notificar",
    amount: formatMoney(amountValue),
    amountValue,
    tone: toneForType(type, row.reservation_status),
  };
}

function buildSignals(days: readonly AgendaDay[]): AgendaFixture["signals"] {
  const services = days.flatMap((day) => day.services);
  const unnotified = services.filter((service) => service.notification === "Sin notificar").length;
  const supplierPending = services.filter((service) =>
    service.supplierPayment.includes("pendiente"),
  ).length;
  const ready = services.filter((service) => service.supplierPayment === "Proveedor pagado").length;

  return [
    {
      id: "notify-pending",
      label: `${unnotified} sin notificar`,
      detail: "Servicios próximos que todavía requieren confirmación o mensaje operativo.",
      tone: unnotified > 0 ? "warning" : "success",
    },
    {
      id: "supplier-pending",
      label: `${supplierPending} proveedores pendientes`,
      detail: "Priorizar revisión de pagos y reservas antes de la fecha del servicio.",
      tone: supplierPending > 0 ? "live" : "success",
    },
    {
      id: "ready-services",
      label: `${ready} listos`,
      detail: "Servicios con proveedor pagado o sin deuda operativa visible en la agenda.",
      tone: "success",
    },
  ];
}

function normalizeServiceType(value: string | null): AgendaService["type"] {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.includes("flight") || normalized.includes("vuelo")) return "flight";
  if (normalized.includes("hotel") || normalized.includes("lodging")) return "hotel";
  if (
    normalized.includes("transport") ||
    normalized.includes("transfer") ||
    normalized.includes("traslado")
  )
    return "transport";
  return "activity";
}

function toneForType(
  type: AgendaService["type"],
  reservationStatus: boolean | string | null,
): AgendaTone {
  if (!normalizeReservationStatus(reservationStatus)) return "warning";
  if (type === "hotel") return "live";
  if (type === "flight") return "primary";
  return "success";
}

function normalizeReservationStatus(value: boolean | string | null): boolean {
  if (typeof value === "boolean") return value;
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "confirmado" || normalized === "confirmed";
}

function contactLabel(contact: ContactRow | undefined): string {
  if (!contact) return "";
  return firstNonEmpty(
    [contact.name, contact.last_name].filter(Boolean).join(" "),
    contact.email,
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return "";
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function readNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" })
    .format(new Date(`${dateKey}T00:00:00Z`))
    .replace(".", "")
    .toUpperCase();
}

function longDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function formatShortRangeDate(dateKey: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T00:00:00Z`))
    .replace(".", "");
}
