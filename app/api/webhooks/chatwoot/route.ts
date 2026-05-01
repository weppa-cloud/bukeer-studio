/**
 * POST /api/webhooks/chatwoot
 *
 * Chatwoot lifecycle webhook for Meta conversion tracking. Native Chatwoot
 * account webhooks cannot send custom HMAC headers, so production uses a
 * secret URL token while tests/relays can still use HMAC + replay checks.
 * After auth, the handler follows ADR-018 provider idempotency, Zod parsing,
 * then business logic.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { z } from "zod";

import {
  apiError,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "@/lib/api";
import { parseAttribution } from "@/lib/growth/attribution-parser";
import { buildEventId } from "@/lib/growth/event-id";
import { insertFunnelEvent } from "@/lib/growth/funnel-events";
import { createLogger } from "@/lib/logger";
import { sendMetaConversionEvent } from "@/lib/meta/conversions-api";
import { GrowthAttributionSchema } from "@bukeer/website-contract";
import type {
  GrowthAttribution,
  FunnelEventIngest,
  FunnelEventName,
  GrowthMarket,
} from "@bukeer/website-contract";

export const runtime = "nodejs";

const log = createLogger("api.webhooks.chatwoot");
const PROVIDER = "chatwoot";
const REPLAY_PAST_SECONDS = 5 * 60;
const REPLAY_FUTURE_SECONDS = 60;
const REF_PATTERN = /#ref:\s*([A-Z0-9][A-Z0-9-]{3,39})/i;
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const ChatwootEventSchema = z
  .object({
    event: z.string().trim().min(1),
    id: z.union([z.string(), z.number()]).optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    conversation: z.record(z.string(), JsonValueSchema).optional(),
    message: z.record(z.string(), JsonValueSchema).optional(),
    messages: z.array(z.record(z.string(), JsonValueSchema)).optional(),
    custom_attributes: z.record(z.string(), JsonValueSchema).optional(),
    meta: z.record(z.string(), JsonValueSchema).optional(),
    content: z.string().optional(),
  })
  .passthrough();

type ChatwootPayload = z.infer<typeof ChatwootEventSchema>;
type JsonRecord = Record<string, unknown>;
type LifecycleEvent =
  | "ConversationCreated"
  | "ConversationContinued"
  | "QualifiedLead"
  | "QuoteSent";
type ChatwootGrowthAttributeValue = string | number | boolean | null;

function mapLifecycleToMetaEvent(lifecycleEvent: LifecycleEvent): string {
  // Meta business_messaging CAPI accepts a constrained event-name set.
  // Keep Bukeer's lifecycle in custom_data/trace and send a valid Meta name.
  switch (lifecycleEvent) {
    case "ConversationCreated":
    case "ConversationContinued":
    case "QualifiedLead":
    case "QuoteSent":
      return "LeadSubmitted";
  }
}

function resolveMetaWhatsAppPageId(): string | null {
  return (
    cleanString(process.env.META_WHATSAPP_PAGE_ID) ??
    cleanString(process.env.META_PAGE_ID)
  );
}

interface WaflowLeadRow {
  id: string;
  account_id: string | null;
  website_id: string | null;
  reference_code: string | null;
  session_key: string | null;
  payload: JsonRecord | null;
  source_ip: string | null;
  source_user_agent: string | null;
}

interface CrmRequestRow {
  id: string;
  short_id: string | null;
  custom_fields: JsonRecord | null;
  lead_source: string | null;
  lead_source_detail: string | null;
}

interface CrmRequestLinkResult {
  requestId: string | null;
  shortId: string | null;
  status: "linked" | "conflict" | "not_found";
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables for Chatwoot webhook API",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readNestedRecord(record: JsonRecord, key: string): JsonRecord {
  return readRecord(record[key]);
}

function readNestedString(record: JsonRecord, key: string): string | null {
  return cleanString(record[key]) ?? readId(record[key]);
}

function findNestedString(record: JsonRecord, keys: string[]): string | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const stack: unknown[] = [record];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (typeof current !== "object" || current === null) continue;
    for (const [key, value] of Object.entries(current as JsonRecord)) {
      if (wanted.has(key.toLowerCase())) {
        const found = cleanString(value) ?? readId(value);
        if (found) return found;
      }
      if (typeof value === "object" && value !== null) stack.push(value);
    }
  }
  return null;
}

function extractCtwaClid(payload: ChatwootPayload, leadPayload: JsonRecord): string | null {
  return (
    findNestedString(readRecord(payload), ["ctwa_clid", "ctwaClid"]) ??
    findNestedString(leadPayload, ["ctwa_clid", "ctwaClid"])
  );
}

function extractCustomAttributes(payload: ChatwootPayload): JsonRecord {
  const conversation = extractConversation(payload);
  return {
    ...readNestedRecord(conversation, "custom_attributes"),
    ...readNestedRecord(payload.message ?? {}, "custom_attributes"),
    ...readRecord(payload.custom_attributes),
  };
}

function extractConversation(payload: ChatwootPayload): JsonRecord {
  return {
    ...readRecord(payload.conversation),
    ...readNestedRecord(payload.message ?? {}, "conversation"),
  };
}

function extractConversationMessages(payload: ChatwootPayload): JsonRecord[] {
  const messages = extractConversation(payload).messages;
  return Array.isArray(messages) ? messages.map(readRecord) : [];
}

function extractConversationId(payload: ChatwootPayload): string | null {
  const conversation = extractConversation(payload);
  return (
    readNestedString(conversation, "id") ??
    readNestedString(payload.message ?? {}, "conversation_id") ??
    readNestedString(payload as JsonRecord, "conversation_id")
  );
}

function extractConversationInboxId(payload: ChatwootPayload): number | null {
  const conversation = extractConversation(payload);
  const candidates = [
    readNestedString(conversation, "inbox_id"),
    readNestedString(readNestedRecord(conversation, "inbox"), "id"),
    readNestedString(payload.message ?? {}, "inbox_id"),
  ];

  for (const candidate of candidates) {
    const parsed = parsePositiveInteger(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function extractContact(payload: ChatwootPayload): JsonRecord {
  const conversation = extractConversation(payload);
  return {
    ...readNestedRecord(conversation, "contact"),
    ...readNestedRecord(payload.message ?? {}, "sender"),
  };
}

function extractMessageText(payload: ChatwootPayload): string {
  const conversationMessages = extractConversationMessages(payload);
  const textParts = [
    payload.content,
    cleanString(payload.message?.content),
    cleanString(payload.message?.processed_message_content),
    ...(payload.messages ?? []).map((message) => cleanString(message.content)),
    ...conversationMessages.map((message) => cleanString(message.content)),
    ...conversationMessages.map((message) =>
      cleanString(message.processed_message_content),
    ),
  ];
  return textParts.filter(Boolean).join("\n");
}

function extractReferenceCode(payload: ChatwootPayload): string | null {
  const attrs = extractCustomAttributes(payload);
  const direct =
    cleanString(attrs.reference_code) ??
    cleanString(attrs.referenceCode) ??
    cleanString(attrs.growth_current_reference_code) ??
    cleanString(attrs.growth_last_reference_code) ??
    cleanString(attrs.growth_reference_code) ??
    cleanString(attrs.waflow_reference_code) ??
    cleanString(attrs.waflow_ref);
  if (direct) return direct.toUpperCase();

  const history = attrs.growth_reference_history;
  if (Array.isArray(history)) {
    const latest = history
      .map((item) =>
        typeof item === "string"
          ? item
          : cleanString(readRecord(item).reference_code),
      )
      .filter(Boolean)
      .at(-1);
    if (latest) return latest.toUpperCase();
  }
  if (typeof history === "string" && history.trim()) {
    try {
      const parsed = JSON.parse(history) as unknown;
      if (Array.isArray(parsed)) {
        const latest = parsed
          .map((item) =>
            typeof item === "string"
              ? item
              : cleanString(readRecord(item).reference_code),
          )
          .filter(Boolean)
          .at(-1);
        if (latest) return latest.toUpperCase();
      }
    } catch {
      const latest = history
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .at(-1);
      if (latest) return latest.toUpperCase();
    }
  }

  const match = extractMessageText(payload).match(REF_PATTERN);
  return match?.[1]?.toUpperCase() ?? null;
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseWebhookTimestamp(
  payload: ChatwootPayload,
  headerValue: string | null,
): number | null {
  const raw = headerValue ?? payload.timestamp;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 10_000_000_000 ? Math.floor(raw / 1000) : Math.floor(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return numeric > 10_000_000_000
        ? Math.floor(numeric / 1000)
        : Math.floor(numeric);
    }
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  }
  return null;
}

function resolveProviderEventId(
  payload: ChatwootPayload,
  conversationId: string | null,
): string {
  const messageId = readNestedString(payload.message ?? {}, "id");
  const payloadId = readId(payload.id);
  return (
    payloadId ??
    [payload.event, conversationId, messageId].filter(Boolean).join(":")
  );
}

function isQualified(attrs: JsonRecord, payload: ChatwootPayload): boolean {
  const conversation = extractConversation(payload);
  const conversationLabels = conversation.labels;
  const payloadLabels = (payload as JsonRecord).labels;
  const labels = [
    ...(Array.isArray(conversationLabels) ? conversationLabels : []),
    ...(Array.isArray(payloadLabels) ? payloadLabels : []),
  ].map((label) => String(label).toLowerCase());
  const status = [
    attrs.qualification_status,
    attrs.lead_status,
    attrs.lifecycle_stage,
    attrs.stage,
    attrs.qualified,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .filter(Boolean);
  return [...labels, ...status].some((value) =>
    ["qualified", "qualified_lead", "lead_qualified", "sql"].includes(value),
  );
}

function isQuoteSent(attrs: JsonRecord, payload: ChatwootPayload): boolean {
  const flags = [
    attrs.quote_sent,
    attrs.quote_status,
    attrs.lifecycle_stage,
    attrs.stage,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .filter(Boolean);
  if (
    flags.some((value) =>
      ["true", "sent", "quote_sent", "quoted"].includes(value),
    )
  ) {
    return true;
  }
  return /\b(cotizaci[oó]n|quote|proposal|propuesta)\b/i.test(
    extractMessageText(payload),
  );
}

function mapLifecycleEvents(payload: ChatwootPayload): LifecycleEvent[] {
  const attrs = extractCustomAttributes(payload);
  const events = new Set<LifecycleEvent>();
  const eventName = payload.event.toLowerCase();

  if (eventName === "conversation_created") {
    events.add("ConversationCreated");
  }

  if (
    eventName === "conversation_updated" ||
    eventName === "conversation_status_changed" ||
    eventName === "message_created"
  ) {
    events.add("ConversationContinued");
  }

  if (isQualified(attrs, payload)) events.add("QualifiedLead");
  if (isQuoteSent(attrs, payload)) events.add("QuoteSent");

  return [...events];
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const normalized = signature.replace(/^sha256=/i, "").trim();
  const expectedRaw = await hmacHex(secret, rawBody);
  if (timingSafeEqual(normalized, expectedRaw)) return true;

  // Some webhook relays sign the conventional "timestamp.body" payload.
  return false;
}

async function resolveWebhookAuth(
  request: NextRequest,
  rawBody: string,
  secret: string,
): Promise<
  { ok: true; method: "hmac" | "token"; signature: string } | { ok: false }
> {
  const signature =
    request.headers.get("x-chatwoot-signature") ??
    request.headers.get("x-bukeer-signature") ??
    request.headers.get("x-signature");
  if (signature) {
    const ok = await verifySignature(rawBody, signature, secret);
    return ok ? { ok: true, method: "hmac", signature } : { ok: false };
  }

  const token =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-chatwoot-webhook-token") ??
    request.headers.get("x-bukeer-webhook-token");
  if (token && timingSafeEqual(token, secret)) {
    return { ok: true, method: "token", signature: "token" };
  }

  return { ok: false };
}

async function insertWebhookEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  payload: ChatwootPayload,
  eventId: string,
  signature: string,
): Promise<"inserted" | "duplicate"> {
  const { error } = await supabase.from("webhook_events").insert({
    provider: PROVIDER,
    event_id: eventId,
    event_type: payload.event,
    signature,
    payload,
  });

  if (!error) return "inserted";
  if (error.code === "23505") return "duplicate";
  throw new Error(error.message);
}

async function markWebhookEvent(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  eventId: string,
  status: "processed" | "failed",
  error?: string,
): Promise<void> {
  await supabase
    .from("webhook_events")
    .update({
      status,
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("provider", PROVIDER)
    .eq("event_id", eventId);
}

async function findWaflowLead(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  referenceCode: string | null,
): Promise<WaflowLeadRow | null> {
  if (referenceCode) {
    const { data, error } = await supabase
      .from("waflow_leads")
      .select(
        "id,account_id,website_id,reference_code,session_key,payload,source_ip,source_user_agent",
      )
      .eq("reference_code", referenceCode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<WaflowLeadRow>();
    if (error) throw new Error(error.message);
    if (data) return data;
  }

  return null;
}

function readCrmRequestId(value: unknown): string | null {
  if (typeof value === "string" && UUID_PATTERN.test(value)) return value;
  const record = readRecord(value);
  const requestId =
    cleanString(record.request_id) ??
    cleanString(record.id) ??
    cleanString(record.requestId);
  return requestId && UUID_PATTERN.test(requestId) ? requestId : null;
}

function deriveCrmLeadSource(leadPayload: JsonRecord): string {
  const attribution = readRecord(leadPayload.attribution);
  const utm = readRecord(attribution.utm);
  const clickIds = readRecord(attribution.click_ids);
  const channel = cleanString(attribution.channel)?.toLowerCase();
  const utmSource =
    cleanString(utm.utm_source)?.toLowerCase() ??
    cleanString(attribution.utm_source)?.toLowerCase();
  const utmMedium =
    cleanString(utm.utm_medium)?.toLowerCase() ??
    cleanString(attribution.utm_medium)?.toLowerCase();
  const referrer = cleanString(attribution.referrer)?.toLowerCase();

  if (
    cleanString(clickIds.gclid) ||
    cleanString(clickIds.gbraid) ||
    cleanString(clickIds.wbraid) ||
    channel === "google_ads" ||
    (utmSource?.includes("google") &&
      ["cpc", "paid", "paidsearch", "ppc"].includes(utmMedium ?? ""))
  ) {
    return "google_ads";
  }

  if (
    cleanString(clickIds.fbclid) ||
    channel === "meta" ||
    (utmSource &&
      ["facebook", "fb", "meta"].some((source) => utmSource.includes(source)))
  ) {
    return "facebook_ads";
  }

  if (
    channel === "tiktok" ||
    cleanString(clickIds.ttclid) ||
    utmSource?.includes("tiktok")
  ) {
    return "organic_social";
  }

  if (utmSource?.includes("instagram") || utmSource === "ig") {
    return ["cpc", "paid", "paid_social"].includes(utmMedium ?? "")
      ? "instagram_ads"
      : "organic_social";
  }

  if (channel === "seo" || utmMedium === "organic") return "organic_search";
  if (channel === "email" || utmMedium === "email") return "email_campaign";
  if (channel === "referral" || utmMedium === "referral") return "referral";
  if (channel === "whatsapp" || utmSource === "whatsapp") return "whatsapp";
  if (referrer) return "referral";
  return "direct";
}

function shouldUpdateLeadSource(
  existingLeadSource: string | null,
  derivedLeadSource: string,
): boolean {
  const existing = cleanString(existingLeadSource)?.toLowerCase();
  if (!existing || existing === "unknown") return true;
  if (existing === "direct" && derivedLeadSource !== "direct") return true;
  return false;
}

function buildCrmLeadSourceDetail(
  lead: WaflowLeadRow,
  leadPayload: JsonRecord,
): string {
  const attribution = readRecord(leadPayload.attribution);
  const utm = readRecord(attribution.utm);
  const parts = [
    "Growth",
    lead.reference_code ? `ref=${lead.reference_code}` : null,
    cleanString(attribution.channel)
      ? `channel=${cleanString(attribution.channel)}`
      : null,
    cleanString(attribution.page_path)
      ? `page=${cleanString(attribution.page_path)}`
      : null,
    cleanString(utm.utm_source)
      ? `utm_source=${cleanString(utm.utm_source)}`
      : null,
    cleanString(utm.utm_medium)
      ? `utm_medium=${cleanString(utm.utm_medium)}`
      : null,
    cleanString(utm.utm_campaign)
      ? `utm_campaign=${cleanString(utm.utm_campaign)}`
      : null,
  ].filter(Boolean);

  return parts.join(" | ").slice(0, 500);
}

function readGrowthReference(customFields: JsonRecord | null): string | null {
  const fields = customFields ?? {};
  const reference =
    cleanString(fields.growth_reference_code) ??
    cleanString(fields.reference_code) ??
    cleanString(fields.waflow_reference_code) ??
    cleanString(readNestedRecord(fields, "waflow").reference_code);
  return reference?.toUpperCase() ?? null;
}

async function findCrmRequestByGrowthReference(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lead: WaflowLeadRow,
): Promise<CrmRequestRow | null> {
  if (!lead.account_id || !lead.reference_code) return null;

  const { data, error } = await supabase
    .from("requests")
    .select("id,short_id,custom_fields,lead_source,lead_source_detail")
    .eq("account_id", lead.account_id)
    .eq("custom_fields->>growth_reference_code", lead.reference_code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CrmRequestRow>();

  if (error) throw new Error(error.message);
  return data ?? null;
}

async function findOrCreateCrmRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lead: WaflowLeadRow,
  payload: ChatwootPayload,
  conversationId: string,
): Promise<CrmRequestRow | null> {
  if (!lead.account_id) return null;

  const existingByReference = await findCrmRequestByGrowthReference(
    supabase,
    lead,
  );
  if (existingByReference) return existingByReference;

  const conversationNumericId = parsePositiveInteger(conversationId);
  if (!conversationNumericId) return null;

  const existing = await supabase
    .from("requests")
    .select("id,short_id,custom_fields,lead_source,lead_source_detail")
    .eq("account_id", lead.account_id)
    .eq("chatwoot_conversation_id", conversationNumericId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CrmRequestRow>();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    const existingReference = readGrowthReference(existing.data.custom_fields);
    if (
      existingReference &&
      lead.reference_code &&
      existingReference !== lead.reference_code
    ) {
      log.info("crm_request_conversation_reference_mismatch_reference_first", {
        request_id: existing.data.id,
        short_id: existing.data.short_id,
        conversation_id: conversationId,
        existing_reference: existingReference,
        incoming_reference: lead.reference_code,
      });
      // One WhatsApp thread can legitimately contain multiple WAFlow requests.
      // Keep the old conversation-linked request intact and delegate to the
      // reference-first RPC so it can find/create the request for this ref.
    } else {
      return existing.data;
    }
  }

  const inboxId = extractConversationInboxId(payload);
  if (!inboxId) return null;

  const contact = extractContact(payload);
  const leadPayload = readRecord(lead.payload);
  const rpc = await supabase.rpc("find_or_create_request", {
    p_account_id: lead.account_id,
    p_chatwoot_conversation_id: conversationNumericId,
    p_chatwoot_inbox_id: inboxId,
    p_chatwoot_contact_id: parsePositiveInteger(
      readNestedString(contact, "id"),
    ),
    p_contact_phone:
      cleanString(contact.phone_number) ??
      cleanString(contact.phone) ??
      cleanString(leadPayload.phone),
    p_contact_email:
      cleanString(contact.email) ?? cleanString(leadPayload.email),
    p_contact_name: cleanString(contact.name) ?? cleanString(leadPayload.name),
    p_growth_reference_code: lead.reference_code,
  });

  if (rpc.error) throw new Error(rpc.error.message);

  const requestId = readCrmRequestId(rpc.data);
  if (!requestId) return null;

  const created = await supabase
    .from("requests")
    .select("id,short_id,custom_fields,lead_source,lead_source_detail")
    .eq("id", requestId)
    .maybeSingle<CrmRequestRow>();

  if (created.error) throw new Error(created.error.message);
  return created.data ?? null;
}

async function linkWaflowLeadToCrmRequest(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lead: WaflowLeadRow,
  payload: ChatwootPayload,
  conversationId: string,
  lifecycleEvents: LifecycleEvent[],
): Promise<CrmRequestLinkResult> {
  if (!lead.reference_code) {
    return { requestId: null, shortId: null, status: "not_found" };
  }

  const request = await findOrCreateCrmRequest(
    supabase,
    lead,
    payload,
    conversationId,
  );
  if (!request) return { requestId: null, shortId: null, status: "not_found" };

  const customFields = request.custom_fields ?? {};
  const existingReference = readGrowthReference(customFields);

  if (existingReference && existingReference !== lead.reference_code) {
    log.warn("crm_request_reference_conflict", {
      request_id: request.id,
      short_id: request.short_id,
      existing_reference: existingReference,
      incoming_reference: lead.reference_code,
    });
    return {
      requestId: request.id,
      shortId: request.short_id,
      status: "conflict",
    };
  }

  const leadPayload = readRecord(lead.payload);
  const attribution = readRecord(leadPayload.attribution);
  const derivedLeadSource = deriveCrmLeadSource(leadPayload);
  const leadSourceDetail = buildCrmLeadSourceDetail(lead, leadPayload);
  const nextCustomFields = {
    ...customFields,
    growth_reference_code: lead.reference_code,
    growth_source_website_id: lead.website_id,
    growth_waflow_lead_id: lead.id,
    growth_session_key: lead.session_key,
    growth_source_url: cleanString(attribution.source_url),
    growth_page_path: cleanString(attribution.page_path),
    growth_lead_source: derivedLeadSource,
    growth_lead_source_detail: leadSourceDetail,
    growth_link_method: "chatwoot_webhook_reference",
    growth_linked_at: new Date().toISOString(),
    growth_last_chatwoot_event: lifecycleEvents.at(-1) ?? null,
  };
  const requestUpdate: Record<string, unknown> = {
    custom_fields: nextCustomFields,
  };
  const existingLeadSourceDetail = cleanString(request.lead_source_detail);

  if (shouldUpdateLeadSource(request.lead_source, derivedLeadSource)) {
    requestUpdate.lead_source = derivedLeadSource;
  }
  if (
    !existingLeadSourceDetail ||
    existingLeadSourceDetail.startsWith("Growth")
  ) {
    requestUpdate.lead_source_detail = leadSourceDetail;
  }

  const update = await supabase
    .from("requests")
    .update(requestUpdate)
    .eq("id", request.id);

  if (update.error) throw new Error(update.error.message);
  return { requestId: request.id, shortId: request.short_id, status: "linked" };
}

function extractChatwootAccountId(payload: ChatwootPayload): string | null {
  const conversation = extractConversation(payload);
  const conversationMessages = extractConversationMessages(payload);
  return (
    readNestedString(
      readNestedRecord(payload as JsonRecord, "account"),
      "id",
    ) ??
    readNestedString(conversation, "account_id") ??
    readNestedString(conversationMessages[0] ?? {}, "account_id")
  );
}

function buildChatwootGrowthAttributes(
  lead: WaflowLeadRow,
  lifecycleEvents: LifecycleEvent[],
  linkResult: CrmRequestLinkResult,
): Record<string, ChatwootGrowthAttributeValue> {
  const leadPayload = readRecord(lead.payload);
  const attribution = readRecord(leadPayload.attribution);
  const utm = readRecord(attribution.utm);

  return {
    growth_current_reference_code: lead.reference_code,
    growth_last_reference_code: lead.reference_code,
    growth_last_waflow_lead_id: lead.id,
    growth_last_session_key: lead.session_key,
    growth_last_source_url: cleanString(attribution.source_url),
    growth_last_page_path: cleanString(attribution.page_path),
    growth_last_utm_source:
      cleanString(utm.utm_source) ?? cleanString(attribution.utm_source),
    growth_last_utm_medium:
      cleanString(utm.utm_medium) ?? cleanString(attribution.utm_medium),
    growth_last_utm_campaign:
      cleanString(utm.utm_campaign) ?? cleanString(attribution.utm_campaign),
    growth_last_lead_source: deriveCrmLeadSource(leadPayload),
    growth_last_crm_request_id: linkResult.requestId,
    growth_last_crm_request_short_id: linkResult.shortId,
    growth_last_crm_link_status: linkResult.status,
    growth_last_chatwoot_event: lifecycleEvents.at(-1) ?? null,
    growth_last_linked_at: new Date().toISOString(),
  };
}

async function syncChatwootGrowthAttributes(
  payload: ChatwootPayload,
  conversationId: string,
  lead: WaflowLeadRow,
  lifecycleEvents: LifecycleEvent[],
  linkResult: CrmRequestLinkResult,
): Promise<"updated" | "not_configured" | "skipped"> {
  const baseUrl = cleanString(process.env.CHATWOOT_BASE_URL);
  const apiToken = cleanString(process.env.CHATWOOT_API_ACCESS_TOKEN);
  if (!baseUrl || !apiToken) return "not_configured";

  const accountId = extractChatwootAccountId(payload);
  if (!accountId || !parsePositiveInteger(accountId)) return "skipped";

  const url = new URL(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/custom_attributes`,
    baseUrl,
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_access_token: apiToken,
    },
    body: JSON.stringify({
      custom_attributes: buildChatwootGrowthAttributes(
        lead,
        lifecycleEvents,
        linkResult,
      ),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Chatwoot custom attributes update failed: ${response.status}`,
    );
  }

  return "updated";
}

async function updateWaflowLeadLink(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  leadId: string,
  conversationId: string | null,
  lifecycleEvents: LifecycleEvent[],
  attrs: JsonRecord,
): Promise<void> {
  const lastEvent = lifecycleEvents.at(-1) ?? null;
  await supabase
    .from("waflow_leads")
    .update({
      ...(conversationId && { chatwoot_conversation_id: conversationId }),
      chatwoot_last_event: lastEvent,
      chatwoot_last_event_at: new Date().toISOString(),
      chatwoot_custom_attributes: attrs,
    })
    .eq("id", leadId);
}

const LIFECYCLE_TO_FUNNEL_EVENT: Partial<
  Record<LifecycleEvent, FunnelEventName>
> = {
  QualifiedLead: "qualified_lead",
  QuoteSent: "quote_sent",
};

const FUNNEL_EVENT_STAGE: Record<FunnelEventName, FunnelEventIngest["stage"]> =
  {
    waflow_open: "acquisition",
    waflow_step_next: "activation",
    waflow_submit: "activation",
    whatsapp_cta_click: "activation",
    qualified_lead: "qualified_lead",
    quote_sent: "quote_sent",
    booking_confirmed: "booking",
    review_submitted: "review_referral",
    referral_lead: "review_referral",
  };

function deriveLeadMarket(leadPayload: JsonRecord): GrowthMarket {
  const country =
    cleanString(leadPayload.country) ?? cleanString(leadPayload.market);
  const upper = country?.toUpperCase();
  if (
    upper === "CO" ||
    upper === "MX" ||
    upper === "US" ||
    upper === "CA" ||
    upper === "EU"
  ) {
    return upper;
  }
  return "CO";
}

function deriveLeadLocale(leadPayload: JsonRecord): string {
  const candidate =
    cleanString(leadPayload.locale) ?? cleanString(leadPayload.lang);
  if (candidate && /^[a-z]{2}(-[A-Z]{2})?$/.test(candidate)) return candidate;
  return "es-CO";
}

function buildLeadAttribution(
  lead: WaflowLeadRow,
  leadPayload: JsonRecord,
  locale: string,
  market: GrowthMarket,
): GrowthAttribution | null {
  if (
    !lead.account_id ||
    !lead.website_id ||
    !lead.reference_code ||
    !lead.session_key
  )
    return null;
  if (
    !UUID_PATTERN.test(lead.account_id) ||
    !UUID_PATTERN.test(lead.website_id)
  )
    return null;

  const raw = readRecord(leadPayload.attribution);
  const existing = GrowthAttributionSchema.safeParse(raw);
  if (existing.success) return existing.data;

  const sourceUrl = cleanString(raw.source_url);
  if (!sourceUrl) return null;

  try {
    const url = new URL(sourceUrl);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
    ] as const) {
      const value = cleanString(raw[key]);
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }

    return GrowthAttributionSchema.parse(
      parseAttribution({
        url,
        referrer: cleanString(raw.referrer),
        account_id: lead.account_id,
        website_id: lead.website_id,
        locale,
        market,
        reference_code: lead.reference_code,
        session_key: lead.session_key,
      }),
    );
  } catch (error) {
    log.warn("attribution_parse_failed", {
      reference_code: lead.reference_code,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function emitLifecycleFunnelEvents(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lead: WaflowLeadRow,
  conversationId: string,
  lifecycleEvents: LifecycleEvent[],
  payload: ChatwootPayload,
): Promise<void> {
  if (!lead.account_id || !lead.website_id || !lead.reference_code) return;

  const leadPayload = readRecord(lead.payload);
  const attribution = readRecord(leadPayload.attribution);
  const sourceUrl = cleanString(attribution.source_url);
  const pagePath = cleanString(attribution.page_path);
  const locale = deriveLeadLocale(leadPayload);
  const market = deriveLeadMarket(leadPayload);
  const funnelAttribution = buildLeadAttribution(
    lead,
    leadPayload,
    locale,
    market,
  );
  const occurredAt = new Date();

  for (const lifecycleEvent of lifecycleEvents) {
    const funnelEventName = LIFECYCLE_TO_FUNNEL_EVENT[lifecycleEvent];
    if (!funnelEventName) continue;

    try {
      const eventId = await buildEventId({
        reference_code: lead.reference_code,
        event_name: funnelEventName,
        occurred_at: occurredAt,
      });

      const ingest: FunnelEventIngest = {
        event_id: eventId,
        event_name: funnelEventName,
        stage: FUNNEL_EVENT_STAGE[funnelEventName],
        channel: "chatwoot",
        reference_code: lead.reference_code,
        account_id: lead.account_id,
        website_id: lead.website_id,
        locale,
        market,
        occurred_at: occurredAt.toISOString(),
        source_url: sourceUrl ?? null,
        page_path: pagePath ?? null,
        attribution: funnelAttribution,
        payload: {
          chatwoot_event: payload.event,
          chatwoot_conversation_id: conversationId,
          waflow_lead_id: lead.id,
          session_key: lead.session_key,
        },
      };

      await insertFunnelEvent(supabase, ingest);
    } catch (error) {
      log.warn("funnel_event_insert_failed", {
        lifecycle_event: lifecycleEvent,
        funnel_event: funnelEventName,
        reference_code: lead.reference_code,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function sendLifecycleConversions(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lead: WaflowLeadRow,
  payload: ChatwootPayload,
  conversationId: string,
  lifecycleEvents: LifecycleEvent[],
): Promise<number> {
  const leadPayload = readRecord(lead.payload);
  const attribution = readRecord(leadPayload.attribution);
  const contact = extractContact(payload);
  const referenceCode = lead.reference_code;
  if (!referenceCode) return 0;
  const pageId = resolveMetaWhatsAppPageId();
  const ctwaClid = extractCtwaClid(payload, leadPayload);
  if (!pageId || !ctwaClid) {
    log.warn("meta_business_messaging_skipped", {
      conversation_id: conversationId,
      reference_code: referenceCode,
      missing_page_id: !pageId,
      missing_ctwa_clid: !ctwaClid,
    });
    return 0;
  }

  let sent = 0;
  for (const lifecycleEvent of lifecycleEvents) {
    const metaEventName = mapLifecycleToMetaEvent(lifecycleEvent);
    await sendMetaConversionEvent(
      {
        eventName: metaEventName,
        eventId: `${referenceCode}:chatwoot:${metaEventName}:${lifecycleEvent}:${conversationId}`,
        actionSource: "business_messaging",
        messagingChannel: "whatsapp",
        eventSourceUrl: cleanString(attribution.source_url),
        userData: {
          email: cleanString(contact.email),
          phone:
            cleanString(contact.phone_number) ?? cleanString(leadPayload.phone),
          firstName: cleanString(contact.name) ?? cleanString(leadPayload.name),
          externalId: referenceCode,
          pageId,
          ctwaClid,
          fbp: cleanString(attribution.fbp),
          fbc: cleanString(attribution.fbc),
          clientIpAddress: lead.source_ip,
          clientUserAgent: lead.source_user_agent,
        },
        customData: {
          reference_code: referenceCode,
          session_key: lead.session_key,
          chatwoot_event: payload.event,
          chatwoot_lifecycle_event: lifecycleEvent,
          chatwoot_conversation_id: conversationId,
        },
        accountId: lead.account_id,
        websiteId: lead.website_id,
        waflowLeadId: lead.id,
        chatwootConversationId: conversationId,
        trace: {
          source: "chatwoot_webhook",
          provider_event: payload.event,
          lifecycle_event: lifecycleEvent,
          reference_code: referenceCode,
        },
      },
      { supabase },
    );
    sent += 1;
  }

  return sent;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET;
  if (!secret) {
    log.error("missing_secret");
    return apiInternalError("Chatwoot webhook secret is not configured");
  }

  const rawBody = await request.text();
  const auth = await resolveWebhookAuth(request, rawBody, secret);
  if (!auth.ok) {
    return apiError(
      "INVALID_SIGNATURE",
      "Invalid Chatwoot webhook signature or token",
      401,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON payload", 400);
  }

  const parsed = ChatwootEventSchema.safeParse(json);
  if (!parsed.success) return apiValidationError(parsed.error);

  const payload = parsed.data;
  if (auth.method === "hmac") {
    const timestamp = parseWebhookTimestamp(
      payload,
      request.headers.get("x-chatwoot-timestamp") ??
        request.headers.get("x-timestamp"),
    );
    if (!timestamp)
      return apiError("REPLAY_REJECTED", "Missing webhook timestamp", 400);

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      timestamp < nowSeconds - REPLAY_PAST_SECONDS ||
      timestamp > nowSeconds + REPLAY_FUTURE_SECONDS
    ) {
      return apiError(
        "REPLAY_REJECTED",
        "Webhook timestamp outside replay window",
        400,
      );
    }
  }

  const conversationId = extractConversationId(payload);
  const providerEventId = resolveProviderEventId(payload, conversationId);
  const supabase = createSupabaseAdmin();

  try {
    const insertStatus = await insertWebhookEvent(
      supabase,
      payload,
      providerEventId,
      auth.signature,
    );
    if (insertStatus === "duplicate") {
      return apiSuccess({ ok: true, deduped: true });
    }

    const lifecycleEvents = mapLifecycleEvents(payload);
    const referenceCode = extractReferenceCode(payload);
    const lead = await findWaflowLead(supabase, referenceCode);
    if (!lead || !conversationId || lifecycleEvents.length === 0) {
      log.warn("orphan_or_unsupported_event", {
        provider_event_id: providerEventId,
        chatwoot_event: payload.event,
        conversation_id: conversationId,
        reference_code: referenceCode,
        matched: Boolean(lead),
        lifecycle_events: lifecycleEvents,
      });
      await markWebhookEvent(supabase, providerEventId, "processed");
      return apiSuccess({
        ok: true,
        matched: Boolean(lead),
        lifecycleEvents,
        conversionsSent: 0,
      });
    }

    const attrs = extractCustomAttributes(payload);
    await updateWaflowLeadLink(
      supabase,
      lead.id,
      conversationId,
      lifecycleEvents,
      attrs,
    );
    let crmLinkResult: CrmRequestLinkResult = {
      requestId: null,
      shortId: null,
      status: "not_found",
    };
    try {
      crmLinkResult = await linkWaflowLeadToCrmRequest(
        supabase,
        lead,
        payload,
        conversationId,
        lifecycleEvents,
      );
    } catch (error) {
      log.warn("crm_request_link_failed", {
        provider_event_id: providerEventId,
        conversation_id: conversationId,
        reference_code: lead.reference_code,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    try {
      const chatwootAttributeStatus = await syncChatwootGrowthAttributes(
        payload,
        conversationId,
        lead,
        lifecycleEvents,
        crmLinkResult,
      );
      if (chatwootAttributeStatus !== "updated") {
        log.info("chatwoot_growth_attributes_not_updated", {
          provider_event_id: providerEventId,
          conversation_id: conversationId,
          reference_code: lead.reference_code,
          status: chatwootAttributeStatus,
        });
      }
    } catch (error) {
      log.warn("chatwoot_growth_attributes_sync_failed", {
        provider_event_id: providerEventId,
        conversation_id: conversationId,
        reference_code: lead.reference_code,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const conversionsSent = await sendLifecycleConversions(
      supabase,
      lead,
      payload,
      conversationId,
      lifecycleEvents,
    );

    try {
      await emitLifecycleFunnelEvents(
        supabase,
        lead,
        conversationId,
        lifecycleEvents,
        payload,
      );
    } catch (error) {
      log.warn("funnel_event_emit_failed", {
        provider_event_id: providerEventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await markWebhookEvent(supabase, providerEventId, "processed");
    return apiSuccess({
      ok: true,
      matched: true,
      lifecycleEvents,
      conversionsSent,
      crmRequestId: crmLinkResult.requestId,
      crmLinkStatus: crmLinkResult.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("processing_failed", {
      provider_event_id: providerEventId,
      error: message,
    });
    await markWebhookEvent(supabase, providerEventId, "failed", message).catch(
      () => undefined,
    );
    return apiInternalError("Failed to process Chatwoot webhook");
  }
}
