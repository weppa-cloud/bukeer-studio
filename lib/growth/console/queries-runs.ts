import "server-only";

import { z } from "zod";
import {
  AgentRunStatusSchema,
  AgentLaneSchema,
  GrowthAgentRunSchema,
  GrowthAgentRunEventSchema,
  type AgentLane,
  type AgentRunStatus,
  type GrowthAgentRun,
  type GrowthAgentRunEvent,
} from "@bukeer/website-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Growth Console — Run queries (#407).
 *
 * Tenant-scoped readers for the Reviews & Agent Runs tab. Filter by
 * `account_id + website_id` (ADR-009). Tables (`growth_agent_runs`,
 * `growth_agent_run_events`, `growth_agent_definitions`) may not exist
 * locally yet (#404 ships them). Missing-table responses degrade to empty
 * defaults plus a `tablesMissing` flag so the UI can surface a TODO state
 * without crashing.
 *
 * NEVER: expose UPDATE / DELETE on `growth_agent_run_events` (append-only —
 * see SPEC §"Append-only events"). Reads only.
 *
 * NEVER: return `artifact_path` raw to the UI. Server actions sign URLs;
 * the row itself includes the path so this layer must scrub callers'
 * exposure of it (caller responsibility — we still parse it through Zod
 * for type fidelity, but UI obfuscates).
 */

const STATUSES = AgentRunStatusSchema.options;

export interface GetAgentRunsOpts {
  accountId: string;
  status?: AgentRunStatus;
  lane?: AgentLane;
  page?: number;
  pageSize?: number;
}

export interface AgentRunListRow {
  run: GrowthAgentRun;
  agentName: string | null;
  hasArtifact: boolean;
  artifactComplete: boolean | null;
  agreementState: "pending" | "met" | "not_met" | "unknown";
}

export interface GetAgentRunsResult {
  runs: AgentRunListRow[];
  total: number;
  totalByStatus: Record<AgentRunStatus, number>;
  page: number;
  pageSize: number;
  tablesMissing: boolean;
  errored: boolean;
}

const POSTGREST_MISSING_TABLE_CODES = new Set([
  "42P01", // undefined_table
  "PGRST205", // PostgREST: relation not found
  "PGRST204",
]);

function isMissingTable(
  error: { code?: string | null; message?: string | null } | null,
): boolean {
  if (!error) return false;
  if (error.code && POSTGREST_MISSING_TABLE_CODES.has(error.code)) return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    (msg.includes("relation") && msg.includes("not found")) ||
    msg.includes("schema cache")
  );
}

function emptyTotalByStatus(): Record<AgentRunStatus, number> {
  return STATUSES.reduce<Record<AgentRunStatus, number>>(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<AgentRunStatus, number>,
  );
}

function deriveAgreementState(
  run: GrowthAgentRun,
): AgentRunListRow["agreementState"] {
  if (run.status === "review_required") return "pending";
  if (run.status === "completed") return "met";
  if (run.status === "failed" || run.status === "stalled") return "not_met";
  return "unknown";
}

function toIsoDateTime(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function normalizeRunRow<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    heartbeat_at:
      row.heartbeat_at == null ? null : toIsoDateTime(row.heartbeat_at),
    started_at: row.started_at == null ? null : toIsoDateTime(row.started_at),
    finished_at:
      row.finished_at == null ? null : toIsoDateTime(row.finished_at),
    created_at: toIsoDateTime(row.created_at),
    updated_at: toIsoDateTime(row.updated_at),
  };
}

function normalizeEventRow<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    occurred_at: toIsoDateTime(row.occurred_at),
    created_at: toIsoDateTime(row.created_at),
  };
}

function safeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "")).filter(Boolean)
    : [];
}

function artifactCompleteFromEvidence(evidence: unknown): boolean | null {
  const executor = safeRecord(safeRecord(evidence)?.executor);
  return typeof executor?.artifact_complete === "boolean"
    ? executor.artifact_complete
    : null;
}

export async function getAgentRuns(
  websiteId: string,
  opts: GetAgentRunsOpts,
): Promise<GetAgentRunsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(Math.max(1, opts.pageSize ?? 25), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("growth_agent_runs")
    .select(
      "account_id, website_id, locale, market, run_id, agent_id, lane, source_table, source_id, profile_run_id, claim_id, workspace_path, status, heartbeat_at, attempts, artifact_path, error_class, error_message, evidence, started_at, finished_at, created_at, updated_at",
      { count: "exact" },
    )
    .eq("account_id", opts.accountId)
    .eq("website_id", websiteId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.lane) query = query.eq("lane", opts.lane);

  const { data, error, count } = await query;

  if (error) {
    if (isMissingTable(error)) {
      return {
        runs: [],
        total: 0,
        totalByStatus: emptyTotalByStatus(),
        page,
        pageSize,
        tablesMissing: true,
        errored: false,
      };
    }
    return {
      runs: [],
      total: 0,
      totalByStatus: emptyTotalByStatus(),
      page,
      pageSize,
      tablesMissing: false,
      errored: true,
    };
  }

  const rawRows = (data ?? []).map((row) =>
    normalizeRunRow(row as Record<string, unknown>),
  );
  const parsed = z.array(GrowthAgentRunSchema).safeParse(rawRows);
  if (!parsed.success) {
    return {
      runs: [],
      total: 0,
      totalByStatus: emptyTotalByStatus(),
      page,
      pageSize,
      tablesMissing: false,
      errored: true,
    };
  }
  const runs = parsed.data;

  const agentIds = Array.from(new Set(runs.map((r) => r.agent_id)));
  const agentNameById = new Map<string, string>();

  if (agentIds.length > 0) {
    const { data: agentRows, error: agentErr } = await supabase
      .from("growth_agent_definitions")
      .select("agent_id, name")
      .eq("account_id", opts.accountId)
      .eq("website_id", websiteId)
      .in("agent_id", agentIds);

    if (!agentErr && agentRows) {
      for (const row of agentRows as Array<{
        agent_id: string;
        name: string;
      }>) {
        agentNameById.set(row.agent_id, row.name);
      }
    }
  }

  // Aggregate status counts (separate query — small table, scoped to tenant).
  const totalByStatus = emptyTotalByStatus();
  const { data: statusRows, error: statusErr } = await supabase
    .from("growth_agent_runs")
    .select("status")
    .eq("account_id", opts.accountId)
    .eq("website_id", websiteId);

  if (!statusErr && statusRows) {
    for (const row of statusRows as Array<{ status: string }>) {
      const parsedStatus = AgentRunStatusSchema.safeParse(row.status);
      if (parsedStatus.success) {
        totalByStatus[parsedStatus.data] += 1;
      }
    }
  }

  return {
    runs: runs.map((run) => ({
      run,
      agentName: agentNameById.get(run.agent_id) ?? null,
      hasArtifact: Boolean(run.artifact_path),
      artifactComplete: artifactCompleteFromEvidence(run.evidence),
      agreementState: deriveAgreementState(run),
    })),
    total: count ?? runs.length,
    totalByStatus,
    page,
    pageSize,
    tablesMissing: false,
    errored: false,
  };
}

export interface GetAgentRunDetailResult {
  run: GrowthAgentRun;
  events: GrowthAgentRunEvent[];
  agentName: string | null;
  agreementForLane: number | null;
  hasArtifact: boolean;
  artifactPathTail: string | null;
  aiReview: RuntimeAiReview | null;
  metrics: RuntimeRunMetrics | null;
  toolCalls: RuntimeToolCall[];
  replayCases: RuntimeReplayCase[];
  memories: RuntimeMemory[];
  skills: RuntimeSkill[];
  tablesMissing: boolean;
}

export interface RuntimeAiReview {
  review_key: string;
  model: string;
  prompt_version: string | null;
  config_version: string | null;
  confidence_score: number;
  recommendation: string;
  risks: string[];
  status: string;
  evidence: Record<string, unknown>;
}

export interface RuntimeRunMetrics {
  duration_ms: number | null;
  codex_duration_ms: number | null;
  exit_code: number | null;
  retries: number;
  artifact_complete: boolean;
  cost_usd: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  error_class: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
}

export interface RuntimeToolCall {
  tool: string;
  action_class: string;
  policy_verdict: string;
  allowed: boolean;
  reason: string | null;
  result_status: string;
  cost_usd: number | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
}

export interface RuntimeReplayCase {
  id: string;
  expected_decision: string;
  expected_allowed_action: string | null;
  rationale: string | null;
  status: string;
  evidence: Record<string, unknown> | null;
  created_at: string;
}

export interface RuntimeMemory {
  id: string;
  memory_key: string;
  status: string;
  content: Record<string, unknown>;
  evidence: Record<string, unknown> | null;
  approved_at: string | null;
  created_at: string;
}

export interface RuntimeSkill {
  id: string;
  skill_key: string;
  version: number;
  status: string;
  title: string;
  instructions: Record<string, unknown>;
  evidence: Record<string, unknown> | null;
  approved_at: string | null;
  created_at: string;
}

export async function getAgentRunDetail(
  websiteId: string,
  runId: string,
  accountId: string,
): Promise<GetAgentRunDetailResult | null> {
  const supabase = await createSupabaseServerClient();

  const { data: runRow, error: runErr } = await supabase
    .from("growth_agent_runs")
    .select(
      "account_id, website_id, locale, market, run_id, agent_id, lane, source_table, source_id, profile_run_id, claim_id, workspace_path, status, heartbeat_at, attempts, artifact_path, error_class, error_message, evidence, started_at, finished_at, created_at, updated_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .maybeSingle();

  if (runErr) {
    if (isMissingTable(runErr)) {
      return null;
    }
    return null;
  }
  if (!runRow) return null;

  const runParsed = GrowthAgentRunSchema.safeParse(
    normalizeRunRow(runRow as Record<string, unknown>),
  );
  if (!runParsed.success) return null;
  const run = runParsed.data;

  const { data: eventRows, error: eventsErr } = await supabase
    .from("growth_agent_run_events")
    .select(
      "account_id, website_id, locale, market, event_id, run_id, event_type, severity, payload, message, occurred_at, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .order("occurred_at", { ascending: true });

  let events: GrowthAgentRunEvent[] = [];
  let tablesMissing = false;
  if (eventsErr) {
    if (isMissingTable(eventsErr)) {
      tablesMissing = true;
    }
  } else if (eventRows) {
    const parsed = z
      .array(GrowthAgentRunEventSchema)
      .safeParse(
        eventRows.map((row) =>
          normalizeEventRow(row as Record<string, unknown>),
        ),
      );
    if (parsed.success) events = parsed.data;
  }

  let agentName: string | null = null;
  let agreementForLane: number | null = null;
  const { data: agentRow, error: agentErr } = await supabase
    .from("growth_agent_definitions")
    .select("name, agreement_threshold, lane")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("agent_id", run.agent_id)
    .maybeSingle();

  if (!agentErr && agentRow) {
    const row = agentRow as {
      name: string;
      agreement_threshold: number;
      lane: string;
    };
    agentName = row.name;
    agreementForLane = row.agreement_threshold;
  }

  // Path obfuscation: only return last 16 chars; never the raw filesystem path.
  const artifactPathTail = run.artifact_path
    ? run.artifact_path.slice(-16)
    : null;

  const runtimeSupabase = createSupabaseServiceRoleClient();
  const [aiReview, metrics, toolCalls, replayCases, memories, skills] =
    await Promise.all([
      fetchRuntimeAiReview(runtimeSupabase, accountId, websiteId, runId),
      fetchRuntimeMetrics(runtimeSupabase, accountId, websiteId, runId),
      fetchRuntimeToolCalls(runtimeSupabase, accountId, websiteId, runId),
      fetchRuntimeReplayCases(runtimeSupabase, accountId, websiteId, runId),
      fetchRuntimeMemories(runtimeSupabase, accountId, websiteId, runId),
      fetchRuntimeSkills(runtimeSupabase, accountId, websiteId, runId),
    ]);

  return {
    run,
    events,
    agentName,
    agreementForLane,
    hasArtifact: Boolean(run.artifact_path),
    artifactPathTail,
    aiReview,
    metrics,
    toolCalls,
    replayCases,
    memories,
    skills,
    tablesMissing,
  };
}

type RuntimeSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function runtimeTable(supabase: RuntimeSupabase, table: string) {
  return (
    supabase.from as unknown as (
      tableName: string,
    ) => ReturnType<typeof supabase.from>
  )(table);
}

async function fetchRuntimeAiReview(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeAiReview | null> {
  const { data, error } = await supabase
    .from("growth_ai_reviews")
    .select(
      "review_key, model, prompt_version, config_version, confidence_score, recommendation, risks, status, evidence",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .in("review_key", [
      `codex-runtime-score-8-5:${runId}`,
      `codex-runtime-8-5:${runId}`,
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    review_key: String(row.review_key ?? ""),
    model: String(row.model ?? ""),
    prompt_version:
      row.prompt_version == null ? null : String(row.prompt_version),
    config_version:
      row.config_version == null ? null : String(row.config_version),
    confidence_score: nullableNumber(row.confidence_score) ?? 0,
    recommendation: String(row.recommendation ?? ""),
    risks: stringArray(row.risks),
    status: String(row.status ?? ""),
    evidence: safeRecord(row.evidence) ?? {},
  };
}

async function fetchRuntimeMetrics(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeRunMetrics | null> {
  const { data, error } = await runtimeTable(
    supabase,
    "growth_agent_run_metrics",
  )
    .select(
      "duration_ms, codex_duration_ms, exit_code, retries, artifact_complete, cost_usd, tokens_input, tokens_output, error_class, evidence, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    duration_ms: nullableNumber(row.duration_ms),
    codex_duration_ms: nullableNumber(row.codex_duration_ms),
    exit_code: nullableNumber(row.exit_code),
    retries: nullableNumber(row.retries) ?? 0,
    artifact_complete: Boolean(row.artifact_complete),
    cost_usd: nullableNumber(row.cost_usd),
    tokens_input: nullableNumber(row.tokens_input),
    tokens_output: nullableNumber(row.tokens_output),
    error_class: row.error_class == null ? null : String(row.error_class),
    evidence: safeRecord(row.evidence),
    created_at: String(toIsoDateTime(row.created_at)),
  };
}

async function fetchRuntimeToolCalls(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeToolCall[]> {
  const { data, error } = await runtimeTable(
    supabase,
    "growth_agent_tool_calls",
  )
    .select(
      "tool, action_class, policy_verdict, allowed, reason, result_status, cost_usd, evidence, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    tool: String(row.tool ?? ""),
    action_class: String(row.action_class ?? ""),
    policy_verdict: String(row.policy_verdict ?? ""),
    allowed: Boolean(row.allowed),
    reason: row.reason == null ? null : String(row.reason),
    result_status: String(row.result_status ?? ""),
    cost_usd: nullableNumber(row.cost_usd),
    evidence: safeRecord(row.evidence),
    created_at: String(toIsoDateTime(row.created_at)),
  }));
}

async function fetchRuntimeReplayCases(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeReplayCase[]> {
  const { data, error } = await runtimeTable(
    supabase,
    "growth_agent_replay_cases",
  )
    .select(
      "id, expected_decision, expected_allowed_action, rationale, status, evidence, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ""),
    expected_decision: String(row.expected_decision ?? ""),
    expected_allowed_action:
      row.expected_allowed_action == null
        ? null
        : String(row.expected_allowed_action),
    rationale: row.rationale == null ? null : String(row.rationale),
    status: String(row.status ?? ""),
    evidence: safeRecord(row.evidence),
    created_at: String(toIsoDateTime(row.created_at)),
  }));
}

async function fetchRuntimeMemories(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeMemory[]> {
  const { data, error } = await runtimeTable(supabase, "growth_agent_memories")
    .select(
      "id, memory_key, status, content, evidence, approved_at, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("source_run_id", runId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ""),
    memory_key: String(row.memory_key ?? ""),
    status: String(row.status ?? ""),
    content: safeRecord(row.content) ?? {},
    evidence: safeRecord(row.evidence),
    approved_at:
      row.approved_at == null ? null : String(toIsoDateTime(row.approved_at)),
    created_at: String(toIsoDateTime(row.created_at)),
  }));
}

async function fetchRuntimeSkills(
  supabase: RuntimeSupabase,
  accountId: string,
  websiteId: string,
  runId: string,
): Promise<RuntimeSkill[]> {
  const { data, error } = await runtimeTable(supabase, "growth_agent_skills")
    .select(
      "id, skill_key, version, status, title, instructions, evidence, approved_at, created_at",
    )
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("source_run_id", runId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: String(row.id ?? ""),
    skill_key: String(row.skill_key ?? ""),
    version: nullableNumber(row.version) ?? 1,
    status: String(row.status ?? ""),
    title: String(row.title ?? ""),
    instructions: safeRecord(row.instructions) ?? {},
    evidence: safeRecord(row.evidence),
    approved_at:
      row.approved_at == null ? null : String(toIsoDateTime(row.approved_at)),
    created_at: String(toIsoDateTime(row.created_at)),
  }));
}

export const AGENT_RUN_STATUS_OPTIONS = STATUSES;
export const AGENT_LANE_OPTIONS = AgentLaneSchema.options;
