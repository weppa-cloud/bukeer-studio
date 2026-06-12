import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  contactsFixture,
  type ContactDetail,
  type ContactRecord,
  type ContactsFixture,
  type ContactTimelineItem,
  type ContactTone,
} from "@/lib/admin-next/fixtures/contacts";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseContactsFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseContactsFilter<T>;
  is(column: string, value: null): SupabaseContactsFilter<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseContactsFilter<T>;
  limit(count: number): SupabaseContactsFilter<T>;
}

interface SupabaseContactsBuilder {
  select<T = unknown>(columns: string): SupabaseContactsFilter<T>;
}

export interface AdminNextContactsReadonlySupabaseClient {
  from(table: "contacts" | "itineraries"): SupabaseContactsBuilder;
}

export interface ContactsAdapter {
  readonly mode: AdminDataSourceMode;
  getContacts(): Promise<ContactsFixture>;
  getContactDetail(id: string): Promise<ContactDetail | null>;
}

export interface ContactsAdapterOptions {
  readonly accountId?: string;
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextContactsReadonlySupabaseClient;
}

type ContactRow = {
  id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  location: string | null;
  location_name: string | null;
  type_id: string | null;
  number_id: string | null;
  is_client: boolean | null;
  is_provider: boolean | null;
  is_company: boolean | null;
  user_rol: string | null;
  client_type: string | null;
  source: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type ContactItineraryRow = {
  id: string;
  name: string | null;
  id_fm: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  passenger_count: number | null;
  total_amount: number | null;
  currency_type: string | null;
  updated_at: string | null;
};

const CONTACT_COLUMNS =
  "id, name, last_name, email, phone, phone2, location, location_name, type_id, number_id, " +
  "is_client, is_provider, is_company, user_rol, client_type, source, updated_at, created_at";

const ITINERARY_COLUMNS =
  "id, name, id_fm, status, start_date, end_date, passenger_count, total_amount, currency_type, updated_at";

const READONLY_CONTACT_LIMIT = 60;
const DETAIL_ITINERARY_LIMIT = 8;

export function createContactsAdapter(
  options: AdminDataSourceMode | ContactsAdapterOptions = "fixture",
): ContactsAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlyContactsAdapter(
      normalized.supabase,
      normalized.accountId,
    );
  }

  return new FixtureContactsAdapter(mode);
}

class FixtureContactsAdapter implements ContactsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getContacts(): Promise<ContactsFixture> {
    return contactsFixture;
  }

  async getContactDetail(id: string): Promise<ContactDetail | null> {
    const contact = contactsFixture.contacts.find((item) => item.id === id);
    return contact ? buildFixtureDetail(contact) : null;
  }
}

class ReadonlyContactsAdapter implements ContactsAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextContactsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getContacts(): Promise<ContactsFixture> {
    const { data, error } = await this.supabase
      .from("contacts")
      .select<ContactRow[]>(CONTACT_COLUMNS)
      .eq("account_id", this.accountId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(READONLY_CONTACT_LIMIT);

    if (error) {
      throw new Error(
        `Contacts readonly adapter failed: ${error.message ?? "unknown error"}`,
      );
    }

    const contacts = (data ?? []).map(mapContactRow);
    const selected = contacts[0] ?? contactsFixture.selected;

    return {
      contacts: contacts.length > 0 ? contacts : contactsFixture.contacts,
      selected,
      timeline: contactsFixture.timeline,
      signals: contactsFixture.signals,
      details: Object.fromEntries(
        contacts.map((contact) => [contact.id, buildFixtureDetail(contact)]),
      ),
    };
  }

  async getContactDetail(id: string): Promise<ContactDetail | null> {
    const { data: contactRows, error: contactError } = await this.supabase
      .from("contacts")
      .select<ContactRow[]>(CONTACT_COLUMNS)
      .eq("account_id", this.accountId)
      .eq("id", id)
      .is("deleted_at", null)
      .limit(1);

    if (contactError) {
      throw new Error(
        `Contact detail readonly adapter failed: ${contactError.message ?? "unknown error"}`,
      );
    }

    const row = contactRows?.[0];
    if (!row) return null;

    const itinerariesResult = await this.supabase
      .from("itineraries")
      .select<ContactItineraryRow[]>(ITINERARY_COLUMNS)
      .eq("account_id", this.accountId)
      .eq("id_contact", id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(DETAIL_ITINERARY_LIMIT);

    if (itinerariesResult.error) {
      throw new Error(
        `Contact itineraries readonly adapter failed: ${itinerariesResult.error.message ?? "unknown error"}`,
      );
    }
    const contact = mapContactRow(row);
    const itineraries = (itinerariesResult.data ?? []).map(mapItineraryRow);

    return {
      contact: {
        ...contact,
        itineraries: itineraries.length,
        openBalance: "Ver pagos del itinerario",
      },
      profile: buildProfileRows(row),
      itineraries,
      signals: buildSignals(row, itineraries.length),
    };
  }
}

function buildFixtureDetail(contact: ContactRecord): ContactDetail {
  return {
    contact,
    profile: [
      { label: "Ciudad", value: contact.city },
      { label: "Documento", value: contact.document },
      { label: "Email", value: contact.email },
      { label: "Telefono", value: contact.phone },
    ],
    itineraries: contactsFixture.timeline,
    signals: contactsFixture.signals,
  };
}

function mapContactRow(row: ContactRow): ContactRecord {
  const fullName = [row.name, row.last_name].filter(Boolean).join(" ").trim();
  const badges = buildBadges(row);
  const updatedAt = row.updated_at ?? row.created_at;

  return {
    id: row.id,
    initials: initialsForName(fullName || row.email || "Contacto"),
    name: fullName || row.email || "Contacto sin nombre",
    badges,
    email: row.email?.trim() || "Sin email",
    phone: row.phone?.trim() || row.phone2?.trim() || "Sin telefono",
    city: row.location_name?.trim() || row.location?.trim() || "Sin ciudad",
    document: [row.type_id, row.number_id].filter(Boolean).join(" ").trim() || "Sin documento",
    lastActivity: updatedAt ? `Actualizado ${formatShortDate(updatedAt)}` : "Sin actividad",
    openBalance: "$0",
    itineraries: 0,
    totalSales: "$0",
    tone: toneForContact(row),
  };
}

function buildBadges(row: ContactRow): string[] {
  const badges: string[] = [];
  if (row.is_client) badges.push("Cliente");
  if (row.is_provider) badges.push("Proveedor");
  if (row.is_company) badges.push("Empresa");
  if (row.client_type) badges.push(row.client_type);
  if (row.user_rol) badges.push(row.user_rol);
  return badges.length > 0 ? badges : ["Contacto"];
}

function toneForContact(row: ContactRow): ContactTone {
  if (row.is_provider) return "live";
  if (row.is_client) return "warning";
  if (row.is_company) return "primary";
  return "success";
}

function mapItineraryRow(row: ContactItineraryRow): ContactTimelineItem {
  const currency = row.currency_type ?? "COP";
  return {
    id: row.id,
    title: row.name?.trim() || row.id_fm || "Itinerario sin nombre",
    meta: [
      row.id_fm ? `#${row.id_fm}` : null,
      formatDateRange(row.start_date, row.end_date),
      `${row.passenger_count ?? 0} pax`,
    ]
      .filter(Boolean)
      .join(" · "),
    amount: formatCurrency(row.total_amount ?? 0, { currency_type: currency }),
    status: row.status?.trim() || "Sin estado",
    tone: toneForStatus(row.status),
  };
}

function buildProfileRows(row: ContactRow): Array<{ label: string; value: string }> {
  return [
    { label: "Email", value: row.email?.trim() || "Sin email" },
    { label: "Telefono", value: row.phone?.trim() || row.phone2?.trim() || "Sin telefono" },
    { label: "Ubicacion", value: row.location_name?.trim() || row.location?.trim() || "Sin ubicacion" },
    { label: "Documento", value: [row.type_id, row.number_id].filter(Boolean).join(" ").trim() || "Sin documento" },
    { label: "Origen", value: row.source?.trim() || "Sin origen" },
    { label: "Actualizado", value: row.updated_at ? formatShortDate(row.updated_at) : "Sin fecha" },
  ];
}

function buildSignals(
  row: ContactRow,
  itineraryCount: number,
) {
  return [
    {
      id: "profile-type",
      label: row.is_provider ? "Proveedor operativo" : "Perfil comercial",
      detail: row.is_provider
        ? "Puede asociarse como proveedor en servicios del itinerario."
        : "Disponible para cotizaciones e itinerarios del cliente.",
      tone: row.is_provider ? "live" : "warning",
    },
    {
      id: "related-itineraries",
      label: `${itineraryCount} itinerarios relacionados`,
      detail:
        itineraryCount > 0
          ? "Historial real cargado desde Supabase."
          : "Sin itinerarios asociados en el backend.",
      tone: itineraryCount > 0 ? "success" : "primary",
    },
    {
      id: "payment-activity",
      label: "Pagos enlazados por itinerario",
      detail:
        "La actividad de pagos se revisa desde cada itinerario relacionado.",
      tone: itineraryCount > 0 ? "success" : "primary",
    },
  ] satisfies ContactDetail["signals"];
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${first ?? ""}${second ?? ""}`.toUpperCase();
}

function toneForStatus(status: string | null): ContactTone {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("confirm")) return "success";
  if (normalized.includes("oper")) return "live";
  if (normalized.includes("presupuesto") || normalized.includes("cot")) return "warning";
  return "primary";
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Sin fechas";
  if (!end || start === end) return formatShortDate(start);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCurrency(
  value: number,
  row: { currency_type?: string | null },
): string {
  const currency = row.currency_type?.trim() || "COP";
  return new Intl.NumberFormat("es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
