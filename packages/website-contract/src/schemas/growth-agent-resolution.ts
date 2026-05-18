import { z } from 'zod';

/**
 * Growth Agent Resolution Schema — Contract-first agent resolution.
 *
 * Defines the resolution chain for Growth Agent definitions by
 * locale/market/lane. Exact match is required; locale-family fallback
 * is opt-in; implicit default to es-CO/CO is BLOCKED.
 *
 * References:
 *   - SPEC growth-agent-profile-base-design-20260516.md §7
 *   - ADR-009 (multi-tenant scoping)
 *   - ADR-019 (multi-locale routing)
 */

export const ResolutionStepSchema = z.enum([
  'exact_match',
  'locale_family_fallback',
  'blocked',
]);
export type ResolutionStep = z.infer<typeof ResolutionStepSchema>;

export const ResolutionErrorCodeSchema = z.enum([
  'agent_definition_missing',
  'agent_locale_fallback_disallowed',
  'missing_target_locale',
  'missing_target_market',
  'invalid_locale_pair',
  'profile_base_missing',
  'profile_base_stale',
  'source_ref_missing',
  'profile_run_missing',
  'tm_glossary_missing',
  'dedupe_skip',
  'action_blocked',
]);
export type ResolutionErrorCode = z.infer<typeof ResolutionErrorCodeSchema>;

export const AgentResolutionSchema = z.object({
  account_id: z.string().uuid(),
  website_id: z.string().uuid(),
  locale: z.string().min(2),
  market: z.string().min(1),
  lane: z.string().min(1),
  resolution_step: ResolutionStepSchema,
  agent_definition_id: z.string().uuid().optional(),
  fallback_from_locale: z.string().optional(),
  fallback_from_market: z.string().optional(),
  error: ResolutionErrorCodeSchema.optional(),
  error_detail: z.string().optional(),
  resolved_at: z.string().datetime(),
});
export type AgentResolution = z.infer<typeof AgentResolutionSchema>;

/**
 * Gate Verdict Schema — The outcome of the validation gate chain.
 *
 * A worker may only execute when verdict is PASS_AUTONOMOUS.
 * PASS_WITH_WATCH requires a reviewer/human gate.
 * BLOCKED means do not execute.
 */
export const GateVerdictSchema = z.object({
  verdict: z.enum(['PASS_AUTONOMOUS', 'PASS_WITH_WATCH', 'BLOCKED']),
  blocked_reasons: z.array(z.string()).default([]),
  required_reviewer: z.string().optional(),
  gate_results: z
    .array(
      z.object({
        gate_name: z.string(),
        status: z.enum(['PASS', 'WATCH', 'BLOCKED']),
        reason: z.string().optional(),
      }),
    )
    .default([]),
  evaluated_at: z.string().datetime().optional(),
});
export type GateVerdict = z.infer<typeof GateVerdictSchema>;