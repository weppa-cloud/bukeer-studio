import { z } from 'zod';

export const AiCostFeatureSchema = z.enum([
  'editor',
  'public-chat',
  'seo-transcreate',
  'seo-generate',
  'package-content',
  'description-rewrite',
  'section-generate',
  'other',
]);
export type AiCostFeature = z.infer<typeof AiCostFeatureSchema>;

export const AiCostStatusSchema = z.enum(['ok', 'error', 'rate_limited', 'budget_exceeded']);
export type AiCostStatus = z.infer<typeof AiCostStatusSchema>;

export const AiCostEventSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  website_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  feature: z.string(),
  route: z.string(),
  model: z.string(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
  status: AiCostStatusSchema,
  rate_limit_key: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime({ offset: true }),
});
export type AiCostEvent = z.infer<typeof AiCostEventSchema>;

export const AiCostEventInputSchema = z.object({
  account_id: z.string().uuid(),
  website_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  feature: z.string().min(1),
  route: z.string().min(1),
  model: z.string().min(1),
  input_tokens: z.number().int().nonnegative().default(0),
  output_tokens: z.number().int().nonnegative().default(0),
  cost_usd: z.number().nonnegative().default(0),
  status: AiCostStatusSchema.default('ok'),
  rate_limit_key: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AiCostEventInput = z.infer<typeof AiCostEventInputSchema>;

export const AiCostBudgetTierSchema = z.enum(['free', 'standard', 'pro', 'enterprise']);
export type AiCostBudgetTier = z.infer<typeof AiCostBudgetTierSchema>;

export const AiCostBudgetSchema = z.object({
  account_id: z.string().uuid(),
  tier: AiCostBudgetTierSchema,
  daily_limit_usd: z.number().nonnegative().nullable(),
  monthly_limit_usd: z.number().nonnegative().nullable(),
  alert_threshold_pct: z.number().int().min(1).max(100),
  updated_at: z.string().datetime({ offset: true }),
});
export type AiCostBudget = z.infer<typeof AiCostBudgetSchema>;

export const AiSpendSummarySchema = z.object({
  account_id: z.string().uuid(),
  period: z.enum(['day', 'month']),
  since: z.string().datetime({ offset: true }),
  spent_usd: z.number().nonnegative(),
  limit_usd: z.number().nonnegative().nullable(),
  tier: AiCostBudgetTierSchema,
  pct: z.number().int().min(0).max(100),
  alert_threshold_pct: z.number().int().min(1).max(100),
  alert_threshold_hit: z.boolean(),
  over_limit: z.boolean(),
});
export type AiSpendSummary = z.infer<typeof AiSpendSummarySchema>;
