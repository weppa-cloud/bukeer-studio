import { z } from "zod";

import { GrowthTenantScopeSchema } from "./growth-attribution";
import { AgentLaneSchema } from "./growth-agent-definitions";

/**
 * Growth Agent Change Sets Contract — SPEC_GROWTH_OS_AGENT_CHANGE_SETS_WORK_CENTER
 *
 * Human-facing work products emitted by Growth OS runtime runs. A change set is
 * the reviewable unit operators approve, reject, request changes for, or apply
 * to a safe non-public draft target.
 */

export const GrowthAgentChangeSetStatusSchema = z.enum([
  "proposed",
  "draft_created",
  "needs_review",
  "changes_requested",
  "approved",
  "applied",
  "published",
  "rejected",
  "blocked",
]);
export type GrowthAgentChangeSetStatus = z.infer<
  typeof GrowthAgentChangeSetStatusSchema
>;

export const GrowthAgentChangeTypeSchema = z.enum([
  "backlog_route_update",
  "backlog_task_split",
  "follow_up_backlog_create",
  "council_packet_prepare",
  "governance_block",
  "growth_cycle_summary",
  "seo_title_meta_draft",
  "seo_indexing_draft",
  "route_mapping_draft",
  "internal_link_draft",
  "performance_remediation_task",
  "technical_smoke_result",
  "blog_draft_create",
  "content_update_draft",
  "content_brief_create",
  "faq_schema_draft",
  "landing_section_copy_draft",
  "content_evidence_request",
  "transcreation_draft_create",
  "transcreation_update_draft",
  "locale_seo_review",
  "translation_quality_fix_draft",
  "locale_serp_packet",
  "transcreation_merge_readiness",
  "content_quality_review",
  "creator_revision_request",
  "publish_packet_prepare",
  "experiment_candidate_prepare",
  "experiment_readout_prepare",
  "learning_candidate_review",
  "tool_policy_verdict",
  "blocked_tool_call_evidence",
  "replay_case_candidate",
  "memory_candidate",
  "skill_update_candidate",
  "research_packet",
]);
export type GrowthAgentChangeType = z.infer<typeof GrowthAgentChangeTypeSchema>;

export const GrowthAgentChangeSetRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "blocked",
]);
export type GrowthAgentChangeSetRiskLevel = z.infer<
  typeof GrowthAgentChangeSetRiskLevelSchema
>;

export const GrowthAgentChangeSetApprovalRoleSchema = z.enum([
  "growth_operator",
  "curator",
  "council_admin",
  "technical_owner",
]);
export type GrowthAgentChangeSetApprovalRole = z.infer<
  typeof GrowthAgentChangeSetApprovalRoleSchema
>;

const JsonRecordSchema = z.record(z.string(), z.unknown()).default({});

export const GrowthAgentChangeSetPreviewPayloadSchema = JsonRecordSchema;
export type GrowthAgentChangeSetPreviewPayload = z.infer<
  typeof GrowthAgentChangeSetPreviewPayloadSchema
>;

export const GrowthAgentChangeSetEvidenceSchema = JsonRecordSchema;
export type GrowthAgentChangeSetEvidence = z.infer<
  typeof GrowthAgentChangeSetEvidenceSchema
>;

const ALWAYS_HUMAN_REVIEW_CHANGE_TYPES = new Set<string>([
  "blog_draft_create",
  "content_update_draft",
  "content_brief_create",
  "faq_schema_draft",
  "landing_section_copy_draft",
  "transcreation_draft_create",
  "transcreation_update_draft",
  "translation_quality_fix_draft",
  "transcreation_merge_readiness",
  "publish_packet_prepare",
  "experiment_candidate_prepare",
]);

const GrowthAgentChangeSetBaseSchema = GrowthTenantScopeSchema.extend({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  source_table: z.string().min(1).max(80).nullable().default(null),
  source_id: z.string().uuid().nullable().default(null),
  agent_lane: AgentLaneSchema,
  change_type: GrowthAgentChangeTypeSchema,
  status: GrowthAgentChangeSetStatusSchema.default("proposed"),
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(4000),
  dedupe_key: z.string().min(16).max(160),
  before_snapshot: JsonRecordSchema,
  after_snapshot: JsonRecordSchema,
  preview_payload: GrowthAgentChangeSetPreviewPayloadSchema,
  evidence: GrowthAgentChangeSetEvidenceSchema,
  risk_level: GrowthAgentChangeSetRiskLevelSchema.default("medium"),
  requires_human_review: z.boolean().default(true),
  required_approval_role:
    GrowthAgentChangeSetApprovalRoleSchema.default("curator"),
  parent_change_set_id: z.string().uuid().nullable().default(null),
  created_backlog_item_id: z.string().uuid().nullable().default(null),
  approved_by: z.string().uuid().nullable().default(null),
  approved_at: z.string().datetime().nullable().default(null),
  applied_by: z.string().uuid().nullable().default(null),
  applied_at: z.string().datetime().nullable().default(null),
  published_by: z.string().uuid().nullable().default(null),
  published_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GrowthAgentChangeSetSchema =
  GrowthAgentChangeSetBaseSchema.superRefine((row, ctx) => {
    if (
      ALWAYS_HUMAN_REVIEW_CHANGE_TYPES.has(row.change_type) &&
      !row.requires_human_review
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requires_human_review"],
        message: "This change type always requires human review.",
      });
    }

    if (row.published_at && row.status !== "published") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["published_at"],
        message: "published_at requires status=published.",
      });
    }

    if (
      row.applied_at &&
      row.status !== "applied" &&
      row.status !== "published"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applied_at"],
        message: "applied_at requires status=applied or status=published.",
      });
    }
  });
export type GrowthAgentChangeSet = z.infer<typeof GrowthAgentChangeSetSchema>;

export const GrowthAgentChangeSetInsertSchema =
  GrowthAgentChangeSetBaseSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });
export type GrowthAgentChangeSetInsert = z.infer<
  typeof GrowthAgentChangeSetInsertSchema
>;

export const GrowthAgentChangeSetUpdateSchema =
  GrowthAgentChangeSetBaseSchema.partial()
    .omit({
      id: true,
      account_id: true,
      website_id: true,
      run_id: true,
      created_at: true,
    })
    .extend({
      updated_at: z.string().datetime().optional(),
    });
export type GrowthAgentChangeSetUpdate = z.infer<
  typeof GrowthAgentChangeSetUpdateSchema
>;
