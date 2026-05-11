import type {
  AgentLane,
  GrowthAgentWakeupRequest,
  GrowthChiefOfStaffActionClass,
  GrowthChiefOfStaffActionStatus,
} from "@bukeer/website-contract";

import { enqueueGrowthAgentWakeup } from "@/lib/growth/agentic/wakeup-queue";
import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";

const FORBIDDEN_INTENT_PATTERNS = [
  /\bpaid\b|\bads?\b|\bcampaigns?\b|\bcampa(?:ñ|n)as?\b/i,
  /\bpricing\b|\bprice\b|\bprecio\b|\btarifas?\b/i,
  /\bpayments?\b|\bpago?s?\b|\bwompi\b|\bstripe\b/i,
  /\breservations?\b|\bbookings?\b|\breservas?\b/i,
  /\bavailability\b|\bdisponibilidad\b/i,
  /bulk\s*crm|crm\s*masiv/i,
  /outreach|email\s*blast|send\s+outreach/i,
];

const CAP_CHANGE_PATTERNS = [
  /cap|limite|l[ií]mite|daily_cap|weekly_cap/i,
  /subir|bajar|aumentar|reducir/i,
];

const RUNTIME_PATTERNS = [
  /run.*cycle|correr.*ciclo|ejecutar.*ciclo|production cycle/i,
  /maxClaims|max claims|max-claims/i,
];

const WAKEUP_PATTERNS = [
  /brain|orquestador|orchestrator|heartbeat|despierta|invoke/i,
  /analiza|recomienda|crear candidatos|candidate/i,
];

const LEARNING_PATTERNS = [
  /skill|memory|memoria|aprendizaje|replay/i,
  /aprobar|activar|deprecar|rechazar/i,
];

export interface ChiefOfStaffIntentRoute {
  actionClass: GrowthChiefOfStaffActionClass;
  requiresApproval: boolean;
  allowed: boolean;
  reason: string;
  lane: AgentLane;
  priority: number;
  status: GrowthChiefOfStaffActionStatus;
}

export interface RouteChiefOfStaffActionInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  userId: string;
  sessionId?: string | null;
  intent: string;
  payload?: JsonRecord;
  now?: Date;
}

export interface RouteChiefOfStaffActionResult {
  actionId: string;
  actionClass: GrowthChiefOfStaffActionClass;
  status: GrowthChiefOfStaffActionStatus;
  policyVerdict: JsonRecord;
  wakeup: GrowthAgentWakeupRequest | null;
  message: string;
}

export function classifyChiefOfStaffIntent(
  intent: string,
): ChiefOfStaffIntentRoute {
  const normalized = intent.trim();
  if (!normalized) {
    return {
      actionClass: "read_only",
      requiresApproval: false,
      allowed: true,
      reason: "empty_intent_defaults_to_read_only",
      lane: "orchestrator",
      priority: 30,
      status: "completed",
    };
  }

  if (FORBIDDEN_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      actionClass: "forbidden",
      requiresApproval: false,
      allowed: false,
      reason: "sensitive_surface_hard_blocked",
      lane: "orchestrator",
      priority: 0,
      status: "blocked",
    };
  }

  if (
    LEARNING_PATTERNS.some((pattern) => pattern.test(normalized)) &&
    /aprobar|activar|deprecar|rechazar/i.test(normalized)
  ) {
    return {
      actionClass: "approve_learning",
      requiresApproval: true,
      allowed: false,
      reason: "learning_changes_require_admin_action",
      lane: "orchestrator",
      priority: 50,
      status: "proposed",
    };
  }

  if (CAP_CHANGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      actionClass: "request_cap_change",
      requiresApproval: true,
      allowed: false,
      reason: "cap_changes_require_admin_action",
      lane: "orchestrator",
      priority: 60,
      status: "proposed",
    };
  }

  if (RUNTIME_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      actionClass: "request_runtime_cycle",
      requiresApproval: true,
      allowed: false,
      reason: "runtime_cycles_require_explicit_admin_confirmation",
      lane: "orchestrator",
      priority: 70,
      status: "proposed",
    };
  }

  if (WAKEUP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      actionClass: "enqueue_wakeup",
      requiresApproval: false,
      allowed: true,
      reason: "safe_wakeup_request",
      lane: "orchestrator",
      priority: 90,
      status: "queued",
    };
  }

  return {
    actionClass: "read_only",
    requiresApproval: false,
    allowed: true,
    reason: "read_only_briefing",
    lane: "orchestrator",
    priority: 30,
    status: "completed",
  };
}

function actionMessage(route: ChiefOfStaffIntentRoute): string {
  if (route.actionClass === "forbidden") {
    return "Accion bloqueada: la solicitud toca una superficie sensible que Growth OS no puede mutar en v1.";
  }
  if (route.actionClass === "enqueue_wakeup") {
    return "Solicitud encolada como wakeup. El daemon productivo la reclamara en el siguiente ciclo.";
  }
  if (route.requiresApproval) {
    return "Solicitud registrada como propuesta. Requiere aprobacion admin antes de ejecutar.";
  }
  return "Solicitud registrada como lectura/briefing.";
}

export async function routeChiefOfStaffAction(
  input: RouteChiefOfStaffActionInput,
): Promise<RouteChiefOfStaffActionResult> {
  const now = input.now ?? new Date();
  const route = classifyChiefOfStaffIntent(input.intent);
  const policyVerdict: JsonRecord = {
    allowed: route.allowed,
    reason: route.reason,
    action_class: route.actionClass,
    requires_approval: route.requiresApproval,
    mutation_boundary: "growth_os_executor",
  };

  const { data: actionRows, error: actionError } = await input.supabase
    .from("growth_chief_of_staff_actions")
    .insert({
      account_id: input.accountId,
      website_id: input.websiteId,
      session_id: input.sessionId ?? null,
      requested_by: input.userId,
      intent: input.intent,
      action_class: route.actionClass,
      status: route.status,
      requires_approval: route.requiresApproval,
      approval: {},
      policy_verdict: policyVerdict,
      request_payload: input.payload ?? {},
      result_payload: {},
      created_refs: [],
      completed_at:
        route.status === "completed" || route.status === "blocked"
          ? now.toISOString()
          : null,
    })
    .select("*")
    .limit(1);

  if (actionError) {
    throw new Error(`chief action insert failed: ${actionError.message}`);
  }
  const action = Array.isArray(actionRows) ? actionRows[0] : actionRows;
  if (!action?.id) throw new Error("chief action insert returned no row");

  let wakeup: GrowthAgentWakeupRequest | null = null;
  if (route.actionClass === "enqueue_wakeup" && route.allowed) {
    const minuteBucket = now.toISOString().slice(0, 16);
    wakeup = await enqueueGrowthAgentWakeup({
      supabase: input.supabase,
      accountId: input.accountId,
      websiteId: input.websiteId,
      lane: route.lane,
      source: "user_on_demand",
      priority: route.priority,
      idempotencyKey: `chief:${input.websiteId}:${route.lane}:${minuteBucket}`,
      payload: {
        requested_by: input.userId,
        chief_action_id: String(action.id),
        intent: input.intent,
        requested_at: now.toISOString(),
        ...(input.payload ?? {}),
      },
      now,
    });

    await input.supabase
      .from("growth_chief_of_staff_actions")
      .update({
        result_payload: {
          wakeup_id: wakeup.id,
          wakeup_status: wakeup.status,
        },
        created_refs: [`growth_agent_wakeup_requests:${wakeup.id}`],
        updated_at: now.toISOString(),
      })
      .eq("id", action.id)
      .eq("website_id", input.websiteId);
  }

  return {
    actionId: String(action.id),
    actionClass: route.actionClass,
    status: route.status,
    policyVerdict,
    wakeup,
    message: actionMessage(route),
  };
}

export function actionRefsFromPayload(value: unknown): string[] {
  const record = asRecord(value);
  const refs = record.created_refs;
  if (!Array.isArray(refs)) return [];
  return refs.map((ref) => String(ref ?? "")).filter(Boolean);
}
