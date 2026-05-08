import type {
  GrowthPublicationJobInsert,
  GrowthPublicationTargetTable,
  GrowthWorkItemOutcomeInsert,
} from "@bukeer/website-contract";
import {
  GrowthPublicationJobInsertSchema,
  GrowthWorkItemOutcomeInsertSchema,
} from "@bukeer/website-contract";

type JsonRecord = Record<string, unknown>;
type GrowthMarket = "CO" | "MX" | "US" | "CA" | "EU" | "OTHER";

export type TechnicalRemediationTargetTable = Extract<
  GrowthPublicationTargetTable,
  "website_pages" | "website_sections" | "product_seo_overrides"
>;

export interface TechnicalRemediationPlanInput {
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  workItemId: string;
  changeSetId: string;
  policyId?: string | null;
  targetTable: GrowthPublicationTargetTable;
  targetId: string;
  targetPath?: string | null;
  beforeRow: JsonRecord;
  patch: JsonRecord;
  baseline?: JsonRecord;
  successMetric?: string;
  now?: Date;
  live?: boolean;
}

export interface TechnicalRemediationPlan {
  job: GrowthPublicationJobInsert;
  outcomes: Omit<GrowthWorkItemOutcomeInsert, "publication_job_id">[];
  smoke: {
    pass: boolean;
    checks: string[];
    failures: string[];
  };
}

const TARGET_ALLOWED_FIELDS: Record<
  TechnicalRemediationTargetTable,
  ReadonlySet<string>
> = {
  website_pages: new Set([
    "seo_title",
    "seo_description",
    "target_keyword",
    "robots_noindex",
  ]),
  website_sections: new Set([
    "content",
    "content_translations",
    "config",
    "is_enabled",
  ]),
  product_seo_overrides: new Set([
    "meta_title",
    "meta_desc",
    "h1",
    "slug",
    "keywords",
    "body_content",
  ]),
};

const FORBIDDEN_FIELD_PATTERNS = [
  /price/i,
  /pricing/i,
  /availability/i,
  /booking/i,
  /reservation/i,
  /payment/i,
  /paid/i,
  /campaign/i,
  /cost/i,
  /currency/i,
];
const PLACEHOLDER_PUBLICATION_JOB_ID =
  "00000000-0000-4000-8000-000000000001";

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

function changedFields(before: JsonRecord, patch: JsonRecord): string[] {
  return Object.keys(patch).filter(
    (key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(patch[key]),
  );
}

function pickSnapshot(row: JsonRecord, keys: string[]): JsonRecord {
  const snapshot: JsonRecord = {};
  for (const key of keys) snapshot[key] = row[key] ?? null;
  return snapshot;
}

function hasForbiddenField(key: string): boolean {
  return FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function isTechnicalTargetTable(
  table: GrowthPublicationTargetTable,
): table is TechnicalRemediationTargetTable {
  return (
    table === "website_pages" ||
    table === "website_sections" ||
    table === "product_seo_overrides"
  );
}

function validatePatch(
  targetTable: TechnicalRemediationTargetTable,
  patch: JsonRecord,
): { checks: string[]; failures: string[] } {
  const checks: string[] = [];
  const failures: string[] = [];
  const allowed = TARGET_ALLOWED_FIELDS[targetTable];

  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) failures.push(`field_not_allowed:${key}`);
    if (hasForbiddenField(key)) failures.push(`forbidden_field:${key}`);
  }

  checks.push("field_allowlist");

  const title =
    typeof patch.seo_title === "string"
      ? patch.seo_title
      : typeof patch.meta_title === "string"
        ? patch.meta_title
        : null;
  if (title !== null && (title.length < 10 || title.length > 70)) {
    failures.push("title_length_out_of_range");
  }
  checks.push("title_length");

  const description =
    typeof patch.seo_description === "string"
      ? patch.seo_description
      : typeof patch.meta_desc === "string"
        ? patch.meta_desc
        : null;
  if (
    description !== null &&
    (description.length < 30 || description.length > 160)
  ) {
    failures.push("description_length_out_of_range");
  }
  checks.push("description_length");

  if (
    patch.slug !== undefined &&
    (typeof patch.slug !== "string" || !/^[a-z0-9-]+$/.test(patch.slug))
  ) {
    failures.push("invalid_slug");
  }
  checks.push("slug_format");

  if (
    patch.robots_noindex !== undefined &&
    typeof patch.robots_noindex !== "boolean"
  ) {
    failures.push("robots_noindex_not_boolean");
  }
  checks.push("robots_noindex_type");

  if (
    patch.keywords !== undefined &&
    (!Array.isArray(patch.keywords) ||
      patch.keywords.some((keyword) => typeof keyword !== "string"))
  ) {
    failures.push("keywords_not_string_array");
  }
  checks.push("keywords_type");

  return { checks, failures };
}

function buildIdempotencyKey(input: TechnicalRemediationPlanInput): string {
  const targetPath = input.targetPath ?? "root";
  const fieldKey = Object.keys(input.patch).sort().join(".");
  return [
    "technical-remediation-v1",
    input.workItemId,
    input.changeSetId,
    input.targetTable,
    input.targetId,
    targetPath,
    fieldKey,
  ].join(":");
}

export function planTechnicalRemediation(
  input: TechnicalRemediationPlanInput,
): TechnicalRemediationPlan {
  if (!isTechnicalTargetTable(input.targetTable)) {
    throw new Error("technical_remediation does not publish content.");
  }
  if (!nonEmptyRecord(input.patch)) {
    throw new Error("Technical remediation patch cannot be empty.");
  }

  const now = input.now ?? new Date();
  const changed = changedFields(input.beforeRow, input.patch);
  if (changed.length === 0) {
    throw new Error("Technical remediation patch has no effective changes.");
  }

  const targetTable = input.targetTable;
  const { checks, failures } = validatePatch(targetTable, input.patch);
  const beforeSnapshot = pickSnapshot(input.beforeRow, changed);
  const smoke = {
    pass: failures.length === 0,
    checks,
    failures,
  };
  const baseline = nonEmptyRecord(input.baseline)
    ? input.baseline
    : {
        changed_fields: changed,
        prior_values: beforeSnapshot,
      };
  const successMetric =
    input.successMetric ??
    `technical_smoke_pass:${input.targetTable}:${changed.join(",")}`;

  const common = {
    account_id: input.accountId,
    website_id: input.websiteId,
    locale: input.locale ?? "es-CO",
    market: input.market ?? "CO",
    work_item_id: input.workItemId,
    change_set_id: input.changeSetId,
    policy_id: input.policyId ?? null,
    lane: "technical_remediation" as const,
    action_class: "safe_apply" as const,
  };

  const jobCandidate: GrowthPublicationJobInsert = {
    ...common,
    job_mode: input.live ? "live" : "dry_run",
    status: smoke.pass ? "dry_run_ready" : "blocked",
    target_table: targetTable,
    target_id: input.targetId,
    target_path: input.targetPath ?? null,
    idempotency_key: buildIdempotencyKey(input),
    before_snapshot: {
      table: input.targetTable,
      target_id: input.targetId,
      values: beforeSnapshot,
    },
    after_payload: {
      table: input.targetTable,
      target_id: input.targetId,
      patch: input.patch,
    },
    smoke_result: smoke,
    rollback_payload: {
      table: input.targetTable,
      target_id: input.targetId,
      restore: beforeSnapshot,
    },
    baseline,
    success_metric: successMetric,
    evaluation_date: dateOnly(addDays(now, 7)),
    evidence: {
      adapter: "technical_remediation_v1",
      smoke_contract: "static_patch_validation",
      changed_fields: changed,
      forbidden_surfaces: [
        "pricing",
        "availability",
        "reservations",
        "payments",
        "paid_media",
      ],
    },
    created_by: "growth_technical_remediation_adapter",
    applied_at: null,
    smoke_checked_at: null,
    rolled_back_at: null,
  };

  const job = GrowthPublicationJobInsertSchema.parse(jobCandidate);

  const outcomeCandidates = [
    {
      ...common,
      status: "measuring" as const,
      outcome_type: "technical_seo" as const,
      success_metric: `${successMetric}:immediate`,
      baseline,
      current_result: {
        smoke_pass: smoke.pass,
        failures,
      },
      evaluation_window: "immediate" as const,
      evaluation_date: dateOnly(now),
      funnel_attribution_status: "not_applicable" as const,
      attribution_evidence: {
        reason: "technical_smoke_window",
      },
    },
    {
      ...common,
      status: "scheduled" as const,
      outcome_type: "technical_seo" as const,
      success_metric: `${successMetric}:day_7`,
      baseline,
      current_result: {},
      evaluation_window: "day_7" as const,
      evaluation_date: dateOnly(addDays(now, 7)),
      funnel_attribution_status: "pending" as const,
      attribution_evidence: {},
    },
    {
      ...common,
      status: "scheduled" as const,
      outcome_type: "technical_seo" as const,
      success_metric: `${successMetric}:day_28`,
      baseline,
      current_result: {},
      evaluation_window: "day_28" as const,
      evaluation_date: dateOnly(addDays(now, 28)),
      funnel_attribution_status: "pending" as const,
      attribution_evidence: {},
    },
  ].map(({ policy_id: _policyId, ...outcome }) => outcome);

  const outcomes = outcomeCandidates.map((outcome) => {
    const parsed = GrowthWorkItemOutcomeInsertSchema.parse({
      ...outcome,
      publication_job_id: PLACEHOLDER_PUBLICATION_JOB_ID,
    });
    const { publication_job_id: _publicationJobId, ...withoutPublicationJob } =
      parsed;
    return withoutPublicationJob;
  });

  return { job, outcomes, smoke };
}

export function extractRollbackRestore(
  rollbackPayload: unknown,
): {
  table: TechnicalRemediationTargetTable;
  targetId: string;
  restore: JsonRecord;
} {
  if (!nonEmptyRecord(rollbackPayload)) {
    throw new Error("Rollback payload is missing.");
  }
  const table = rollbackPayload.table;
  const targetId = rollbackPayload.target_id;
  const restore = rollbackPayload.restore;
  if (
    table !== "website_pages" &&
    table !== "website_sections" &&
    table !== "product_seo_overrides"
  ) {
    throw new Error("Rollback target table is not supported.");
  }
  if (typeof targetId !== "string" || !targetId) {
    throw new Error("Rollback target id is missing.");
  }
  if (!nonEmptyRecord(restore)) {
    throw new Error("Rollback restore payload is missing.");
  }
  const allowed = TARGET_ALLOWED_FIELDS[table];
  for (const key of Object.keys(restore)) {
    if (!allowed.has(key)) throw new Error(`Rollback field not allowed: ${key}`);
  }
  return { table, targetId, restore };
}
