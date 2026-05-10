import "server-only";

import type { AgentLane } from "@bukeer/website-contract";
import { AgentLaneSchema } from "@bukeer/website-contract";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { requireGrowthRole, type GrowthRole } from "./auth";
import { CANONICAL_LANES, getLaneAgreement } from "./queries";

const POSTGREST_MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);
const TABLE_READ_TIMEOUT_MS = 8_000;

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orchestrator",
  technical_remediation: "Technical Remediation",
  transcreation: "Transcreation",
  content_creator: "Content Creator",
  content_curator: "Content Curator",
};

const LANE_MISSIONS: Record<AgentLane, string> = {
  orchestrator: "Prioriza oportunidades, asigna lanes y protege el SSOT.",
  technical_remediation: "Aplica fixes reversibles cuando el smoke lo puede probar.",
  transcreation: "Adapta contenido por mercado sin romper calidad locale.",
  content_creator: "Convierte evidencia en contenido organico publicable.",
  content_curator: "Protege calidad, Council y aprendizajes aprobados.",
};

export type AgentCompanyStatus =
  | "running"
  | "blocked"
  | "review_needed"
  | "idle"
  | "disabled";

export interface NorthStarMetric {
  key: string;
  label: string;
  value: string;
  target: string;
  status: "live" | "measuring" | "watch" | "missing";
  detail: string;
}

export interface AgentCompanyRow {
  lane: AgentLane;
  name: string;
  mission: string;
  mode: string;
  status: AgentCompanyStatus;
  heartbeatAt: string | null;
  currentWork: string;
  costUsd: number;
  outputCount: number;
  confidence: number | null;
  blockedCount: number;
  reviewNeededCount: number;
}

export interface AutonomyFeedItem {
  id: string;
  kind:
    | "running"
    | "auto_published"
    | "auto_applied"
    | "rollback"
    | "blocked"
    | "review_needed";
  title: string;
  detail: string;
  lane: AgentLane | "unknown";
  actionClass: string;
  status: string;
  occurredAt: string;
}

export interface ImpactLedgerRow {
  id: string;
  publicationJobId: string | null;
  workItemTitle: string;
  target: string;
  metric: string;
  baseline: string;
  current: string;
  status: string;
  evaluationDate: string;
  funnelAttributionStatus: string;
}

export interface RuntimeCycleRow {
  id: string;
  cycleKey: string;
  status: string;
  trigger: string;
  environment: string;
  gitSha: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  stepStatus: Record<string, unknown>;
  counts: Record<string, unknown>;
  failures: Record<string, unknown>;
  updatedAt: string;
}

export interface RuntimeCycleHealth {
  schedulerStatus: "healthy" | "stale" | "degraded" | "failed" | "missing";
  schedulerMessage: string;
  lastHeartbeatAt: string | null;
  activeCycle: RuntimeCycleRow | null;
  lastCycle: RuntimeCycleRow | null;
  missingTables: string[];
}

export interface RiskBudgetRow {
  id: string;
  lane: AgentLane;
  actionClass: string;
  enabled: boolean;
  dryRunOnly: boolean;
  killSwitchEnabled: boolean;
  pausedReason: string | null;
  dailyUsed: number;
  dailyCap: number;
  weeklyUsed: number;
  weeklyCap: number;
  maxRiskLevel: string;
  maxRiskScore: number;
  requiredChecks: string[];
  policyVersion: string;
  updatedAt: string;
}

export interface RollbackPublicationJobRow {
  id: string;
  lane: AgentLane | "unknown";
  actionClass: string;
  jobMode: string;
  status: string;
  affectedRoute: string;
  targetTable: string;
  targetId: string | null;
  targetPath: string | null;
  beforeSnapshot: Record<string, unknown>;
  afterPayload: Record<string, unknown>;
  rollbackPayload: Record<string, unknown>;
  smokeEvidence: Record<string, unknown>;
  canRollback: boolean;
  updatedAt: string;
}

export interface ProfileFreshnessRow {
  id: string;
  profileType: string;
  subject: string;
  status: "fresh" | "stale" | "low_confidence";
  confidence: number;
  validUntil: string;
  ageHours: number;
}

export interface OpportunityCandidateRow {
  id: string;
  title: string;
  candidateType: string;
  lane: AgentLane | "unknown";
  actionClass: string;
  status: string;
  totalScore: number;
  blockingReason: string | null;
  successMetric: string | null;
}

export interface AgenticDecisionRow {
  id: string;
  decisionType: string;
  objective: string;
  northStarAlignment: string;
  confidence: number;
  materializationStatus: string;
  createdCandidates: number;
  delegatedTasks: number;
  blockedDecisions: number;
  memoryReads: number;
  skillReads: number;
  outcomeReferences: number;
  noGoReasons: string[];
  contextSnapshotId: string | null;
  createdAt: string;
  observedSignals: Record<string, unknown>[];
  proposedCandidates: Record<string, unknown>[];
  proposedWorkItems: Record<string, unknown>[];
  delegatedTaskDetails: Record<string, unknown>[];
  blockedDecisionDetails: Record<string, unknown>[];
  memoryReadDetails: Record<string, unknown>[];
  skillReadDetails: Record<string, unknown>[];
  outcomeReferenceDetails: Record<string, unknown>[];
  policyRecommendations: Record<string, unknown>[];
  riskAssessment: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

export interface AgenticWakeupRow {
  id: string;
  lane: AgentLane | "unknown";
  source: string;
  status: string;
  priority: number;
  coalescedCount: number;
  runId: string | null;
  updatedAt: string;
}

export interface AgenticTaskSessionRow {
  id: string;
  assignedLane: AgentLane | "unknown";
  status: string;
  handoffSummary: string;
  parentWorkItemId: string | null;
  childWorkItemId: string | null;
  decisionId: string | null;
  dependencies: number;
  updatedAt: string;
}

export interface GrowthCeoCockpit {
  accountId: string;
  websiteId: string;
  role: GrowthRole;
  objective: {
    northStar: string;
    laggingOutcome: string;
    scope: string;
    autonomyRule: string;
  };
  northStar: NorthStarMetric[];
  agentCompany: AgentCompanyRow[];
  autonomyFeed: AutonomyFeedItem[];
  impactLedger: ImpactLedgerRow[];
  runtimeCycle: RuntimeCycleHealth;
  riskBudget: {
    killSwitchActive: boolean;
    enabledPolicies: number;
    policies: RiskBudgetRow[];
    smokeFailures: number;
    rolledBack: number;
    blockedPaidMutations: number;
    missingTables: string[];
  };
  rollbackJobs: RollbackPublicationJobRow[];
  profileFlow: {
    freshProfiles: number;
    staleProfiles: number;
    lowConfidenceProfiles: number;
    readyCandidates: number;
    blockedCandidates: number;
    profiles: ProfileFreshnessRow[];
    candidates: OpportunityCandidateRow[];
  };
  agenticControl: {
    decisions: AgenticDecisionRow[];
    wakeups: AgenticWakeupRow[];
    taskSessions: AgenticTaskSessionRow[];
    blockedSensitiveDecisions: number;
    missingTables: string[];
  };
  generatedAt: string;
}

type SupabaseClient = ReturnType<typeof createSupabaseServiceRoleClient>;

function table(supabase: SupabaseClient, tableName: string) {
  return (
    supabase.from as unknown as (
      name: string,
    ) => ReturnType<typeof supabase.from>
  )(tableName);
}

function isMissingTable(error: { code?: string | null } | null): boolean {
  return Boolean(error?.code && POSTGREST_MISSING_TABLE_CODES.has(error.code));
}

async function fetchTable(
  tableName: string,
  query: () => PromiseLike<{
    data: unknown[] | null;
    error: { code?: string | null; message?: string | null } | null;
  }>,
): Promise<{ rows: Record<string, unknown>[]; missing: string | null }> {
  const timeout = new Promise<{
    data: unknown[] | null;
    error: { code?: string | null; message?: string | null } | null;
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        data: null,
        error: {
          code: "GROWTH_COCKPIT_TIMEOUT",
          message: `Timed out reading ${tableName}.`,
        },
      });
    }, TABLE_READ_TIMEOUT_MS);
  });

  let result: {
    data: unknown[] | null;
    error: { code?: string | null; message?: string | null } | null;
  };
  try {
    result = await Promise.race([query(), timeout]);
  } catch {
    return { rows: [], missing: null };
  }

  const { data, error } = result;
  if (error) {
    return { rows: [], missing: isMissingTable(error) ? tableName : null };
  }
  return { rows: (data ?? []) as Record<string, unknown>[], missing: null };
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function optionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "")).filter(Boolean);
}

function compactUnknown(
  value: unknown,
  options: { depth?: number; arrayLimit?: number; stringLimit?: number } = {},
): unknown {
  const depth = options.depth ?? 2;
  const arrayLimit = options.arrayLimit ?? 5;
  const stringLimit = options.stringLimit ?? 600;

  if (typeof value === "string") {
    return value.length > stringLimit
      ? `${value.slice(0, stringLimit)}...[truncated ${value.length - stringLimit} chars]`
      : value;
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }
  if (depth <= 0) {
    if (Array.isArray(value)) return `[array:${value.length}]`;
    if (typeof value === "object") return "[object]";
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, arrayLimit)
      .map((item) =>
        compactUnknown(item, { depth: depth - 1, arrayLimit, stringLimit }),
      );
  }
  if (typeof value !== "object") return String(value);

  const compact: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (
      [
        "body",
        "content",
        "full_content",
        "profile_snapshot",
        "before_snapshot",
        "after_payload",
        "rollback_payload",
        "raw_response",
        "html",
        "markdown",
      ].includes(key)
    ) {
      compact[key] =
        typeof raw === "string"
          ? `[omitted:${raw.length} chars]`
          : Array.isArray(raw)
            ? `[omitted-array:${raw.length}]`
            : "[omitted-object]";
      continue;
    }
    compact[key] = compactUnknown(raw, {
      depth: depth - 1,
      arrayLimit,
      stringLimit,
    });
  }
  return compact;
}

function compactRecords(value: unknown, limit = 6): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).map((item) => {
    const compact = compactUnknown(item, {
      depth: 3,
      arrayLimit: 5,
      stringLimit: 500,
    });
    return safeRecord(compact);
  });
}

function compactDecisionEvidence(value: unknown): Record<string, unknown> {
  const record = safeRecord(value);
  const providerEvidenceReads = compactRecords(
    record.provider_evidence_reads,
    8,
  );
  const evidenceFingerprints = Array.isArray(record.evidence_fingerprints)
    ? record.evidence_fingerprints.slice(0, 12)
    : [];
  return {
    context_snapshot_id: record.context_snapshot_id,
    provider_evidence_reads: providerEvidenceReads,
    evidence_fingerprints: evidenceFingerprints,
    reasoning_summary: compactUnknown(record.reasoning_summary, {
      depth: 2,
      arrayLimit: 4,
      stringLimit: 500,
    }),
    injection_scan: compactUnknown(record.injection_scan, {
      depth: 2,
      arrayLimit: 4,
      stringLimit: 500,
    }),
  };
}

function parseLane(value: unknown): AgentLane | null {
  const parsed = AgentLaneSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function recencySort(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aTime = Date.parse(
    optionalText(a.updated_at) ?? optionalText(a.created_at) ?? "0",
  );
  const bTime = Date.parse(
    optionalText(b.updated_at) ?? optionalText(b.created_at) ?? "0",
  );
  return bTime - aTime;
}

function metricFromRecord(value: unknown): string {
  const record = safeRecord(value);
  const entries = Object.entries(record);
  if (entries.length === 0) return "n/a";
  const [key, raw] = entries[0];
  if (typeof raw === "number" || typeof raw === "string") {
    return `${key}: ${raw}`;
  }
  return key;
}

function countRecentJobs(
  jobs: Record<string, unknown>[],
  policy: Record<string, unknown>,
  days: number,
) {
  const lane = optionalText(policy.lane);
  const actionClass = optionalText(policy.action_class);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return jobs.filter((job) => {
    const createdAt = optionalText(job.created_at);
    const created = createdAt ? Date.parse(createdAt) : 0;
    return (
      created >= cutoff &&
      optionalText(job.lane) === lane &&
      optionalText(job.action_class) === actionClass
    );
  }).length;
}

function runtimeCycleFromRow(
  row: Record<string, unknown> | undefined,
  fallbackId: string,
): RuntimeCycleRow | null {
  if (!row) return null;
  const id = optionalText(row.id) ?? fallbackId;
  const updatedAt =
    isoOrNull(row.updated_at) ??
    isoOrNull(row.finished_at) ??
    isoOrNull(row.started_at) ??
    isoOrNull(row.created_at) ??
    new Date(0).toISOString();
  return {
    id,
    cycleKey: optionalText(row.cycle_key) ?? id,
    status: optionalText(row.status) ?? "unknown",
    trigger: optionalText(row.trigger) ?? optionalText(row.triggered_by) ?? "n/a",
    environment:
      optionalText(row.environment) ?? optionalText(row.runtime_env) ?? "n/a",
    gitSha: optionalText(row.git_sha) ?? optionalText(row.git_ref),
    startedAt: isoOrNull(row.started_at),
    finishedAt: isoOrNull(row.finished_at),
    stepStatus: safeRecord(row.step_status ?? row.steps),
    counts: safeRecord(row.counts),
    failures: safeRecord(row.failures ?? row.errors),
    updatedAt,
  };
}

function buildRuntimeCycleHealth(
  cycles: Record<string, unknown>[],
  schedulerRows: Record<string, unknown>[],
  missingTables: string[],
): RuntimeCycleHealth {
  const sortedCycles = [...cycles].sort(recencySort);
  const activeCycle =
    sortedCycles
      .map((row, index) => runtimeCycleFromRow(row, `cycle:${index}`))
      .find((row) =>
        row ? ["running", "started", "in_progress"].includes(row.status) : false,
      ) ?? null;
  const lastCycle =
    sortedCycles
      .map((row, index) => runtimeCycleFromRow(row, `cycle:${index}`))
      .find((row) => row && row.id !== activeCycle?.id) ?? activeCycle ?? null;
  const scheduler = [...schedulerRows].sort(recencySort)[0];
  const heartbeatAt =
    isoOrNull(scheduler?.heartbeat_at) ??
    isoOrNull(scheduler?.last_heartbeat_at) ??
    isoOrNull(scheduler?.updated_at) ??
    null;
  const heartbeatAgeMs = heartbeatAt ? Date.now() - Date.parse(heartbeatAt) : null;
  const rawStatus =
    optionalText(scheduler?.status) ?? optionalText(scheduler?.health_status);
  const schedulerStatus = resolveGrowthSchedulerStatus({
    missingTables: missingTables.length > 0,
    rawStatus,
    heartbeatAgeMs,
    intervalMs: scheduler?.interval_ms,
  });

  return {
    schedulerStatus,
    schedulerMessage:
      optionalText(scheduler?.message) ??
      optionalText(scheduler?.last_message) ??
      (schedulerStatus === "healthy"
        ? "Scheduler heartbeat is fresh."
        : schedulerStatus === "stale"
          ? "Scheduler heartbeat is stale for configured cadence."
          : schedulerStatus === "failed"
            ? "Scheduler reported a failed state."
          : schedulerStatus === "degraded"
            ? "Scheduler heartbeat is late for configured cadence."
            : "Scheduler heartbeat is not available."),
    lastHeartbeatAt: heartbeatAt,
    activeCycle,
    lastCycle,
    missingTables,
  };
}

export function resolveGrowthSchedulerStatus({
  missingTables,
  rawStatus,
  heartbeatAgeMs,
  intervalMs,
}: {
  missingTables: boolean;
  rawStatus: string | null | undefined;
  heartbeatAgeMs: number | null;
  intervalMs: unknown;
}): RuntimeCycleHealth["schedulerStatus"] {
  const parsedIntervalMs =
    typeof intervalMs === "number" && intervalMs > 0
      ? intervalMs
      : Number(intervalMs);
  const cadenceMs =
    Number.isFinite(parsedIntervalMs) && parsedIntervalMs > 0
      ? parsedIntervalMs
      : 45 * 60 * 1000;
  if (missingTables) return "missing";
  if (rawStatus === "failed") return "failed";
  if (rawStatus && ["degraded", "error"].includes(rawStatus)) return "degraded";
  if (heartbeatAgeMs != null && heartbeatAgeMs <= cadenceMs * 2) return "healthy";
  if (heartbeatAgeMs != null && heartbeatAgeMs <= cadenceMs * 3) return "degraded";
  return heartbeatAgeMs == null ? "missing" : "stale";
}

export async function getGrowthCeoCockpit(
  websiteId: string,
): Promise<GrowthCeoCockpit> {
  const ctx = await requireGrowthRole(websiteId, "viewer");
  const admin = createSupabaseServiceRoleClient();
  const missingTables = new Set<string>();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    agents,
    workItems,
    runs,
    changeSets,
    toolCalls,
    metrics,
    policies,
    publicationJobs,
    outcomes,
    funnelEvents,
    signalFacts,
    profiles,
    opportunityCandidates,
    runtimeCycles,
    schedulerHeartbeats,
    contextSnapshots,
    orchestratorDecisions,
    wakeupRequests,
    taskSessions,
    agreement,
  ] = await Promise.all([
    fetchTable("growth_agent_definitions", () =>
      table(admin, "growth_agent_definitions")
        .select("agent_id,name,lane,enabled,mode")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .limit(100),
    ),
    fetchTable("growth_work_items", () =>
      table(admin, "growth_work_items")
        .select(
          "id,lane,title,intent,status,allowed_action_class,risk_level,risk_score,requires_human_review,operator_summary,next_action,progress_label,claimed_at,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_agent_runs", () =>
      table(admin, "growth_agent_runs")
        .select(
          "run_id,agent_id,lane,status,heartbeat_at,evidence,error_class,error_message,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_agent_change_sets", () =>
      table(admin, "growth_agent_change_sets")
        .select(
          "id,run_id,agent_lane,change_type,status,title,summary,risk_level,requires_human_review,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_agent_tool_calls", () =>
      table(admin, "growth_agent_tool_calls")
        .select(
          "id,run_id,lane,tool,action_class,policy_verdict,allowed,reason,result_status,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    fetchTable("growth_agent_run_metrics", () =>
      table(admin, "growth_agent_run_metrics")
        .select("run_id,lane,cost_usd,created_at")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .limit(200),
    ),
    fetchTable("growth_autonomy_policies", () =>
      table(admin, "growth_autonomy_policies")
        .select(
          "id,lane,action_class,enabled,dry_run_only,kill_switch_enabled,paused_reason,max_risk_level,max_risk_score,daily_cap,weekly_cap,required_checks,policy_version,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_publication_jobs", () =>
      table(admin, "growth_publication_jobs")
        .select("*")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_work_item_outcomes", () =>
      table(admin, "growth_work_item_outcomes")
        .select(
          "id,work_item_id,publication_job_id,change_set_id,outcome_type,status,success_metric,baseline,current_result,evaluation_window,evaluation_date,funnel_attribution_status,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("evaluation_date", { ascending: true, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("funnel_events", () =>
      table(admin, "funnel_events")
        .select("event_name,stage,channel,occurred_at")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .gte("occurred_at", since30d)
        .limit(500),
    ),
    fetchTable("growth_signal_facts", () =>
      table(admin, "growth_signal_facts")
        .select("id,source,signal_type,expires_at,confidence,created_at")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("observed_at", { ascending: false })
        .limit(80),
    ),
    fetchTable("growth_profiles", () =>
      table(admin, "growth_profiles")
        .select(
          "id,profile_type,subject_table,subject_id,subject_key,confidence,valid_from,valid_until,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("valid_until", { ascending: true })
        .limit(80),
    ),
    fetchTable("growth_opportunity_candidates", () =>
      table(admin, "growth_opportunity_candidates")
        .select(
          "id,title,candidate_type,lane,allowed_action_class,status,total_score,blocking_reason,success_metric,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("total_score", { ascending: false })
        .limit(80),
    ),
    fetchTable("growth_runtime_cycles", () =>
      table(admin, "growth_runtime_cycles")
        .select("*")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(20),
    ),
    fetchTable("growth_scheduler_heartbeats", () =>
      table(admin, "growth_scheduler_heartbeats")
        .select("*")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(5),
    ),
    fetchTable("growth_context_snapshots", () =>
      table(admin, "growth_context_snapshots")
        .select("id,lane,objective,injection_scan,token_estimate,created_at")
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    fetchTable("growth_orchestrator_decisions", () =>
      table(admin, "growth_orchestrator_decisions")
        .select(
          "id,decision_type,objective,north_star_alignment,confidence,materialization_status,observed_signals,created_candidate_ids,created_work_item_ids,proposed_candidates,proposed_work_items,delegated_tasks,blocked_decisions,memory_reads,skill_reads,outcome_references,policy_recommendations,risk_assessment,no_go_reasons,context_snapshot_id,evidence,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("created_at", { ascending: false })
        .limit(8),
    ),
    fetchTable("growth_agent_wakeup_requests", () =>
      table(admin, "growth_agent_wakeup_requests")
        .select(
          "id,lane,source,status,priority,coalesced_count,run_id,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(30),
    ),
    fetchTable("growth_agent_task_sessions", () =>
      table(admin, "growth_agent_task_sessions")
        .select(
          "id,assigned_agent_lane,status,handoff_summary,parent_work_item_id,child_work_item_id,decision_id,dependencies,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(30),
    ),
    getLaneAgreement(ctx.websiteId),
  ]);

  for (const result of [
    agents,
    workItems,
    runs,
    changeSets,
    toolCalls,
    metrics,
    policies,
    publicationJobs,
    outcomes,
    funnelEvents,
    signalFacts,
    profiles,
    opportunityCandidates,
    runtimeCycles,
    schedulerHeartbeats,
    contextSnapshots,
    orchestratorDecisions,
    wakeupRequests,
    taskSessions,
  ]) {
    if (result.missing) missingTables.add(result.missing);
  }

  const agreementByLane = new Map(
    (agreement?.lanes ?? []).map((row) => [row.lane, row] as const),
  );

  const agentsByLane = new Map<AgentLane, Record<string, unknown>>();
  for (const row of agents.rows) {
    const lane = parseLane(row.lane);
    if (lane && !agentsByLane.has(lane)) agentsByLane.set(lane, row);
  }

  const runsByLane = new Map<AgentLane, Record<string, unknown>[]>();
  const workByLane = new Map<AgentLane, Record<string, unknown>[]>();
  const outputByLane = new Map<AgentLane, number>();
  const costByLane = new Map<AgentLane, number>();
  const blockedByLane = new Map<AgentLane, number>();

  for (const row of runs.rows) {
    const lane = parseLane(row.lane);
    if (!lane) continue;
    runsByLane.set(lane, [...(runsByLane.get(lane) ?? []), row]);
  }
  for (const row of workItems.rows) {
    const lane = parseLane(row.lane);
    if (!lane) continue;
    workByLane.set(lane, [...(workByLane.get(lane) ?? []), row]);
    if (optionalText(row.status) === "blocked") {
      blockedByLane.set(lane, (blockedByLane.get(lane) ?? 0) + 1);
    }
  }
  for (const row of changeSets.rows) {
    const lane = parseLane(row.agent_lane);
    if (lane) outputByLane.set(lane, (outputByLane.get(lane) ?? 0) + 1);
  }
  for (const row of publicationJobs.rows) {
    const lane = parseLane(row.lane);
    if (lane) outputByLane.set(lane, (outputByLane.get(lane) ?? 0) + 1);
  }
  for (const row of metrics.rows) {
    const lane = parseLane(row.lane);
    if (lane) costByLane.set(lane, (costByLane.get(lane) ?? 0) + numberValue(row.cost_usd));
  }

  const agentCompany = CANONICAL_LANES.map((lane): AgentCompanyRow => {
    const agent = agentsByLane.get(lane);
    const laneRuns = (runsByLane.get(lane) ?? []).sort(recencySort);
    const laneWork = (workByLane.get(lane) ?? []).sort(recencySort);
    const running = laneRuns.find((row) =>
      ["claimed", "running"].includes(optionalText(row.status) ?? ""),
    );
    const reviewNeeded = laneRuns.filter(
      (row) => optionalText(row.status) === "review_required",
    ).length;
    const blocked = blockedByLane.get(lane) ?? 0;
    const status: AgentCompanyStatus = running
      ? "running"
      : blocked > 0
        ? "blocked"
        : reviewNeeded > 0
          ? "review_needed"
          : agent && agent.enabled !== false
            ? "idle"
            : "disabled";
    const current = laneWork[0] ?? running;
    const currentWork =
      optionalText(current?.title) ??
      optionalText(current?.operator_summary) ??
      optionalText(safeRecord(current?.evidence).summary) ??
      "Sin trabajo activo";

    return {
      lane,
      name: optionalText(agent?.name) ?? LANE_LABELS[lane],
      mission: LANE_MISSIONS[lane],
      mode: optionalText(agent?.mode) ?? "not_configured",
      status,
      heartbeatAt: isoOrNull(running?.heartbeat_at ?? laneRuns[0]?.updated_at),
      currentWork,
      costUsd: Number((costByLane.get(lane) ?? 0).toFixed(4)),
      outputCount: outputByLane.get(lane) ?? 0,
      confidence: agreementByLane.get(lane)?.agreement ?? null,
      blockedCount: blocked,
      reviewNeededCount: reviewNeeded,
    };
  });

  const qualifiedTripRequests = funnelEvents.rows.filter((row) => {
    const event = optionalText(row.event_name);
    const stage = optionalText(row.stage);
    return (
      event === "qualified_lead" ||
      event === "chatwoot_label_qualified" ||
      event === "crm_lead_stage_qualified" ||
      stage === "qualified_lead"
    );
  }).length;

  const confirmedBookings = funnelEvents.rows.filter((row) => {
    const event = optionalText(row.event_name);
    const stage = optionalText(row.stage);
    return event === "booking_confirmed" || event === "crm_booking_confirmed" || stage === "booking";
  }).length;

  const seoOutcomes = outcomes.rows.filter(
    (row) => optionalText(row.outcome_type) === "seo_content",
  ).length;
  const technicalOutcomes = outcomes.rows.filter(
    (row) => optionalText(row.outcome_type) === "technical_seo",
  ).length;

  const northStar: NorthStarMetric[] = [
    {
      key: "qualified_trip_requests",
      label: "Qualified trip requests",
      value: missingTables.has("funnel_events") ? "n/a" : String(qualifiedTripRequests),
      target: "monthly growth",
      status: missingTables.has("funnel_events") ? "missing" : "live",
      detail: "Primary #310 North Star from funnel_events over the last 30 days.",
    },
    {
      key: "confirmed_bookings",
      label: "Confirmed bookings",
      value: missingTables.has("funnel_events") ? "n/a" : String(confirmedBookings),
      target: "attributed/month",
      status: missingTables.has("funnel_events") ? "missing" : "watch",
      detail: "Lagging commercial outcome attributed to Growth channels.",
    },
    {
      key: "organic_outcomes",
      label: "Organic work measuring",
      value: String(seoOutcomes),
      target: "day 21 / day 45",
      status: seoOutcomes > 0 ? "measuring" : "watch",
      detail: "Autonomous organic publications with outcome windows.",
    },
    {
      key: "technical_outcomes",
      label: "Technical fixes measuring",
      value: String(technicalOutcomes),
      target: "immediate / day 7 / day 28",
      status: technicalOutcomes > 0 ? "measuring" : "watch",
      detail: "Reversible technical remediation with smoke and follow-up windows.",
    },
  ];

  const feed: AutonomyFeedItem[] = [];
  for (const row of publicationJobs.rows) {
    const lane = parseLane(row.lane) ?? "unknown";
    const actionClass = optionalText(row.action_class) ?? "unknown";
    const status = optionalText(row.status) ?? "unknown";
    const rolledBack = status === "rolled_back";
    feed.push({
      id: `job:${optionalText(row.id) ?? feed.length}`,
      kind: rolledBack
        ? "rollback"
        : actionClass === "safe_apply"
          ? "auto_applied"
          : "auto_published",
      title:
        actionClass === "safe_apply"
          ? "Technical safe apply"
          : "Organic publication adapter",
      detail: `${optionalText(row.target_table) ?? "target"} -> ${status}`,
      lane,
      actionClass,
      status,
      occurredAt:
        isoOrNull(row.rolled_back_at) ??
        isoOrNull(row.smoke_checked_at) ??
        isoOrNull(row.applied_at) ??
        isoOrNull(row.updated_at) ??
        isoOrNull(row.created_at) ??
        new Date(0).toISOString(),
    });
  }
  for (const row of workItems.rows) {
    const status = optionalText(row.status) ?? "unknown";
    if (!["running", "blocked", "review_needed"].includes(status)) continue;
    feed.push({
      id: `work:${optionalText(row.id) ?? feed.length}`,
      kind:
        status === "running"
          ? "running"
          : status === "blocked"
            ? "blocked"
            : "review_needed",
      title: optionalText(row.title) ?? "Growth work item",
      detail:
        optionalText(row.next_action) ??
        optionalText(row.progress_label) ??
        optionalText(row.intent) ??
        status,
      lane: parseLane(row.lane) ?? "unknown",
      actionClass: optionalText(row.allowed_action_class) ?? "unknown",
      status,
      occurredAt:
        isoOrNull(row.updated_at) ??
        isoOrNull(row.created_at) ??
        new Date(0).toISOString(),
    });
  }
  for (const row of toolCalls.rows) {
    const actionClass = optionalText(row.action_class) ?? "unknown";
    const allowed = row.allowed === true;
    if (allowed && actionClass !== "paid_mutation") continue;
    feed.push({
      id: `tool:${optionalText(row.id) ?? feed.length}`,
      kind: "blocked",
      title: actionClass === "paid_mutation" ? "Paid mutation blocked" : "Tool call blocked",
      detail:
        optionalText(row.reason) ??
        optionalText(row.policy_verdict) ??
        "Blocked by policy",
      lane: parseLane(row.lane) ?? "unknown",
      actionClass,
      status: optionalText(row.result_status) ?? "blocked",
      occurredAt: isoOrNull(row.created_at) ?? new Date(0).toISOString(),
    });
  }

  const workTitleById = new Map(
    workItems.rows.map((row) => [optionalText(row.id), optionalText(row.title)]),
  );
  const jobById = new Map(
    publicationJobs.rows.map((row) => [optionalText(row.id), row] as const),
  );

  const impactLedger = outcomes.rows.slice(0, 12).map((row, index): ImpactLedgerRow => {
    const job = jobById.get(optionalText(row.publication_job_id));
    return {
      id: optionalText(row.id) ?? `outcome:${index}`,
      publicationJobId: optionalText(row.publication_job_id),
      workItemTitle:
        workTitleById.get(optionalText(row.work_item_id)) ??
        optionalText(row.success_metric) ??
        "Autonomous Growth work",
      target:
        job
          ? `${optionalText(job.target_table) ?? "target"}${
              optionalText(job.target_path) ? `:${optionalText(job.target_path)}` : ""
            }`
          : "pending publication job",
      metric: optionalText(row.success_metric) ?? "metric missing",
      baseline: metricFromRecord(row.baseline),
      current: metricFromRecord(row.current_result),
      status: optionalText(row.status) ?? "scheduled",
      evaluationDate: optionalText(row.evaluation_date) ?? "n/a",
      funnelAttributionStatus:
        optionalText(row.funnel_attribution_status) ?? "pending",
    };
  });

  const policyRows = policies.rows
    .map((row, index): RiskBudgetRow | null => {
      const lane = parseLane(row.lane);
      if (!lane) return null;
      return {
        id: optionalText(row.id) ?? `policy:${index}`,
        lane,
        actionClass: optionalText(row.action_class) ?? "unknown",
        enabled: row.enabled === true,
        dryRunOnly: row.dry_run_only !== false,
        killSwitchEnabled: row.kill_switch_enabled === true,
        pausedReason: optionalText(row.paused_reason),
        dailyUsed: countRecentJobs(publicationJobs.rows, row, 1),
        dailyCap: numberValue(row.daily_cap),
        weeklyUsed: countRecentJobs(publicationJobs.rows, row, 7),
        weeklyCap: numberValue(row.weekly_cap),
        maxRiskLevel: optionalText(row.max_risk_level) ?? "medium",
        maxRiskScore: numberValue(row.max_risk_score),
        requiredChecks: optionalStringArray(row.required_checks),
        policyVersion: optionalText(row.policy_version) ?? "n/a",
        updatedAt:
          isoOrNull(row.updated_at) ??
          isoOrNull(row.created_at) ??
          new Date(0).toISOString(),
      };
    })
    .filter(Boolean) as RiskBudgetRow[];

  const rollbackJobs = publicationJobs.rows
    .filter((row) =>
      ["applied", "smoke_passed", "smoke_failed", "rolled_back"].includes(
        optionalText(row.status) ?? "",
      ),
    )
    .slice(0, 6)
    .map((row, index): RollbackPublicationJobRow => {
      const lane = parseLane(row.lane) ?? "unknown";
      const targetPath = optionalText(row.target_path);
      const targetTable = optionalText(row.target_table) ?? "target";
      const targetId = optionalText(row.target_id);
      return {
        id: optionalText(row.id) ?? `publication:${index}`,
        lane,
        actionClass: optionalText(row.action_class) ?? "unknown",
        jobMode: optionalText(row.job_mode) ?? "dry_run",
        status: optionalText(row.status) ?? "unknown",
        affectedRoute:
          targetPath ??
          (targetId ? `${targetTable}:${targetId}` : targetTable),
        targetTable,
        targetId,
        targetPath,
        beforeSnapshot: safeRecord(row.before_snapshot),
        afterPayload: safeRecord(row.after_payload),
        rollbackPayload: safeRecord(row.rollback_payload),
        smokeEvidence: safeRecord(row.smoke_result ?? row.evidence),
        canRollback: ["applied", "smoke_passed", "smoke_failed"].includes(
          optionalText(row.status) ?? "",
        ),
        updatedAt:
          isoOrNull(row.updated_at) ??
          isoOrNull(row.created_at) ??
          new Date(0).toISOString(),
      };
    });

  const nowMs = Date.now();
  const profileRows = profiles.rows.slice(0, 12).map((row, index): ProfileFreshnessRow => {
    const validUntil = optionalText(row.valid_until) ?? "n/a";
    const validUntilMs = Date.parse(validUntil);
    const validFrom = optionalText(row.valid_from) ?? optionalText(row.created_at);
    const ageHours = validFrom
      ? Math.max(0, (nowMs - Date.parse(validFrom)) / (1000 * 60 * 60))
      : 0;
    const confidence = numberValue(row.confidence);
    const status: ProfileFreshnessRow["status"] =
      Number.isFinite(validUntilMs) && validUntilMs <= nowMs
        ? "stale"
        : confidence < 0.7
          ? "low_confidence"
          : "fresh";
    return {
      id: optionalText(row.id) ?? `profile:${index}`,
      profileType: optionalText(row.profile_type) ?? "unknown",
      subject:
        optionalText(row.subject_key) ??
        optionalText(row.subject_table) ??
        "tenant",
      status,
      confidence,
      validUntil,
      ageHours: Number(ageHours.toFixed(1)),
    };
  });

  const candidateRows = opportunityCandidates.rows
    .slice(0, 8)
    .map((row, index): OpportunityCandidateRow => ({
      id: optionalText(row.id) ?? `candidate:${index}`,
      title: optionalText(row.title) ?? "Growth opportunity",
      candidateType: optionalText(row.candidate_type) ?? "unknown",
      lane: parseLane(row.lane) ?? "unknown",
      actionClass: optionalText(row.allowed_action_class) ?? "unknown",
      status: optionalText(row.status) ?? "candidate",
      totalScore: numberValue(row.total_score),
      blockingReason: optionalText(row.blocking_reason),
      successMetric: optionalText(row.success_metric),
    }));

  const decisionRows = orchestratorDecisions.rows.map(
    (row, index): AgenticDecisionRow => {
      const proposedCandidates = Array.isArray(row.proposed_candidates)
        ? row.proposed_candidates
        : [];
      const proposedWorkItems = Array.isArray(row.proposed_work_items)
        ? row.proposed_work_items
        : [];
      const delegatedTasks = Array.isArray(row.delegated_tasks)
        ? row.delegated_tasks
        : [];
      const blockedDecisions = Array.isArray(row.blocked_decisions)
        ? row.blocked_decisions
        : [];
      const memoryReads = Array.isArray(row.memory_reads) ? row.memory_reads : [];
      const skillReads = Array.isArray(row.skill_reads) ? row.skill_reads : [];
      const outcomeReferences = Array.isArray(row.outcome_references)
        ? row.outcome_references
        : [];
      const createdCandidateIds = optionalStringArray(row.created_candidate_ids);
      return {
        id: optionalText(row.id) ?? `decision:${index}`,
        decisionType: optionalText(row.decision_type) ?? "observe",
        objective: optionalText(row.objective) ?? "Growth OS objective",
        northStarAlignment:
          optionalText(row.north_star_alignment) ?? "North Star alignment not recorded.",
        confidence: numberValue(row.confidence),
        materializationStatus:
          optionalText(row.materialization_status) ?? "pending",
        createdCandidates:
          createdCandidateIds.length > 0
            ? createdCandidateIds.length
            : proposedCandidates.length,
        delegatedTasks: delegatedTasks.length,
        blockedDecisions: blockedDecisions.length,
        memoryReads: memoryReads.length,
        skillReads: skillReads.length,
        outcomeReferences: outcomeReferences.length,
        noGoReasons: optionalStringArray(row.no_go_reasons),
        contextSnapshotId: optionalText(row.context_snapshot_id),
        createdAt:
          isoOrNull(row.created_at) ??
          isoOrNull(row.updated_at) ??
          new Date(0).toISOString(),
        observedSignals: compactRecords(row.observed_signals),
        proposedCandidates: compactRecords(proposedCandidates),
        proposedWorkItems: compactRecords(proposedWorkItems),
        delegatedTaskDetails: compactRecords(delegatedTasks),
        blockedDecisionDetails: compactRecords(blockedDecisions),
        memoryReadDetails: compactRecords(memoryReads),
        skillReadDetails: compactRecords(skillReads),
        outcomeReferenceDetails: compactRecords(outcomeReferences),
        policyRecommendations: Array.isArray(row.policy_recommendations)
          ? compactRecords(row.policy_recommendations)
          : [],
        riskAssessment: safeRecord(
          compactUnknown(row.risk_assessment, {
            depth: 3,
            arrayLimit: 5,
            stringLimit: 500,
          }),
        ),
        evidence: compactDecisionEvidence(row.evidence),
      };
    },
  );

  const wakeupRows = wakeupRequests.rows.map(
    (row, index): AgenticWakeupRow => ({
      id: optionalText(row.id) ?? `wakeup:${index}`,
      lane: parseLane(row.lane) ?? "unknown",
      source: optionalText(row.source) ?? "timer",
      status: optionalText(row.status) ?? "queued",
      priority: numberValue(row.priority),
      coalescedCount: numberValue(row.coalesced_count),
      runId: optionalText(row.run_id),
      updatedAt:
        isoOrNull(row.updated_at) ??
        isoOrNull(row.created_at) ??
        new Date(0).toISOString(),
    }),
  );

  const taskSessionRows = taskSessions.rows.map(
    (row, index): AgenticTaskSessionRow => ({
      id: optionalText(row.id) ?? `task-session:${index}`,
      assignedLane: parseLane(row.assigned_agent_lane) ?? "unknown",
      status: optionalText(row.status) ?? "created",
      handoffSummary:
        optionalText(row.handoff_summary) ?? "No handoff summary recorded.",
      parentWorkItemId: optionalText(row.parent_work_item_id),
      childWorkItemId: optionalText(row.child_work_item_id),
      decisionId: optionalText(row.decision_id),
      dependencies: Array.isArray(row.dependencies) ? row.dependencies.length : 0,
      updatedAt:
        isoOrNull(row.updated_at) ??
        isoOrNull(row.created_at) ??
        new Date(0).toISOString(),
    }),
  );

  return {
    accountId: ctx.accountId,
    websiteId: ctx.websiteId,
    role: ctx.role,
    objective: {
      northStar: "qualified_trip_requests/month",
      laggingOutcome: "confirmed_bookings_attributed_to_growth_channels/month",
      scope: "ColombiaTours organic + reversible technical remediation",
      autonomyRule:
        "Generic runtime blocks public mutation; dedicated adapters may execute only with policy, caps, smoke, rollback and measurement.",
    },
    northStar,
    agentCompany,
    autonomyFeed: feed
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, 12),
    impactLedger,
    runtimeCycle: buildRuntimeCycleHealth(
      runtimeCycles.rows,
      schedulerHeartbeats.rows,
      [
        runtimeCycles.missing,
        schedulerHeartbeats.missing,
      ].filter(Boolean) as string[],
    ),
    riskBudget: {
      killSwitchActive: policyRows.some((row) => row.killSwitchEnabled),
      enabledPolicies: policyRows.filter((row) => row.enabled).length,
      policies: policyRows,
      smokeFailures: publicationJobs.rows.filter(
        (row) => optionalText(row.status) === "smoke_failed",
      ).length,
      rolledBack: publicationJobs.rows.filter(
        (row) => optionalText(row.status) === "rolled_back",
      ).length,
      blockedPaidMutations: toolCalls.rows.filter(
        (row) =>
          optionalText(row.action_class) === "paid_mutation" &&
          row.allowed !== true,
      ).length,
      missingTables: Array.from(missingTables).sort(),
    },
    rollbackJobs,
    profileFlow: {
      freshProfiles: profileRows.filter((row) => row.status === "fresh").length,
      staleProfiles: profileRows.filter((row) => row.status === "stale").length,
      lowConfidenceProfiles: profileRows.filter(
        (row) => row.status === "low_confidence",
      ).length,
      readyCandidates: candidateRows.filter(
        (row) => row.status === "ready_for_backlog",
      ).length,
      blockedCandidates: candidateRows.filter((row) => row.status === "blocked")
        .length,
      profiles: profileRows,
      candidates: candidateRows,
    },
    agenticControl: {
      decisions: decisionRows,
      wakeups: wakeupRows,
      taskSessions: taskSessionRows,
      blockedSensitiveDecisions: orchestratorDecisions.rows.filter((row) => {
        const blocked = Array.isArray(row.blocked_decisions)
          ? row.blocked_decisions
          : [];
        return blocked.some((entry) =>
          /paid|pricing|payment|reservation|availability|crm|outreach/i.test(
            JSON.stringify(entry),
          ),
        );
      }).length,
      missingTables: [
        contextSnapshots.missing,
        orchestratorDecisions.missing,
        wakeupRequests.missing,
        taskSessions.missing,
      ].filter(Boolean) as string[],
    },
    generatedAt: new Date().toISOString(),
  };
}
