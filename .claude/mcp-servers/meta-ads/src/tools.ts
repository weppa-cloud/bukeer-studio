import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

import { hashToken } from './approval.js';
import { assertAccountAllowed, assertBudgetCaps, assertLandingDomain, assertRole, assertWritesAvailable, forcePaused, GuardrailError } from './guardrails.js';
import { AccountInputSchema, AdvantagePlanSchema, AuditInputSchema, BudgetUpdateSchema, CampaignPlanInputSchema, CompareInputSchema, CreateAdSchema, CreateAdsetSchema, CreateCampaignSchema, InsightsInputSchema, ListInputSchema, StatusUpdateSchema, ToolOutputSchema, type ToolOutput } from './schemas.js';
import type { MetaMcpRole, ToolContext } from './types.js';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  handler: (input: any, context: ToolContext) => Promise<ToolOutput>;
}

export function toMcpTool(tool: ToolDef): Record<string, unknown> {
  return { name: tool.name, description: tool.description, inputSchema: jsonSchema(tool.inputSchema), outputSchema: jsonSchema(tool.outputSchema), annotations: tool.annotations };
}

function jsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<string, unknown>;
}

async function runGuarded(tool: ToolDef, input: any, context: ToolContext, fn: () => Promise<ToolOutput>): Promise<ToolOutput> {
  const started = Date.now();
  const record = input as Record<string, unknown>;
  try {
    const result = await fn();
    await context.audit.log({ tool: tool.name, actor: String(record.actor ?? ''), role: record.role as MetaMcpRole, accountId: String(record.adAccountId ?? ''), input, dryRun: result.dryRun, metaResponse: result.data, outcome: result.ok ? 'success' : 'blocked', durationMs: Date.now() - started });
    return result;
  } catch (error) {
    const blocked = error instanceof GuardrailError;
    const output: ToolOutput = { ok: false, blocked: { code: blocked ? error.code : 'META_MCP_ERROR', message: error instanceof Error ? error.message : String(error), detail: blocked ? error.detail : undefined } };
    await context.audit.log({ tool: tool.name, actor: String(record.actor ?? ''), role: record.role as MetaMcpRole, accountId: String(record.adAccountId ?? ''), input, outcome: blocked ? 'blocked' : 'error', errorCategory: output.blocked?.code, durationMs: Date.now() - started });
    return output;
  }
}

function readTool(name: string, description: string, inputSchema: ZodTypeAny, handler: (input: any, context: ToolContext) => Promise<ToolOutput>): ToolDef {
  const tool: ToolDef = { name, description, inputSchema, outputSchema: ToolOutputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }, handler: (input, context) => runGuarded(tool, input, context, () => handler(input, context)) };
  return tool;
}

function ensureRead(input: { role: MetaMcpRole; adAccountId: string }, context: ToolContext): string {
  assertRole(input.role, 'read');
  return assertAccountAllowed(context.config, input.adAccountId);
}

function fieldsFor(edge: string): string {
  if (edge === 'campaigns') return 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,updated_time';
  if (edge === 'adsets') return 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal';
  if (edge === 'ads') return 'id,name,status,effective_status,campaign_id,adset_id,creative';
  if (edge === 'adcreatives') return 'id,name,title,body,object_story_spec';
  return 'id,name,account_status,currency,timezone_name';
}

function edgeTool(name: string, edge: string, description: string): ToolDef {
  return readTool(name, description, ListInputSchema, async (input, context) => {
    const account = ensureRead(input, context);
    const path = edge ? `${account}/${edge}` : account;
    const data = await context.meta.get(path, { fields: input.fields?.join(',') ?? fieldsFor(edge), limit: input.limit, after: input.after });
    return { ok: true, dryRun: true, data };
  });
}

function campaignPlan(input: any): Record<string, unknown> {
  return { campaign: { name: `BKR_${input.objective}_${new URL(input.destinationUrl).hostname}`, objective: input.objective, status: 'PAUSED', specialAdCategories: input.specialAdCategories }, adsets: [{ name: `Prospecting_${input.audience}`, dailyBudgetCop: input.dailyBudgetCop, status: 'PAUSED' }], ads: (input.copyAngles.length ? input.copyAngles : ['primary']).map((angle: string) => ({ name: `Ad_${angle}`, copyAngle: angle, status: 'PAUSED' })), tracking: { destinationUrl: input.destinationUrl, utm: input.utm } };
}

function draftTool(name: string): ToolDef {
  const tool: ToolDef = { name, description: `Use when creating or validating a no-write Meta Ads campaign draft: ${name}.`, inputSchema: CampaignPlanInputSchema, outputSchema: ToolOutputSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }, handler: (input, context) => runGuarded(tool, input, context, async () => { assertRole(input.role, 'draft'); assertAccountAllowed(context.config, input.adAccountId); assertBudgetCaps(context.config, input); assertLandingDomain(context.config, input.destinationUrl); return { ok: true, dryRun: true, data: campaignPlan(input), warnings: input.specialAdCategories.length ? [] : ['Confirm whether a special ad category is required before write.'] }; }) };
  return tool;
}

function writeTool(name: string, description: string, inputSchema: ZodTypeAny, requiredRole: MetaMcpRole, buildPayload: (input: any) => { path: string; payload: Record<string, unknown>; budget?: { dailyBudgetCop?: number; campaignBudgetCop?: number } }): ToolDef {
  const tool: ToolDef = { name, description, inputSchema, outputSchema: ToolOutputSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, handler: (input, context) => runGuarded(tool, input, context, async () => {
    const record = input as Record<string, unknown>;
    assertRole(record.role as MetaMcpRole, requiredRole);
    assertAccountAllowed(context.config, String(record.adAccountId));
    const { path, payload, budget } = buildPayload(input);
    assertBudgetCaps(context.config, budget ?? {});
    if (typeof record.destinationUrl === 'string') assertLandingDomain(context.config, record.destinationUrl);
    if (!record.approvalToken) {
      const approval = context.approvals.issue({ actor: String(record.actor), role: record.role as MetaMcpRole, tool: name, payload });
      return { ok: true, dryRun: true, data: { approvalRequired: true, ...approval, proposedPayload: payload } };
    }
    const verification = context.approvals.verify({ token: String(record.approvalToken), actor: String(record.actor), role: record.role as MetaMcpRole, tool: name, payload, confirm: record.confirm === true });
    if (!verification.ok) throw new GuardrailError('META_APPROVAL_INVALID', verification.reason ?? 'Invalid approval token');
    assertWritesAvailable(context.config);
    const data = await context.meta.post(path, payload, { write: true });
    return { ok: true, dryRun: false, data: { payload, meta: data, approvalTokenHash: hashToken(String(record.approvalToken)) } };
  }) };
  return tool;
}

export const TOOLS: ToolDef[] = [
  readTool('meta_health_check', 'Use when verifying configuration, allowlist, write mode, and MCP readiness without changing Meta.', AccountInputSchema, async (input, context) => { ensureRead(input, context); return { ok: true, dryRun: true, data: { mode: context.config.mode, writesEnabled: context.config.writesEnabled, hasWriteToken: Boolean(context.config.writeToken), allowlist: context.config.adAccountAllowlist } }; }),
  edgeTool('meta_list_ad_accounts', '', 'Use when reading the configured allowlisted ad account summary.'),
  edgeTool('meta_get_account_summary', '', 'Use when reading account-level metadata and currency/timezone.'),
  edgeTool('meta_list_campaigns', 'campaigns', 'Use when listing campaigns for an allowlisted account.'),
  edgeTool('meta_list_adsets', 'adsets', 'Use when listing ad sets for an allowlisted account.'),
  edgeTool('meta_list_ads', 'ads', 'Use when listing ads for an allowlisted account.'),
  edgeTool('meta_list_creatives', 'adcreatives', 'Use when listing creatives for an allowlisted account.'),
  readTool('meta_get_insights', 'Use when reading Meta Ads insights by date range and level.', InsightsInputSchema, async (input, context) => { const account = ensureRead(input, context); const data = await context.meta.get(`${account}/insights`, { fields: input.fields.join(','), level: input.level, time_range: JSON.stringify(input.dateRange), limit: input.limit }); return { ok: true, dryRun: true, data }; }),
  readTool('meta_compare_periods', 'Use when comparing current vs previous Meta Ads performance.', CompareInputSchema, async (input, context) => { const account = ensureRead(input, context); const fields = 'spend,impressions,clicks,ctr,cpc,actions,purchase_roas'; const [current, previous] = await Promise.all([context.meta.get(`${account}/insights`, { fields, level: input.level, time_range: JSON.stringify(input.current) }), context.meta.get(`${account}/insights`, { fields, level: input.level, time_range: JSON.stringify(input.previous) })]); return { ok: true, dryRun: true, data: { current, previous } }; }),
  ...['meta_audit_campaigns', 'meta_audit_tracking', 'meta_audit_naming', 'meta_detect_high_spend_low_result'].map((name) => readTool(name, `Use when running read-only Growth diagnostic ${name}.`, AuditInputSchema, async (input, context) => { const account = ensureRead(input, context); const campaigns = await context.meta.get(`${account}/campaigns`, { fields: fieldsFor('campaigns'), limit: 100 }); return { ok: true, dryRun: true, data: { campaigns, checks: ['naming', 'tracking', 'spend_efficiency'], thresholds: { highSpendCop: input.highSpendCop, maxCostPerResultCop: input.maxCostPerResultCop } } }; })),
  ...['meta_generate_campaign_plan', 'meta_validate_campaign_plan', 'meta_prepare_campaign_draft', 'meta_export_campaign_draft', 'meta_estimate_budget_risk', 'meta_validate_tracking_and_utm', 'meta_validate_policy_risk'].map(draftTool),
  writeTool('meta_create_campaign', 'Create a campaign, always PAUSED, after approval.', CreateCampaignSchema, 'operator', (input) => ({ path: `${input.adAccountId}/campaigns`, payload: forcePaused({ name: input.name, objective: input.objective, special_ad_categories: input.specialAdCategories, daily_budget: input.dailyBudgetCop, lifetime_budget: input.campaignBudgetCop }), budget: input })),
  writeTool('meta_create_adset', 'Create an ad set, always PAUSED, after approval.', CreateAdsetSchema, 'operator', (input) => ({ path: `${input.adAccountId}/adsets`, payload: forcePaused({ campaign_id: input.campaignId, name: input.name, optimization_goal: input.optimizationGoal, billing_event: input.billingEvent, daily_budget: input.dailyBudgetCop, targeting: input.targeting }), budget: input })),
  writeTool('meta_create_ad', 'Create an ad, always PAUSED, after approval.', CreateAdSchema, 'operator', (input) => ({ path: `${input.adAccountId}/ads`, payload: forcePaused({ adset_id: input.adsetId, name: input.name, creative: input.creative }) })),
  writeTool('meta_update_budget', 'Update campaign/ad set budget with caps and approval.', BudgetUpdateSchema, 'operator', (input) => ({ path: input.entityId, payload: { daily_budget: input.dailyBudgetCop, lifetime_budget: input.campaignBudgetCop }, budget: input })),
  writeTool('meta_pause_entity', 'Pause a campaign/ad set/ad after approval.', StatusUpdateSchema, 'operator', (input) => ({ path: input.entityId, payload: { status: 'PAUSED' } })),
  writeTool('meta_update_status_to_paused', 'Force status PAUSED after approval.', StatusUpdateSchema, 'operator', (input) => ({ path: input.entityId, payload: { status: 'PAUSED' } })),
  writeTool('meta_activate_entity', 'Activate only with admin role, approval, live mode, and recent health check.', StatusUpdateSchema, 'admin', (input) => { if (!input.latestHealthCheckAt) throw new GuardrailError('META_HEALTH_CHECK_REQUIRED', 'Activation requires latestHealthCheckAt'); return { path: input.entityId, payload: { status: 'ACTIVE' } }; }),
  readTool('meta_advantage_capabilities', 'Use when checking supported Meta AI / Advantage controls.', AccountInputSchema, async (input, context) => { ensureRead(input, context); return { ok: true, dryRun: true, data: { supported: ['advantage_audience', 'advantage_placements', 'dynamic_creative', 'creative_enhancements'], defaults: { status: 'PAUSED', creativeEnhancements: false } } }; }),
  ...['meta_ai_readiness_check', 'meta_audit_advantage_settings', 'meta_generate_advantage_plan', 'meta_create_advantage_leads_campaign', 'meta_create_dynamic_creative_test', 'meta_toggle_creative_features', 'meta_compare_advantage_vs_manual'].map((name) => {
    const tool: ToolDef = { name, description: `Use when evaluating Meta AI / Advantage safely: ${name}.`, inputSchema: AdvantagePlanSchema, outputSchema: ToolOutputSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }, handler: (input, context) => runGuarded(tool, input, context, async () => { assertRole(input.role, name.includes('create') || name.includes('toggle') ? 'operator' : 'draft'); assertAccountAllowed(context.config, input.adAccountId); assertBudgetCaps(context.config, input); assertLandingDomain(context.config, input.destinationUrl); if (input.useDynamicCreative && (input.approvedAssets.length === 0 || input.approvedCopies.length === 0)) throw new GuardrailError('META_ADVANTAGE_ASSETS_REQUIRED', 'Dynamic creative requires approved assets and copies'); return { ok: true, dryRun: true, warnings: input.allowCreativeEnhancements ? ['Creative enhancements enabled only for approved experiment.'] : [], data: { experimentName: input.experimentName, automations: ['audience', 'placements', 'creative combinations', 'budget delivery'], plan: campaignPlan(input), snapshotsRequired: ['before', 'after'], status: 'PAUSED' } }; }) };
    return tool;
  }),
];
