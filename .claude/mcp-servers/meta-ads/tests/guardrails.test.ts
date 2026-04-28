import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { assertAccountAllowed, assertBudgetCaps, assertWritesAvailable, forcePaused } from '../src/guardrails.js';

describe('guardrails', () => {
  const config = loadConfig({ META_ACCESS_TOKEN_READ: 'read', META_AD_ACCOUNT_ALLOWLIST: 'act_1', META_MCP_DAILY_BUDGET_CAP_COP: '1000' });

  it('blocks non-allowlisted accounts', () => {
    expect(() => assertAccountAllowed(config, 'act_2')).toThrow(/not allowlisted/);
  });

  it('blocks writes by default', () => {
    expect(() => assertWritesAvailable(config)).toThrow(/not live/);
  });

  it('enforces budget caps', () => {
    expect(() => assertBudgetCaps(config, { dailyBudgetCop: 2000 })).toThrow(/Daily budget/);
  });

  it('forces paused status', () => {
    expect(forcePaused({ name: 'x', status: 'ACTIVE' })).toMatchObject({ status: 'PAUSED' });
  });
});
