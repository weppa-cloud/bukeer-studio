type SupabaseError = { message?: string } | null;

type SupabaseReadResult<T> = PromiseLike<{ data: T | null; error: SupabaseError }>;
type SupabaseWriteResult = PromiseLike<{ data?: unknown; error: SupabaseError }>;

interface SupabasePublicFilter<T> extends SupabaseReadResult<T> {
  eq(column: string, value: unknown): SupabasePublicFilter<T>;
  is(column: string, value: null): SupabasePublicFilter<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabasePublicFilter<T>;
  limit(count: number): SupabasePublicFilter<T>;
}

interface SupabasePublicBuilder {
  select<T = unknown>(columns: string): SupabasePublicFilter<T>;
  insert(values: Record<string, unknown>): SupabaseWriteResult;
}

export interface PublicItinerarySupabaseClient {
  from(
    table:
      | "itineraries"
      | "itinerary_items"
      | "itinerary_payment_schedule"
      | "passenger"
      | "scheduled_payments",
  ): SupabasePublicBuilder;
}

type PublicItineraryRow = {
  id: string;
  account_id: string;
  name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  passenger_count: number | null;
  currency_type: string | null;
  language: string | null;
  itinerary_visibility: boolean | null;
  personalized_message: string | null;
  active_payment_method: string | null;
  main_image: string | null;
  total_amount: number | null;
  rates_visibility: boolean | null;
  contact: { name: string | null } | null;
};

type PublicItineraryItemRow = {
  id: string;
  product_type: string | null;
  product_name: string | null;
  rate_name: string | null;
  date: string | null;
  day_number: number | null;
  order: number | null;
  destination: string | null;
  quantity: number | null;
};

type PublicPassengerRow = {
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

type PublicPaymentScheduleRow = {
  id: string;
  currency: string | null;
  status: string | null;
  total_amount: number | null;
};

type PublicScheduledPaymentRow = {
  id: string;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_number: number | null;
  status: string | null;
};

export type PublicItineraryItem = {
  id: string;
  date: string | null;
  dayNumber: number;
  destination: string;
  label: string;
  productType: string;
  quantity: number;
};

export type PublicPassenger = {
  id: string;
  fullName: string;
  document: string;
  email: string;
  isMainPassenger: boolean;
};

export type PublicScheduledPayment = {
  id: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentLink: string;
  paymentNumber: number;
  status: string;
};

export type PublicPaymentPlan = {
  currency: string;
  onlinePaymentEnabled: boolean;
  payments: PublicScheduledPayment[];
  pendingAmount: number;
  scheduleId: string | null;
  status: string;
  totalAmount: number;
};

export type PublicItinerary = {
  itinerary: {
    activePaymentMethod: string;
    id: string;
    accountId: string;
    clientName: string;
    currency: string;
    endDate: string | null;
    language: "es" | "en";
    mainImage: string | null;
    name: string;
    passengerCount: number;
    personalizedMessage: string;
    ratesVisible: boolean;
    startDate: string | null;
    status: string;
    totalAmount: number;
  };
  items: PublicItineraryItem[];
  passengers: PublicPassenger[];
  paymentPlan: PublicPaymentPlan;
};

export type CreatePublicPassengerInput = {
  birthDate: string;
  documentNumber: string;
  documentType: string;
  email: string;
  firstName: string;
  gender: string;
  itineraryId: string;
  isMainPassenger: boolean;
  lastName: string;
  nationality: string;
  phoneNumber: string;
};

const PUBLIC_ITINERARY_COLUMNS =
  "id, account_id, name, status, start_date, end_date, passenger_count, currency_type, language, " +
  "itinerary_visibility, personalized_message, active_payment_method, main_image, total_amount, rates_visibility, " +
  "contact:contacts!id_contact(name)";

const PUBLIC_ITEM_COLUMNS =
  "id, product_type, product_name, rate_name, date, day_number, order, destination, quantity";

const PUBLIC_PASSENGER_COLUMNS =
  "id, name, last_name, type_id, number_id, nationality, birth_date, email, phone_number, gender, is_main_passenger";

const PUBLIC_PAYMENT_SCHEDULE_COLUMNS =
  "id, currency, status, total_amount";

const PUBLIC_SCHEDULED_PAYMENT_COLUMNS =
  "id, amount, currency, due_date, paid_at, payment_number, status";

export async function getPublicItineraryById({
  itineraryId,
  supabase,
}: {
  itineraryId: string;
  supabase: PublicItinerarySupabaseClient;
}): Promise<PublicItinerary | null> {
  const { data: itineraryRows, error: itineraryError } = await supabase
    .from("itineraries")
    .select<PublicItineraryRow[]>(PUBLIC_ITINERARY_COLUMNS)
    .eq("id", itineraryId)
    .is("deleted_at", null)
    .limit(1);

  if (itineraryError) {
    throw new Error(
      itineraryError.message || "No se pudo cargar el itinerario publico",
    );
  }

  const itinerary = itineraryRows?.[0];
  if (!itinerary || itinerary.itinerary_visibility !== true) {
    return null;
  }

  const [itemsResult, passengersResult, scheduleResult] = await Promise.all([
    supabase
      .from("itinerary_items")
      .select<PublicItineraryItemRow[]>(PUBLIC_ITEM_COLUMNS)
      .eq("account_id", itinerary.account_id)
      .eq("id_itinerary", itineraryId)
      .is("deleted_at", null)
      .order("order", { ascending: true })
      .order("date", { ascending: true }),
    supabase
      .from("passenger")
      .select<PublicPassengerRow[]>(PUBLIC_PASSENGER_COLUMNS)
      .eq("account_id", itinerary.account_id)
      .eq("itinerary_id", itineraryId)
      .order("is_main_passenger", { ascending: false }),
    supabase
      .from("itinerary_payment_schedule")
      .select<PublicPaymentScheduleRow[]>(PUBLIC_PAYMENT_SCHEDULE_COLUMNS)
      .eq("itinerary_id", itineraryId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (itemsResult.error) {
    throw new Error(
      itemsResult.error.message || "No se pudieron cargar los servicios",
    );
  }
  if (passengersResult.error) {
    throw new Error(
      passengersResult.error.message || "No se pudieron cargar los pasajeros",
    );
  }
  if (scheduleResult.error) {
    throw new Error(
      scheduleResult.error.message || "No se pudo cargar el plan de pagos",
    );
  }

  const schedule = scheduleResult.data?.[0] ?? null;
  const scheduledPayments = schedule
    ? await getScheduledPaymentsForSchedule({
        lang: normalizeLanguage(itinerary.language),
        itineraryId,
        schedule,
        supabase,
      })
    : [];

  return {
    itinerary: {
      activePaymentMethod: itinerary.active_payment_method?.trim() || "",
      id: itinerary.id,
      accountId: itinerary.account_id,
      clientName: itinerary.contact?.name?.trim() || "Cliente",
      currency: itinerary.currency_type?.trim() || "COP",
      endDate: itinerary.end_date,
      language: normalizeLanguage(itinerary.language),
      mainImage: itinerary.main_image,
      name: itinerary.name?.trim() || "Itinerario sin nombre",
      passengerCount: Math.max(itinerary.passenger_count ?? 1, 1),
      personalizedMessage: itinerary.personalized_message?.trim() || "",
      ratesVisible: itinerary.rates_visibility === true,
      startDate: itinerary.start_date,
      status: itinerary.status?.trim() || "Presupuesto",
      totalAmount: Number(itinerary.total_amount ?? 0),
    },
    items: (itemsResult.data ?? []).map(mapPublicItem),
    passengers: (passengersResult.data ?? []).map(mapPublicPassenger),
    paymentPlan: buildPaymentPlan({
      activePaymentMethod: itinerary.active_payment_method,
      fallbackCurrency: itinerary.currency_type,
      schedule,
      scheduledPayments,
      totalAmount: itinerary.total_amount,
    }),
  };
}

export async function createPublicPassengerRegistration({
  input,
  supabase,
}: {
  input: CreatePublicPassengerInput;
  supabase: PublicItinerarySupabaseClient;
}): Promise<void> {
  const publicItinerary = await getPublicItineraryById({
    itineraryId: input.itineraryId,
    supabase,
  });

  if (!publicItinerary) {
    throw new Error("Este itinerario no esta disponible publicamente");
  }

  if (
    publicItinerary.passengers.length >=
    publicItinerary.itinerary.passengerCount
  ) {
    throw new Error("El cupo de pasajeros del itinerario ya esta completo");
  }

  const insertResult = await supabase.from("passenger").insert({
    account_id: publicItinerary.itinerary.accountId,
    birth_date: input.birthDate || null,
    email: input.email,
    gender: input.gender,
    is_main_passenger:
      input.isMainPassenger || publicItinerary.passengers.length === 0,
    itinerary_id: input.itineraryId,
    last_name: input.lastName,
    name: input.firstName,
    nationality: input.nationality,
    number_id: input.documentNumber,
    phone_number: input.phoneNumber,
    type_id: input.documentType,
  });

  if (insertResult.error) {
    throw new Error(
      insertResult.error.message || "No se pudo registrar el pasajero",
    );
  }
}

function mapPublicItem(row: PublicItineraryItemRow): PublicItineraryItem {
  const label = [row.product_name, row.rate_name, row.product_type]
    .map((value) => value?.trim())
    .find(Boolean);

  return {
    id: String(row.id),
    date: row.date,
    dayNumber: Math.max(row.day_number ?? 1, 1),
    destination: row.destination?.trim() || "Destino por confirmar",
    label: label || "Servicio por confirmar",
    productType: row.product_type?.trim() || "Servicio",
    quantity: Math.max(Number(row.quantity ?? 1), 1),
  };
}

function mapPublicPassenger(row: PublicPassengerRow): PublicPassenger {
  const fullName = [row.name, row.last_name].filter(Boolean).join(" ").trim();
  const document = [row.type_id, row.number_id].filter(Boolean).join(" ").trim();

  return {
    id: String(row.id),
    document,
    email: row.email?.trim() || "",
    fullName: fullName || "Pasajero sin nombre",
    isMainPassenger: row.is_main_passenger === true,
  };
}

async function getScheduledPaymentsForSchedule({
  itineraryId,
  lang,
  schedule,
  supabase,
}: {
  itineraryId: string;
  lang: "es" | "en";
  schedule: PublicPaymentScheduleRow;
  supabase: PublicItinerarySupabaseClient;
}): Promise<PublicScheduledPayment[]> {
  const { data, error } = await supabase
    .from("scheduled_payments")
    .select<PublicScheduledPaymentRow[]>(PUBLIC_SCHEDULED_PAYMENT_COLUMNS)
    .eq("schedule_id", schedule.id)
    .order("payment_number", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las cuotas");
  }

  return (data ?? []).map((row) =>
    mapScheduledPayment({
      fallbackCurrency: schedule.currency,
      itineraryId,
      lang,
      row,
    }),
  );
}

function mapScheduledPayment({
  fallbackCurrency,
  itineraryId,
  lang,
  row,
}: {
  fallbackCurrency: string | null;
  itineraryId: string;
  lang: "es" | "en";
  row: PublicScheduledPaymentRow;
}): PublicScheduledPayment {
  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency?.trim() || fallbackCurrency?.trim() || "COP",
    dueDate: row.due_date,
    paidAt: row.paid_at,
    paymentLink: buildPublicPaymentLink({
      itineraryId,
      lang,
      scheduledPaymentId: row.id,
    }),
    paymentNumber: Math.max(row.payment_number ?? 1, 1),
    status: row.status?.trim() || "pending",
  };
}

function buildPaymentPlan({
  activePaymentMethod,
  fallbackCurrency,
  schedule,
  scheduledPayments,
  totalAmount,
}: {
  activePaymentMethod: string | null;
  fallbackCurrency: string | null;
  schedule: PublicPaymentScheduleRow | null;
  scheduledPayments: PublicScheduledPayment[];
  totalAmount: number | null;
}): PublicPaymentPlan {
  const pendingAmount = scheduledPayments
    .filter((payment) => payment.status !== "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    currency: schedule?.currency?.trim() || fallbackCurrency?.trim() || "COP",
    onlinePaymentEnabled: normalizePaymentMethod(activePaymentMethod) === "stripe",
    payments: scheduledPayments,
    pendingAmount,
    scheduleId: schedule?.id ?? null,
    status: schedule?.status?.trim() || "not_configured",
    totalAmount: Number(schedule?.total_amount ?? totalAmount ?? 0),
  };
}

export function buildPublicPaymentLink({
  itineraryId,
  lang,
  scheduledPaymentId,
}: {
  itineraryId: string;
  lang: "es" | "en";
  scheduledPaymentId?: string | null;
}): string {
  const query = new URLSearchParams({ itinerary_id: itineraryId });
  if (scheduledPaymentId) {
    query.set("scheduled_payment_id", scheduledPaymentId);
  }

  return `/${lang}/payment/pay?${query.toString()}`;
}

function normalizePaymentMethod(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeLanguage(language: string | null): "es" | "en" {
  const normalized = language?.trim().toLowerCase();
  return normalized === "en" ||
    normalized === "english" ||
    normalized === "ingles"
    ? "en"
    : "es";
}
