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
type ContentLane = "content_creator" | "content_curator";

const PLACEHOLDER_PUBLICATION_JOB_ID =
  "00000000-0000-4000-8000-000000000002";

export interface ContentPublicationPlanInput {
  accountId: string;
  websiteId: string;
  locale?: string;
  market?: GrowthMarket;
  workItemId: string;
  changeSetId: string;
  policyId?: string | null;
  lane?: ContentLane;
  targetId?: string | null;
  beforeRow?: JsonRecord | null;
  article: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string | null;
    seo_title: string;
    seo_description: string;
    seo_keywords?: string[];
    featured_image?: string | null;
    featured_image_alt?: string | null;
  };
  baseline?: JsonRecord;
  successMetric?: string;
  now?: Date;
  live?: boolean;
}

export interface ContentPublicationPlan {
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

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function nonEmptyRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0,
  );
}

function validateArticle(
  article: ContentPublicationPlanInput["article"],
): { checks: string[]; failures: string[] } {
  const checks = [
    "title_present",
    "slug_format",
    "content_depth",
    "seo_title_length",
    "seo_description_length",
    "no_pricing_or_booking_mutation",
  ];
  const failures: string[] = [];

  if (article.title.trim().length < 10) failures.push("title_too_short");
  if (!/^[a-z0-9-]+$/.test(article.slug)) failures.push("invalid_slug");
  if (wordCount(article.content) < 300) failures.push("content_too_thin");
  if (
    article.seo_title.trim().length < 10 ||
    article.seo_title.trim().length > 70
  ) {
    failures.push("seo_title_length_out_of_range");
  }
  if (
    article.seo_description.trim().length < 70 ||
    article.seo_description.trim().length > 160
  ) {
    failures.push("seo_description_length_out_of_range");
  }
  if (
    /(?:price|pricing|availability|booking|reservation|payment|paid campaign)/i.test(
      JSON.stringify(article),
    )
  ) {
    failures.push("forbidden_commercial_mutation_language");
  }

  return { checks, failures };
}

function buildIdempotencyKey(input: ContentPublicationPlanInput): string {
  return [
    "content-publication-v1",
    input.workItemId,
    input.changeSetId,
    input.article.slug,
    input.locale ?? "es-CO",
  ].join(":");
}

export function planContentPublication(
  input: ContentPublicationPlanInput,
): ContentPublicationPlan {
  const now = input.now ?? new Date();
  const { checks, failures } = validateArticle(input.article);
  const smoke = { pass: failures.length === 0, checks, failures };
  const targetId = input.targetId ?? null;
  const beforeSnapshot = nonEmptyRecord(input.beforeRow)
    ? input.beforeRow
    : { exists: false, table: "website_blog_posts", slug: input.article.slug };
  const baseline = nonEmptyRecord(input.baseline)
    ? input.baseline
    : {
        organic_clicks: 0,
        impressions: 0,
        indexed: false,
        slug: input.article.slug,
      };
  const successMetric =
    input.successMetric ?? `organic_clicks:blog:${input.article.slug}`;
  const common = {
    account_id: input.accountId,
    website_id: input.websiteId,
    locale: input.locale ?? "es-CO",
    market: input.market ?? "CO",
    work_item_id: input.workItemId,
    change_set_id: input.changeSetId,
    policy_id: input.policyId ?? null,
    lane: input.lane ?? ("content_creator" as const),
    action_class: "content_publish" as const,
  };

  const job = GrowthPublicationJobInsertSchema.parse({
    ...common,
    job_mode: input.live ? "live" : "dry_run",
    status: smoke.pass ? "dry_run_ready" : "blocked",
    target_table: "website_blog_posts",
    target_id: targetId,
    target_path: `/blog/${input.article.slug}`,
    idempotency_key: buildIdempotencyKey(input),
    before_snapshot: {
      table: "website_blog_posts",
      target_id: targetId,
      row: beforeSnapshot,
    },
    after_payload: {
      table: "website_blog_posts",
      target_id: targetId,
      insert_or_update: {
        ...input.article,
        status: "published",
        published_at: now.toISOString(),
        ai_generated: true,
        human_edited: false,
        word_count: wordCount(input.article.content),
      },
    },
    smoke_result: smoke,
    rollback_payload: targetId
      ? {
          table: "website_blog_posts",
          target_id: targetId,
          restore: beforeSnapshot,
        }
      : {
          table: "website_blog_posts",
          target_id: null,
          delete_created_slug: input.article.slug,
        },
    baseline,
    success_metric: successMetric,
    evaluation_date: dateOnly(addDays(now, 21)),
    evidence: {
      adapter: "content_publication_v1",
      changed_surface: "organic_blog",
      required_revalidation: [
        `/site/[subdomain]/blog`,
        `/site/[subdomain]/blog/${input.article.slug}`,
      ],
    },
    created_by: "growth_content_publication_adapter",
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
    attribution_evidence: {},
  }));

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
