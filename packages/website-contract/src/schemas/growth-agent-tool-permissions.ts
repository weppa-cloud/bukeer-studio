import { z } from 'zod';

import { GrowthTenantScopeSchema } from './growth-attribution';

/**
 * Growth Agent Tool Permissions Contract — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR
 *
 * Per-agent tool policy controlling read/write mode, approval requirement and
 * budget cap for each external/internal tool the Symphony Orchestrator can
 * dispatch (Supabase, GSC, GA4, DataForSEO, GitHub, Browser/Playwright, CRM,
 * paid ads, OpenRouter, Chatwoot, internal).
 *
 * Implements the Lane-Level Autonomy Gate from the Symphony Orchestrator SPEC
 * (Control Plane Tables) — issue #403, EPIC #310.
 *
 * References:
 *   - ADR-003: Growth control-plane data model
 *   - ADR-008: Agent autonomy gates and approval flow
 *   - ADR-009: Multi-tenant scoping (account_id + website_id)
 *
 * Multi-tenant scoped via GrowthTenantScopeSchema (account_id + website_id +
 * locale + market) so policies can diverge per tenant/locale.
 */

export const AgentToolIdSchema = z.enum([
  'supabase',
  'gsc',
  'ga4',
  'dataforseo',
  'github',
  'playwright',
  'crm',
  'meta_ads',
  'google_ads',
  'tiktok',
  'openrouter',
  'chatwoot',
  'internal',
]);
export type AgentToolId = z.infer<typeof AgentToolIdSchema>;

export const AgentToolModeSchema = z.enum(['none', 'read', 'write']);
export type AgentToolMode = z.infer<typeof AgentToolModeSchema>;

export const AgentToolBudgetPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);
export type AgentToolBudgetPeriod = z.infer<typeof AgentToolBudgetPeriodSchema>;

export const GrowthAgentToolPermissionSchema = GrowthTenantScopeSchema.extend({
  permission_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  tool_id: AgentToolIdSchema,
  mode: AgentToolModeSchema.default('none'),
  requires_approval: z.boolean().default(true),
  budget_usd_cap: z.number().min(0).nullable().default(null),
  budget_period: AgentToolBudgetPeriodSchema.nullable().default(null),
  notes: z.string().min(1).max(500).nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).refine(
  (data) =>
    (data.budget_usd_cap === null && data.budget_period === null) ||
    (data.budget_usd_cap !== null && data.budget_period !== null),
  {
    message:
      'budget_usd_cap and budget_period must both be set or both be null (cap requires a period; no cap means no period).',
    path: ['budget_period'],
  },
);
export type GrowthAgentToolPermission = z.infer<typeof GrowthAgentToolPermissionSchema>;

export const GrowthAgentToolPermissionInputSchema = GrowthTenantScopeSchema.extend({
  agent_id: z.string().uuid(),
  tool_id: AgentToolIdSchema,
  mode: AgentToolModeSchema.default('none'),
  requires_approval: z.boolean().default(true),
  budget_usd_cap: z.number().min(0).nullable().default(null),
  budget_period: AgentToolBudgetPeriodSchema.nullable().default(null),
  notes: z.string().min(1).max(500).nullable().default(null),
}).refine(
  (data) =>
    (data.budget_usd_cap === null && data.budget_period === null) ||
    (data.budget_usd_cap !== null && data.budget_period !== null),
  {
    message:
      'budget_usd_cap and budget_period must both be set or both be null (cap requires a period; no cap means no period).',
    path: ['budget_period'],
  },
);
export type GrowthAgentToolPermissionInput = z.infer<typeof GrowthAgentToolPermissionInputSchema>;
