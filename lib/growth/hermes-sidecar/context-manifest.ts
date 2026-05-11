import type {
  AgentLane,
  GrowthAgentAutonomyLevel,
  GrowthAgentContextManifest,
  GrowthAgentContextManifestInsert,
  GrowthAgentInstance,
  GrowthAgentTaskSession,
  GrowthAgentWakeupRequest,
  GrowthContextSnapshot,
  GrowthMarket,
} from "@bukeer/website-contract";
import { GrowthAgentContextManifestInsertSchema } from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import {
  buildGrowthAgentContext,
  type GrowthAgentContextBundle,
} from "@/lib/growth/agentic/context-builder";
import { assertTenantScope } from "@/lib/growth/orchestrator/tenant-guard";

export interface StrictGrowthAgentContextOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  agentInstanceId: string;
  taskSessionId?: string | null;
  wakeup?: GrowthAgentWakeupRequest | null;
  cycleId?: string | null;
  locale?: string;
  market?: GrowthMarket;
  autonomyLevel?: GrowthAgentAutonomyLevel;
  now?: Date;
  persist?: boolean;
}

export interface StrictGrowthAgentContextBundle extends GrowthAgentContextBundle {
  agentInstance: GrowthAgentInstance;
  contextManifest: GrowthAgentContextManifest;
}

export interface CitationVerdict {
  allowed: boolean;
  missingMemoryIds: string[];
  missingSkillIds: string[];
  missingToolNames: string[];
  autonomyViolation: string | null;
  manifestId: string | null;
}

function rows<T = JsonRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : value ? [value as T] : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uuidArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function citationIds(reads: JsonRecord[] | undefined): string[] {
  return (reads ?? [])
    .map((read) => text(read.id) ?? text(read.memory_id) ?? text(read.skill_id) ?? text(read.ref))
    .filter((id): id is string => Boolean(id))
    .map((id) => id.split(":").pop() ?? id);
}

function sourceRefsByPrefix(snapshot: GrowthContextSnapshot, prefix: string): string[] {
  return (snapshot.source_refs ?? []).filter((ref) => ref.startsWith(prefix));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as JsonRecord)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1aHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function fetchAgentInstance(
  supabase: SupabaseLike,
  accountId: string,
  websiteId: string,
  agentInstanceId: string,
): Promise<GrowthAgentInstance> {
  const { data, error } = await supabase
    .from("growth_agent_instances")
    .select("*")
    .eq("id", agentInstanceId)
    .eq("website_id", websiteId)
    .limit(1);
  if (error) throw new Error(`agent instance lookup failed: ${error.message}`);
  const agent = rows<GrowthAgentInstance>(data)[0];
  if (!agent?.id) throw new Error("agent instance not found for strict context");
  assertTenantScope(
    { account_id: accountId, website_id: websiteId },
    {
      account_id: agent.account_id,
      website_id: agent.website_id,
    },
  );
  if (agent.status !== "enabled") {
    throw new Error(`agent instance ${agent.id} is not enabled`);
  }
  return agent;
}

function filterRowsByInjectedIds(rowsValue: unknown, ids: string[]) {
  const allowed = new Set(ids);
  return rows<JsonRecord>(rowsValue).filter((row) => {
    const id = text(row.id);
    return id ? allowed.has(id) : false;
  });
}

function buildIsolatedContext(
  baseContext: JsonRecord,
  agent: GrowthAgentInstance,
): {
  context: JsonRecord;
  injectedSkillIds: string[];
  injectedMemoryIds: string[];
  excludedSkillIds: string[];
  excludedMemoryIds: string[];
} {
  const injectedSkillIds = uuidArray(agent.active_skill_ids);
  const injectedMemoryIds = uuidArray(agent.active_memory_ids);
  const allSkills = rows<JsonRecord>(baseContext.active_skills);
  const allMemories = rows<JsonRecord>(baseContext.active_memories);
  const allowedSkills = filterRowsByInjectedIds(allSkills, injectedSkillIds);
  const allowedMemories = filterRowsByInjectedIds(allMemories, injectedMemoryIds);
  const allowedSkillSet = new Set(allowedSkills.map((row) => text(row.id)).filter(Boolean));
  const allowedMemorySet = new Set(allowedMemories.map((row) => text(row.id)).filter(Boolean));
  const excludedSkillIds = allSkills
    .map((row) => text(row.id))
    .filter((id): id is string => Boolean(id) && !allowedSkillSet.has(id));
  const excludedMemoryIds = allMemories
    .map((row) => text(row.id))
    .filter((id): id is string => Boolean(id) && !allowedMemorySet.has(id));

  return {
    injectedSkillIds,
    injectedMemoryIds,
    excludedSkillIds,
    excludedMemoryIds,
    context: {
      ...baseContext,
      lane: agent.lane,
      agent_instance: {
        id: agent.id,
        agent_type: agent.agent_type,
        lane: agent.lane,
        display_name: agent.display_name,
        model_provider: agent.model_provider,
        model_name: agent.model_name,
        toolset_allowlist: agent.toolset_allowlist,
        confidence_threshold: agent.confidence_threshold,
        quality_threshold: agent.quality_threshold,
      },
      active_skills: allowedSkills,
      active_memories: allowedMemories,
      isolation: {
        enforced: true,
        excluded_skill_ids: excludedSkillIds,
        excluded_memory_ids: excludedMemoryIds,
        mutation_boundary: "growth_os_executor",
      },
    },
  };
}

export async function buildStrictGrowthAgentContextManifest(
  options: StrictGrowthAgentContextOptions,
): Promise<StrictGrowthAgentContextBundle> {
  const agent = await fetchAgentInstance(
    options.supabase,
    options.accountId,
    options.websiteId,
    options.agentInstanceId,
  );
  const base = await buildGrowthAgentContext({
    supabase: options.supabase,
    accountId: options.accountId,
    websiteId: options.websiteId,
    lane: agent.lane as AgentLane,
    wakeup: options.wakeup,
    cycleId: options.cycleId,
    locale: options.locale,
    market: options.market,
    now: options.now,
    persist: true,
  });
  const isolated = buildIsolatedContext(base.context, agent);
  const manifestPayload = {
    context_version: "hermes-agent-context-isolation-v1",
    agent_instance_id: agent.id,
    injected_context: isolated.context,
  };
  const sourceRefs = base.snapshot.source_refs ?? [];
  const insert: GrowthAgentContextManifestInsert =
    GrowthAgentContextManifestInsertSchema.parse({
      account_id: options.accountId,
      website_id: options.websiteId,
      agent_instance_id: agent.id,
      task_session_id: options.taskSessionId ?? null,
      context_snapshot_id: base.snapshot.id,
      lane: agent.lane,
      status: "active",
      autonomy_level: options.autonomyLevel ?? "A2",
      context_hash: fnv1aHash(manifestPayload),
      model_provider: agent.model_provider,
      model_name: agent.model_name,
      toolset_allowed: agent.toolset_allowlist,
      skill_ids_injected: isolated.injectedSkillIds,
      memory_ids_injected: isolated.injectedMemoryIds,
      global_memory_ids_injected: [],
      excluded_skill_ids: isolated.excludedSkillIds,
      excluded_memory_ids: isolated.excludedMemoryIds,
      provider_source_refs: sourceRefs
        .filter((ref) => ref.startsWith("growth_profiles:") || ref.startsWith("growth_signal_facts:"))
        .slice(0, 200),
      outcome_refs: sourceRefsByPrefix(base.snapshot, "growth_work_item_outcomes:").slice(0, 80),
      policy_refs: sourceRefsByPrefix(base.snapshot, "growth_autonomy_policies:").slice(0, 80),
      budget_snapshot: {
        max_cost_daily_usd: agent.max_cost_daily_usd,
        max_cost_weekly_usd: agent.max_cost_weekly_usd,
        concurrency_limit: agent.concurrency_limit,
      },
      injection_scan: base.injectionScan,
      isolation_verdict: {
        allowed: !base.injectionScan.blocked,
        enforced: true,
        tenant_scoped: true,
        lane_scoped: true,
        tool_scoped: true,
        memory_scoped: true,
        skill_scoped: true,
        mutation_boundary: "growth_os_executor",
      },
      manifest_payload: manifestPayload,
    });

  if (options.persist === false) {
    return {
      ...base,
      context: isolated.context,
      agentInstance: agent,
      contextManifest: {
        id: "00000000-0000-4000-8000-000000000001",
        ...insert,
        created_at: (options.now ?? new Date()).toISOString(),
        updated_at: (options.now ?? new Date()).toISOString(),
      },
    };
  }

  const { data, error } = await options.supabase
    .from("growth_agent_context_manifests")
    .insert(insert)
    .select("*")
    .limit(1);
  if (error) throw new Error(`context manifest insert failed: ${error.message}`);
  const manifest = rows<GrowthAgentContextManifest>(data)[0];
  if (!manifest?.id) throw new Error("context manifest insert returned no row");

  if (options.taskSessionId) {
    await options.supabase
      .from("growth_agent_task_sessions")
      .update({
        context_manifest_id: manifest.id,
        session_state: {
          source: "hermes_sidecar",
          agent_instance_id: agent.id,
          context_manifest_id: manifest.id,
        },
        updated_at: (options.now ?? new Date()).toISOString(),
      })
      .eq("id", options.taskSessionId)
      .eq("website_id", options.websiteId);
  }

  return {
    ...base,
    context: isolated.context,
    agentInstance: agent,
    contextManifest: manifest,
  };
}

export async function validateManifestCitations(
  supabase: SupabaseLike,
  websiteId: string,
  manifestId: string | null | undefined,
  memoryReads?: JsonRecord[],
  skillReads?: JsonRecord[],
  requestedTools?: string[],
  actionClass?: string | null,
  requestLiveExecution?: boolean,
): Promise<CitationVerdict> {
  if (!manifestId) {
    return {
      allowed: false,
      missingMemoryIds: citationIds(memoryReads),
      missingSkillIds: citationIds(skillReads),
      missingToolNames: requestedTools ?? [],
      autonomyViolation: null,
      manifestId: null,
    };
  }
  const { data, error } = await supabase
    .from("growth_agent_context_manifests")
    .select("id,website_id,autonomy_level,toolset_allowed,memory_ids_injected,global_memory_ids_injected,skill_ids_injected")
    .eq("id", manifestId)
    .eq("website_id", websiteId)
    .limit(1);
  if (error) throw new Error(`context manifest citation lookup failed: ${error.message}`);
  const manifest = asRecord(rows<JsonRecord>(data)[0]);
  if (!manifest.id) {
    return {
      allowed: false,
      missingMemoryIds: citationIds(memoryReads),
      missingSkillIds: citationIds(skillReads),
      missingToolNames: requestedTools ?? [],
      autonomyViolation: null,
      manifestId,
    };
  }
  const allowedMemories = new Set([
    ...uuidArray(manifest.memory_ids_injected),
    ...uuidArray(manifest.global_memory_ids_injected),
  ]);
  const allowedSkills = new Set(uuidArray(manifest.skill_ids_injected));
  const allowedTools = new Set(
    Array.isArray(manifest.toolset_allowed)
      ? manifest.toolset_allowed.filter((tool): tool is string => typeof tool === "string")
      : [],
  );
  const missingMemoryIds = citationIds(memoryReads).filter((id) => !allowedMemories.has(id));
  const missingSkillIds = citationIds(skillReads).filter((id) => !allowedSkills.has(id));
  const missingToolNames = (requestedTools ?? []).filter((tool) => !allowedTools.has(tool));
  const autonomyLevel = text(manifest.autonomy_level) ?? "A0";
  const autonomyViolation =
    requestLiveExecution === true && autonomyLevel !== "A4"
      ? `autonomy_${autonomyLevel}_cannot_request_live_execution`
      : null;
  return {
    allowed:
      missingMemoryIds.length === 0 &&
      missingSkillIds.length === 0 &&
      missingToolNames.length === 0 &&
      !autonomyViolation,
    missingMemoryIds,
    missingSkillIds,
    missingToolNames,
    autonomyViolation,
    manifestId,
  };
}

export function taskSessionManifestId(session: GrowthAgentTaskSession | JsonRecord | null | undefined) {
  const record = asRecord(session);
  return text(record.context_manifest_id);
}
