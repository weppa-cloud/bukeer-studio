import { z } from 'zod';
import { GrowthTenantScopeSchema, GrowthMarketSchema } from './growth-attribution';

/**
 * Growth Agent Context Packs Contract — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR
 *
 * Versioned tenant context for the Symphony Orchestrator runtime (issue #403,
 * EPIC #310). Each pack captures project preferences, target markets, brand
 * tone, content rules, illustrative examples, rejected patterns and learned
 * decisions that ground every agent run for a tenant.
 *
 * Multi-tenant scoped via account_id + website_id (ADR-009). Only one pack
 * per tenant is active at a time (is_active=true) — the orchestrator picks
 * the active one when composing prompts. Versioning follows semver
 * (ADR-008) so packs can be promoted, rolled back and audited (ADR-003).
 */

export const ContextPackVersionSchema = z
  .string()
  .min(5)
  .max(32)
  .regex(/^\d+\.\d+\.\d+$/);
export type ContextPackVersion = z.infer<typeof ContextPackVersionSchema>;

export const ContextPackExampleSchema = z.object({
  kind: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});
export type ContextPackExample = z.infer<typeof ContextPackExampleSchema>;

export const ContextPackLearnedDecisionSchema = z.object({
  decision_id: z.string(),
  summary: z.string().min(1).max(1000),
  recorded_at: z.string().datetime(),
});
export type ContextPackLearnedDecision = z.infer<typeof ContextPackLearnedDecisionSchema>;

export const GrowthAgentContextPackSchema = GrowthTenantScopeSchema.extend({
  pack_id: z.string().uuid(),
  version: ContextPackVersionSchema,
  is_active: z.boolean().default(false),
  // Free-form preferences bag. Documented keys live in the SPEC under
  // "Control Plane Tables" (e.g. brand_voice, target_persona, off_limits_topics,
  // preferred_cta, default_funnel). Unknown keys are tolerated to allow
  // forward-compatible additions without schema migrations.
  preferences: z.record(z.string(), z.unknown()),
  markets: z.array(GrowthMarketSchema).min(1),
  tone: z.string().min(1).max(500).nullable().default(null),
  content_rules: z.array(z.string().min(1).max(500)).default([]),
  rejected_patterns: z.array(z.string().min(1).max(500)).default([]),
  examples: z.array(ContextPackExampleSchema).default([]),
  learned_decisions: z.array(ContextPackLearnedDecisionSchema).default([]),
  notes: z.string().max(2000).nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GrowthAgentContextPack = z.infer<typeof GrowthAgentContextPackSchema>;

export const GrowthAgentContextPackInputSchema = GrowthAgentContextPackSchema.omit({
  pack_id: true,
  created_at: true,
  updated_at: true,
});
export type GrowthAgentContextPackInput = z.infer<typeof GrowthAgentContextPackInputSchema>;
