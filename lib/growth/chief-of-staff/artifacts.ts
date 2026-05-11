import type {
  GrowthAgentArtifact,
  GrowthAgentArtifactInsert,
  GrowthAgentArtifactType,
} from "@bukeer/website-contract";
import { GrowthAgentArtifactInsertSchema } from "@bukeer/website-contract";

import {
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";

export interface ValidateGrowthAgentArtifactInput {
  artifactType: GrowthAgentArtifactType;
  payload: JsonRecord;
  providerEvidenceReads?: JsonRecord[];
  qualityReview?: JsonRecord;
  memoryReads?: JsonRecord[];
  skillReads?: JsonRecord[];
  riskAssessment?: JsonRecord;
}

export interface ArtifactValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string }>;
}

export interface CreateGrowthAgentArtifactInput
  extends ValidateGrowthAgentArtifactInput {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  agentInstanceId?: string | null;
  taskSessionId?: string | null;
  contextManifestId?: string | null;
  decisionId?: string | null;
  artifactVersion?: string;
  idempotencyKey: string;
  status?: GrowthAgentArtifact["status"];
  manifestCitationVerdict?: JsonRecord;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRecord(value: unknown): boolean {
  return Object.keys(asRecord(value)).length > 0;
}

function pushIf(
  errors: ArtifactValidationResult["errors"],
  condition: boolean,
  code: string,
  message: string,
) {
  if (condition) errors.push({ code, message });
}

export function validateGrowthAgentArtifact(
  input: ValidateGrowthAgentArtifactInput,
): ArtifactValidationResult {
  const errors: ArtifactValidationResult["errors"] = [];
  const payload = asRecord(input.payload);
  const evidenceReads = input.providerEvidenceReads ?? [];
  const qualityReview = asRecord(input.qualityReview);
  const riskAssessment = asRecord(input.riskAssessment);

  const mutable =
    input.artifactType === "content_article" ||
    input.artifactType === "content_brief" ||
    input.artifactType === "safe_apply_patch" ||
    input.artifactType === "transcreation_payload";

  pushIf(
    errors,
    mutable && evidenceReads.length === 0,
    "provider_evidence_missing",
    "Mutable artifacts require provider evidence reads.",
  );
  pushIf(
    errors,
    mutable && !hasRecord(riskAssessment),
    "risk_assessment_missing",
    "Mutable artifacts require risk assessment.",
  );

  if (input.artifactType === "content_article") {
    pushIf(errors, !hasText(payload.title), "title_missing", "Content artifact requires title.");
    pushIf(errors, !hasText(payload.slug), "slug_missing", "Content artifact requires slug.");
    pushIf(errors, !hasText(payload.locale), "locale_missing", "Content artifact requires locale.");
    pushIf(
      errors,
      !hasText(payload.body) && !hasText(payload.markdown) && !hasText(payload.outline),
      "body_missing",
      "Content artifact requires body, markdown or outline.",
    );
    pushIf(
      errors,
      !hasRecord(payload.rollback_expectation),
      "rollback_expectation_missing",
      "Content artifact requires rollback expectation.",
    );
    pushIf(
      errors,
      !hasText(payload.success_metric) || !hasText(payload.evaluation_window),
      "metric_window_missing",
      "Content artifact requires success metric and evaluation window.",
    );
  }

  if (input.artifactType === "content_brief") {
    pushIf(errors, !hasText(payload.topic), "topic_missing", "Brief requires topic.");
    pushIf(
      errors,
      !hasText(payload.success_metric) || !hasText(payload.evaluation_window),
      "metric_window_missing",
      "Brief requires success metric and evaluation window.",
    );
  }

  if (input.artifactType === "safe_apply_patch") {
    const target = asRecord(payload.target);
    pushIf(
      errors,
      !hasText(target.table) && !hasText(target.target_table),
      "target_table_missing",
      "Safe apply artifact requires target table.",
    );
    pushIf(
      errors,
      !hasText(target.id) && !hasText(target.target_id) && !hasText(target.path),
      "target_identifier_missing",
      "Safe apply artifact requires target id or path.",
    );
    pushIf(
      errors,
      !Array.isArray(payload.field_allowlist) || payload.field_allowlist.length === 0,
      "field_allowlist_missing",
      "Safe apply artifact requires field allowlist.",
    );
    pushIf(errors, !hasRecord(payload.patch), "patch_missing", "Safe apply artifact requires patch.");
    pushIf(
      errors,
      !hasRecord(payload.rollback_payload),
      "rollback_payload_missing",
      "Safe apply artifact requires rollback payload.",
    );
    pushIf(
      errors,
      !hasRecord(payload.smoke_plan),
      "smoke_plan_missing",
      "Safe apply artifact requires smoke plan.",
    );
  }

  if (input.artifactType === "transcreation_payload") {
    pushIf(
      errors,
      !hasText(payload.source_locale) || !hasText(payload.target_locale),
      "locale_missing",
      "Transcreation artifact requires source and target locale.",
    );
    pushIf(
      errors,
      hasText(payload.source_locale) &&
        hasText(payload.target_locale) &&
        payload.source_locale === payload.target_locale,
      "locale_mismatch",
      "Transcreation target locale must differ from source locale.",
    );
    pushIf(
      errors,
      !hasRecord(payload.target),
      "target_missing",
      "Transcreation artifact requires target entity.",
    );
    pushIf(
      errors,
      !hasRecord(payload.payload),
      "payload_missing",
      "Transcreation artifact requires merge payload.",
    );
    pushIf(
      errors,
      qualityReview.pass !== true,
      "quality_review_missing",
      "Transcreation artifact requires passing quality review.",
    );
    pushIf(
      errors,
      !hasRecord(payload.rollback_payload),
      "rollback_payload_missing",
      "Transcreation artifact requires rollback payload.",
    );
  }

  return { valid: errors.length === 0, errors };
}

export async function createGrowthAgentArtifact(
  input: CreateGrowthAgentArtifactInput,
): Promise<GrowthAgentArtifact> {
  const validation = validateGrowthAgentArtifact(input);
  const status =
    input.status ??
    (validation.valid ? "validated" : "rejected");

  const insert: GrowthAgentArtifactInsert = GrowthAgentArtifactInsertSchema.parse({
    account_id: input.accountId,
    website_id: input.websiteId,
    agent_instance_id: input.agentInstanceId ?? null,
    task_session_id: input.taskSessionId ?? null,
    context_manifest_id: input.contextManifestId ?? null,
    decision_id: input.decisionId ?? null,
    artifact_type: input.artifactType,
    artifact_version: input.artifactVersion ?? "v1",
    status,
    payload: input.payload,
    quality_review: input.qualityReview ?? {},
    provider_evidence_reads: input.providerEvidenceReads ?? [],
    memory_reads: input.memoryReads ?? [],
    skill_reads: input.skillReads ?? [],
    risk_assessment: input.riskAssessment ?? {},
    manifest_citation_verdict: input.manifestCitationVerdict ?? {},
    validation_errors: validation.errors,
    idempotency_key: input.idempotencyKey,
    created_work_item_id: null,
    created_change_set_id: null,
  });

  const { data, error } = await input.supabase
    .from("growth_agent_artifacts")
    .upsert(insert, { onConflict: "website_id,idempotency_key" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`agent artifact upsert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("agent artifact upsert returned no row");
  return row as GrowthAgentArtifact;
}
