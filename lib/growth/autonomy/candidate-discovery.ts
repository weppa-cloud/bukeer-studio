import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthMarket,
  GrowthOpportunityCandidateInsert,
  GrowthOpportunityCandidateType,
  GrowthOutcomeEvaluationWindow,
  GrowthProfile,
  GrowthProfileType,
} from "@bukeer/website-contract";

import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
  scoreOpportunityCandidate,
} from "./profile-freshness-gate";
import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "./runtime-common";
import {
  dataForSeoFeatureForAction,
  dataForSeoRequirementFromSnapshot,
  type DataForSeoProviderSnapshot,
} from "./dataforseo-provider-profile";

export interface DiscoverGrowthCandidatesOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  cycleId?: string;
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface DiscoverGrowthCandidatesResult {
  candidates: GrowthOpportunityCandidateInsert[];
  insertedOrUpdated: number;
  signalFactIds: string[];
  dryRun: boolean;
}

interface CandidateMapping {
  candidateType: GrowthOpportunityCandidateType;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  requiredProfileTypes: GrowthProfileType[];
  targetTable: string;
  successMetric: string;
  evaluationWindow: GrowthOutcomeEvaluationWindow;
}

function mappingForSignal(row: JsonRecord): CandidateMapping | null {
  const signal = `${row.signal_type ?? ""}:${row.source ?? ""}`.toLowerCase();
  if (/technical|crawl|index|schema|web_vital|performance/.test(signal)) {
    return {
      candidateType: "technical_seo_issue",
      lane: "technical_remediation",
      actionClass: "safe_apply",
      requiredProfileTypes: ["page_product", "risk_policy"],
      targetTable: "website_sections",
      successMetric: "technical_smoke_pass",
      evaluationWindow: "day_7",
    };
  }
  if (/translation|hreflang|locale|transcreation/.test(signal)) {
    return {
      candidateType: "missing_translation",
      lane: "transcreation",
      actionClass: "transcreation_merge",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "competitor",
        "page_product",
        "risk_policy",
      ],
      targetTable: "seo_transcreation_jobs",
      successMetric: "localized_organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  if (/decay|refresh|stale/.test(signal)) {
    return {
      candidateType: "content_refresh",
      lane: "content_curator",
      actionClass: "content_publish",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "page_product",
        "risk_policy",
      ],
      targetTable: "website_blog_posts",
      successMetric: "organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  if (/funnel|lead|crm|whatsapp|conversion/.test(signal)) {
    return {
      candidateType: "funnel_leak",
      lane: "orchestrator",
      actionClass: "follow_up_backlog_create",
      requiredProfileTypes: ["risk_policy"],
      targetTable: "growth_work_items",
      successMetric: "lead_to_quote_rate",
      evaluationWindow: "day_30",
    };
  }
  if (/keyword|gsc|query|serp|content|internal_link/.test(signal)) {
    return {
      candidateType: /internal_link/.test(signal)
        ? "internal_linking_gap"
        : "keyword_gap",
      lane: "content_creator",
      actionClass: "content_publish",
      requiredProfileTypes: [
        "business",
        "buyer",
        "seo_market",
        "page_product",
        "risk_policy",
      ],
      targetTable: "website_blog_posts",
      successMetric: "organic_clicks",
      evaluationWindow: "day_21",
    };
  }
  return null;
}

function numericPayload(row: JsonRecord, key: string, fallback: number): number {
  const payload = asRecord(row.payload);
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function candidateTitle(row: JsonRecord, mapping: CandidateMapping): string {
  const payload = asRecord(row.payload);
  const entity =
    payload.query ??
    payload.keyword ??
    payload.slug ??
    row.entity_path ??
    row.signal_type ??
    mapping.candidateType;
  return `${mapping.candidateType.replace(/_/g, " ")}: ${String(entity)}`.slice(
    0,
    240,
  );
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function textPayload(row: JsonRecord, payload: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key] ?? row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function candidateTarget(
  row: JsonRecord,
  payload: JsonRecord,
  mapping: CandidateMapping,
): JsonRecord {
  const targetTable =
    textPayload(row, payload, ["target_table", "entity_table"]) ??
    mapping.targetTable;
  const rawTargetId = textPayload(row, payload, ["target_id", "entity_id"]);
  const targetId = rawTargetId && isUuid(rawTargetId) ? rawTargetId : null;
  const explicitPath = textPayload(row, payload, [
    "target_path",
    "entity_path",
    "slug",
    "path",
  ]);
  const querySlug = textPayload(row, payload, ["query", "keyword"]);
  const targetPath =
    explicitPath ??
    (querySlug && mapping.actionClass === "content_publish"
      ? `/blog/${slugify(querySlug)}`
      : null);
  const targetKey =
    textPayload(row, payload, ["target_key", "idempotency_key"]) ??
    (rawTargetId && !targetId ? rawTargetId : null);
  return {
    target_table: targetTable,
    ...(targetId ? { target_id: targetId } : {}),
    ...(targetPath ? { target_path: targetPath } : {}),
    ...(targetKey ? { target_key: targetKey } : {}),
  };
}

function candidateBaseline(payload: JsonRecord, mapping: CandidateMapping): JsonRecord {
  const explicit = asRecord(payload.baseline);
  if (Object.keys(explicit).length > 0) return explicit;

  const baseline: JsonRecord = {};
  for (const key of [
    "organic_clicks",
    "localized_organic_clicks",
    "impressions",
    "position",
    "ctr",
    "lead_to_quote_rate",
    "technical_smoke_pass",
    "indexed",
  ]) {
    const value = payload[key];
    if (typeof value === "number" || typeof value === "boolean") {
      baseline[key] = value;
    }
  }
  if (Object.keys(baseline).length === 0 && mapping.actionClass === "safe_apply") {
    baseline.expected_smoke = "not_measured";
  }
  return baseline;
}

function rollbackExpectation(
  payload: JsonRecord,
  target: JsonRecord,
  mapping: CandidateMapping,
): JsonRecord {
  const explicit = asRecord(payload.rollback_expectation);
  if (Object.keys(explicit).length > 0) return explicit;
  if (mapping.actionClass === "content_publish" && typeof target.target_path === "string") {
    return {
      strategy: "delete_created_content",
      target_path: target.target_path,
    };
  }
  if (mapping.actionClass === "safe_apply" && target.target_id) {
    return {
      strategy: "restore_before_snapshot",
      target_id: target.target_id,
    };
  }
  if (mapping.actionClass === "transcreation_merge" && target.target_id) {
    return {
      strategy: "restore_localized_variant_or_job",
      target_id: target.target_id,
    };
  }
  return {};
}

function profilePayload(
  profiles: GrowthProfile[],
  profileType: GrowthProfileType,
): JsonRecord {
  const profile = profiles
    .filter((row) => row.profile_type === profileType)
    .sort((a, b) => Date.parse(b.valid_from) - Date.parse(a.valid_from))[0];
  return asRecord(profile?.payload);
}

function providerSnapshotFromProfiles(
  profiles: GrowthProfile[],
  mapping: CandidateMapping,
): DataForSeoProviderSnapshot | null {
  const profileType: GrowthProfileType =
    mapping.candidateType === "missing_translation" ? "competitor" : "seo_market";
  const payload = profilePayload(profiles, profileType);
  const snapshot = payload.dataforseo_snapshot;
  return snapshot && typeof snapshot === "object"
    ? (snapshot as DataForSeoProviderSnapshot)
    : null;
}

function dataForSeoRequirement({
  row,
  payload,
  mapping,
  profiles,
}: {
  row: JsonRecord;
  payload: JsonRecord;
  mapping: CandidateMapping;
  profiles: GrowthProfile[];
}) {
  const signalText = `${row.signal_type ?? ""} ${row.source ?? ""} ${payload.provider ?? ""} ${Array.isArray(payload.sources) ? payload.sources.join(" ") : ""}`;
  const lower = signalText.toLowerCase();
  const providerDependent =
    /dataforseo|serp|keyword|query|competitor|onpage|crawl|technical|translation|locale|transcreation/.test(
      lower,
    ) &&
    (mapping.actionClass === "content_publish" ||
      mapping.actionClass === "transcreation_merge" ||
      mapping.actionClass === "safe_apply");
  const exceptionReason =
    textPayload(row, payload, [
      "dataforseo_exception_reason",
      "provider_exception_reason",
      "strategic_exception_reason",
    ]) ?? null;
  const featureProfile = dataForSeoFeatureForAction(mapping.actionClass, signalText);
  return dataForSeoRequirementFromSnapshot({
    required: providerDependent,
    featureProfile,
    snapshot: providerSnapshotFromProfiles(profiles, mapping),
    exceptionReason,
  });
}

export async function discoverGrowthOpportunityCandidates(
  input: DiscoverGrowthCandidatesOptions,
): Promise<DiscoverGrowthCandidatesResult> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 25;
  const { data: signalRows, error: signalError } = await input.supabase
    .from("growth_signal_facts")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .gte("expires_at", now.toISOString())
    .order("confidence", { ascending: false })
    .order("observed_at", { ascending: false })
    .limit(limit * 3);
  if (signalError) throw new Error(`candidate signal lookup failed: ${signalError.message}`);

  const { data: profileRows, error: profileError } = await input.supabase
    .from("growth_profiles")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .eq("locale", input.locale ?? "es-CO")
    .eq("market", input.market ?? "CO");
  if (profileError) throw new Error(`candidate profile lookup failed: ${profileError.message}`);

  const profiles = (profileRows ?? []) as GrowthProfile[];
  const candidates: GrowthOpportunityCandidateInsert[] = [];

  for (const rawRow of (signalRows ?? []) as JsonRecord[]) {
    if (candidates.length >= limit) break;
    const mapping = mappingForSignal(rawRow);
    if (!mapping) continue;
    const payload = asRecord(rawRow.payload);
    const target = candidateTarget(rawRow, payload, mapping);
    const baseline = candidateBaseline(payload, mapping);
    const rollback = rollbackExpectation(payload, target, mapping);
    const dataforseoEvidence = dataForSeoRequirement({
      row: rawRow,
      payload,
      mapping,
      profiles,
    });
    const signalId = typeof rawRow.id === "string" ? rawRow.id : "";
    const freshness = evaluateProfileFreshnessGate({
      profiles,
      requirements: requirementsForAction(mapping.actionClass),
      now,
    });
    const impact = numericPayload(rawRow, "impact_score", numericPayload(rawRow, "click_delta", 60));
    const urgency = numericPayload(rawRow, "urgency_score", 60);
    const risk = numericPayload(rawRow, "risk_score", mapping.actionClass === "safe_apply" ? 20 : 35);
    const cost = numericPayload(rawRow, "cost_score", 35);
    const confidence =
      typeof rawRow.confidence === "number" ? rawRow.confidence : 0.7;
    const metricSubject =
      payload.slug ??
      payload.query ??
      rawRow.entity_path ??
      rawRow.entity_id ??
      mapping.candidateType;

    candidates.push(
      scoreOpportunityCandidate({
        accountId: input.accountId,
        websiteId: input.websiteId,
        locale: input.locale ?? "es-CO",
        market: input.market ?? "CO",
        candidateType: mapping.candidateType,
        lane: mapping.lane,
        allowedActionClass: mapping.actionClass,
        title: candidateTitle(rawRow, mapping),
        summary: String(payload.summary ?? rawRow.signal_type ?? "Growth signal promoted by runtime."),
        impactScore: impact,
        confidence,
        urgencyScore: urgency,
        costScore: cost,
        riskScore: risk,
        idempotencyKey: `runtime:${input.cycleId ?? "cycle"}:${signalId || JSON.stringify(payload).slice(0, 80)}`,
        evidence: {
          source: "growth_runtime_candidate_discovery",
          cycle_id: input.cycleId ?? null,
          signal_fact_id: signalId || null,
          signal_payload: payload,
          target,
          rollback_expectation: rollback,
          baseline,
          dataforseo_evidence: dataforseoEvidence,
          source_refs: signalId ? [`growth_signal_facts:${signalId}`] : [],
        },
        requiredProfileTypes: mapping.requiredProfileTypes,
        freshness,
        successMetric: `${mapping.successMetric}:${metricSubject}`,
        evaluationWindow: mapping.evaluationWindow,
        sourceSignalFactIds: signalId ? [signalId] : [],
      }),
    );
  }

  if (!input.dryRun && candidates.length > 0) {
    const { error } = await input.supabase
      .from("growth_opportunity_candidates")
      .upsert(candidates, { onConflict: "website_id,idempotency_key" });
    if (error) throw new Error(`candidate upsert failed: ${error.message}`);
  }

  return {
    candidates,
    insertedOrUpdated: input.dryRun ? 0 : candidates.length,
    signalFactIds: candidates
      .flatMap((candidate) => candidate.source_signal_fact_ids)
      .filter(Boolean),
    dryRun: input.dryRun ?? false,
  };
}
