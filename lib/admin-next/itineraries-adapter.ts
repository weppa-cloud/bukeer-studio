// Adapter de Itinerarios — F2 del epic Evolución (flow-first).
// Modo fixture | readonly: en readonly lee itineraries reales de Supabase
// (RLS por account) y los mapea a ItinerarySummary para la UI del prototipo.
// Mismo patrón que products-adapter.ts.

import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  itinerariesFixture,
  type ItinerariesFixture,
  type ItineraryDetail,
  type ItineraryDetailItem,
  type ItineraryPaymentPlan,
  type ItineraryPublicProposal,
  type ItineraryStatus,
  type ItinerarySummary,
  type ItineraryTone,
} from "@/lib/admin-next/fixtures/itineraries";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseItinerariesFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseItinerariesFilter<T>;
  is(column: string, value: null): SupabaseItinerariesFilter<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseItinerariesFilter<T>;
  limit(count: number): SupabaseItinerariesFilter<T>;
}

interface SupabaseItinerariesBuilder {
  select<T = unknown>(columns: string): SupabaseItinerariesFilter<T>;
}

type AdminNextItinerariesReadonlyTable =
  | "itineraries"
  | "itinerary_items"
  | "passenger"
  | "transactions";

type AuditTimelineRpcRow = {
  event_id: string | null;
  event_type: string | null;
  title: string | null;
  description: string | null;
  changed_by_name: string | null;
  changed_at: string | null;
  source: string | null;
  severity: string | null;
};

export interface AdminNextItinerariesReadonlySupabaseClient {
  from(table: AdminNextItinerariesReadonlyTable): SupabaseItinerariesBuilder;
  rpc?(
    functionName: "function_get_itinerary_audit_timeline",
    params: { p_itinerary_id: string },
  ): SupabaseReadQuery<AuditTimelineRpcRow[]>;
}

type ItineraryRow = {
  id: string;
  id_fm: string | null;
  name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  passenger_count: number | null;
  adults: number | null;
  children: number | null;
  currency_type: string | null;
  language: string | null;
  request_type: string | null;
  itinerary_visibility: boolean | null;
  personalized_message: string | null;
  main_image: string | null;
  confirmation_date: string | null;
  total_amount: number | null;
  total_cost: number | null;
  total_markup: number | null;
  agent: string | null;
  id_contact: string | null;
  created_at: string | null;
  destinations: string[] | null;
  contact: { name: string | null } | null;
};

type ItineraryItemRow = {
  id: string;
  product_type: string | null;
  product_name: string | null;
  rate_name: string | null;
  date: string | null;
  day_number: number | null;
  order: number | null;
  destination: string | null;
  quantity: number | null;
  unit_cost: number | null;
  unit_price: number | null;
  total_cost: number | null;
  total_price: number | null;
  profit: number | null;
  profit_percentage: number | null;
  paid_cost: number | null;
  pending_paid_cost: number | null;
  reservation_status: boolean | string | null;
  reservation_messages: unknown[] | null;
  provider_contact_id: string | null;
  canonical_provider_contact_id: string | null;
  canonical_mapping_status: string | null;
  channel_code: string | null;
  is_from_package: boolean | null;
  package_group_name: string | null;
  source_package_id: string | null;
  needs_review: boolean | null;
  id_product: string | null;
  created_at: string | null;
  provider: {
    name: string | null;
    last_name: string | null;
    email?: string | null;
    user_image?: string | null;
  } | null;
};

type PassengerRow = {
  id: string | number;
  name: string | null;
  last_name: string | null;
  type_id: string | null;
  number_id: string | null;
  nationality: string | null;
  birth_date: string | null;
  email: string | null;
  phone_number: string | null;
  gender: string | null;
  is_main_passenger: boolean | null;
};

type TransactionRow = {
  id: string | number;
  value?: number | null;
  amount?: number | null;
  transaction_type?: string | null;
  type?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
  date?: string | null;
  created_at?: string | null;
  reference?: string | null;
  voucher_url?: string | null;
};

const ITINERARY_COLUMNS =
  "id, id_fm, name, status, start_date, end_date, passenger_count, adults, children, " +
  "currency_type, language, request_type, itinerary_visibility, personalized_message, main_image, confirmation_date, " +
  "total_amount, total_cost, total_markup, agent, id_contact, created_at, destinations, " +
  "contact:contacts!id_contact(name)";

const ITINERARY_ITEM_COLUMNS =
  "id, product_type, product_name, rate_name, date, day_number, order, destination, quantity, " +
  "unit_cost, unit_price, total_cost, total_price, profit, profit_percentage, paid_cost, pending_paid_cost, " +
  "reservation_status, reservation_messages, " +
  "provider_contact_id, canonical_provider_contact_id, canonical_mapping_status, channel_code, " +
  "is_from_package, package_group_name, source_package_id, needs_review, id_product, created_at, " +
  "provider:contacts!provider_contact_id(name,last_name,email,user_image)";

const PASSENGER_COLUMNS =
  "id, name, last_name, type_id, number_id, nationality, birth_date, email, phone_number, gender, is_main_passenger";

const STATUS_MAP: Record<string, ItineraryStatus> = {
  pendiente: "draft",
  borrador: "draft",
  presupuesto: "quoted",
  confirmado: "won",
  "en operación": "operating",
  "en operacion": "operating",
  finalizado: "closed",
};

const READONLY_LIMIT = 60;
const FEE_BANCARIO_PRODUCT_IDS = new Set([
  "615a5eda-7560-4506-abf1-67a362dbafba",
  "f8f7b780-fa93-4c64-8525-02e81f425e5d",
]);

function mapStatus(raw: string | null): ItineraryStatus {
  if (!raw) return "draft";
  return STATUS_MAP[raw.trim().toLowerCase()] ?? "draft";
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency?.trim() || "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString("es-CO")}`;
  }
}

function parseMoney(value: string): number | null {
  const parsed = Number(value.replace(/[^\d-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatShortDate(value: string | null): string {
  if (!value) return "Por definir";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Por definir";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatLongDate(value: string | null): string {
  if (!value) return "Fecha por definir";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T00:00:00`).getTime();
  const endDate = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(startDate) || Number.isNaN(endDate)) return 0;
  return Math.max(0, Math.round((endDate - startDate) / 86_400_000));
}

function formatMarginPct(row: ItineraryRow): string {
  const total = row.total_amount ?? 0;
  const markup = row.total_markup ?? 0;
  if (total <= 0 || markup <= 0) return "—";
  const pct = (markup / total) * 100;
  return `${pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

function formatCreated(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `Creado ${new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

export function mapItineraryRowToSummary(row: ItineraryRow): ItinerarySummary {
  return {
    id: row.id,
    code: row.id_fm ? `ID ${row.id_fm}` : `ID ${row.id.slice(0, 8)}`,
    title: row.name?.trim() || "Itinerario sin nombre",
    customer: row.contact?.name?.trim() || "Sin contacto",
    owner: row.agent?.trim() || "—",
    destination: row.destinations?.[0] ?? "",
    startDate: formatShortDate(row.start_date),
    endDate: formatShortDate(row.end_date),
    days: daysBetween(row.start_date, row.end_date),
    pax: row.passenger_count ?? 0,
    status: mapStatus(row.status),
    value: formatMoney(row.total_amount, row.currency_type),
    margin: formatMarginPct(row),
    marginTone: "success",
    services: 0,
    paidInstallments: 0,
    totalInstallments: 0,
    nextService: formatCreated(row.created_at),
    risk: "",
    href: `/admin/itineraries/${row.id}`,
  };
}

export type ItineraryAuditSeverity = "info" | "success" | "warning" | "error";

export type ItineraryAuditItem = {
  id: string;
  title: string;
  description: string;
  actor: string;
  changedAt: string;
  source: string;
  severity: ItineraryAuditSeverity;
};

export type ItineraryDetailPageData = {
  summary: ItinerarySummary;
  detail: ItineraryDetail;
  paymentPlan: ItineraryPaymentPlan;
  publicProposal: ItineraryPublicProposal;
  auditTrail: ItineraryAuditItem[];
  confirmationDate: string;
  editDefaults: ItineraryHeaderEditDefaults;
};

export type ItineraryHeaderEditDefaults = {
  itineraryId: string;
  name: string;
  startDate: string;
  endDate: string;
  passengerCount: number;
  adults: number;
  children: number;
  currencyType: string;
  language: string;
  requestType: string;
  personalizedMessage: string;
  contactId: string;
  agentId: string;
  mainImage: string;
  status: string;
};

export interface ItinerariesAdapter {
  readonly mode: AdminDataSourceMode;
  getItineraries(): Promise<ItinerariesFixture>;
  getItineraryDetail(id: string): Promise<ItineraryDetailPageData | null>;
}

export interface ItinerariesAdapterOptions {
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextItinerariesReadonlySupabaseClient;
  readonly accountId?: string;
}

export function createItinerariesAdapter(
  options: ItinerariesAdapterOptions | AdminDataSourceMode = "fixture",
): ItinerariesAdapter {
  const resolved: ItinerariesAdapterOptions =
    typeof options === "string" ? { mode: options } : options;
  const mode: AdminDataSourceMode = resolved.mode ?? "fixture";

  if (mode !== "readonly") {
    return {
      mode: "fixture",
      async getItineraries() {
        return normalizeFixtureLinks(itinerariesFixture);
      },
      async getItineraryDetail(id: string) {
        return getFixtureItineraryDetail(id);
      },
    };
  }

  const { supabase, accountId } = resolved;
  if (!supabase || !accountId) {
    throw new Error(
      "Itineraries readonly adapter requires a Supabase client and accountId",
    );
  }

  return {
    mode: "readonly",
    async getItineraries() {
      const { data, error } = await supabase
        .from("itineraries")
        .select<ItineraryRow[]>(ITINERARY_COLUMNS)
        .eq("account_id", accountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(READONLY_LIMIT);

      if (error) {
        throw new Error(
          `Itineraries readonly adapter failed: ${error.message ?? "unknown error"}`,
        );
      }

      const itineraries = (data ?? []).map(mapItineraryRowToSummary);

      return {
        ...itinerariesFixture,
        itineraries,
      };
    },
    async getItineraryDetail(id: string) {
      const { data: itineraryRows, error: itineraryError } = await supabase
        .from("itineraries")
        .select<ItineraryRow[]>(ITINERARY_COLUMNS)
        .eq("account_id", accountId)
        .eq("id", id)
        .is("deleted_at", null)
        .limit(1);

      if (itineraryError) {
        throw new Error(
          `Itinerary readonly adapter failed: ${itineraryError.message ?? "unknown error"}`,
        );
      }

      const itinerary = itineraryRows?.[0];
      if (!itinerary) return null;

      const [itemsResult, passengersResult, transactionsResult, auditResult] =
        await Promise.all([
          supabase
            .from("itinerary_items")
            .select<ItineraryItemRow[]>(ITINERARY_ITEM_COLUMNS)
            .eq("account_id", accountId)
            .eq("id_itinerary", id)
            .is("deleted_at", null)
            .order("order", { ascending: true })
            .order("date", { ascending: true }),
          supabase
            .from("passenger")
            .select<PassengerRow[]>(PASSENGER_COLUMNS)
            .eq("account_id", accountId)
            .eq("itinerary_id", id)
            .order("is_main_passenger", { ascending: false }),
          supabase
            .from("transactions")
            .select<TransactionRow[]>("*")
            .eq("id_itinerary", id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          safeAuditTimelineRead(supabase, id),
        ]);

      if (itemsResult.error) {
        throw new Error(
          `Itinerary items readonly adapter failed: ${itemsResult.error.message ?? "unknown error"}`,
        );
      }
      if (passengersResult.error) {
        throw new Error(
          `Itinerary passengers readonly adapter failed: ${passengersResult.error.message ?? "unknown error"}`,
        );
      }
      if (transactionsResult.error) {
        throw new Error(
          `Itinerary payments readonly adapter failed: ${transactionsResult.error.message ?? "unknown error"}`,
        );
      }

      const items = itemsResult.data ?? [];
      const summary = {
        ...mapItineraryRowToSummary(itinerary),
        services: items.length,
      };
      const passengers = passengersResult.data ?? [];
      const transactions = transactionsResult.data ?? [];
      const detail = buildReadonlyDetail(
        summary,
        itinerary,
        items,
        passengers,
        transactions,
      );

      return {
        summary,
        detail,
        paymentPlan: buildReadonlyPaymentPlan(summary, transactions),
        publicProposal: buildReadonlyPublicProposal(
          summary,
          itinerary,
          detail.preview,
        ),
        auditTrail: buildAuditTrail(
          summary,
          auditResult.data ?? [],
          items.length,
        ),
        confirmationDate: itinerary.confirmation_date ?? "",
        editDefaults: buildEditDefaults(itinerary, summary),
      };
    },
  };
}

function normalizeFixtureLinks(
  fixture: ItinerariesFixture,
): ItinerariesFixture {
  return {
    ...fixture,
    itineraries: fixture.itineraries.map((itinerary) => ({
      ...itinerary,
      href: `/admin/itineraries/${itinerary.id}`,
    })),
  };
}

function getFixtureItineraryDetail(id: string): ItineraryDetailPageData | null {
  const fixture = normalizeFixtureLinks(itinerariesFixture);
  const summary = fixture.itineraries.find((itinerary) => itinerary.id === id);
  const detail = fixture.details[id];
  const paymentPlan = fixture.paymentPlans[id];
  const publicProposal = fixture.publicProposals[id];

  if (!summary || !detail || !paymentPlan || !publicProposal) return null;

  return {
    summary,
    detail,
    paymentPlan,
    publicProposal,
    confirmationDate: summary.status === "won" ? summary.startDate : "",
    editDefaults: {
      itineraryId: summary.id,
      name: summary.title,
      startDate: summary.startDate,
      endDate: summary.endDate,
      passengerCount: summary.pax,
      adults: Math.max(summary.pax, 1),
      children: 0,
      currencyType: "COP",
      language: "es",
      requestType: "Cotizacion",
      personalizedMessage: "",
      contactId: "",
      agentId: "",
      mainImage: "",
      status: statusLabelForUpdate(summary.status),
    },
    auditTrail: [
      {
        id: `${id}-audit-status`,
        title: "Cambio de estado",
        description: `Estado actual: ${summary.status}`,
        actor: summary.owner,
        changedAt: summary.nextService,
        source: "fixture",
        severity: summary.status === "won" ? "success" : "info",
      },
      {
        id: `${id}-audit-items`,
        title: "Servicios sincronizados",
        description: `${summary.services} servicios disponibles en detalle`,
        actor: "Bukeer Next",
        changedAt: summary.startDate,
        source: "fixture",
        severity: "info",
      },
    ],
  };
}

function buildEditDefaults(
  row: ItineraryRow,
  summary: ItinerarySummary,
): ItineraryHeaderEditDefaults {
  return {
    itineraryId: row.id,
    name: row.name?.trim() || summary.title,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    passengerCount: row.passenger_count ?? 1,
    adults: row.adults ?? row.passenger_count ?? 1,
    children: row.children ?? 0,
    currencyType: row.currency_type?.trim() || "COP",
    language: normalizeLanguage(row.language),
    requestType: row.request_type?.trim() || "Cotizacion",
    personalizedMessage: row.personalized_message ?? "",
    contactId: row.id_contact ?? "",
    agentId: normalizeUuid(row.agent),
    mainImage: row.main_image ?? "",
    status: row.status?.trim() || statusLabelForUpdate(summary.status),
  };
}

function normalizeLanguage(language: string | null): string {
  const normalized = language?.trim().toLowerCase();
  if (
    normalized === "en" ||
    normalized === "english" ||
    normalized === "ingles"
  )
    return "en";
  return "es";
}

function normalizeUuid(value: string | null): string {
  const candidate = value?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate,
  )
    ? candidate
    : "";
}

function statusLabelForUpdate(status: ItineraryStatus): string {
  const labels: Record<ItineraryStatus, string> = {
    draft: "Borrador",
    quoted: "Presupuesto",
    won: "Confirmado",
    operating: "En operación",
    closed: "Finalizado",
  };
  return labels[status];
}

async function safeAuditTimelineRead(
  supabase: AdminNextItinerariesReadonlySupabaseClient,
  itineraryId: string,
): Promise<SupabaseRpcResponse<AuditTimelineRpcRow[]>> {
  if (!supabase.rpc) return { data: [], error: null };

  try {
    const result = await supabase.rpc("function_get_itinerary_audit_timeline", {
      p_itinerary_id: itineraryId,
    });
    return result.error ? { data: [], error: null } : result;
  } catch {
    return { data: [], error: null };
  }
}

function buildReadonlyDetail(
  summary: ItinerarySummary,
  itinerary: ItineraryRow,
  items: ItineraryItemRow[],
  passengers: PassengerRow[],
  transactions: TransactionRow[],
): ItineraryDetail {
  const previewItems = mapItemsToPreviewDetails(summary, itinerary, items);

  return {
    services: nonEmptyDetail(
      items.map((item) => mapItemToDetail(summary, item)),
      "Sin servicios cargados",
      "0 items",
      "Flutter no tiene items visibles para este itinerario.",
      "warning",
    ),
    passengers: nonEmptyDetail(
      passengers.map(mapPassengerToDetail),
      "Sin pasajeros registrados",
      `${summary.pax} esperados`,
      "Agrega pasajeros en Flutter antes de cerrar la paridad write.",
      "warning",
    ),
    suppliers: nonEmptyDetail(
      mapItemsToSupplierDetails(summary, items),
      "Sin proveedores asociados",
      "Pendiente",
      "No hay items con proveedor o reserva para auditar.",
      "warning",
    ),
    payments: nonEmptyDetail(
      transactions.map((transaction) =>
        mapTransactionToDetail(summary, transaction),
      ),
      "Sin pagos registrados",
      summary.value,
      "No hay transacciones visibles para este itinerario.",
      "warning",
    ),
    preview: nonEmptyDetail(
      previewItems,
      "Sin servicios para preview",
      "Timeline vacio",
      "No hay items visibles para construir la propuesta publica.",
      "warning",
    ),
  };
}

function nonEmptyDetail(
  items: ItineraryDetailItem[],
  label: string,
  value: string,
  detail: string,
  tone: ItineraryTone,
): ItineraryDetailItem[] {
  return items.length > 0
    ? items
    : [
        {
          id: `empty-${label.toLowerCase().replace(/\s+/g, "-")}`,
          label,
          value,
          detail,
          tone,
        },
      ];
}

function mapItemToDetail(
  summary: ItinerarySummary,
  item: ItineraryItemRow,
): ItineraryDetailItem {
  const reservation = formatReservationStatus(item.reservation_status);
  const source = formatItemSource(item);
  const provider = formatProvider(item);
  const markup =
    item.profit ?? calculateMarkup(item.total_price, item.total_cost);

  return {
    id: item.id,
    label:
      item.product_name?.trim() ||
      item.product_type?.trim() ||
      "Servicio sin nombre",
    value: item.date
      ? formatLongDate(item.date)
      : `Dia ${item.day_number ?? "por definir"}`,
    detail: [
      item.product_type,
      item.destination,
      item.quantity ? `${item.quantity} unidades` : null,
      reservation,
    ]
      .filter(Boolean)
      .join(" · "),
    tone: item.needs_review ? "warning" : statusToneForSummary(summary.status),
    locked: isReserved(item.reservation_status),
    service: {
      type: item.product_type?.trim() || "Servicio",
      source,
      provider,
      reservation,
      catalogStatus: formatCatalogStatus(item.canonical_mapping_status),
      quantity: item.quantity ? `${item.quantity}` : "1",
      unitCost: formatMoney(
        item.unit_cost,
        summary.value.includes("US$") ? "USD" : "COP",
      ),
      unitPrice: formatMoney(
        item.unit_price,
        summary.value.includes("US$") ? "USD" : "COP",
      ),
      totalCost: formatMoney(
        item.total_cost,
        summary.value.includes("US$") ? "USD" : "COP",
      ),
      totalPrice: formatMoney(
        item.total_price,
        summary.value.includes("US$") ? "USD" : "COP",
      ),
      markup:
        markup === null
          ? "—"
          : formatMoney(markup, summary.value.includes("US$") ? "USD" : "COP"),
    },
  };
}

function mapItemsToPreviewDetails(
  summary: ItinerarySummary,
  itinerary: ItineraryRow,
  items: ItineraryItemRow[],
): ItineraryDetailItem[] {
  const currency = summary.value.includes("US$") ? "USD" : "COP";
  const publicState = itinerary.itinerary_visibility ? "Publicado" : "Privado";
  const language = normalizeLanguage(itinerary.language).toUpperCase();

  return [...items]
    .filter(isPreviewVisibleItem)
    .sort(comparePreviewItems)
    .map((item) => {
      const productType = item.product_type?.trim() || "Servicio";
      const productName =
        item.product_name?.trim() || item.rate_name?.trim() || productType;
      const serviceDate = item.date
        ? formatLongDate(item.date)
        : item.day_number
          ? `Dia ${item.day_number}`
          : "Fecha por definir";
      const reservationStatus = formatReservationStatus(
        item.reservation_status,
      );
      const providerName = formatProvider(item);
      const destination =
        item.destination?.trim() ||
        summary.destination ||
        "Destino por definir";
      const amountLabel = formatMoney(item.total_price, currency);
      const reserved = isReserved(item.reservation_status);
      const tone: ItineraryTone = reserved ? "success" : "primary";

      return {
        id: item.id,
        label: `Dia ${item.day_number ?? "S/F"} · ${serviceDate}`,
        value: productName,
        detail: [
          productType,
          destination,
          providerName,
          reservationStatus,
          `${publicState} ${language}`,
        ]
          .filter(Boolean)
          .join(" · "),
        tone,
        locked: reserved,
        preview: {
          dayNumber: item.day_number,
          serviceDate,
          productName,
          productType,
          destination,
          providerName,
          amountLabel,
          reserved,
          reservationStatus,
        },
      };
    });
}

function isPreviewVisibleItem(item: ItineraryItemRow): boolean {
  const productId = item.id_product?.trim();
  if (productId && FEE_BANCARIO_PRODUCT_IDS.has(productId)) return false;

  const productName = item.product_name?.trim().toLowerCase() ?? "";
  const rateName = item.rate_name?.trim().toLowerCase() ?? "";
  return productName !== "fee bancario" && rateName !== "fee bancario";
}

function comparePreviewItems(a: ItineraryItemRow, b: ItineraryItemRow): number {
  return (
    compareNullableNumber(a.day_number, b.day_number) ||
    compareNullableDate(a.date, b.date) ||
    compareNullableNumber(a.order, b.order) ||
    compareNullableDate(a.created_at, b.created_at) ||
    (a.product_type ?? "").localeCompare(b.product_type ?? "", "es") ||
    a.id.localeCompare(b.id, "es")
  );
}

function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareNullableDate(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const aTime = new Date(a.includes("T") ? a : `${a}T00:00:00`).getTime();
  const bTime = new Date(b.includes("T") ? b : `${b}T00:00:00`).getTime();
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return aTime - bTime;
}

function mapItemsToSupplierDetails(
  summary: ItinerarySummary,
  items: ItineraryItemRow[],
): ItineraryDetailItem[] {
  const currency = summary.value.includes("US$") ? "USD" : "COP";
  const groups = new Map<
    string,
    {
      providerName: string;
      providerEmail: string;
      providerImage: string;
      items: ItineraryItemRow[];
    }
  >();

  for (const item of items) {
    const providerName = formatProvider(item);
    const key =
      item.provider_contact_id ||
      item.canonical_provider_contact_id ||
      providerName ||
      "Proveedor";
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      providerName,
      providerEmail: item.provider?.email?.trim() ?? "",
      providerImage: item.provider?.user_image?.trim() ?? "",
      items: [item],
    });
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const totalCost = sumItemMoney(group.items, "total_cost");
      const paidCost = sumItemMoney(group.items, "paid_cost");
      const pendingCost = sumItemMoney(group.items, "pending_paid_cost");
      const confirmedCount = group.items.filter((item) =>
        isReserved(item.reservation_status),
      ).length;
      const pendingCount = Math.max(group.items.length - confirmedCount, 0);
      const label = group.providerName || "Proveedor";
      const tone: ItineraryTone =
        pendingCount > 0 || pendingCost > 0 ? "warning" : "success";

      return {
        id: `supplier-${slugifyKey(key)}`,
        label,
        value: formatMoney(pendingCost, currency),
        detail: `${group.items.length} ${group.items.length === 1 ? "servicio" : "servicios"} · ${confirmedCount}/${group.items.length} reservas confirmadas`,
        tone,
        locked: pendingCount === 0,
        supplier: {
          providerName: label,
          providerEmail: group.providerEmail,
          providerImage: group.providerImage,
          itemCount: group.items.length,
          confirmedCount,
          pendingCount,
          totalCost,
          paidCost,
          pendingCost,
          totalCostLabel: formatMoney(totalCost, currency),
          paidCostLabel: formatMoney(paidCost, currency),
          pendingCostLabel: formatMoney(pendingCost, currency),
          items: group.items.map((item) => {
            const itemTotalCost = item.total_cost ?? 0;
            const itemPaidCost = item.paid_cost ?? 0;
            const itemPendingCost = item.pending_paid_cost ?? 0;

            return {
              itemId: item.id,
              productName:
                item.product_name?.trim() ||
                item.product_type?.trim() ||
                summary.title,
              productType: item.product_type?.trim() || "Servicio",
              rateName: item.rate_name?.trim() ?? "",
              serviceDate: item.date ? formatLongDate(item.date) : "",
              reservationStatus: formatReservationStatus(
                item.reservation_status,
              ),
              reserved: isReserved(item.reservation_status),
              totalCost: itemTotalCost,
              paidCost: itemPaidCost,
              pendingCost: itemPendingCost,
              totalCostLabel: formatMoney(itemTotalCost, currency),
              paidCostLabel: formatMoney(itemPaidCost, currency),
              pendingCostLabel: formatMoney(itemPendingCost, currency),
              messageCount: Array.isArray(item.reservation_messages)
                ? item.reservation_messages.length
                : 0,
            };
          }),
        },
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function sumItemMoney(
  items: ItineraryItemRow[],
  key: "total_cost" | "paid_cost" | "pending_paid_cost",
): number {
  return items.reduce((sum, item) => sum + (item[key] ?? 0), 0);
}

function slugifyKey(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "provider"
  );
}

function isReserved(value: ItineraryItemRow["reservation_status"]): boolean {
  if (typeof value === "boolean") return value;
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "confirmado" ||
    normalized === "reservado"
  );
}

function formatReservationStatus(
  value: ItineraryItemRow["reservation_status"],
): string {
  if (typeof value === "boolean") return value ? "Reservado" : "Pendiente";
  const normalized = value?.trim();
  if (!normalized) return "Pendiente";
  if (normalized.toLowerCase() === "true") return "Reservado";
  if (normalized.toLowerCase() === "false") return "Pendiente";
  return normalized;
}

function formatProvider(item: ItineraryItemRow): string {
  const name = [item.provider?.name, item.provider?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (name) return name;
  if (item.provider_contact_id || item.canonical_provider_contact_id) {
    return "Proveedor asignado";
  }
  return "Proveedor no asignado";
}

function formatCatalogStatus(value: string | null): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "mapped") return "Catálogo V2";
  if (normalized === "pending") return "Mapping pendiente";
  if (normalized) return normalized;
  return "Sin mapping";
}

function formatItemSource(item: ItineraryItemRow): string {
  if (
    item.is_from_package ||
    item.source_package_id ||
    item.package_group_name
  ) {
    return item.package_group_name?.trim() || "Package Kit";
  }
  if (item.canonical_mapping_status?.trim().toLowerCase() === "mapped") {
    return "Catálogo V2";
  }
  return item.channel_code?.trim() || "Manual";
}

function calculateMarkup(
  totalPrice: number | null,
  totalCost: number | null,
): number | null {
  if (totalPrice === null || totalPrice === undefined) return null;
  if (totalCost === null || totalCost === undefined) return null;
  return totalPrice - totalCost;
}

function mapPassengerToDetail(passenger: PassengerRow): ItineraryDetailItem {
  const firstName = passenger.name?.trim() ?? "";
  const lastName = passenger.last_name?.trim() ?? "";
  const fullName = [passenger.name, passenger.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const documentType = passenger.type_id?.trim() ?? "";
  const documentNumber = passenger.number_id?.trim() ?? "";
  const birthDate = passenger.birth_date?.trim() ?? "";
  const nationality = passenger.nationality?.trim() ?? "";
  const email = passenger.email?.trim() ?? "";
  const phoneNumber = passenger.phone_number?.trim() ?? "";
  const gender = passenger.gender?.trim() ?? "";

  return {
    id: String(passenger.id),
    label: fullName || "Pasajero sin nombre",
    value: passenger.is_main_passenger ? "Principal" : "Acompanante",
    detail: [
      [documentType, documentNumber].filter(Boolean).join(" "),
      nationality,
      email,
    ]
      .filter(Boolean)
      .join(" · "),
    tone: documentNumber ? "success" : "warning",
    passenger: {
      firstName,
      lastName,
      documentType,
      documentNumber,
      nationality,
      birthDate,
      email,
      phoneNumber,
      gender,
      isMainPassenger: Boolean(passenger.is_main_passenger),
    },
  };
}

function mapTransactionToDetail(
  summary: ItinerarySummary,
  transaction: TransactionRow,
): ItineraryDetailItem {
  const amount = transaction.value ?? transaction.amount ?? null;
  const status =
    transaction.payment_status ?? transaction.status ?? "Registrado";
  const type = transaction.transaction_type ?? transaction.type ?? "Pago";
  const paymentMethod = transaction.payment_method?.trim() ?? "";
  const date = transaction.date ?? transaction.created_at ?? null;
  const reference = transaction.reference?.trim() ?? "";
  const voucherUrl = transaction.voucher_url?.trim() ?? "";
  return {
    id: String(transaction.id),
    label: type,
    value: formatMoney(amount, summary.value.includes("US$") ? "USD" : "COP"),
    detail: [status, paymentMethod, formatLongDate(date), reference]
      .filter(Boolean)
      .join(" · "),
    tone:
      status.toLowerCase().includes("paid") ||
      status.toLowerCase().includes("pag")
        ? "success"
        : "warning",
    locked: true,
    payment: {
      date: normalizeDateInput(date),
      amount,
      paymentMethod,
      type,
      reference,
      voucherUrl,
    },
  };
}

function normalizeDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildReadonlyPaymentPlan(
  summary: ItinerarySummary,
  transactions: TransactionRow[],
): ItineraryPaymentPlan {
  const paidTotal = transactions.reduce(
    (total, transaction) =>
      total + (transaction.value ?? transaction.amount ?? 0),
    0,
  );
  const totalAmount = parseMoney(summary.value);
  const pending =
    totalAmount === null ? null : Math.max(totalAmount - paidTotal, 0);

  return {
    methods: [
      {
        id: "bank_transfer",
        label: "Transferencia",
        fee: "$0",
        total: summary.value,
        feeIncluded: false,
        tone: "success",
      },
      {
        id: "card",
        label: "Tarjeta",
        fee: "Segun pasarela",
        total: summary.value,
        feeIncluded: true,
        tone: "primary",
      },
      {
        id: "cash",
        label: "Efectivo",
        fee: "$0",
        total: summary.value,
        feeIncluded: false,
        tone: "warning",
      },
    ],
    installments: [
      {
        id: `${summary.id}-paid`,
        label: "Pagado",
        amount: formatMoney(paidTotal, "COP"),
        dueDate: "Registrado en BD",
        status: paidTotal > 0 ? "paid" : "pending",
        locked: paidTotal > 0,
        tone: paidTotal > 0 ? "success" : "warning",
      },
      {
        id: `${summary.id}-pending`,
        label: "Saldo",
        amount: pending === null ? summary.value : formatMoney(pending, "COP"),
        dueDate: summary.startDate,
        status: pending === 0 ? "paid" : "pending",
        locked: pending === 0,
        tone: pending === 0 ? "success" : "warning",
      },
    ],
  };
}

function buildReadonlyPublicProposal(
  summary: ItinerarySummary,
  itinerary: ItineraryRow,
  previewItems: ItineraryDetailItem[],
): ItineraryPublicProposal {
  const language = normalizeLanguage(itinerary.language);

  return {
    shareUrl: `/${language}/view/${summary.id}?hideEmptyDays=true`,
    pages: previewItems.map((item, index) => ({
      id: index === 0 ? "cover" : index === 1 ? "itinerary" : "checkout",
      title: item.label,
      headline: item.value,
      body: item.detail,
      primaryMetric: index === 0 ? summary.value : `${summary.days} dias`,
      secondaryMetric: `${summary.pax} pasajeros`,
      tone: item.tone,
    })),
  };
}

function buildAuditTrail(
  summary: ItinerarySummary,
  rpcRows: AuditTimelineRpcRow[],
  itemCount: number,
): ItineraryAuditItem[] {
  const mappedRows = rpcRows.map((row, index) => ({
    id: row.event_id ?? `${summary.id}-audit-${index}`,
    title: row.title ?? "Evento de auditoria",
    description: row.description ?? "Cambio registrado en Flutter",
    actor: row.changed_by_name ?? "Bukeer",
    changedAt: formatLongDate(row.changed_at),
    source: row.source ?? row.event_type ?? "audit",
    severity: mapAuditSeverity(row.severity),
  }));

  if (mappedRows.length > 0) return mappedRows;

  return [
    {
      id: `${summary.id}-audit-created`,
      title: "Itinerario sincronizado",
      description: `${summary.title} disponible desde el backend compartido`,
      actor: summary.owner,
      changedAt: summary.nextService || "Fecha no disponible",
      source: "readonly",
      severity: "info",
    },
    {
      id: `${summary.id}-audit-items`,
      title: "Items leidos",
      description: `${itemCount} servicios obtenidos desde itinerary_items`,
      actor: "Bukeer Next",
      changedAt: summary.startDate,
      source: "readonly",
      severity: itemCount > 0 ? "success" : "warning",
    },
  ];
}

function mapAuditSeverity(value: string | null): ItineraryAuditSeverity {
  if (value === "success" || value === "warning" || value === "error")
    return value;
  return "info";
}

function statusToneForSummary(status: ItineraryStatus): ItineraryTone {
  if (status === "won" || status === "operating") return "live";
  if (status === "closed") return "success";
  if (status === "draft") return "warning";
  return "primary";
}
