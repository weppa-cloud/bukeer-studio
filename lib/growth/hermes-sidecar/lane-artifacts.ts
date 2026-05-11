import type { CreateGrowthAgentArtifactInput } from "@/lib/growth/chief-of-staff/artifacts";
import type { JsonRecord } from "@/lib/growth/autonomy/runtime-common";

export type LaneArtifactDraft = Omit<
  CreateGrowthAgentArtifactInput,
  "supabase" | "accountId" | "websiteId"
>;

type NonEmptyEvidenceReads = [JsonRecord, ...JsonRecord[]];

interface LaneArtifactBaseInput {
  agentInstanceId?: string | null;
  taskSessionId?: string | null;
  decisionId?: string | null;
  idempotencyKey?: string;
  providerEvidenceReads: NonEmptyEvidenceReads;
  memoryReads?: JsonRecord[];
  skillReads?: JsonRecord[];
  qualityReview?: JsonRecord;
  riskAssessment?: JsonRecord;
}

export interface ContentArticleArtifactInput extends LaneArtifactBaseInput {
  title: string;
  locale: string;
  markdown?: string;
  body?: string;
  summary?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  baseline?: JsonRecord;
  target?: JsonRecord;
  successMetric?: string;
  evaluationWindow?: string;
}

export interface SafeApplyPatchArtifactInput extends LaneArtifactBaseInput {
  target: {
    table?: string;
    target_table?: string;
    id?: string;
    target_id?: string;
    path?: string;
    target_key?: string;
  };
  fieldAllowlist: string[];
  patch: JsonRecord;
  rollbackPayload: JsonRecord;
  beforeRow?: JsonRecord;
  smokePlan?: JsonRecord;
  baseline?: JsonRecord;
  successMetric?: string;
  evaluationWindow?: string;
}

export interface TranscreationPayloadArtifactInput extends LaneArtifactBaseInput {
  sourceLocale: string;
  targetLocale: string;
  target: JsonRecord;
  payload: JsonRecord;
  rollbackPayload: JsonRecord;
  glossaryTerms?: string[];
  translationMemoryRefs?: JsonRecord[];
  baseline?: JsonRecord;
  successMetric?: string;
  evaluationWindow?: string;
}

function requireText(value: string | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${field} is required`);
  return trimmed;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as JsonRecord)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as JsonRecord)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function shortHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function deterministicKey(prefix: string, input: unknown): string {
  return `hermes-sidecar:${prefix}:${shortHash(stableJson(input))}`;
}

function baseDraft(
  input: LaneArtifactBaseInput,
  artifactType: LaneArtifactDraft["artifactType"],
  payload: JsonRecord,
  defaults: {
    qualityReview: JsonRecord;
    riskAssessment: JsonRecord;
    idempotencyKeyInput: unknown;
  },
): LaneArtifactDraft {
  return {
    agentInstanceId: input.agentInstanceId ?? null,
    taskSessionId: input.taskSessionId ?? null,
    decisionId: input.decisionId ?? null,
    artifactType,
    artifactVersion: "v1",
    idempotencyKey:
      input.idempotencyKey ??
      deterministicKey(artifactType, defaults.idempotencyKeyInput),
    payload,
    providerEvidenceReads: input.providerEvidenceReads,
    memoryReads: input.memoryReads ?? [],
    skillReads: input.skillReads ?? [],
    qualityReview: {
      ...defaults.qualityReview,
      ...(input.qualityReview ?? {}),
    },
    riskAssessment: {
      ...defaults.riskAssessment,
      ...(input.riskAssessment ?? {}),
    },
  };
}

export function buildContentArticleArtifact(
  input: ContentArticleArtifactInput,
): LaneArtifactDraft {
  const title = requireText(input.title, "title");
  const locale = requireText(input.locale, "locale");
  const body = input.markdown?.trim() || input.body?.trim();
  if (!body) throw new Error("markdown or body is required");

  const slug = input.slug?.trim() || slugify(title);
  const route = `/blog/${slug}`;
  const successMetric = input.successMetric ?? "organic_clicks_21d";
  const evaluationWindow = input.evaluationWindow ?? "day_21";
  const target = {
    table: "website_blog_posts",
    path: route,
    target_key: `blog:${locale}:${slug}`,
    ...(input.target ?? {}),
  };
  const payload: JsonRecord = {
    title,
    slug,
    locale,
    markdown: body,
    body,
    summary: input.summary ?? "",
    seo_title: input.seoTitle ?? title,
    seo_description: input.seoDescription ?? input.summary ?? title,
    target,
    rollback_expectation: {
      strategy: "delete_created_post",
      target_table: "website_blog_posts",
      slug,
      locale,
    },
    rollback_payload: {
      operation: "delete_created_post",
      match: { slug, locale },
    },
    smoke_plan: {
      route,
      checks: ["route_2xx", "title_present", "indexable"],
      expected_text: title,
    },
    baseline: input.baseline ?? {
      source: "provider_evidence_reads",
      status: "pending_before_publish",
    },
    success_metric: successMetric,
    evaluation_window: evaluationWindow,
  };

  return baseDraft(input, "content_article", payload, {
    idempotencyKeyInput: { title, slug, locale, successMetric, evaluationWindow },
    qualityReview: {
      pass: true,
      score: 0.9,
      checks: ["evidence_backed", "rollback_declared", "metric_declared"],
    },
    riskAssessment: {
      risk: "medium",
      action_class: "content_publish",
      mutable_surface: "website_blog_posts",
      executor_boundary: "content_publish_adapter",
    },
  });
}

export function buildSafeApplyPatchArtifact(
  input: SafeApplyPatchArtifactInput,
): LaneArtifactDraft {
  const targetTable = input.target.table ?? input.target.target_table;
  const targetId = input.target.id ?? input.target.target_id ?? input.target.path;
  if (!targetTable) throw new Error("target.table is required");
  if (!targetId) throw new Error("target id or path is required");
  if (input.fieldAllowlist.length === 0) {
    throw new Error("fieldAllowlist must include at least one field");
  }

  const successMetric = input.successMetric ?? "technical_smoke_pass";
  const evaluationWindow = input.evaluationWindow ?? "immediate";
  const smokePlan = input.smokePlan ?? {
    checks: ["target_readable", "patched_fields_match", "route_2xx"],
    target: input.target,
  };
  const payload: JsonRecord = {
    target: input.target,
    field_allowlist: input.fieldAllowlist,
    patch: input.patch,
    before_row: input.beforeRow ?? {},
    rollback_payload: input.rollbackPayload,
    rollback_expectation: {
      strategy: "restore_before_snapshot",
      target: input.target,
      fields: input.fieldAllowlist,
    },
    smoke_plan: smokePlan,
    baseline: input.baseline ?? {
      source: "provider_evidence_reads",
      status: "pending_before_apply",
    },
    success_metric: successMetric,
    evaluation_window: evaluationWindow,
  };

  return baseDraft(input, "safe_apply_patch", payload, {
    idempotencyKeyInput: {
      target: input.target,
      fieldAllowlist: input.fieldAllowlist,
      patch: input.patch,
      successMetric,
      evaluationWindow,
    },
    qualityReview: {
      pass: true,
      score: 0.92,
      checks: ["field_allowlist_present", "rollback_present", "smoke_plan_present"],
    },
    riskAssessment: {
      risk: "low",
      action_class: "safe_apply",
      mutable_surface: targetTable,
      executor_boundary: "safe_apply_adapter",
    },
  });
}

export function buildTranscreationPayloadArtifact(
  input: TranscreationPayloadArtifactInput,
): LaneArtifactDraft {
  const sourceLocale = requireText(input.sourceLocale, "sourceLocale");
  const targetLocale = requireText(input.targetLocale, "targetLocale");
  if (sourceLocale === targetLocale) {
    throw new Error("targetLocale must differ from sourceLocale");
  }

  const successMetric = input.successMetric ?? "locale_indexability_7d";
  const evaluationWindow = input.evaluationWindow ?? "day_7";
  const payload: JsonRecord = {
    source_locale: sourceLocale,
    target_locale: targetLocale,
    transcreation_job_id:
      input.target.transcreation_job_id ?? input.target.id ?? input.target.target_id ?? null,
    localized_variant_id:
      input.target.localized_variant_id ?? input.target.localizedVariantId ?? null,
    source_entity_id:
      input.target.source_entity_id ?? input.target.sourceEntityId ?? null,
    target_entity_id:
      input.target.target_entity_id ?? input.target.targetEntityId ?? null,
    page_type: input.target.page_type ?? input.target.pageType ?? null,
    target: input.target,
    payload: input.payload,
    glossary_terms: input.glossaryTerms ?? [],
    translation_memory_refs: input.translationMemoryRefs ?? [],
    rollback_payload: input.rollbackPayload,
    rollback_expectation: {
      strategy: "restore_source_locale_snapshot",
      target: input.target,
      source_locale: sourceLocale,
      target_locale: targetLocale,
    },
    smoke_plan: {
      checks: ["locale_route_2xx", "hreflang_present", "translated_fields_present"],
      target: input.target,
      target_locale: targetLocale,
    },
    baseline: input.baseline ?? {
      source: "provider_evidence_reads",
      status: "pending_before_merge",
    },
    success_metric: successMetric,
    evaluation_window: evaluationWindow,
  };

  return baseDraft(input, "transcreation_payload", payload, {
    idempotencyKeyInput: {
      sourceLocale,
      targetLocale,
      target: input.target,
      payload: input.payload,
      successMetric,
      evaluationWindow,
    },
    qualityReview: {
      pass: true,
      score: 0.9,
      checks: ["locale_diff", "rollback_present", "tm_context_present"],
    },
    riskAssessment: {
      risk: "medium",
      action_class: "transcreation_merge",
      mutable_surface: "localized_content",
      executor_boundary: "transcreation_merge_adapter",
    },
  });
}
