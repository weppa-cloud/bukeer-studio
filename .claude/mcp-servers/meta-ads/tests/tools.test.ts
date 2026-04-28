import { describe, expect, it } from 'vitest';

import { InMemoryApprovalStore } from '../src/approval.js';
import { loadConfig } from '../src/config.js';
import { TOOLS, toMcpTool } from '../src/tools.js';
import type { ToolContext } from '../src/types.js';

function context(): ToolContext {
  return {
    config: loadConfig({
      META_ACCESS_TOKEN_READ: 'read',
      META_ACCESS_TOKEN_WRITE: 'write',
      META_AD_ACCOUNT_ALLOWLIST: 'act_1',
      META_MCP_DAILY_BUDGET_CAP_COP: '1000',
      META_MCP_ALLOWED_LANDING_DOMAINS: 'colombiatours.travel',
    }),
    meta: {
      get: async (_path, params) => ({ data: [], params }),
      post: async (_path, body) => ({ id: 'new-id', body }),
    },
    audit: { log: async () => undefined },
    approvals: new InMemoryApprovalStore(),
  };
}

describe('tools', () => {
  it('exposes first-party Meta Ads tools with annotations and no deletes', () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(names).toContain('meta_get_insights');
    expect(names).toContain('meta_create_campaign');
    expect(names).toContain('meta_advantage_capabilities');
    expect(names.some((name) => name.includes('delete'))).toBe(false);

    for (const tool of TOOLS.map(toMcpTool)) {
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('outputSchema');
      expect(tool).toHaveProperty('annotations');
    }
  });

  it('read-only tools call the injected client', async () => {
    const tool = TOOLS.find((candidate) => candidate.name === 'meta_get_insights');
    const input = tool!.inputSchema.parse({
        actor: 'codex',
        role: 'read',
        adAccountId: 'act_1',
        dateRange: { since: '2026-04-01', until: '2026-04-28' },
      });
    const output = await tool!.handler(input, context());

    expect(output.ok).toBe(true);
    expect(output.dryRun).toBe(true);
  });

  it('controlled writes default to dry-run and force PAUSED', async () => {
    const tool = TOOLS.find((candidate) => candidate.name === 'meta_create_campaign');
    const input = tool!.inputSchema.parse({
        actor: 'codex',
        role: 'operator',
        adAccountId: 'act_1',
        name: 'Test',
        objective: 'LEADS',
        confirm: false,
        specialAdCategories: [],
      });
    const output = await tool!.handler(input, context());

    expect(output.ok).toBe(true);
    expect(output.dryRun).toBe(true);
    expect(output.data).toMatchObject({ proposedPayload: { status: 'PAUSED' } });
  });
});
