import { isAccountAllowed, normalizeAdAccountId } from './config.js';
import type { MetaAdsConfig, MetaMcpRole } from './types.js';

export class GuardrailError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'GuardrailError';
  }
}

const RoleRank: Record<MetaMcpRole, number> = { read: 1, draft: 2, operator: 3, admin: 4 };

export function assertRole(role: MetaMcpRole, required: MetaMcpRole): void {
  if (RoleRank[role] < RoleRank[required]) {
    throw new GuardrailError('META_ROLE_FORBIDDEN', `Role ${role} cannot perform ${required} actions`);
  }
}

export function assertAccountAllowed(config: MetaAdsConfig, accountId: string): string {
  const normalized = normalizeAdAccountId(accountId);
  if (!isAccountAllowed(config, normalized)) {
    throw new GuardrailError('META_ACCOUNT_NOT_ALLOWLISTED', `Ad account ${normalized} is not allowlisted`);
  }
  return normalized;
}

export function assertWritesAvailable(config: MetaAdsConfig): void {
  if (config.mode !== 'live') throw new GuardrailError('META_DRY_RUN_ONLY', 'Writes are blocked because META_MCP_MODE is not live');
  if (!config.writesEnabled) throw new GuardrailError('META_WRITES_DISABLED', 'Writes are blocked by META_MCP_WRITES_ENABLED=false');
}

export function assertBudgetCaps(config: MetaAdsConfig, input: { dailyBudgetCop?: number; campaignBudgetCop?: number }): void {
  if (config.dailyBudgetCapCop && input.dailyBudgetCop && input.dailyBudgetCop > config.dailyBudgetCapCop) {
    throw new GuardrailError('META_DAILY_BUDGET_CAP_EXCEEDED', 'Daily budget exceeds configured cap', {
      cap: config.dailyBudgetCapCop,
      requested: input.dailyBudgetCop,
    });
  }
  if (config.campaignBudgetCapCop && input.campaignBudgetCop && input.campaignBudgetCop > config.campaignBudgetCapCop) {
    throw new GuardrailError('META_CAMPAIGN_BUDGET_CAP_EXCEEDED', 'Campaign budget exceeds configured cap', {
      cap: config.campaignBudgetCapCop,
      requested: input.campaignBudgetCop,
    });
  }
}

export function assertLandingDomain(config: MetaAdsConfig, url: string | undefined): void {
  if (!url || config.allowedLandingDomains.length === 0) return;
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const ok = config.allowedLandingDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (!ok) throw new GuardrailError('META_LANDING_DOMAIN_BLOCKED', `Landing domain ${hostname} is not allowlisted`);
}

export function forcePaused<T extends Record<string, unknown>>(payload: T): T & { status: 'PAUSED' } {
  return { ...payload, status: 'PAUSED' };
}
