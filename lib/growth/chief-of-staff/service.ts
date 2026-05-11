import type {
  GrowthChiefOfStaffMessage,
  GrowthChiefOfStaffSession,
} from "@bukeer/website-contract";
import {
  GrowthChiefOfStaffMessageInsertSchema,
  GrowthChiefOfStaffSessionInsertSchema,
} from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { routeChiefOfStaffAction } from "./action-router";

export interface ChiefOfStaffTurnInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  userId: string;
  prompt: string;
  sessionId?: string | null;
  now?: Date;
}

export interface ChiefOfStaffTurnResult {
  sessionId: string;
  userMessageId: string;
  assistantMessageId: string;
  actionId: string;
  answer: string;
  citedRefs: string[];
}

interface RecentFacts {
  cycles: JsonRecord[];
  decisions: JsonRecord[];
  workItems: JsonRecord[];
  jobs: JsonRecord[];
  outcomes: JsonRecord[];
  profileRuns: JsonRecord[];
  taskSessions: JsonRecord[];
  memories: JsonRecord[];
  skills: JsonRecord[];
  actions: JsonRecord[];
}

function rows(data: unknown): JsonRecord[] {
  return (Array.isArray(data) ? data : data ? [data] : []).map(asRecord);
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function countByStatus(rowsValue: JsonRecord[], status: string): number {
  return rowsValue.filter((row) => row.status === status).length;
}

function cite(table: string, row: JsonRecord): string | null {
  const id = optionalText(row.id) ?? optionalText(row.run_id);
  return id ? `${table}:${id}` : null;
}

function pushCites(target: string[], table: string, source: JsonRecord[], limit = 3) {
  for (const row of source.slice(0, limit)) {
    const ref = cite(table, row);
    if (ref) target.push(ref);
  }
}

async function ensureSession({
  supabase,
  accountId,
  websiteId,
  userId,
  sessionId,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  userId: string;
  sessionId?: string | null;
  now: Date;
}): Promise<GrowthChiefOfStaffSession> {
  if (sessionId) {
    const { data, error } = await supabase
      .from("growth_chief_of_staff_sessions")
      .select("*")
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .eq("id", sessionId)
      .limit(1);
    if (error) throw new Error(`chief session lookup failed: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id) return row as GrowthChiefOfStaffSession;
  }

  const insert = GrowthChiefOfStaffSessionInsertSchema.parse({
    account_id: accountId,
    website_id: websiteId,
    user_id: userId,
    title: "Growth Chief of Staff",
    session_mode: "chief_of_staff",
    status: "active",
    last_message_at: now.toISOString(),
    metadata: {
      source: "growth_overview",
      architecture: "hermes_hybrid",
    },
  });
  const { data, error } = await supabase
    .from("growth_chief_of_staff_sessions")
    .insert(insert)
    .select("*")
    .limit(1);
  if (error) throw new Error(`chief session insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("chief session insert returned no row");
  return row as GrowthChiefOfStaffSession;
}

async function insertMessage({
  supabase,
  session,
  role,
  content,
  citedRefs = [],
  actionId = null,
  metadata = {},
}: {
  supabase: SupabaseLike;
  session: GrowthChiefOfStaffSession;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  citedRefs?: string[];
  actionId?: string | null;
  metadata?: JsonRecord;
}): Promise<GrowthChiefOfStaffMessage> {
  const insert = GrowthChiefOfStaffMessageInsertSchema.parse({
    account_id: session.account_id,
    website_id: session.website_id,
    session_id: session.id,
    role,
    content,
    cited_refs: citedRefs,
    action_id: actionId,
    token_estimate: Math.ceil(content.length / 4),
    redaction: {},
    metadata,
  });
  const { data, error } = await supabase
    .from("growth_chief_of_staff_messages")
    .insert(insert)
    .select("*")
    .limit(1);
  if (error) throw new Error(`chief message insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("chief message insert returned no row");
  return row as GrowthChiefOfStaffMessage;
}

async function readRecentFacts({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
}): Promise<RecentFacts> {
  const selectRecent = (
    tableName: string,
    select: string,
    orderColumn = "updated_at",
  ) =>
    supabase
      .from(tableName)
      .select(select)
      .eq("account_id", accountId)
      .eq("website_id", websiteId)
      .order(orderColumn, { ascending: false, nullsFirst: false })
      .limit(20);

  const [
    cycles,
    decisions,
    workItems,
    jobs,
    outcomes,
    profileRuns,
    taskSessions,
    memories,
    skills,
    actions,
  ] = await Promise.all([
    selectRecent("growth_runtime_cycles", "id,status,trigger,git_sha,counts,failures,started_at,finished_at,updated_at"),
    selectRecent("growth_orchestrator_decisions", "id,decision_type,objective,confidence,materialization_status,blocked_decisions,memory_reads,skill_reads,outcome_references,created_at", "created_at"),
    selectRecent("growth_work_items", "id,lane,title,status,allowed_action_class,updated_at"),
    selectRecent("growth_publication_jobs", "id,lane,action_class,status,affected_route,smoke_result,updated_at"),
    selectRecent("growth_work_item_outcomes", "id,work_item_id,status,success_metric,current_result,evaluation_date,updated_at"),
    selectRecent("growth_profile_runs", "id,provider,profile_id,run_status,freshness_status,row_count,cost_usd,updated_at"),
    selectRecent("growth_agent_task_sessions", "id,assigned_agent_lane,status,handoff_summary,decision_id,updated_at"),
    selectRecent("growth_agent_memories", "id,lane,memory_key,status,content,updated_at"),
    selectRecent("growth_agent_skills", "id,lane,skill_key,status,title,updated_at"),
    selectRecent("growth_chief_of_staff_actions", "id,action_class,status,intent,policy_verdict,result_payload,updated_at"),
  ]);

  return {
    cycles: rows(cycles.data),
    decisions: rows(decisions.data),
    workItems: rows(workItems.data),
    jobs: rows(jobs.data),
    outcomes: rows(outcomes.data),
    profileRuns: rows(profileRuns.data),
    taskSessions: rows(taskSessions.data),
    memories: rows(memories.data),
    skills: rows(skills.data),
    actions: rows(actions.data),
  };
}

export function composeChiefOfStaffAnswer({
  prompt,
  facts,
  actionMessage,
}: {
  prompt: string;
  facts: RecentFacts;
  actionMessage: string;
}): { answer: string; citedRefs: string[] } {
  const citedRefs: string[] = [];
  pushCites(citedRefs, "growth_runtime_cycles", facts.cycles);
  pushCites(citedRefs, "growth_orchestrator_decisions", facts.decisions);
  pushCites(citedRefs, "growth_publication_jobs", facts.jobs);
  pushCites(citedRefs, "growth_work_item_outcomes", facts.outcomes);
  pushCites(citedRefs, "growth_profile_runs", facts.profileRuns, 2);
  pushCites(citedRefs, "growth_agent_task_sessions", facts.taskSessions, 2);
  pushCites(citedRefs, "growth_agent_memories", facts.memories, 3);
  pushCites(citedRefs, "growth_agent_skills", facts.skills, 3);

  const completedCycles = countByStatus(facts.cycles, "completed");
  const failedCycles = countByStatus(facts.cycles, "failed");
  const appliedJobs =
    countByStatus(facts.jobs, "smoke_passed") +
    countByStatus(facts.jobs, "published_applied");
  const rolledBackJobs = countByStatus(facts.jobs, "rolled_back");
  const blockedWork = countByStatus(facts.workItems, "blocked");
  const measuringOutcomes = countByStatus(facts.outcomes, "measuring");
  const activeMemories = countByStatus(facts.memories, "active");
  const activeSkills = countByStatus(facts.skills, "active");

  const lastCycle = facts.cycles[0];
  const lastDecision = facts.decisions[0];
  const lastProfile = facts.profileRuns[0];
  const latestActiveMemory = facts.memories.find(
    (row) => optionalText(row.status) === "active",
  );
  const latestActiveSkill = facts.skills.find(
    (row) => optionalText(row.status) === "active",
  );

  const lines = [
    "Resumen operativo Growth OS:",
    `- Ciclos recientes: ${completedCycles} completed, ${failedCycles} failed.`,
    `- Jobs productivos recientes: ${appliedJobs} aplicados/publicados, ${rolledBackJobs} rolled_back.`,
    `- Work items bloqueados en ventana reciente: ${blockedWork}. Outcomes midiendo: ${measuringOutcomes}.`,
    `- Aprendizaje disponible: ${activeMemories} memorias activas y ${activeSkills} skills activas.`,
  ];

  if (lastCycle) {
    lines.push(
      `- Ultimo ciclo: ${optionalText(lastCycle.id) ?? "n/a"} (${optionalText(lastCycle.status) ?? "unknown"}).`,
    );
  }
  if (lastDecision) {
    lines.push(
      `- Ultima decision: ${optionalText(lastDecision.id) ?? "n/a"} (${optionalText(lastDecision.decision_type) ?? "unknown"}) con confianza ${lastDecision.confidence ?? "n/a"}.`,
    );
  }
  if (lastProfile) {
    lines.push(
      `- Perfil mas reciente: ${optionalText(lastProfile.provider) ?? "provider"} / ${optionalText(lastProfile.profile_id) ?? "profile"} (${optionalText(lastProfile.freshness_status) ?? optionalText(lastProfile.run_status) ?? "unknown"}).`,
    );
  }

  if (/cap|limite|l[ií]mite/i.test(prompt)) {
    lines.push(
      "Recomendacion: subir caps por escalones y solo despues de ciclos sin smoke failures, duplicados ready ni sesiones abiertas.",
    );
  } else if (/aprendi|learning|memoria|skill/i.test(prompt)) {
    if (latestActiveMemory) {
      lines.push(
        `Memoria citada: ${optionalText(latestActiveMemory.id) ?? "n/a"} (${optionalText(latestActiveMemory.memory_key) ?? "memory"}).`,
      );
    }
    if (latestActiveSkill) {
      lines.push(
        `Skill citada: ${optionalText(latestActiveSkill.id) ?? "n/a"} (${optionalText(latestActiveSkill.skill_key) ?? "skill"}).`,
      );
    }
    lines.push(
      "Aprendizaje: la memoria/skill solo debe influir decisiones futuras si esta activa y citada por decision o conversacion.",
    );
  } else if (/tecnic|safe|migraci/i.test(prompt)) {
    lines.push(
      "Para acciones tecnicas masivas: usar wakeup -> brain decision -> work items safe_apply -> executor con snapshot, smoke, rollback y outcome.",
    );
  } else {
    lines.push(
      "Siguiente paso recomendado: mantener el flujo por wakeups/action router; no ejecutar mutaciones desde chat.",
    );
  }

  lines.push(`Accion del router: ${actionMessage}`);

  return {
    answer: lines.join("\n"),
    citedRefs: Array.from(new Set(citedRefs)),
  };
}

export async function createChiefOfStaffTurn(
  input: ChiefOfStaffTurnInput,
): Promise<ChiefOfStaffTurnResult> {
  const now = input.now ?? new Date();
  const session = await ensureSession({
    supabase: input.supabase,
    accountId: input.accountId,
    websiteId: input.websiteId,
    userId: input.userId,
    sessionId: input.sessionId,
    now,
  });
  const userMessage = await insertMessage({
    supabase: input.supabase,
    session,
    role: "user",
    content: input.prompt,
    metadata: { source: "growth_chief_of_staff" },
  });
  const action = await routeChiefOfStaffAction({
    supabase: input.supabase,
    accountId: input.accountId,
    websiteId: input.websiteId,
    userId: input.userId,
    sessionId: session.id,
    intent: input.prompt,
    payload: { user_message_id: userMessage.id },
    now,
  });
  const facts = await readRecentFacts({
    supabase: input.supabase,
    accountId: input.accountId,
    websiteId: input.websiteId,
  });
  const { answer, citedRefs } = composeChiefOfStaffAnswer({
    prompt: input.prompt,
    facts,
    actionMessage: action.message,
  });
  const assistantMessage = await insertMessage({
    supabase: input.supabase,
    session,
    role: "assistant",
    content: answer,
    citedRefs,
    actionId: action.actionId,
    metadata: {
      action_class: action.actionClass,
      action_status: action.status,
      policy_verdict: action.policyVerdict,
    },
  });

  await input.supabase
    .from("growth_chief_of_staff_sessions")
    .update({
      last_message_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", session.id)
    .eq("website_id", input.websiteId);

  return {
    sessionId: session.id,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    actionId: action.actionId,
    answer,
    citedRefs,
  };
}
