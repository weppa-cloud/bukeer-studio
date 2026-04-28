import { z } from 'zod';

export const RoleSchema = z.enum(['read', 'draft', 'operator', 'admin']).default('read');
export const DateRangeSchema = z.object({ since: z.string(), until: z.string() });
export const AccountInputSchema = z.object({ actor: z.string().default('agent'), role: RoleSchema, adAccountId: z.string().min(1) });
export const ListInputSchema = AccountInputSchema.extend({ limit: z.number().int().positive().max(100).default(25), after: z.string().optional(), fields: z.array(z.string()).optional() });
export const InsightsInputSchema = AccountInputSchema.extend({
  dateRange: DateRangeSchema,
  level: z.enum(['account', 'campaign', 'adset', 'ad']).default('campaign'),
  fields: z.array(z.string()).default(['campaign_name', 'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'actions']),
  limit: z.number().int().positive().max(500).default(100),
});
export const CompareInputSchema = AccountInputSchema.extend({ current: DateRangeSchema, previous: DateRangeSchema, level: z.enum(['account', 'campaign', 'adset', 'ad']).default('campaign') });
export const AuditInputSchema = AccountInputSchema.extend({ dateRange: DateRangeSchema.optional(), highSpendCop: z.number().positive().default(500000), maxCostPerResultCop: z.number().positive().optional() });
export const CampaignPlanInputSchema = AccountInputSchema.extend({
  objective: z.string().min(1),
  destinationUrl: z.string().url(),
  audience: z.string().min(1),
  dailyBudgetCop: z.number().positive(),
  campaignBudgetCop: z.number().positive().optional(),
  specialAdCategories: z.array(z.string()).default([]),
  copyAngles: z.array(z.string()).default([]),
  utm: z.record(z.string()).default({}),
});
export const WriteBaseSchema = AccountInputSchema.extend({ approvalToken: z.string().optional(), confirm: z.boolean().default(false) });
export const CreateCampaignSchema = WriteBaseSchema.extend({ name: z.string().min(1), objective: z.string().min(1), dailyBudgetCop: z.number().positive().optional(), campaignBudgetCop: z.number().positive().optional(), specialAdCategories: z.array(z.string()).default([]), destinationUrl: z.string().url().optional() });
export const CreateAdsetSchema = WriteBaseSchema.extend({ campaignId: z.string().min(1), name: z.string().min(1), optimizationGoal: z.string().min(1), billingEvent: z.string().default('IMPRESSIONS'), dailyBudgetCop: z.number().positive().optional(), targeting: z.record(z.unknown()).default({}) });
export const CreateAdSchema = WriteBaseSchema.extend({ adsetId: z.string().min(1), name: z.string().min(1), creative: z.record(z.unknown()) });
export const BudgetUpdateSchema = WriteBaseSchema.extend({ entityId: z.string().min(1), entityType: z.enum(['campaign', 'adset']), dailyBudgetCop: z.number().positive().optional(), campaignBudgetCop: z.number().positive().optional() });
export const StatusUpdateSchema = WriteBaseSchema.extend({ entityId: z.string().min(1), entityType: z.enum(['campaign', 'adset', 'ad']), latestHealthCheckAt: z.string().optional() });
export const AdvantagePlanSchema = CampaignPlanInputSchema.extend({ experimentName: z.string().default('Advantage experiment'), allowCreativeEnhancements: z.boolean().default(false), useDynamicCreative: z.boolean().default(false), approvedAssets: z.array(z.string()).default([]), approvedCopies: z.array(z.string()).default([]) });
export const ToolOutputSchema = z.object({ ok: z.boolean(), dryRun: z.boolean().optional(), data: z.unknown().optional(), warnings: z.array(z.string()).optional(), blocked: z.object({ code: z.string(), message: z.string(), detail: z.unknown().optional() }).optional() });
export type ToolOutput = z.infer<typeof ToolOutputSchema>;
