import type {
  AgentLane,
  GrowthAgentWakeupRequest,
  GrowthContextSnapshot,
  GrowthContextSnapshotInsert,
  GrowthMarket,
} from "@bukeer/website-contract";
import { GrowthContextSnapshotInsertSchema } from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { scanGrowthContextForPromptInjection } from "./prompt-injection-scan";

export interface BuildGrowthAgentContextOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  lane?: AgentLane | "all";
  wakeup?: GrowthAgentWakeupRequest | null;
  cycleId?: string | null;
  locale?: string;
  market?: GrowthMarket;
  now?: Date;
  persist?: boolean;
}

export interface GrowthAgentContextBundle {
  snapshot: GrowthContextSnapshot;
  context: JsonRecord;
  injectionScan: ReturnType<typeof scanGrowthContextForPromptInjection>;
}

const OBJECTIVE =
  "Increase qualified_trip_requests/month and confirmed bookings attributed to organic and funnel Growth OS channels for ColombiaTours.";

async function selectRows({
  supabase,
  table,
  accountId,
  websiteId,
  columns = "*",
  limit = 30,
  orderColumn = "updated_at",
}: {
  supabase: SupabaseLike;
  table: string;
  accountId: string;
  websiteId: string;
  columns?: string;
  limit?: number;
  orderColumn?: string;
}) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .order(orderColumn, { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`${table} context lookup failed: ${error.message}`);
  return (data ?? []) as JsonRecord[];
}

function compactRows(rows: JsonRecord[], keys: string[]) {
  return rows.map((row) => {
    const compact: JsonRecord = {};
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null) compact[key] = value;
    }
    return compact;
  });
}

function estimateTokens(context: JsonRecord): number {
  return Math.ceil(JSON.stringify(context).length / 4);
}

function normalizeSnapshot(row: unknown): GrowthContextSnapshot {
  return row as GrowthContextSnapshot;
}

export async function buildGrowthAgentContext(
  options: BuildGrowthAgentContextOptions,
): Promise<GrowthAgentContextBundle> {
  const lane = options.lane ?? "all";
  const locale = options.locale ?? "es-CO";
  const market = options.market ?? "CO";
  const now = options.now ?? new Date();

  const [
    profiles,
    signalFacts,
    workItems,
    outcomes,
    memories,
    skills,
    replayCases,
    policies,
    publicationJobs,
    toolCalls,
    runtimeState,
  ] = await Promise.all([
    selectRows({
      ...options,
      table: "growth_profiles",
      columns:
        "id,profile_type,subject_table,subject_id,subject_key,confidence,valid_until,payload,source_signal_fact_ids",
      limit: 40,
      orderColumn: "valid_until",
    }),
    selectRows({
      ...options,
      table: "growth_signal_facts",
      columns:
        "id,source,signal_type,entity_table,entity_id,entity_path,observed_at,expires_at,confidence,payload",
      limit: 50,
      orderColumn: "observed_at",
    }),
    selectRows({
      ...options,
      table: "growth_work_items",
      columns:
        "id,lane,title,intent,status,allowed_action_class,risk_score,evidence,updated_at",
      limit: 40,
    }),
    selectRows({
      ...options,
      table: "growth_work_item_outcomes",
      columns:
        "id,work_item_id,publication_job_id,status,success_metric,baseline,current_result,evaluation_window,evaluation_date,updated_at",
      limit: 40,
      orderColumn: "evaluation_date",
    }),
    selectRows({
      ...options,
      table: "growth_agent_memories",
      columns: "id,lane,memory_key,status,content,evidence,updated_at",
      limit: 40,
    }),
    selectRows({
      ...options,
      table: "growth_agent_skills",
      columns: "id,lane,skill_key,version,status,title,instructions,evidence,updated_at",
      limit: 40,
    }),
    selectRows({
      ...options,
      table: "growth_agent_replay_cases",
      columns: "id,lane,status,expected_decision,expected_allowed_action,evidence,updated_at",
      limit: 40,
    }),
    selectRows({
      ...options,
      table: "growth_autonomy_policies",
      columns:
        "id,lane,action_class,enabled,dry_run_only,kill_switch_enabled,paused_reason,daily_cap,weekly_cap,max_risk_score,updated_at",
      limit: 80,
    }),
    selectRows({
      ...options,
      table: "growth_publication_jobs",
      columns: "id,lane,action_class,status,target_table,target_path,success_metric,updated_at",
      limit: 40,
    }),
    selectRows({
      ...options,
      table: "growth_agent_tool_calls",
      columns:
        "id,run_id,lane,tool,action_class,policy_verdict,allowed,reason,result_status,cost_usd,created_at",
      limit: 80,
      orderColumn: "created_at",
    }),
    selectRows({
      ...options,
      table: "growth_agent_runtime_state",
      columns:
        "id,lane,agent_id,status,heartbeat_at,current_wakeup_id,current_work_item_id,total_wakeups,total_decisions,total_cost_usd,last_error,updated_at",
      limit: 20,
    }).catch(() => []),
  ]);

  const laneFilter = (row: JsonRecord) =>
    lane === "all" || row.lane === lane || row.assigned_agent_lane === lane;
  const activeMemories = memories.filter(
    (row) => row.status === "active" && laneFilter(row),
  );
  const activeSkills = skills.filter(
    (row) => row.status === "active" && laneFilter(row),
  );
  const recentOutcomes = outcomes.slice(0, 20);
  const blockedTools = toolCalls.filter((row) => row.allowed === false).slice(0, 20);

  const context: JsonRecord = {
    objective: OBJECTIVE,
    generated_at: now.toISOString(),
    lane,
    wakeup: options.wakeup
      ? {
          id: options.wakeup.id,
          source: options.wakeup.source,
          priority: options.wakeup.priority,
          payload: options.wakeup.payload,
        }
      : null,
    hard_constraints: {
      brain_can_mutate_public_surfaces: false,
      executor_only_mutation_boundary: true,
      blocked_action_classes: [
        "paid_mutation",
        "experiment_activation",
        "outreach_send",
      ],
      blocked_surfaces: [
        "pricing",
        "payments",
        "reservations",
        "availability",
        "bulk_crm",
        "paid_media",
      ],
    },
    profiles: compactRows(profiles, [
      "id",
      "profile_type",
      "subject_table",
      "subject_id",
      "subject_key",
      "confidence",
      "valid_until",
      "payload",
      "source_signal_fact_ids",
    ]),
    signals: compactRows(signalFacts, [
      "id",
      "source",
      "signal_type",
      "entity_table",
      "entity_id",
      "entity_path",
      "observed_at",
      "expires_at",
      "confidence",
      "payload",
    ]),
    active_work: compactRows(workItems.filter(laneFilter), [
      "id",
      "lane",
      "title",
      "intent",
      "status",
      "allowed_action_class",
      "risk_score",
      "evidence",
      "updated_at",
    ]),
    recent_outcomes: compactRows(recentOutcomes, [
      "id",
      "work_item_id",
      "publication_job_id",
      "status",
      "success_metric",
      "baseline",
      "current_result",
      "evaluation_window",
      "evaluation_date",
    ]),
    active_memories: compactRows(activeMemories, [
      "id",
      "lane",
      "memory_key",
      "content",
      "evidence",
    ]),
    active_skills: compactRows(activeSkills, [
      "id",
      "lane",
      "skill_key",
      "version",
      "title",
      "instructions",
      "evidence",
    ]),
    replay_agreement: replayCases.reduce<JsonRecord>((acc, row) => {
      const key = typeof row.lane === "string" ? row.lane : "unknown";
      const current = asRecord(acc[key]);
      acc[key] = {
        total: Number(current.total ?? 0) + 1,
        active:
          Number(current.active ?? 0) + (row.status === "active" ? 1 : 0),
      };
      return acc;
    }, {}),
    policies: compactRows(policies, [
      "id",
      "lane",
      "action_class",
      "enabled",
      "dry_run_only",
      "kill_switch_enabled",
      "paused_reason",
      "daily_cap",
      "weekly_cap",
      "max_risk_score",
    ]),
    recent_publication_jobs: compactRows(publicationJobs, [
      "id",
      "lane",
      "action_class",
      "status",
      "target_table",
      "target_path",
      "success_metric",
    ]),
    blocked_tools: compactRows(blockedTools, [
      "id",
      "lane",
      "tool",
      "action_class",
      "policy_verdict",
      "reason",
      "result_status",
    ]),
    runtime_state: compactRows(runtimeState, [
      "id",
      "lane",
      "agent_id",
      "status",
      "heartbeat_at",
      "current_wakeup_id",
      "current_work_item_id",
      "total_wakeups",
      "total_decisions",
      "total_cost_usd",
      "last_error",
    ]),
  };

  const injectionScan = scanGrowthContextForPromptInjection(context);
  if (injectionScan.blocked) {
    context.injection_blocked_sections = injectionScan.findings.map(
      (finding) => finding.path,
    );
  }

  const sourceRefs = [
    ...profiles.map((row) => `growth_profiles:${row.id}`),
    ...signalFacts.map((row) => `growth_signal_facts:${row.id}`),
    ...activeMemories.map((row) => `growth_agent_memories:${row.id}`),
    ...activeSkills.map((row) => `growth_agent_skills:${row.id}`),
    ...recentOutcomes.map((row) => `growth_work_item_outcomes:${row.id}`),
  ].filter((ref) => !ref.endsWith(":undefined"));

  const insert: GrowthContextSnapshotInsert = GrowthContextSnapshotInsertSchema.parse({
    account_id: options.accountId,
    website_id: options.websiteId,
    locale,
    market,
    lane,
    wakeup_request_id: options.wakeup?.id ?? null,
    cycle_id: options.cycleId ?? null,
    context_version: "agentic-context-v1",
    objective: OBJECTIVE,
    sanitized_context: context,
    source_refs: sourceRefs.slice(0, 200),
    injection_scan: injectionScan,
    token_estimate: estimateTokens(context),
  });

  if (options.persist === false) {
    return {
      context,
      injectionScan,
      snapshot: normalizeSnapshot({
        id: "00000000-0000-4000-8000-000000000000",
        ...insert,
        created_at: now.toISOString(),
      }),
    };
  }

  const { data, error } = await options.supabase
    .from("growth_context_snapshots")
    .insert(insert)
    .select("*")
    .limit(1);
  if (error) throw new Error(`context snapshot insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("context snapshot insert returned no row");

  return {
    context,
    injectionScan,
    snapshot: normalizeSnapshot(row),
  };
}
