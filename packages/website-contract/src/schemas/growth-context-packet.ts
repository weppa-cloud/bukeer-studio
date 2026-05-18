import { z } from 'zod';

import { DedupeSchema, FreshnessMapSchema, ProfilePolicySchema, SourceProfileSchema, SourceRefSchema } from './growth-profile-base';

/**
 * Growth Context Packet Schema — Contract-first Context Packet definition.
 *
 * The Context Packet is the sole operational input consumed by any Growth OS
 * worker or agent. It is assembled by the context builder from Profile Bases
 * and normalized facts — never from ad-hoc worker research.
 *
 * References:
 *   - SPEC growth-agent-profile-base-design-20260516.md §6
 *   - ADR-003 (contract-first validation)
 *   - ADR-009 (multi-tenant scoping)
 *   - ADR-019 (multi-locale routing)
 */

// ── Supporting sub-schemas ──

const UuidSchema = z.string().uuid();

export const DedupeVerdictSchema = z.enum([
  'proceed',
  'coalesce',
  'skip',
  'request_refresh',
  'blocked',
]);
export type DedupeVerdict = z.infer<typeof DedupeVerdictSchema>;

export const ValidationVerdictSchema = z.enum([
  'PASS_AUTONOMOUS',
  'PASS_WITH_WATCH',
  'BLOCKED',
]);
export type ValidationVerdict = z.infer<typeof ValidationVerdictSchema>;

export const ReviewPublishGateSchema = z.object({
  requires_review: z.boolean().default(true),
  reviewer_type: z.enum(['none', 'tech_reviewer', 'cultural_reviewer', 'human_or_verifier']).default('human_or_verifier'),
  publish_blocked_actions_always: z.literal('call_provider_api_directly').optional(),
  publish_requires_gate: z.boolean().default(true),
  sitemap_exposure_requires_verifier: z.boolean().default(true),
});
export type ReviewPublishGate = z.infer<typeof ReviewPublishGateSchema>;

export const CanaryScopeSchema = z.object({
  enabled: z.boolean().default(true),
  max_urls_per_batch: z.number().int().positive().default(1),
  allowed_locales: z.array(z.string()).optional(),
  forbid_cron_dispatch: z.boolean().default(true),
});
export type CanaryScope = z.infer<typeof CanaryScopeSchema>;

export const RedactionReportSchema = z.object({
  raw_provider_payloads_removed: z.boolean().default(true),
  pii_stripped: z.boolean().default(true),
  secrets_verified_absent: z.boolean().default(true),
  note: z.string().optional(),
});
export type RedactionReport = z.infer<typeof RedactionReportSchema>;

// ── Context Packet schema ──

export const ContextPacketSchema = z.object({
  packet_version: z.string().default('1'),
  generated_at: z.string().datetime(),
  account_id: UuidSchema,
  website_id: UuidSchema,
  locale: z.string().min(2),
  market: z.string().min(1),
  lane: z.string().min(1),
  agent_definition_ref: z.string().optional(),
  task_ref: z.string().optional(),
  entity: z.string().optional(),

  // Profile bases — compact forms, never raw provider payloads
  profile_bases: z.array(z.unknown()).default([]),

  // Traceability
  source_profiles: z.array(SourceProfileSchema).default([]),
  source_refs: z.array(SourceRefSchema).default([]),
  freshness_map: FreshnessMapSchema.default({}),

  // Normalized facts only
  facts: z.array(z.record(z.string(), z.unknown())).default([]),

  // Anti-rework
  previous_actions: z
    .array(
      z.object({
        work_item_id: z.string().optional(),
        publication_job_id: z.string().optional(),
        action: z.string().optional(),
        status: z.string().optional(),
        timestamp: z.string().datetime().optional(),
      }),
    )
    .default([]),

  // Deduplication
  dedupe_verdict: DedupeVerdictSchema.default('proceed'),

  // Transcreation lane specific
  tm_glossary: z
    .object({
      translation_memory_refs: z.array(z.string()).optional(),
      glossary_refs: z.array(z.string()).optional(),
      brand_voice_refs: z.array(z.string()).optional(),
    })
    .optional(),

  // Policies and restrictions
  policies: ProfilePolicySchema.optional(),
  allowed_actions: z.array(z.string()).default([]),
  blocked_actions: z
    .array(z.string())
    .default(['call_provider_api_directly']),

  // Governance gates
  review_publish_gate: ReviewPublishGateSchema.optional(),
  canary_scope: CanaryScopeSchema.optional(),

  // Safety
  redaction_report: RedactionReportSchema.optional(),
  validation_verdict: ValidationVerdictSchema.default('BLOCKED'),
});
export type ContextPacket = z.infer<typeof ContextPacketSchema>;