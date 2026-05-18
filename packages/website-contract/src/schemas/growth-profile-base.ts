import { z } from 'zod';

/**
 * Growth Profile Base Schema — Contract-first Profile Base definition.
 *
 * A Profile Base is the operational minimum package that enables an agent
 * to answer: who am I, for what website/locale/market/lane do I work,
 * what facts can I use, where did they come from, how fresh are they,
 * what actions can I or can I not execute, and what reviewer/gate must
 * approve before publishing or escalating.
 *
 * Key composite: account_id / website_id / locale / market / lane / profile_type
 *
 * References:
 *   - SPEC growth-agent-profile-base-design-20260516.md §4
 *   - ADR-003 (contract-first validation)
 *   - ADR-009 (multi-tenant scoping)
 *   - ADR-019 (multi-locale routing)
 */

// ── Supporting schemas ──

const UuidSchema = z.string().uuid();

export const ProfileBaseStatusSchema = z.enum([
  'PASS_AUTONOMOUS',
  'PASS_WITH_WATCH',
  'BLOCKED',
  'STALE',
  'MISSING_SOURCE_REFS',
  'LOCALE_MISMATCH',
]);
export type ProfileBaseStatus = z.infer<typeof ProfileBaseStatusSchema>;

export const SourceRefSchema = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const SourceProfileSchema = z.object({
  profile_id: z.string().uuid(),
  provider: z.string().min(1),
  profile_type: z.string().min(1),
  run_id: z.string().uuid().optional(),
  run_window: z.string().optional(),
  cache_key: z.string().optional(),
  normalizer_version: z.string().optional(),
});
export type SourceProfile = z.infer<typeof SourceProfileSchema>;

export const DedupeSchema = z.object({
  evidence_fingerprint: z.string().min(1).optional(),
  correlation_key: z.string().optional(),
  verdict: z.enum(['proceed', 'skip', 'coalesce', 'request_refresh', 'blocked']).default('proceed'),
});
export type Dedupe = z.infer<typeof DedupeSchema>;

export const ProfilePolicySchema = z.object({
  allowed_actions: z.array(z.string()).default([]),
  blocked_actions: z.array(z.string()).default(['call_provider_api_directly']),
  kill_switch: z.boolean().default(false),
  caps: z.record(z.string(), z.unknown()).optional(),
  review_gate: z.string().optional(),
  canary_only: z.boolean().default(true),
});
export type ProfilePolicy = z.infer<typeof ProfilePolicySchema>;

/**
 * Freshness entry for a single fact or profile within the Profile Base.
 */
export const FreshnessEntrySchema = z.object({
  profile_type: z.string().min(1).optional(),
  fact_id: z.string().optional(),
  observed_at: z.string().datetime().optional(),
  valid_from: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  ttl_hours: z.number().nonnegative().optional(),
  freshness_status: z
    .enum(['fresh', 'stale', 'expired', 'unknown'])
    .default('unknown'),
  confidence: z.number().min(0).max(1).optional(),
  quality_status: z.string().optional(),
});
export type FreshnessEntry = z.infer<typeof FreshnessEntrySchema>;

export const FreshnessMapSchema = z.record(
  z.string(),
  FreshnessEntrySchema,
);
export type FreshnessMap = z.infer<typeof FreshnessMapSchema>;

// ── Profile Base schema ──

export const ProfileBaseSchema = z.object({
  profile_base_id: z.string().uuid().optional(),
  account_id: UuidSchema,
  website_id: UuidSchema,
  locale: z.string().min(2),
  market: z.string().min(1),
  lane: z.string().min(1),
  profile_type: z.string().min(1),
  subject: z.string().optional(),
  version: z.number().int().positive().default(1),
  status: ProfileBaseStatusSchema.default('BLOCKED'),
  source_refs: z.array(SourceRefSchema).default([]),
  source_profiles: z.array(SourceProfileSchema).default([]),
  freshness_map: FreshnessMapSchema.default({}),
  dedupe: DedupeSchema.optional(),
  policy: ProfilePolicySchema.optional(),
  redaction_report: z.string().optional(),
});
export type ProfileBase = z.infer<typeof ProfileBaseSchema>;
