import type {
  GrowthAgentArtifact,
  GrowthAutonomyActionClass,
  GrowthOpportunityCandidateInsert,
  GrowthOpportunityCandidateType,
  GrowthOutcomeEvaluationWindow,
  AgentLane,
} from "@bukeer/website-contract";
import {
  GrowthOpportunityCandidateInsertSchema,
  GrowthOutcomeEvaluationWindowSchema,
} from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { validateGrowthAgentArtifact } from "./artifacts";

export interface GrowthArtifactCandidateBuildResult {
  candidate: GrowthOpportunityCandidateInsert;
  actionClass: GrowthAutonomyActionClass;
  lane: AgentLane;
}

export interface MaterializeGrowthAgentArtifactInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  artifactId: string;
  locale?: string;
  market?: "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";
  now?: Date;
}

export interface MaterializeGrowthAgentArtifactResult {
  artifactId: string;
  candidateId: string | null;
  status: "materialized" | "rejected" | "blocked";
  blockingReasons: string[];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function score(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function evaluationWindow(value: unknown): GrowthOutcomeEvaluationWindow {
  const parsed = GrowthOutcomeEvaluationWindowSchema.safeParse(value);
  return parsed.success ? parsed.data : "day_7";
}

function targetFromArtifact(artifact: GrowthAgentArtifact): JsonRecord {
  const payload = asRecord(artifact.payload);
  const target = asRecord(payload.target);
  const targetTable =
    text(target.table) ??
    text(target.target_table) ??
    (artifact.artifact_type === "content_article"
      ? "website_blog_posts"
      : artifact.artifact_type === "safe_apply_patch"
        ? "website_pages"
        : "website_pages");
  const slug = text(payload.slug);
  const targetPath =
    text(target.path) ??
    text(target.target_path) ??
    (slug ? `/blog/${slug}` : null);
  return {
    target_table: targetTable,
    target_id: text(target.id) ?? text(target.target_id),
    target_path: targetPath,
    target_key:
      text(target.target_key) ??
      text(target.key) ??
      targetPath ??
      slug ??
      text(payload.title) ??
      artifact.id,
  };
}

function artifactKind(
  artifact: GrowthAgentArtifact,
): {
  candidateType: GrowthOpportunityCandidateType;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  defaultMetric: string;
  defaultWindow: GrowthOutcomeEvaluationWindow;
} {
  if (artifact.artifact_type === "content_article") {
    return {
      candidateType: "content_refresh",
      lane: "content_creator",
      actionClass: "content_publish",
      defaultMetric: "organic_clicks_21d",
      defaultWindow: "day_21",
    };
  }
  if (artifact.artifact_type === "transcreation_payload") {
    return {
      candidateType: "missing_translation",
      lane: "transcreation",
      actionClass: "transcreation_merge",
      defaultMetric: "locale_indexability_7d",
      defaultWindow: "day_7",
    };
  }
  if (artifact.artifact_type === "safe_apply_patch") {
    return {
      candidateType: "technical_seo_issue",
      lane: "technical_remediation",
      actionClass: "safe_apply",
      defaultMetric: "technical_smoke_pass",
      defaultWindow: "immediate",
    };
  }
  return {
    candidateType: "content_refresh",
    lane: "content_curator",
    actionClass: "content_publish",
    defaultMetric: "quality_review_completed",
    defaultWindow: "day_7",
  };
}

function adapterInputForArtifact(artifact: GrowthAgentArtifact, target: JsonRecord) {
  const payload = asRecord(artifact.payload);
  if (artifact.artifact_type === "content_article") {
    return {
      article: {
        title: text(payload.title),
        slug: text(payload.slug),
        locale: text(payload.locale) ?? "es-CO",
        seo_title: text(payload.seo_title) ?? text(payload.title),
        seo_description: text(payload.seo_description) ?? text(payload.summary),
        content: text(payload.content) ?? text(payload.markdown) ?? text(payload.body),
      },
    };
  }
  if (artifact.artifact_type === "safe_apply_patch") {
    return {
      target_table: target.target_table,
      target_id: target.target_id,
      target_path: target.target_path,
      patch: asRecord(payload.patch),
      before_row: asRecord(payload.before_row),
      rollback_payload: asRecord(payload.rollback_payload),
      smoke_plan: asRecord(payload.smoke_plan),
    };
  }
  if (artifact.artifact_type === "transcreation_payload") {
    return {
      source_locale: text(payload.source_locale),
      target_locale: text(payload.target_locale),
      target,
      payload: asRecord(payload.payload),
      quality: asRecord(artifact.quality_review),
      rollback_payload: asRecord(payload.rollback_payload),
      glossary_terms: Array.isArray(payload.glossary_terms)
        ? payload.glossary_terms
        : [],
      transcreation_job_id:
        text(payload.transcreation_job_id) ??
        `artifact-${artifact.id}`,
      source_entity_id:
        text(payload.source_entity_id) ??
        text(target.target_id) ??
        text(target.target_key),
      page_type: text(payload.page_type) ?? "website_page",
    };
  }
  return payload;
}

export function buildGrowthArtifactCandidate({
  artifact,
  locale = "es-CO",
  market = "CO",
}: {
  artifact: GrowthAgentArtifact;
  locale?: string;
  market?: "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";
}): GrowthArtifactCandidateBuildResult {
  const payload = asRecord(artifact.payload);
  const target = targetFromArtifact(artifact);
  const kind = artifactKind(artifact);
  const adapterInput = adapterInputForArtifact(artifact, target);
  const title =
    text(payload.title) ??
    text(payload.topic) ??
    `${artifact.artifact_type.replaceAll("_", " ")} ${String(target.target_key)}`;
  const summary =
    text(payload.summary) ??
    `Hermes artifact ${artifact.id} prepared for ${kind.actionClass}.`;
  const successMetric = text(payload.success_metric) ?? kind.defaultMetric;
  const evalWindow = evaluationWindow(payload.evaluation_window ?? kind.defaultWindow);
  const evidence: JsonRecord = {
    source: "growth_agent_artifact",
    artifact_id: artifact.id,
    artifact_type: artifact.artifact_type,
    target,
    adapter_input: adapterInput,
    rollback_expectation:
      Object.keys(asRecord(payload.rollback_expectation)).length > 0
        ? asRecord(payload.rollback_expectation)
        : {
            strategy: "executor_validates_artifact_rollback_before_apply",
            rollback_payload: asRecord(payload.rollback_payload),
          },
    baseline:
      Object.keys(asRecord(payload.baseline)).length > 0
        ? asRecord(payload.baseline)
        : { artifact_baseline: "pending_executor_snapshot" },
    provider_evidence_reads: artifact.provider_evidence_reads,
    memory_reads: artifact.memory_reads,
    skill_reads: artifact.skill_reads,
    quality_review: artifact.quality_review,
    risk_assessment: artifact.risk_assessment,
    success_metric: successMetric,
    evaluation_window: evalWindow,
  };

  const candidate = GrowthOpportunityCandidateInsertSchema.parse({
    account_id: artifact.account_id,
    website_id: artifact.website_id,
    locale,
    market,
    candidate_type: kind.candidateType,
    lane: kind.lane,
    allowed_action_class: kind.actionClass,
    title,
    summary,
    impact_score: score(payload.impact_score, 55),
    confidence: Math.max(0, Math.min(1, Number(payload.confidence ?? 0.72))),
    urgency_score: score(payload.urgency_score, 50),
    cost_score: score(payload.cost_score, 65),
    risk_score: score(payload.risk_score, 35),
    total_score: score(payload.total_score, 60),
    status: "ready_for_backlog",
    blocking_reason: null,
    required_profile_types: ["risk_policy"],
    profile_snapshot: {
      source: "growth_agent_artifact",
      artifact_id: artifact.id,
    },
    source_signal_fact_ids: [],
    evidence,
    success_metric: successMetric,
    evaluation_window: evalWindow,
    idempotency_key: `artifact:${artifact.website_id}:${artifact.idempotency_key}`.slice(
      0,
      240,
    ),
    promoted_work_item_id: null,
  });

  return {
    candidate,
    actionClass: kind.actionClass,
    lane: kind.lane,
  };
}

export async function materializeGrowthAgentArtifactToCandidate(
  input: MaterializeGrowthAgentArtifactInput,
): Promise<MaterializeGrowthAgentArtifactResult> {
  const now = input.now ?? new Date();
  const { data, error } = await input.supabase
    .from("growth_agent_artifacts")
    .select("*")
    .eq("account_id", input.accountId)
    .eq("website_id", input.websiteId)
    .eq("id", input.artifactId)
    .limit(1);
  if (error) throw new Error(`artifact lookup failed: ${error.message}`);
  const artifact = (Array.isArray(data) ? data[0] : data) as GrowthAgentArtifact | undefined;
  if (!artifact?.id) {
    return {
      artifactId: input.artifactId,
      candidateId: null,
      status: "blocked",
      blockingReasons: ["artifact_not_found"],
    };
  }

  const validation = validateGrowthAgentArtifact({
    artifactType: artifact.artifact_type,
    payload: asRecord(artifact.payload),
    providerEvidenceReads: artifact.provider_evidence_reads,
    qualityReview: asRecord(artifact.quality_review),
    memoryReads: artifact.memory_reads,
    skillReads: artifact.skill_reads,
    riskAssessment: asRecord(artifact.risk_assessment),
  });
  if (!validation.valid) {
    await input.supabase
      .from("growth_agent_artifacts")
      .update({
        status: "rejected",
        validation_errors: validation.errors,
        updated_at: now.toISOString(),
      })
      .eq("id", artifact.id)
      .eq("website_id", input.websiteId);
    return {
      artifactId: artifact.id,
      candidateId: null,
      status: "rejected",
      blockingReasons: validation.errors.map((item) => item.code),
    };
  }

  const { candidate } = buildGrowthArtifactCandidate({
    artifact,
    locale: input.locale,
    market: input.market,
  });
  const { data: candidateRows, error: candidateError } = await input.supabase
    .from("growth_opportunity_candidates")
    .upsert(candidate, { onConflict: "website_id,idempotency_key" })
    .select("id")
    .limit(1);
  if (candidateError) {
    throw new Error(`artifact candidate materialization failed: ${candidateError.message}`);
  }
  const candidateRow = Array.isArray(candidateRows) ? candidateRows[0] : candidateRows;
  const candidateId = candidateRow?.id ? String(candidateRow.id) : null;
  await input.supabase
    .from("growth_agent_artifacts")
    .update({
      status: "materialized",
      payload: {
        ...asRecord(artifact.payload),
        materialization: {
          candidate_id: candidateId,
          materialized_at: now.toISOString(),
        },
      },
      updated_at: now.toISOString(),
    })
    .eq("id", artifact.id)
    .eq("website_id", input.websiteId);

  return {
    artifactId: artifact.id,
    candidateId,
    status: "materialized",
    blockingReasons: [],
  };
}
