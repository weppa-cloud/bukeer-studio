import type {
  GrowthPublicationJobInsert,
  GrowthWorkItemOutcomeInsert,
} from "@bukeer/website-contract";
import {
  GrowthPublicationJobInsertSchema,
  GrowthWorkItemOutcomeInsertSchema,
} from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;
type GrowthMarket = "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";

const PLACEHOLDER_PUBLICATION_JOB_ID =
  "00000000-0000-4000-8000-000000000003";

export interface TranscreationMergePlanInput {
  accountId: string;
  websiteId: string;
  sourceLocale: string;
  targetLocale: string;
  market?: GrowthMarket;
  workItemId: string;
  changeSetId: string;
  policyId?: string | null;
  transcreationJobId: string;
  localizedVariantId?: string | null;
  pageType: "blog" | "page" | "destination";
  sourceEntityId: string;
  targetEntityId?: string | null;
  beforeVariant?: JsonRecord | null;
  payload: {
    title?: string;
    slug?: string;
    meta_title: string;
    meta_desc: string;
    h1?: string;
    body_content?: string;
    body_overlay_v2?: JsonRecord;
  };
  quality?: {
    score?: number;
    passed?: boolean;
    issues?: string[];
  };
  baseline?: JsonRecord;
  successMetric?: string;
  now?: Date;
  live?: boolean;
}

export interface TranscreationMergePlan {
  job: GrowthPublicationJobInsert;
  outcomes: Omit<GrowthWorkItemOutcomeInsert, "publication_job_id">[];
  smoke: {
    pass: boolean;
    checks: string[];
    failures: string[];
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nonEmptyRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0,
  );
}

function validatePayload(
  input: TranscreationMergePlanInput,
): { checks: string[]; failures: string[] } {
  const checks = [
    "locale_pair",
    "meta_title_length",
    "meta_description_length",
    "quality_gate",
    "overlay_present",
  ];
  const failures: string[] = [];

  if (input.sourceLocale === input.targetLocale) {
    failures.push("target_locale_matches_source");
  }
  if (
    input.payload.meta_title.trim().length < 10 ||
    input.payload.meta_title.trim().length > 70
  ) {
    failures.push("meta_title_length_out_of_range");
  }
  if (
    input.payload.meta_desc.trim().length < 70 ||
    input.payload.meta_desc.trim().length > 160
  ) {
    failures.push("meta_description_length_out_of_range");
  }
  if (input.quality?.passed === false) failures.push("quality_gate_failed");
  if (typeof input.quality?.score === "number" && input.quality.score < 0.8) {
    failures.push("quality_score_below_threshold");
  }
  if (!input.payload.body_content && !input.payload.body_overlay_v2) {
    failures.push("missing_body_payload");
  }

  return { checks, failures };
}

function buildIdempotencyKey(input: TranscreationMergePlanInput): string {
  return [
    "transcreation-merge-v1",
    input.workItemId,
    input.changeSetId,
    input.transcreationJobId,
    input.targetLocale,
  ].join(":");
}

function buildTargetMerge(input: TranscreationMergePlanInput, now: Date): JsonRecord {
  if (input.localizedVariantId) {
    return {
      page_type: input.pageType,
      source_entity_id: input.sourceEntityId,
      target_entity_id: input.targetEntityId ?? null,
      target_locale: input.targetLocale,
      body_overlay_v2: input.payload.body_overlay_v2 ?? {
        title: input.payload.title ?? null,
        slug: input.payload.slug ?? null,
        meta_title: input.payload.meta_title,
        meta_desc: input.payload.meta_desc,
        h1: input.payload.h1 ?? null,
        body_content: input.payload.body_content ?? null,
        applied_at: now.toISOString(),
      },
      status: "applied",
    };
  }

  return {
    page_type: input.pageType,
    page_id: input.sourceEntityId,
    target_locale: input.targetLocale,
    payload: input.payload,
    payload_v2: {
      ...input.payload,
      applied_at: now.toISOString(),
    },
    status: "applied",
  };
}

export function planTranscreationMerge(
  input: TranscreationMergePlanInput,
): TranscreationMergePlan {
  const now = input.now ?? new Date();
  const { checks, failures } = validatePayload(input);
  const smoke = { pass: failures.length === 0, checks, failures };
  const targetTable = input.localizedVariantId
    ? "seo_localized_variants"
    : "seo_transcreation_jobs";
  const targetId = input.localizedVariantId ?? input.transcreationJobId;
  const beforeSnapshot = nonEmptyRecord(input.beforeVariant)
    ? input.beforeVariant
    : {
        exists: Boolean(input.localizedVariantId),
        transcreation_job_id: input.transcreationJobId,
        target_locale: input.targetLocale,
      };
  const baseline = nonEmptyRecord(input.baseline)
    ? input.baseline
    : {
        source_locale: input.sourceLocale,
        target_locale: input.targetLocale,
        indexed: false,
        organic_clicks: 0,
      };
  const successMetric =
    input.successMetric ??
    `localized_organic_clicks:${input.pageType}:${input.targetLocale}:${input.sourceEntityId}`;
  const common = {
    account_id: input.accountId,
    website_id: input.websiteId,
    locale: input.targetLocale,
    market: input.market ?? "CO",
    work_item_id: input.workItemId,
    change_set_id: input.changeSetId,
    policy_id: input.policyId ?? null,
    lane: "transcreation" as const,
    action_class: "transcreation_merge" as const,
  };

  const job = GrowthPublicationJobInsertSchema.parse({
    ...common,
    job_mode: input.live ? "live" : "dry_run",
    status: smoke.pass ? "dry_run_ready" : "blocked",
    target_table: targetTable,
    target_id: targetId,
    target_path: `${input.pageType}:${input.targetLocale}:${input.sourceEntityId}`,
    idempotency_key: buildIdempotencyKey(input),
    before_snapshot: {
      table: targetTable,
      target_id: targetId,
      row: beforeSnapshot,
    },
    after_payload: {
      table: targetTable,
      target_id: targetId,
      merge: buildTargetMerge(input, now),
    },
    smoke_result: smoke,
    rollback_payload: {
      table: targetTable,
      target_id: targetId,
      restore: beforeSnapshot,
    },
    baseline,
    success_metric: successMetric,
    evaluation_date: dateOnly(addDays(now, 21)),
    evidence: {
      adapter: "transcreation_merge_v1",
      transcreation_job_id: input.transcreationJobId,
      localized_variant_id: input.localizedVariantId ?? null,
      quality: input.quality ?? null,
      existing_workflow: "lib/seo/transcreate-workflow.ts",
    },
    created_by: "growth_transcreation_merge_adapter",
    applied_at: null,
    smoke_checked_at: null,
    rolled_back_at: null,
  });

  const outcomeCandidates = [21, 45].map((days) => ({
    ...common,
    status: days === 21 ? ("measuring" as const) : ("scheduled" as const),
    outcome_type: "seo_content" as const,
    success_metric: `${successMetric}:day_${days}`,
    baseline,
    current_result: {},
    evaluation_window: `day_${days}` as "day_21" | "day_45",
    evaluation_date: dateOnly(addDays(now, days)),
    funnel_attribution_status: "pending" as const,
    attribution_evidence: {
      locale: input.targetLocale,
      source_locale: input.sourceLocale,
    },
  }));

  const outcomes = outcomeCandidates.map((outcome) => {
    const parsed = GrowthWorkItemOutcomeInsertSchema.parse({
      ...outcome,
      publication_job_id: PLACEHOLDER_PUBLICATION_JOB_ID,
    });
    const { publication_job_id: publicationJobId, ...withoutPublicationJob } =
      parsed;
    void publicationJobId;
    return withoutPublicationJob;
  });

  return { job, outcomes, smoke };
}
