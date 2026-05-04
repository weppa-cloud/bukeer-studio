import "server-only";

import type { AgentLane } from "@bukeer/website-contract";
import { AgentLaneSchema } from "@bukeer/website-contract";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const WORKBOARD_COLUMNS = [
  "backlog",
  "assigned",
  "running",
  "ready_for_review",
  "approved",
  "next_task_created",
  "done",
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
  risk: string | null;
  approvalRequirement: string;
  updatedAt: string | null;
  runId: string | null;
  backlogItemId: string | null;
  changeSetId: string | null;
  evidenceRefs: string[];
  humanDecision: string | null;
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

function columnForBacklogStatus(status: unknown): WorkboardColumn {
  const value = String(status ?? "").toLowerCase();
  if (DONE_STATUSES.has(value)) return "done";
  if (READY_STATUSES.has(value)) return "ready_for_review";
  if (APPROVED_STATUSES.has(value)) return "approved";
  if (value.includes("progress") || value === "drafting") return "running";
  return "backlog";
}

function columnForRunStatus(status: unknown): WorkboardColumn {
  const value = String(status ?? "").toLowerCase();
  if (value === "claimed") return "assigned";
  if (value === "running") return "running";
  if (value === "review_required") return "ready_for_review";
  if (value === "completed") return "done";
  return value === "failed" || value === "stalled"
    ? "ready_for_review"
    : "assigned";
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
    return "next_task_created";
  }
  if (
    DONE_STATUSES.has(status) ||
    status === "rejected" ||
    status === "blocked"
  ) {
    return "done";
  }
  if (APPROVED_STATUSES.has(status)) return "approved";
  if (READY_STATUSES.has(status)) return "ready_for_review";
  return "assigned";
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
  const limit = Math.min(Math.max(opts.limit ?? 80, 10), 200);
  const missingTables = new Set<string>();
  let errored = false;

  const [agents, backlog, tasks, runs, changeSets, reviews] = await Promise.all(
    [
      fetchTable("growth_agent_definitions", () =>
        admin
          .from("growth_agent_definitions")
          .select("agent_id,name,lane")
          .eq("account_id", opts.accountId)
          .eq("website_id", opts.websiteId)
          .limit(100),
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
    ],
  );

  for (const result of [agents, backlog, tasks, runs, changeSets, reviews]) {
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

  const cards: WorkboardCard[] = [];

  for (const row of backlog.rows) {
    const latestRun = latestRunBySource.get(`growth_backlog_items:${row.id}`);
    const lane = laneForBacklog(row.work_type);
    cards.push({
      id: `backlog:${row.id}`,
      column: latestRun
        ? columnForRunStatus(latestRun.status)
        : columnForBacklogStatus(row.status),
      lane,
      title: optionalText(row.title) ?? "Tarea Growth sin título",
      workType: optionalText(row.work_type) ?? "growth_opportunity",
      status:
        optionalText(latestRun?.status) ?? optionalText(row.status) ?? "queued",
      sourceLabel: "Backlog Growth",
      agentName: latestRun
        ? (agentNameById.get(String(latestRun.agent_id)) ?? null)
        : null,
      preview: previewFromPayload(row.next_action, row.evidence),
      risk: optionalText(row.blocked_reason),
      approvalRequirement: "Según resultado",
      updatedAt:
        optionalText(latestRun?.updated_at) ?? optionalText(row.updated_at),
      runId: optionalText(latestRun?.run_id),
      backlogItemId: String(row.id),
      changeSetId: null,
      evidenceRefs: collectSourceRefs(row.evidence),
      humanDecision: latestRun
        ? (decisionByRun.get(String(latestRun.run_id)) ?? null)
        : null,
    });
  }

  for (const row of tasks.rows) {
    const latestRun = latestRunBySource.get(`growth_content_tasks:${row.id}`);
    cards.push({
      id: `task:${row.id}`,
      column: latestRun
        ? columnForRunStatus(latestRun.status)
        : columnForBacklogStatus(row.status),
      lane: laneForContentTask(row.task_type),
      title: optionalText(row.title) ?? "Tarea de contenido sin título",
      workType: optionalText(row.task_type) ?? "content_task",
      status:
        optionalText(latestRun?.status) ?? optionalText(row.status) ?? "queued",
      sourceLabel: "Tarea de contenido",
      agentName: latestRun
        ? (agentNameById.get(String(latestRun.agent_id)) ?? null)
        : null,
      preview: previewFromPayload(row.next_action, row.evidence),
      risk: optionalText(safeRecord(row.evidence).blocked_reason),
      approvalRequirement: "Curator",
      updatedAt:
        optionalText(latestRun?.updated_at) ?? optionalText(row.updated_at),
      runId: optionalText(latestRun?.run_id),
      backlogItemId: null,
      changeSetId: null,
      evidenceRefs: collectSourceRefs(row.evidence),
      humanDecision: latestRun
        ? (decisionByRun.get(String(latestRun.run_id)) ?? null)
        : null,
    });
  }

  for (const row of changeSets.rows) {
    const id = String(row.id);
    const evidence = safeRecord(row.evidence);
    const preview = safeRecord(row.preview_payload);
    const lane = parseLane(row.agent_lane, "orchestrator");
    cards.push({
      id: `change-set:${id}`,
      column: columnForChangeSet(row),
      lane,
      title: optionalText(row.title) ?? "Propuesta del agente",
      workType: optionalText(row.change_type) ?? "change_set",
      status: optionalText(row.status) ?? "proposed",
      sourceLabel: "Resultado del agente",
      agentName: null,
      preview: previewFromPayload(preview, row.summary, evidence),
      risk: optionalText(row.risk_level),
      approvalRequirement:
        optionalText(row.required_approval_role) ?? "curator",
      updatedAt: optionalText(row.updated_at) ?? optionalText(row.created_at),
      runId: optionalText(row.run_id),
      backlogItemId:
        optionalText(row.created_backlog_item_id) ??
        optionalText(row.source_id),
      changeSetId: id,
      evidenceRefs: collectSourceRefs(preview, evidence),
      humanDecision: decisionByChangeSet.get(id) ?? null,
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
    cards.push({
      id: `run:${runId}`,
      column: columnForRunStatus(row.status),
      lane,
      title: optionalText(evidence.title) ?? `Run ${runId.slice(-8)}`,
      workType: "agent_run",
      status: optionalText(row.status) ?? "claimed",
      sourceLabel: "Run del agente",
      agentName: agentNameById.get(String(row.agent_id)) ?? null,
      preview: previewFromPayload(evidence),
      risk: optionalText(row.error_class) ?? optionalText(row.error_message),
      approvalRequirement:
        row.status === "review_required" ? "curator" : "No requiere",
      updatedAt: optionalText(row.updated_at),
      runId,
      backlogItemId:
        row.source_table === "growth_backlog_items"
          ? optionalText(row.source_id)
          : null,
      changeSetId: null,
      evidenceRefs: collectSourceRefs(evidence),
      humanDecision: decisionByRun.get(runId) ?? null,
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
