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

export interface RiskBudgetRow {
  id: string;
  lane: AgentLane;
  actionClass: string;
  enabled: boolean;
  dryRunOnly: boolean;
  killSwitchEnabled: boolean;
  dailyUsed: number;
  dailyCap: number;
  weeklyUsed: number;
  weeklyCap: number;
  maxRiskLevel: string;
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
  riskBudget: {
    killSwitchActive: boolean;
    enabledPolicies: number;
    policies: RiskBudgetRow[];
    smokeFailures: number;
    rolledBack: number;
    blockedPaidMutations: number;
    missingTables: string[];
  };
  profileFlow: {
    freshProfiles: number;
    staleProfiles: number;
    lowConfidenceProfiles: number;
    readyCandidates: number;
    blockedCandidates: number;
    profiles: ProfileFreshnessRow[];
    candidates: OpportunityCandidateRow[];
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
          "id,lane,action_class,enabled,dry_run_only,kill_switch_enabled,max_risk_level,daily_cap,weekly_cap,updated_at,created_at",
        )
        .eq("account_id", ctx.accountId)
        .eq("website_id", ctx.websiteId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(80),
    ),
    fetchTable("growth_publication_jobs", () =>
      table(admin, "growth_publication_jobs")
        .select(
          "id,work_item_id,change_set_id,lane,action_class,job_mode,status,target_table,target_id,target_path,baseline,success_metric,evaluation_date,smoke_result,evidence,applied_at,smoke_checked_at,rolled_back_at,updated_at,created_at",
        )
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
        dailyUsed: countRecentJobs(publicationJobs.rows, row, 1),
        dailyCap: numberValue(row.daily_cap),
        weeklyUsed: countRecentJobs(publicationJobs.rows, row, 7),
        weeklyCap: numberValue(row.weekly_cap),
        maxRiskLevel: optionalText(row.max_risk_level) ?? "medium",
      };
    })
    .filter(Boolean) as RiskBudgetRow[];

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
    generatedAt: new Date().toISOString(),
  };
}
