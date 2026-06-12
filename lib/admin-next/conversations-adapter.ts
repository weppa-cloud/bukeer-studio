import type { AdminDataSourceMode } from "@bukeer/admin-contract";
import {
  conversationsFixture,
  type ConversationChannel,
  type ConversationMessage,
  type ConversationSignal,
  type ConversationSummary,
  type ConversationTone,
  type ConversationsFixture,
  type LeadTemperature,
} from "@/lib/admin-next/fixtures/conversations";

type SupabaseRpcResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseReadQuery<T> = PromiseLike<SupabaseRpcResponse<T>>;

interface SupabaseConversationsFilter<T> extends SupabaseReadQuery<T> {
  eq(column: string, value: unknown): SupabaseConversationsFilter<T>;
  in(
    column: string,
    values: readonly unknown[],
  ): SupabaseConversationsFilter<T>;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): SupabaseConversationsFilter<T>;
  limit(count: number): SupabaseConversationsFilter<T>;
}

interface SupabaseConversationsBuilder {
  select<T = unknown>(columns: string): SupabaseConversationsFilter<T>;
}

export interface AdminNextConversationsReadonlySupabaseClient {
  from(
    table: "requests" | "conversation_messages" | "chatwoot_events",
  ): SupabaseConversationsBuilder;
}

export interface ConversationsAdapter {
  readonly mode: AdminDataSourceMode;
  getConversations(): Promise<ConversationsFixture>;
}

export interface ConversationsAdapterOptions {
  readonly accountId?: string;
  readonly mode?: AdminDataSourceMode;
  readonly supabase?: AdminNextConversationsReadonlySupabaseClient;
}

type NumericValue = number | string | null | undefined;

type RequestConversationRow = {
  id: string;
  short_id: string | null;
  account_id: string;
  bukeer_contact_id: string | null;
  chatwoot_conversation_id: number;
  traveler_name: string | null;
  traveler_email: string | null;
  traveler_phone: string | null;
  status: string;
  pipeline_status: string | null;
  request_stage: string | null;
  lead_score: NumericValue;
  lead_score_label: string | null;
  lead_qualification: string | null;
  lead_source: string | null;
  destinations: string[] | null;
  budget: NumericValue;
  expected_value: NumericValue;
  currency_type: string | null;
  conversation_summary: string | null;
  preferred_channel: string | null;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  itinerary_id: string | null;
  special_requests: string | null;
  assigned_to: string | null;
  urgency: string | null;
  trip_type: string | null;
  adults: number | null;
  children: number | null;
  start_date: string | null;
  end_date: string | null;
};

type ConversationMessageRow = {
  id: string;
  conversation_id: number;
  content: string | null;
  message_type: string;
  private: boolean | null;
  sender_name: string | null;
  sender_type: string;
  chatwoot_created_at: string | null;
  created_at: string | null;
};

type ChatwootEventRow = {
  id: string;
  conversation_id: number;
  event_type: string;
  created_at: string | null;
  processed: boolean | null;
};

const REQUEST_COLUMNS = [
  "id",
  "short_id",
  "account_id",
  "bukeer_contact_id",
  "chatwoot_conversation_id",
  "traveler_name",
  "traveler_email",
  "traveler_phone",
  "status",
  "pipeline_status",
  "request_stage",
  "lead_score",
  "lead_score_label",
  "lead_qualification",
  "lead_source",
  "destinations",
  "budget",
  "expected_value",
  "currency_type",
  "conversation_summary",
  "preferred_channel",
  "last_message_at",
  "created_at",
  "updated_at",
  "itinerary_id",
  "special_requests",
  "assigned_to",
  "urgency",
  "trip_type",
  "adults",
  "children",
  "start_date",
  "end_date",
].join(",");
const MESSAGE_COLUMNS =
  "id,conversation_id,content,message_type,private,sender_name,sender_type,chatwoot_created_at,created_at";
const EVENT_COLUMNS = "id,conversation_id,event_type,created_at,processed";
const READONLY_CONVERSATION_LIMIT = 25;
const READONLY_MESSAGE_LIMIT = 120;
const READONLY_EVENT_LIMIT = 80;

export function createConversationsAdapter(
  options: AdminDataSourceMode | ConversationsAdapterOptions = "fixture",
): ConversationsAdapter {
  const normalized = typeof options === "string" ? { mode: options } : options;
  const mode = normalized.mode ?? "fixture";

  if (mode === "readonly" && normalized.supabase && normalized.accountId) {
    return new ReadonlyConversationsAdapter(
      normalized.supabase,
      normalized.accountId,
    );
  }

  return new FixtureConversationsAdapter(mode);
}

class FixtureConversationsAdapter implements ConversationsAdapter {
  constructor(readonly mode: AdminDataSourceMode) {}

  async getConversations(): Promise<ConversationsFixture> {
    return conversationsFixture;
  }
}

class ReadonlyConversationsAdapter implements ConversationsAdapter {
  readonly mode = "readonly" as const;

  constructor(
    private readonly supabase: AdminNextConversationsReadonlySupabaseClient,
    private readonly accountId: string,
  ) {}

  async getConversations(): Promise<ConversationsFixture> {
    const { data: latestMessages, error: latestMessagesError } =
      await this.supabase
        .from("conversation_messages")
        .select<ConversationMessageRow[]>(MESSAGE_COLUMNS)
        .eq("account_id", this.accountId)
        .order("chatwoot_created_at", { ascending: false })
        .limit(READONLY_MESSAGE_LIMIT);

    assertReadableResponse("conversation_messages", latestMessagesError);

    const messageConversationIds = uniqueNumbers(
      (latestMessages ?? []).map((message) => message.conversation_id),
    );
    const requestQuery = this.supabase
      .from("requests")
      .select<RequestConversationRow[]>(REQUEST_COLUMNS)
      .eq("account_id", this.accountId)
      .limit(READONLY_CONVERSATION_LIMIT);
    const { data: requests, error: requestsError } =
      messageConversationIds.length > 0
        ? await requestQuery.in(
            "chatwoot_conversation_id",
            messageConversationIds,
          )
        : await requestQuery.order("last_message_at", { ascending: false });

    assertReadableResponse("requests", requestsError);

    const requestRows = requests ?? [];
    if (requestRows.length === 0) return conversationsFixture;

    const conversationIds = uniqueNumbers(
      requestRows.map((request) => request.chatwoot_conversation_id),
    );
    const [conversationMessagesResult, eventsResult] = await Promise.all([
      messageConversationIds.length > 0
        ? Promise.resolve({ data: latestMessages ?? [], error: null })
        : this.supabase
            .from("conversation_messages")
            .select<ConversationMessageRow[]>(MESSAGE_COLUMNS)
            .eq("account_id", this.accountId)
            .in("conversation_id", conversationIds)
            .order("chatwoot_created_at", { ascending: true })
            .limit(READONLY_MESSAGE_LIMIT),
      this.supabase
        .from("chatwoot_events")
        .select<ChatwootEventRow[]>(EVENT_COLUMNS)
        .eq("account_id", this.accountId)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(READONLY_EVENT_LIMIT),
    ]);

    assertReadableResponse(
      "conversation_messages",
      conversationMessagesResult.error,
    );
    assertReadableResponse("chatwoot_events", eventsResult.error);

    return buildReadonlyConversationsFixture({
      requests: requestRows,
      messages: conversationMessagesResult.data ?? [],
      events: eventsResult.data ?? [],
    });
  }
}

function buildReadonlyConversationsFixture({
  requests,
  messages,
  events,
}: {
  requests: readonly RequestConversationRow[];
  messages: readonly ConversationMessageRow[];
  events: readonly ChatwootEventRow[];
}): ConversationsFixture {
  const messagesByConversation = groupByNumber(
    messages,
    (message) => message.conversation_id,
  );
  const eventsByConversation = groupByNumber(
    events,
    (event) => event.conversation_id,
  );
  const orderedRequests = dedupeRequestsByConversation(
    requests
      .slice()
      .sort(
        (left, right) =>
          latestConversationTimestamp(
            messagesByConversation.get(right.chatwoot_conversation_id) ?? [],
          ) -
          latestConversationTimestamp(
            messagesByConversation.get(left.chatwoot_conversation_id) ?? [],
          ),
      ),
  );
  const summaries = orderedRequests.map((request) =>
    mapConversationSummary({
      request,
      messages:
        messagesByConversation.get(request.chatwoot_conversation_id) ?? [],
    }),
  );
  const selectedRequest = orderedRequests[0];
  const selectedMessages =
    messagesByConversation.get(selectedRequest.chatwoot_conversation_id) ?? [];
  const selectedEvents =
    eventsByConversation.get(selectedRequest.chatwoot_conversation_id) ?? [];
  const selectedSummary = summaries[0];
  const latestEvent = selectedEvents[0];

  return {
    conversations: summaries,
    selected: {
      ...selectedSummary,
      messages: buildMessages(selectedRequest, selectedMessages),
      notes: [
        {
          id: "summary",
          title: "Resumen CRM",
          body: firstNonEmpty(
            selectedRequest.conversation_summary,
            selectedRequest.special_requests,
            "Solicitud sincronizada desde el backend compartido.",
          ),
        },
        {
          id: "source",
          title: "Origen",
          body:
            [
              selectedRequest.lead_source,
              selectedRequest.trip_type,
              selectedRequest.urgency,
            ]
              .filter(Boolean)
              .join(" · ") || "Origen pendiente por completar.",
        },
      ],
      closeReasons: conversationsFixture.selected.closeReasons,
      crm: {
        contactId: firstNonEmpty(
          selectedRequest.bukeer_contact_id,
          selectedRequest.short_id,
          selectedRequest.id,
        ),
        phone: firstNonEmpty(
          selectedRequest.traveler_phone,
          "Telefono pendiente",
        ),
        email: firstNonEmpty(selectedRequest.traveler_email, "Email pendiente"),
        document: "Documento pendiente",
        lastPurchase: firstNonEmpty(selectedRequest.status, "Sin historial"),
        totalValue: selectedSummary.valueLabel,
        preference: firstNonEmpty(
          destinationLabel(selectedRequest),
          selectedRequest.special_requests,
          "Preferencia pendiente",
        ),
      },
      realtime: {
        provider: "Chatwoot mirror",
        mirrorLabel: latestEvent
          ? "Mirror conectado"
          : "Mirror sin eventos recientes",
        latencyLabel: "<= Flutter/Chatwoot",
        updatedAt: timeLabel(
          latestEvent?.created_at ||
            selectedRequest.last_message_at ||
            selectedRequest.updated_at ||
            selectedRequest.created_at,
        ),
      },
      linkedItinerary: {
        id: selectedSummary.itineraryId,
        title: firstNonEmpty(
          destinationLabel(selectedRequest),
          selectedRequest.conversation_summary,
          "Solicitud CRM",
        ),
        state: firstNonEmpty(
          selectedRequest.pipeline_status,
          selectedRequest.request_stage,
          selectedRequest.status,
        ),
        margin: selectedSummary.valueLabel,
      },
      requestDraft: {
        title: firstNonEmpty(selectedRequest.short_id, "Solicitud activa"),
        destination: destinationLabel(selectedRequest) || "Destino pendiente",
        pax: paxLabel(selectedRequest),
        dates: datesLabel(selectedRequest),
      },
    },
    signals: buildSignals(requests, events),
    templates: conversationsFixture.templates,
  };
}

function mapConversationSummary({
  request,
  messages,
}: {
  request: RequestConversationRow;
  messages: readonly ConversationMessageRow[];
}): ConversationSummary {
  const lastMessage = newestMessage(messages);
  const status = normalizeStatus(request);
  const temperature = normalizeTemperature(request);

  return {
    id: String(request.chatwoot_conversation_id || request.id),
    customerName: firstNonEmpty(
      request.traveler_name,
      request.traveler_email,
      `Solicitud ${request.short_id || request.id.slice(0, 8)}`,
    ),
    agencyLabel: firstNonEmpty(
      destinationLabel(request),
      request.lead_source,
      "CRM Bukeer",
    ),
    channel: normalizeChannel(request),
    status,
    tone: toneForConversation(status, temperature),
    temperature,
    lastMessage: firstNonEmpty(
      lastMessage?.content,
      request.conversation_summary,
      request.special_requests,
      "Conversacion sincronizada desde Chatwoot.",
    ),
    lastMessageAt: relativeTimeLabel(
      lastMessage?.chatwoot_created_at ||
        lastMessage?.created_at ||
        request.last_message_at ||
        request.updated_at ||
        request.created_at,
    ),
    unreadCount: status === "open" ? Math.min(messages.length, 9) : 0,
    itineraryId: firstNonEmpty(
      request.itinerary_id,
      request.short_id ? `REQ-${request.short_id}` : null,
      `REQ-${request.id.slice(0, 8)}`,
    ),
    valueLabel: formatMoney(
      moneyValue(request.expected_value) || moneyValue(request.budget),
    ),
    owner: firstNonEmpty(request.assigned_to, "Equipo comercial"),
    slaLabel: slaLabel(request),
  };
}

function buildMessages(
  request: RequestConversationRow,
  messages: readonly ConversationMessageRow[],
): ConversationMessage[] {
  const mapped = messages
    .filter((message) => Boolean(message.content?.trim()))
    .slice()
    .sort((left, right) => timestamp(left) - timestamp(right))
    .slice(-8)
    .map((message) => ({
      id: message.id,
      author: messageAuthor(message),
      authorName: firstNonEmpty(
        message.sender_name,
        authorFallbackName(message),
      ),
      body: message.content?.trim() ?? "",
      timestamp: timeLabel(message.chatwoot_created_at || message.created_at),
      state: message.private ? "Nota privada" : undefined,
    }));

  if (mapped.length > 0) return mapped;

  return [
    {
      id: `request-${request.id}`,
      author: "customer",
      authorName: firstNonEmpty(request.traveler_name, "Cliente"),
      body: firstNonEmpty(
        request.conversation_summary,
        request.special_requests,
        "Solicitud CRM sin mensajes visibles aun.",
      ),
      timestamp: timeLabel(request.last_message_at || request.created_at),
    },
  ];
}

function buildSignals(
  requests: readonly RequestConversationRow[],
  events: readonly ChatwootEventRow[],
): ConversationSignal[] {
  const open = requests.filter(
    (request) => normalizeStatus(request) === "open",
  ).length;
  const waiting = requests.filter(
    (request) => normalizeStatus(request) === "waiting",
  ).length;
  const latestEvent = events[0];
  const processed = events.filter((event) => event.processed).length;

  return [
    {
      id: "realtime",
      label: "Realtime",
      value: latestEvent ? latestEvent.event_type : "Sin evento reciente",
      tone: latestEvent ? "live" : "warning",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      value: `${open} abiertas · ${waiting} en espera`,
      tone: open > 0 ? "primary" : "warning",
    },
    {
      id: "mirror",
      label: "Mirror Chatwoot",
      value: `${processed}/${events.length} procesados`,
      tone:
        events.length === 0 || processed < events.length ? "warning" : "live",
    },
  ];
}

function normalizeStatus(
  request: RequestConversationRow,
): ConversationSummary["status"] {
  const value =
    `${request.pipeline_status ?? request.request_stage ?? request.status}`
      .trim()
      .toLowerCase();
  if (
    value.includes("closed") ||
    value.includes("lost") ||
    value.includes("won")
  ) {
    return "closed";
  }
  if (
    value.includes("wait") ||
    value.includes("pending") ||
    value.includes("proposal")
  ) {
    return "waiting";
  }
  return "open";
}

function normalizeTemperature(
  request: RequestConversationRow,
): LeadTemperature {
  const label =
    `${request.lead_score_label ?? request.lead_qualification ?? request.urgency ?? ""}`
      .trim()
      .toLowerCase();
  const score = moneyValue(request.lead_score);

  if (
    label.includes("hot") ||
    label.includes("caliente") ||
    label.includes("alta") ||
    score >= 70
  ) {
    return "hot";
  }
  if (
    label.includes("warm") ||
    label.includes("tibio") ||
    label.includes("media") ||
    score >= 35
  ) {
    return "warm";
  }
  return "cold";
}

function normalizeChannel(
  request: RequestConversationRow,
): ConversationChannel {
  const value = `${request.preferred_channel ?? request.lead_source ?? ""}`
    .trim()
    .toLowerCase();
  if (value.includes("mail") || value.includes("email")) return "email";
  if (value.includes("web") || value.includes("site") || value.includes("form"))
    return "web";
  return "whatsapp";
}

function toneForConversation(
  status: ConversationSummary["status"],
  temperature: LeadTemperature,
): ConversationTone {
  if (status === "waiting") return "warning";
  if (temperature === "hot") return "live";
  return "primary";
}

function messageAuthor(
  message: ConversationMessageRow,
): ConversationMessage["author"] {
  const type = `${message.sender_type} ${message.message_type}`.toLowerCase();
  if (type.includes("bot") || type.includes("assistant")) return "assistant";
  if (
    message.private ||
    type.includes("outgoing") ||
    type.includes("agent") ||
    type.includes("user")
  ) {
    return "agent";
  }
  return "customer";
}

function newestMessage(
  messages: readonly ConversationMessageRow[],
): ConversationMessageRow | undefined {
  return messages
    .filter((message) => Boolean(message.content?.trim()))
    .slice()
    .sort((left, right) => timestamp(right) - timestamp(left))[0];
}

function authorFallbackName(message: ConversationMessageRow): string {
  const author = messageAuthor(message);
  if (author === "agent") return "Agente Bukeer";
  if (author === "assistant") return "IA Bukeer";
  return "Cliente";
}

function destinationLabel(request: RequestConversationRow): string {
  return request.destinations?.filter(Boolean).join(", ") ?? "";
}

function paxLabel(request: RequestConversationRow): string {
  const adults = request.adults ?? 0;
  const children = request.children ?? 0;
  const total = adults + children;
  if (total > 0) return `${total} pax`;
  return "Pax pendiente";
}

function datesLabel(request: RequestConversationRow): string {
  if (request.start_date && request.end_date) {
    return `${shortDate(request.start_date)} - ${shortDate(request.end_date)}`;
  }
  if (request.start_date) return shortDate(request.start_date);
  return "Fechas pendientes";
}

function slaLabel(request: RequestConversationRow): string {
  const last =
    request.last_message_at || request.updated_at || request.created_at;
  if (!last) return "SLA pendiente";
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - timestampValue(last)) / 60000),
  );
  if (ageMinutes < 60) return `SLA ${ageMinutes} min`;
  return `SLA ${Math.round(ageMinutes / 60)}h`;
}

function relativeTimeLabel(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - timestampValue(value)) / 60000),
  );
  if (ageMinutes < 1) return "Ahora";
  if (ageMinutes < 60) return `Hace ${ageMinutes} min`;
  if (ageMinutes < 1440) return `Hace ${Math.round(ageMinutes / 60)} h`;
  return `Hace ${Math.round(ageMinutes / 1440)} d`;
}

function timeLabel(value: string | null | undefined): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

function formatMoney(amount: number): string {
  if (amount <= 0) return "$0";
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

function moneyValue(value: NumericValue): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function firstNonEmpty(
  ...values: Array<string | number | null | undefined>
): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text.length > 0) return text;
  }
  return "";
}

function uniqueNumbers(values: readonly unknown[]): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "number" ? value : Number(value)))
        .filter((value) => Number.isFinite(value)),
    ),
  );
}

function groupByNumber<T>(
  rows: readonly T[],
  keyOf: (row: T) => number,
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }
  return grouped;
}

function dedupeRequestsByConversation(
  requests: readonly RequestConversationRow[],
): RequestConversationRow[] {
  const seen = new Set<number>();
  const deduped: RequestConversationRow[] = [];
  for (const request of requests) {
    if (seen.has(request.chatwoot_conversation_id)) continue;
    seen.add(request.chatwoot_conversation_id);
    deduped.push(request);
  }
  return deduped;
}

function timestamp(message: ConversationMessageRow): number {
  return timestampValue(message.chatwoot_created_at || message.created_at);
}

function latestConversationTimestamp(
  messages: readonly ConversationMessageRow[],
): number {
  const visibleMessageTimestamps = messages
    .filter((message) => Boolean(message.content?.trim()))
    .map(timestamp);
  if (visibleMessageTimestamps.length > 0) {
    return Math.max(...visibleMessageTimestamps);
  }

  return 0;
}

function timestampValue(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function assertReadableResponse(
  table: string,
  error: { message?: string } | null,
) {
  if (!error) return;
  throw new Error(
    `Conversations readonly adapter failed for ${table}: ${error.message ?? "unknown error"}`,
  );
}
