import "server-only";

import type { AgentLane } from "@bukeer/website-contract";
import { AgentLaneSchema } from "@bukeer/website-contract";
import {
  evaluateGrowthRisk,
  type GrowthRiskLevel,
} from "@/lib/growth/autonomy/risk-policy";
import {
  ActionClassSchema,
  type ActionClass,
} from "@/lib/growth/autonomy/action-classes";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const WORKBOARD_COLUMNS = [
  "triage",
  "ready",
  "running",
  "blocked",
  "review_needed",
  "auto_completed",
  "published_applied",
  "archived",
] as const;

export type WorkboardColumn = (typeof WORKBOARD_COLUMNS)[number];

export interface WorkboardCard {
  id: string;
  column: WorkboardColumn;
  lane: AgentLane;
  title: string;
  workType: string;
  status: string;
  sourceLabel: string;
  agentName: string | null;
  preview: string | null;
  risk: GrowthRiskLevel;
  riskScore: number;
  autonomyLabel: "sigue_solo" | "revision_humana" | "bloqueado";
  nextAction: string | null;
  language: string;
  progressLabel: string;
  capabilityLabels: string[];
  toolCallSummary: { allowed: number; blocked: number };
  childTaskCount: number;
  approvalRequirement: string;
  updatedAt: string | null;
  runId: string | null;
  backlogItemId: string | null;
  changeSetId: string | null;
  evidenceRefs: string[];
  humanDecision: string | null;
  previewDetails: WorkboardPreviewDetails;
}

export interface WorkboardPreviewDetails {
  kind: string | null;
  headline: string | null;
  body: string | null;
  ctaLabel: string | null;
  diffSummary: string[];
  followUpTasks: Array<{
    title: string;
    lane: string | null;
    instructions: string | null;
    requiresHumanReview: boolean | null;
  }>;
  materializedBacklogItems: Array<{
    id: string | null;
    title: string;
    status: string | null;
    workType: string | null;
  }>;
}

export interface GrowthWorkboardResult {
  cards: WorkboardCard[];
  countsByColumn: Record<WorkboardColumn, number>;
  countsByLane: Record<AgentLane, number>;
  missingTables: string[];
  errored: boolean;
}

const CANONICAL_LANES = AgentLaneSchema.options;

const BACKLOG_WORK_TYPE_TO_LANE: Record<string, AgentLane> = {
  technical_remediation: "technical_remediation",
  transcreation: "transcreation",
  translate: "transcreation",
  locale_content: "transcreation",
  seo_demand: "content_creator",
  growth_opportunity: "content_creator",
  content_opportunity: "content_creator",
  serp_competitor_opportunity: "content_creator",
  content_update: "content_creator",
  seo_content: "content_creator",
  cro_activation: "content_curator",
  experiment_readiness: "content_curator",
};

const CONTENT_TASK_TYPE_TO_LANE: Record<string, AgentLane> = {
  transcreation: "transcreation",
  translate: "transcreation",
  locale_qa: "transcreation",
  content_brief: "content_creator",
  seo_content: "content_creator",
  content_update: "content_creator",
  seo_qa: "content_curator",
  curator_review: "content_curator",
};

const DONE_STATUSES = new Set([
  "done",
  "shipped",
  "evaluated",
  "applied",
  "published",
  "completed",
]);

const READY_STATUSES = new Set([
  "review_required",
  "proposed",
  "draft_created",
  "needs_review",
  "changes_requested",
]);

const APPROVED_STATUSES = new Set([
  "approved",
  "approved_for_execution",
  "ready_for_council",
]);

const AGENT_PROFILE_BY_LANE: Record<AgentLane, string> = {
  orchestrator: "Orchestrator",
  technical_remediation: "Technical Agent",
  transcreation: "Transcreation Agent",
  content_creator: "Content Creator",
  content_curator: "Curator",
};

const DEFAULT_CAPABILITIES_BY_LANE: Record<AgentLane, string[]> = {
  orchestrator: ["dividir trabajo", "enrutar agentes", "crear seguimiento"],
  technical_remediation: ["SEO técnico", "smoke checks", "rollback técnico"],
  transcreation: ["adaptación por mercado", "QA de idioma", "tono de marca"],
  content_creator: ["briefs", "drafts", "previews", "contenido SEO"],
  content_curator: ["calidad editorial", "evidencia", "riesgo", "Council"],
};

const STALE_RUNTIME_MS = 60 * 60 * 1000;

function emptyCountsByColumn(): Record<WorkboardColumn, number> {
  return WORKBOARD_COLUMNS.reduce(
    (acc, column) => ({ ...acc, [column]: 0 }),
    {} as Record<WorkboardColumn, number>,
  );
}

function emptyCountsByLane(): Record<AgentLane, number> {
  return CANONICAL_LANES.reduce(
    (acc, lane) => ({ ...acc, [lane]: 0 }),
    {} as Record<AgentLane, number>,
  );
}

function isMissingTable(
  error: { code?: string | null; message?: string | null } | null,
) {
  if (!error) return false;
  if (["42P01", "PGRST205", "PGRST204"].includes(error.code ?? "")) {
    return true;
  }
  const message = (error.message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache");
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compactStringArray(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => optionalText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit);
}

function normalizeFollowUpTasks(
  value: unknown,
): WorkboardPreviewDetails["followUpTasks"] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 6)
    .map((item) => {
      const row = safeRecord(item);
      const title =
        optionalText(row.title) ??
        optionalText(row.name) ??
        optionalText(row.summary);
      if (!title) return null;
      return {
        title,
        lane:
          optionalText(row.target_lane) ??
          optionalText(row.lane) ??
          optionalText(row.owner_lane),
        instructions:
          optionalText(row.instructions) ??
          optionalText(row.description) ??
          optionalText(row.next_action),
        requiresHumanReview:
          typeof row.requires_human_review === "boolean"
            ? row.requires_human_review
            : null,
      };
    })
    .filter((item): item is WorkboardPreviewDetails["followUpTasks"][number] =>
      Boolean(item),
    );
}

function normalizeMaterializedBacklogItems(
  evidence: Record<string, unknown>,
): WorkboardPreviewDetails["materializedBacklogItems"] {
  const materialization = safeRecord(
    evidence.follow_up_backlog_materialization,
  );
  const createdItems = materialization.created_items;
  if (!Array.isArray(createdItems)) return [];
  return createdItems.slice(0, 8).map((item, index) => {
    const row = safeRecord(item);
    return {
      id: optionalText(row.id),
      title: optionalText(row.title) ?? `Tarea creada ${index + 1}`,
      status: optionalText(row.status),
      workType: optionalText(row.work_type),
    };
  });
}

function previewDetailsFromPayload(
  payload: unknown,
  evidence: Record<string, unknown> = {},
  fallbackSummary: unknown = null,
): WorkboardPreviewDetails {
  const preview = safeRecord(payload);
  return {
    kind: optionalText(preview.kind),
    headline:
      optionalText(preview.headline) ??
      optionalText(preview.title) ??
      optionalText(evidence.title),
    body:
      optionalText(preview.body) ??
      optionalText(preview.summary) ??
      optionalText(evidence.operator_summary) ??
      optionalText(fallbackSummary),
    ctaLabel: optionalText(preview.cta_label) ?? optionalText(preview.ctaLabel),
    diffSummary: compactStringArray(preview.diff_summary),
    followUpTasks: normalizeFollowUpTasks(preview.follow_up_tasks),
    materializedBacklogItems: normalizeMaterializedBacklogItems(evidence),
  };
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function laneForBacklog(workType: unknown): AgentLane {
  return (
    BACKLOG_WORK_TYPE_TO_LANE[String(workType ?? "").toLowerCase()] ??
    "orchestrator"
  );
}

function laneForContentTask(taskType: unknown): AgentLane {
  return (
    CONTENT_TASK_TYPE_TO_LANE[String(taskType ?? "").toLowerCase()] ??
    "content_creator"
  );
}

function parseLane(value: unknown, fallback: AgentLane): AgentLane {
  const parsed = AgentLaneSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function isStaleRuntimeStatus(status: unknown, updatedAt: unknown): boolean {
  const value = String(status ?? "").toLowerCase();
  if (value !== "running" && value !== "claimed") return false;
  const timestamp = optionalText(updatedAt);
  if (!timestamp) return false;
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return false;
  return Date.now() - time > STALE_RUNTIME_MS;
}

function columnForBacklogStatus(
  status: unknown,
  updatedAt?: unknown,
): WorkboardColumn {
  const value = String(status ?? "").toLowerCase();
  if (isStaleRuntimeStatus(value, updatedAt)) return "blocked";
  if (WORKBOARD_COLUMNS.includes(value as WorkboardColumn)) {
    return value as WorkboardColumn;
  }
  if (value === "blocked") return "blocked";
  if (DONE_STATUSES.has(value)) return "auto_completed";
  if (READY_STATUSES.has(value)) return "review_needed";
  if (APPROVED_STATUSES.has(value)) return "ready";
  if (value.includes("progress") || value === "drafting") return "running";
  return "triage";
}

function columnForRunStatus(
  status: unknown,
  updatedAt?: unknown,
): WorkboardColumn {
  const value = String(status ?? "").toLowerCase();
  if (isStaleRuntimeStatus(value, updatedAt)) return "blocked";
  if (value === "claimed") return "ready";
  if (value === "running") return "running";
  if (value === "review_required") return "review_needed";
  if (value === "completed") return "auto_completed";
  if (value === "failed" || value === "stalled") return "blocked";
  return "ready";
}

function changeSetCreatedBacklog(
  evidence: unknown,
  createdBacklogItemId: unknown,
) {
  if (createdBacklogItemId) return true;
  const materialization = safeRecord(
    safeRecord(evidence).follow_up_backlog_materialization,
  );
  const created = materialization.created_items;
  return Array.isArray(created) && created.length > 0;
}

function columnForChangeSet(row: Record<string, unknown>): WorkboardColumn {
  const status = String(row.status ?? "").toLowerCase();
  if (changeSetCreatedBacklog(row.evidence, row.created_backlog_item_id)) {
    return "auto_completed";
  }
  if (status === "published") return "published_applied";
  if (status === "applied") return "published_applied";
  if (status === "blocked") return "blocked";
  if (DONE_STATUSES.has(status) || status === "rejected") return "archived";
  if (APPROVED_STATUSES.has(status)) return "ready";
  if (READY_STATUSES.has(status)) return "review_needed";
  return "ready";
}

function previewFromPayload(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    const record = safeRecord(value);
    for (const key of [
      "preview_text",
      "summary",
      "title",
      "headline",
      "draft",
      "next_action",
      "evidence_summary",
    ]) {
      const text = optionalText(record[key]);
      if (text) return text;
    }
  }
  return null;
}

function collectSourceRefs(...values: unknown[]): string[] {
  const refs = new Set<string>();
  for (const value of values) {
    const record = safeRecord(value);
    for (const ref of stringArray(record.source_refs)) refs.add(ref);
    for (const ref of stringArray(record.source_fact_refs)) refs.add(ref);
  }
  return Array.from(refs).slice(0, 4);
}

function collectCapabilities(lane: AgentLane, ...values: unknown[]): string[] {
  const labels = new Set<string>();
  for (const value of values) {
    const record = safeRecord(value);
    for (const item of [
      ...stringArray(record.capability_requirements),
      ...stringArray(record.capabilities),
      ...stringArray(record.skills),
    ]) {
      labels.add(item);
    }
  }
  if (labels.size === 0) {
    for (const label of DEFAULT_CAPABILITIES_BY_LANE[lane]) labels.add(label);
  }
  return Array.from(labels).slice(0, 4);
}

function parseActionClass(value: unknown): ActionClass {
  const parsed = ActionClassSchema.safeParse(value);
  return parsed.success ? parsed.data : "prepare";
}

function languageFor(...values: unknown[]): string {
  for (const value of values) {
    const record = safeRecord(value);
    const language =
      optionalText(record.operator_language) ??
      optionalText(record.language) ??
      optionalText(record.locale);
    if (language)
      return language.toLowerCase().startsWith("es") ? "español" : language;
  }
  return "español";
}

function progressFor(column: WorkboardColumn, status: string): string {
  if (column === "blocked" && ["running", "claimed"].includes(status)) {
    return "Ejecución detenida; revisar runtime";
  }
  if (column === "triage") return "Pendiente de priorización";
  if (column === "ready") return "Listo para que el runtime lo tome";
  if (column === "running") return "Agente trabajando";
  if (column === "blocked") return "Bloqueado por política o evidencia";
  if (column === "review_needed") return "Necesita decisión humana";
  if (column === "auto_completed") return "Completado por agente";
  if (column === "published_applied") return "Aplicado o publicado";
  if (column === "archived") return "Cerrado";
  return status;
}

function autonomyForColumn(
  column: WorkboardColumn,
  fallback: WorkboardCard["autonomyLabel"],
): WorkboardCard["autonomyLabel"] {
  if (column === "blocked") return "bloqueado";
  if (column === "review_needed") return "revision_humana";
  if (column === "published_applied" || column === "archived") {
    return "revision_humana";
  }
  return fallback;
}

function buildCardRisk(input: {
  lane: AgentLane;
  actionClass?: unknown;
  confidence?: unknown;
  risk?: unknown;
  evidenceRefs: string[];
  rollback?: unknown;
}) {
  return evaluateGrowthRisk({
    lane: input.lane,
    actionClass: parseActionClass(input.actionClass),
    confidence:
      typeof input.confidence === "number" ? input.confidence : undefined,
    riskLevel: optionalText(input.risk),
    evidenceRefs: input.evidenceRefs,
    hasRollback: Boolean(input.rollback),
  });
}

function compareUpdatedAt(a: WorkboardCard, b: WorkboardCard) {
  return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "");
}

async function fetchTable(
  table: string,
  query: () => PromiseLike<{
    data: unknown[] | null;
    error: { code?: string | null; message?: string | null } | null;
  }>,
) {
  const { data, error } = await query();
  if (error) {
    if (isMissingTable(error)) {
      return { rows: [], missing: table, errored: false };
    }
    return { rows: [], missing: null, errored: true };
  }
  return {
    rows: (data ?? []) as Record<string, unknown>[],
    missing: null,
    errored: false,
  };
}

export async function getGrowthWorkboard(opts: {
  accountId: string;
  websiteId: string;
  limit?: number;
}): Promise<GrowthWorkboardResult> {
  const admin = createSupabaseServiceRoleClient();
  const limit = Math.min(Math.max(opts.limit ?? 30, 10), 90);
  const missingTables = new Set<string>();
  let errored = false;

  const [
    agents,
    workItems,
    backlog,
    tasks,
    runs,
    changeSets,
    reviews,
    toolCalls,
  ] = await Promise.all([
    fetchTable("growth_agent_definitions", () =>
      admin
        .from("growth_agent_definitions")
        .select("agent_id,name,lane")
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .limit(100),
    ),
    fetchTable("growth_work_items", () =>
      admin
        .from("growth_work_items")
        .select(
          "id,parent_work_item_id,source_table,source_id,run_id,change_set_id,lane,agent_profile,title,intent,status,language,capability_requirements,skill_hints,allowed_action_class,risk_level,risk_score,requires_human_review,required_approval_role,operator_summary,next_action,progress_label,evidence,created_at,updated_at",
        )
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(limit),
    ),
    fetchTable("growth_backlog_items", () =>
      admin
        .from("growth_backlog_items")
        .select(
          "id,title,work_type,status,next_action,blocked_reason,evidence,updated_at,created_at",
        )
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(limit),
    ),
    fetchTable("growth_content_tasks", () =>
      admin
        .from("growth_content_tasks")
        .select(
          "id,title,task_type,status,next_action,evidence,updated_at,created_at",
        )
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(Math.floor(limit / 2)),
    ),
    fetchTable("growth_agent_runs", () =>
      admin
        .from("growth_agent_runs")
        .select(
          "run_id,agent_id,lane,source_table,source_id,status,evidence,error_class,error_message,updated_at,created_at",
        )
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(limit),
    ),
    fetchTable("growth_agent_change_sets", () =>
      admin
        .from("growth_agent_change_sets")
        .select(
          "id,run_id,source_table,source_id,agent_lane,change_type,status,title,summary,preview_payload,evidence,risk_level,required_approval_role,created_backlog_item_id,updated_at,created_at",
        )
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(limit),
    ),
    fetchTable("growth_human_reviews", () =>
      admin
        .from("growth_human_reviews")
        .select("decision,evidence,created_at")
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ),
    fetchTable("growth_agent_tool_calls", () =>
      admin
        .from("growth_agent_tool_calls")
        .select("run_id,allowed")
        .eq("account_id", opts.accountId)
        .eq("website_id", opts.websiteId)
        .order("created_at", { ascending: false })
        .limit(limit * 5),
    ),
  ]);

  for (const result of [
    agents,
    workItems,
    backlog,
    tasks,
    runs,
    changeSets,
    reviews,
    toolCalls,
  ]) {
    if (result.missing) missingTables.add(result.missing);
    if (result.errored) errored = true;
  }

  const agentNameById = new Map<string, string>();
  for (const row of agents.rows) {
    const id = optionalText(row.agent_id);
    const name = optionalText(row.name);
    if (id && name) agentNameById.set(id, name);
  }

  const latestRunBySource = new Map<string, Record<string, unknown>>();
  for (const row of runs.rows) {
    const sourceTable = optionalText(row.source_table);
    const sourceId = optionalText(row.source_id);
    if (!sourceTable || !sourceId) continue;
    const key = `${sourceTable}:${sourceId}`;
    if (!latestRunBySource.has(key)) latestRunBySource.set(key, row);
  }

  const decisionByChangeSet = new Map<string, string>();
  const decisionByRun = new Map<string, string>();
  for (const row of reviews.rows) {
    const evidence = safeRecord(row.evidence);
    const decision = optionalText(row.decision);
    const changeSetId = optionalText(evidence.change_set_id);
    const runId = optionalText(evidence.run_id);
    if (decision && changeSetId && !decisionByChangeSet.has(changeSetId)) {
      decisionByChangeSet.set(changeSetId, decision);
    }
    if (decision && runId && !decisionByRun.has(runId)) {
      decisionByRun.set(runId, decision);
    }
  }

  const toolSummaryByRun = new Map<
    string,
    { allowed: number; blocked: number }
  >();
  for (const row of toolCalls.rows) {
    const runId = optionalText(row.run_id);
    if (!runId) continue;
    const current = toolSummaryByRun.get(runId) ?? { allowed: 0, blocked: 0 };
    if (row.allowed === true) current.allowed += 1;
    else current.blocked += 1;
    toolSummaryByRun.set(runId, current);
  }

  const childCountByWorkItem = new Map<string, number>();
  for (const row of workItems.rows) {
    const parentId = optionalText(row.parent_work_item_id);
    if (parentId)
      childCountByWorkItem.set(
        parentId,
        (childCountByWorkItem.get(parentId) ?? 0) + 1,
      );
  }

  const cards: WorkboardCard[] = [];

  for (const row of workItems.rows) {
    const id = String(row.id);
    const evidence = safeRecord(row.evidence);
    const lane = parseLane(row.lane, "orchestrator");
    const evidenceRefs = collectSourceRefs(evidence);
    const riskDecision = evaluateGrowthRisk({
      lane,
      actionClass: parseActionClass(row.allowed_action_class),
      confidence:
        typeof evidence.confidence === "number" ? evidence.confidence : null,
      riskLevel: optionalText(row.risk_level),
      evidenceRefs,
      hasRollback: Boolean(evidence.rollback_available),
    });
    const status = optionalText(row.status) ?? "triage";
    const column = columnForBacklogStatus(status, row.updated_at);
    cards.push({
      id: `work-item:${id}`,
      column,
      lane,
      title: optionalText(row.title) ?? "Trabajo autónomo Growth",
      workType: optionalText(row.intent) ?? "work_item",
      status,
      sourceLabel: "Work item autónomo",
      agentName:
        optionalText(row.agent_profile) ?? AGENT_PROFILE_BY_LANE[lane] ?? null,
      preview: previewFromPayload(
        row.operator_summary,
        row.next_action,
        evidence,
      ),
      risk: riskDecision.riskLevel,
      riskScore:
        typeof row.risk_score === "number"
          ? row.risk_score
          : riskDecision.riskScore,
      autonomyLabel: autonomyForColumn(column, riskDecision.autonomyLabel),
      nextAction: optionalText(row.next_action),
      language: optionalText(row.language) ?? languageFor(evidence),
      progressLabel:
        optionalText(row.progress_label) ?? progressFor(column, status),
      capabilityLabels: collectCapabilities(lane, row, evidence),
      toolCallSummary: row.run_id
        ? (toolSummaryByRun.get(String(row.run_id)) ?? {
            allowed: 0,
            blocked: 0,
          })
        : { allowed: 0, blocked: 0 },
      childTaskCount: childCountByWorkItem.get(id) ?? 0,
      approvalRequirement:
        optionalText(row.required_approval_role) ??
        riskDecision.requiredApproval,
      updatedAt: optionalText(row.updated_at) ?? optionalText(row.created_at),
      runId: optionalText(row.run_id),
      backlogItemId:
        row.source_table === "growth_backlog_items"
          ? optionalText(row.source_id)
          : null,
      changeSetId: optionalText(row.change_set_id),
      evidenceRefs,
      humanDecision: row.change_set_id
        ? (decisionByChangeSet.get(String(row.change_set_id)) ?? null)
        : row.run_id
          ? (decisionByRun.get(String(row.run_id)) ?? null)
          : null,
      previewDetails: previewDetailsFromPayload(
        {
          headline: row.title,
          body: row.operator_summary ?? row.next_action,
        },
        evidence,
        row.next_action,
      ),
    });
  }

  for (const row of backlog.rows) {
    const latestRun = latestRunBySource.get(`growth_backlog_items:${row.id}`);
    const lane = laneForBacklog(row.work_type);
    const evidence = safeRecord(row.evidence);
    const evidenceRefs = collectSourceRefs(evidence);
    const column = latestRun
      ? columnForRunStatus(latestRun.status, latestRun.updated_at)
      : columnForBacklogStatus(row.status, row.updated_at);
    const riskDecision = buildCardRisk({
      lane,
      actionClass: "prepare",
      confidence: evidence.confidence,
      risk: row.blocked_reason,
      evidenceRefs,
    });
    cards.push({
      id: `backlog:${row.id}`,
      column,
      lane,
      title: optionalText(row.title) ?? "Tarea Growth sin título",
      workType: optionalText(row.work_type) ?? "growth_opportunity",
      status:
        optionalText(latestRun?.status) ?? optionalText(row.status) ?? "queued",
      sourceLabel: "Backlog Growth",
      agentName: latestRun
        ? (agentNameById.get(String(latestRun.agent_id)) ?? null)
        : AGENT_PROFILE_BY_LANE[lane],
      preview: previewFromPayload(row.next_action, row.evidence),
      risk: riskDecision.riskLevel,
      riskScore: riskDecision.riskScore,
      autonomyLabel: autonomyForColumn(column, riskDecision.autonomyLabel),
      nextAction: optionalText(row.next_action),
      language: languageFor(row.evidence),
      progressLabel: progressFor(column, optionalText(row.status) ?? "queued"),
      capabilityLabels: collectCapabilities(lane, row.evidence),
      toolCallSummary: latestRun
        ? (toolSummaryByRun.get(String(latestRun.run_id)) ?? {
            allowed: 0,
            blocked: 0,
          })
        : { allowed: 0, blocked: 0 },
      childTaskCount: 0,
      approvalRequirement:
        riskDecision.requiredApproval === "none"
          ? "No requiere"
          : riskDecision.requiredApproval,
      updatedAt:
        optionalText(latestRun?.updated_at) ?? optionalText(row.updated_at),
      runId: optionalText(latestRun?.run_id),
      backlogItemId: String(row.id),
      changeSetId: null,
      evidenceRefs,
      humanDecision: latestRun
        ? (decisionByRun.get(String(latestRun.run_id)) ?? null)
        : null,
      previewDetails: previewDetailsFromPayload(
        {
          headline: row.title,
          body: row.next_action,
        },
        evidence,
        row.next_action,
      ),
    });
  }

  for (const row of tasks.rows) {
    const latestRun = latestRunBySource.get(`growth_content_tasks:${row.id}`);
    const lane = laneForContentTask(row.task_type);
    const evidence = safeRecord(row.evidence);
    const evidenceRefs = collectSourceRefs(evidence);
    const column = latestRun
      ? columnForRunStatus(latestRun.status, latestRun.updated_at)
      : columnForBacklogStatus(row.status, row.updated_at);
    const riskDecision = buildCardRisk({
      lane,
      actionClass: "prepare",
      confidence: evidence.confidence,
      risk: evidence.blocked_reason,
      evidenceRefs,
    });
    cards.push({
      id: `task:${row.id}`,
      column,
      lane,
      title: optionalText(row.title) ?? "Tarea de contenido sin título",
      workType: optionalText(row.task_type) ?? "content_task",
      status:
        optionalText(latestRun?.status) ?? optionalText(row.status) ?? "queued",
      sourceLabel: "Tarea de contenido",
      agentName: latestRun
        ? (agentNameById.get(String(latestRun.agent_id)) ?? null)
        : AGENT_PROFILE_BY_LANE[lane],
      preview: previewFromPayload(row.next_action, row.evidence),
      risk: riskDecision.riskLevel,
      riskScore: riskDecision.riskScore,
      autonomyLabel: autonomyForColumn(column, riskDecision.autonomyLabel),
      nextAction: optionalText(row.next_action),
      language: languageFor(row.evidence),
      progressLabel: progressFor(column, optionalText(row.status) ?? "queued"),
      capabilityLabels: collectCapabilities(lane, row.evidence),
      toolCallSummary: latestRun
        ? (toolSummaryByRun.get(String(latestRun.run_id)) ?? {
            allowed: 0,
            blocked: 0,
          })
        : { allowed: 0, blocked: 0 },
      childTaskCount: 0,
      approvalRequirement:
        riskDecision.requiredApproval === "none"
          ? "No requiere"
          : riskDecision.requiredApproval,
      updatedAt:
        optionalText(latestRun?.updated_at) ?? optionalText(row.updated_at),
      runId: optionalText(latestRun?.run_id),
      backlogItemId: null,
      changeSetId: null,
      evidenceRefs,
      humanDecision: latestRun
        ? (decisionByRun.get(String(latestRun.run_id)) ?? null)
        : null,
      previewDetails: previewDetailsFromPayload(
        {
          headline: row.title,
          body: row.next_action,
        },
        evidence,
        row.next_action,
      ),
    });
  }

  for (const row of changeSets.rows) {
    const id = String(row.id);
    const evidence = safeRecord(row.evidence);
    const preview = safeRecord(row.preview_payload);
    const lane = parseLane(row.agent_lane, "orchestrator");
    const evidenceRefs = collectSourceRefs(preview, evidence);
    const column = columnForChangeSet(row);
    const riskDecision = buildCardRisk({
      lane,
      actionClass: evidence.allowed_action_class ?? "prepare",
      confidence: evidence.confidence,
      risk: row.risk_level,
      evidenceRefs,
      rollback: evidence.rollback_available,
    });
    cards.push({
      id: `change-set:${id}`,
      column,
      lane,
      title: optionalText(row.title) ?? "Propuesta del agente",
      workType: optionalText(row.change_type) ?? "change_set",
      status: optionalText(row.status) ?? "proposed",
      sourceLabel: "Resultado del agente",
      agentName: AGENT_PROFILE_BY_LANE[lane],
      preview: previewFromPayload(
        evidence.operator_summary,
        preview,
        row.summary,
        evidence,
      ),
      risk: riskDecision.riskLevel,
      riskScore: riskDecision.riskScore,
      autonomyLabel: autonomyForColumn(column, riskDecision.autonomyLabel),
      nextAction: optionalText(evidence.next_action),
      language: languageFor(evidence, preview),
      progressLabel: progressFor(
        column,
        optionalText(row.status) ?? "proposed",
      ),
      capabilityLabels: collectCapabilities(lane, evidence, preview),
      toolCallSummary: row.run_id
        ? (toolSummaryByRun.get(String(row.run_id)) ?? {
            allowed: 0,
            blocked: 0,
          })
        : { allowed: 0, blocked: 0 },
      childTaskCount: changeSetCreatedBacklog(
        row.evidence,
        row.created_backlog_item_id,
      )
        ? 1
        : 0,
      approvalRequirement:
        optionalText(row.required_approval_role) ?? "curator",
      updatedAt: optionalText(row.updated_at) ?? optionalText(row.created_at),
      runId: optionalText(row.run_id),
      backlogItemId:
        optionalText(row.created_backlog_item_id) ??
        optionalText(row.source_id),
      changeSetId: id,
      evidenceRefs,
      humanDecision: decisionByChangeSet.get(id) ?? null,
      previewDetails: previewDetailsFromPayload(preview, evidence, row.summary),
    });
  }

  for (const row of runs.rows) {
    const runId = String(row.run_id);
    const hasChangeSet = changeSets.rows.some(
      (changeSet) => changeSet.run_id === runId,
    );
    if (hasChangeSet) continue;
    const evidence = safeRecord(row.evidence);
    const lane = parseLane(row.lane, "orchestrator");
    const evidenceRefs = collectSourceRefs(evidence);
    const column = columnForRunStatus(row.status, row.updated_at);
    const riskDecision = buildCardRisk({
      lane,
      actionClass: evidence.allowed_action_class ?? "prepare",
      confidence: evidence.confidence,
      risk: row.error_class ?? row.error_message,
      evidenceRefs,
    });
    cards.push({
      id: `run:${runId}`,
      column,
      lane,
      title: optionalText(evidence.title) ?? `Run ${runId.slice(-8)}`,
      workType: "agent_run",
      status: optionalText(row.status) ?? "claimed",
      sourceLabel: "Run del agente",
      agentName: agentNameById.get(String(row.agent_id)) ?? null,
      preview: previewFromPayload(evidence.operator_summary, evidence),
      risk: riskDecision.riskLevel,
      riskScore: riskDecision.riskScore,
      autonomyLabel: autonomyForColumn(column, riskDecision.autonomyLabel),
      nextAction: optionalText(evidence.next_action),
      language: languageFor(evidence),
      progressLabel: progressFor(column, optionalText(row.status) ?? "claimed"),
      capabilityLabels: collectCapabilities(lane, evidence),
      toolCallSummary: toolSummaryByRun.get(runId) ?? {
        allowed: 0,
        blocked: 0,
      },
      childTaskCount: 0,
      approvalRequirement:
        row.status === "review_required" ? "curator" : "No requiere",
      updatedAt: optionalText(row.updated_at),
      runId,
      backlogItemId:
        row.source_table === "growth_backlog_items"
          ? optionalText(row.source_id)
          : null,
      changeSetId: null,
      evidenceRefs,
      humanDecision: decisionByRun.get(runId) ?? null,
      previewDetails: previewDetailsFromPayload(evidence, evidence),
    });
  }

  const countsByColumn = emptyCountsByColumn();
  const countsByLane = emptyCountsByLane();
  for (const card of cards) {
    countsByColumn[card.column] += 1;
    countsByLane[card.lane] += 1;
  }

  return {
    cards: cards.sort(compareUpdatedAt),
    countsByColumn,
    countsByLane,
    missingTables: Array.from(missingTables),
    errored,
  };
}
