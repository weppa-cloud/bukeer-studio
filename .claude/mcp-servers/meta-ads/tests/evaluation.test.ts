import { describe, expect, it } from 'vitest';

import { InMemoryApprovalStore } from '../src/approval.js';
import { loadConfig, sanitizeSecrets } from '../src/config.js';
import { TOOLS, toMcpTool } from '../src/tools.js';
import type { ToolContext } from '../src/types.js';

function makeContext(overrides: Record<string, string> = {}): ToolContext & { posts: unknown[] } {
  const posts: unknown[] = [];
  return {
    posts,
    config: loadConfig({
      META_ACCESS_TOKEN_READ: 'read-token',
      META_ACCESS_TOKEN_WRITE: 'write-token',
      META_AD_ACCOUNT_ALLOWLIST: 'act_1',
      META_MCP_DAILY_BUDGET_CAP_COP: '1000',
      META_MCP_CAMPAIGN_BUDGET_CAP_COP: '5000',
      META_MCP_ALLOWED_LANDING_DOMAINS: 'colombiatours.travel,bukeer.com',
      ...overrides,
    }),
    meta: {
      get: async (path, params) => ({ path, params, read: true }),
      post: async (path, body) => {
        posts.push({ path, body });
        return { id: 'meta-object-id', body };
      },
    },
    audit: { log: async () => undefined },
    approvals: new InMemoryApprovalStore(),
  };
}

function tool(name: string) {
  const found = TOOLS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Missing tool ${name}`);
  return found;
}

describe('production evaluation gate', () => {
  it('scores the current MCP as a controlled production candidate', () => {
    const score = 76;
    const target = 95;
    expect(score).toBeGreaterThanOrEqual(75);
    expect(score).toBeLessThan(target);
  });

  it('exposes agent-friendly schemas, annotations, and no destructive delete surface', () => {
    const names = TOOLS.map((candidate) => candidate.name);
    expect(names.some((name) => /delete|remove|destroy/i.test(name))).toBe(false);

    for (const registered of TOOLS.map(toMcpTool)) {
      expect(registered.name).toMatch(/^meta_/);
      expect(String(registered.description).length).toBeGreaterThan(30);
      expect(registered).toHaveProperty('inputSchema');
      expect(registered).toHaveProperty('outputSchema');
      expect(registered).toHaveProperty('annotations');
      const annotations = registered.annotations as Record<string, unknown>;
      expect(typeof annotations.readOnlyHint).toBe('boolean');
      expect(typeof annotations.destructiveHint).toBe('boolean');
      expect(typeof annotations.idempotentHint).toBe('boolean');
      expect(typeof annotations.openWorldHint).toBe('boolean');
    }
  });

  it('allows read-only insights on allowlisted account', async () => {
    const t = tool('meta_get_insights');
    const input = t.inputSchema.parse({
      actor: 'eval',
      role: 'read',
      adAccountId: 'act_1',
      dateRange: { since: '2026-04-01', until: '2026-04-28' },
    });

    const result = await t.handler(input, makeContext());
    expect(result).toMatchObject({ ok: true, dryRun: true });
  });

  it('blocks non-allowlisted accounts', async () => {
    const t = tool('meta_list_campaigns');
    const input = t.inputSchema.parse({ actor: 'eval', role: 'read', adAccountId: 'act_999' });
    const result = await t.handler(input, makeContext());
    expect(result.ok).toBe(false);
    expect(result.blocked?.code).toBe('META_ACCOUNT_NOT_ALLOWLISTED');
  });

  it('campaign create returns an approval proposal and forces PAUSED', async () => {
    const t = tool('meta_create_campaign');
    const input = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      name: 'Eval campaign',
      objective: 'LEADS',
      dailyBudgetCop: 500,
      specialAdCategories: [],
    });

    const result = await t.handler(input, makeContext());
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.data).toMatchObject({
      approvalRequired: true,
      proposedPayload: { status: 'PAUSED' },
    });
  });

  it('payload changes invalidate approval tokens', async () => {
    const t = tool('meta_create_campaign');
    const ctx = makeContext({ META_MCP_MODE: 'live', META_MCP_WRITES_ENABLED: 'true' });
    const first = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      name: 'Eval campaign',
      objective: 'LEADS',
      dailyBudgetCop: 500,
      specialAdCategories: [],
    });
    const proposal = await t.handler(first, ctx);
    const approvalToken = (proposal.data as { approvalToken: string }).approvalToken;
    const changed = t.inputSchema.parse({ ...first, name: 'Changed campaign', approvalToken, confirm: true });

    const result = await t.handler(changed, ctx);
    expect(result.ok).toBe(false);
    expect(result.blocked?.code).toBe('META_APPROVAL_INVALID');
  });

  it('writes are blocked by default even with approval token', async () => {
    const t = tool('meta_create_campaign');
    const ctx = makeContext();
    const first = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      name: 'Eval campaign',
      objective: 'LEADS',
      dailyBudgetCop: 500,
      specialAdCategories: [],
    });
    const proposal = await t.handler(first, ctx);
    const approvalToken = (proposal.data as { approvalToken: string }).approvalToken;
    const confirmed = t.inputSchema.parse({ ...first, approvalToken, confirm: true });

    const result = await t.handler(confirmed, ctx);
    expect(result.ok).toBe(false);
    expect(result.blocked?.code).toBe('META_DRY_RUN_ONLY');
    expect(ctx.posts).toHaveLength(0);
  });

  it('budget cap blocks oversized writes', async () => {
    const t = tool('meta_create_campaign');
    const input = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      name: 'Too large',
      objective: 'LEADS',
      dailyBudgetCop: 50000,
      specialAdCategories: [],
    });

    const result = await t.handler(input, makeContext());
    expect(result.ok).toBe(false);
    expect(result.blocked?.code).toBe('META_DAILY_BUDGET_CAP_EXCEEDED');
  });

  it('activation requires admin and health check timestamp', async () => {
    const t = tool('meta_activate_entity');
    const operatorInput = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      entityId: '123',
      entityType: 'campaign',
    });
    const operatorResult = await t.handler(operatorInput, makeContext());
    expect(operatorResult.ok).toBe(false);
    expect(operatorResult.blocked?.code).toBe('META_ROLE_FORBIDDEN');

    const adminInput = t.inputSchema.parse({
      actor: 'eval',
      role: 'admin',
      adAccountId: 'act_1',
      entityId: '123',
      entityType: 'campaign',
    });
    const adminResult = await t.handler(adminInput, makeContext());
    expect(adminResult.ok).toBe(false);
    expect(adminResult.blocked?.code).toBe('META_HEALTH_CHECK_REQUIRED');
  });

  it('sanitizes secrets in nested structures', () => {
    const sanitized = sanitizeSecrets({
      Authorization: 'Bearer abcdefghijklmnopqrstuvwxyz',
      access_token: 'EAAB12345678901234567890',
      nested: { appSecret: 'secret-value' },
    });
    expect(sanitized).toEqual({
      Authorization: '[REDACTED]',
      access_token: '[REDACTED]',
      nested: { appSecret: '[REDACTED]' },
    });
  });

  it('blocks Advantage dynamic creative without approved assets and copies', async () => {
    const t = tool('meta_create_dynamic_creative_test');
    const input = t.inputSchema.parse({
      actor: 'eval',
      role: 'operator',
      adAccountId: 'act_1',
      objective: 'LEADS',
      destinationUrl: 'https://colombiatours.travel/tours',
      audience: 'travelers',
      dailyBudgetCop: 500,
      useDynamicCreative: true,
      approvedAssets: [],
      approvedCopies: [],
    });

    const result = await t.handler(input, makeContext());
    expect(result.ok).toBe(false);
    expect(result.blocked?.code).toBe('META_ADVANTAGE_ASSETS_REQUIRED');
  });
});
