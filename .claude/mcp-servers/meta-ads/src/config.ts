import { z } from 'zod';

import type { MetaAdsConfig } from './types.js';

const EnvSchema = z.object({
  META_API_VERSION: z.string().default('v23.0'),
  META_ACCESS_TOKEN_READ: z.string().min(1).optional(),
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  META_ACCESS_TOKEN_WRITE: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  META_BUSINESS_ID: z.string().min(1).optional(),
  META_AD_ACCOUNT_ALLOWLIST: z.string().min(1),
  META_MCP_MODE: z.enum(['dry-run', 'live']).default('dry-run'),
  META_MCP_WRITES_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  META_MCP_DAILY_BUDGET_CAP_COP: z.coerce.number().positive().optional(),
  META_MCP_CAMPAIGN_BUDGET_CAP_COP: z.coerce.number().positive().optional(),
  META_MCP_ALLOWED_LANDING_DOMAINS: z.string().default(''),
  META_MCP_AUDIT_DIR: z.string().default('.mcp-meta-ads/audit'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export function parseCsv(value: string | undefined): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function normalizeAdAccountId(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('act_') ? trimmed : `act_${trimmed}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MetaAdsConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid Meta Ads MCP configuration: ${details.join('; ')}`);
  }

  const readToken = parsed.data.META_ACCESS_TOKEN_READ ?? parsed.data.META_ACCESS_TOKEN;
  if (!readToken) throw new Error('Invalid Meta Ads MCP configuration: META_ACCESS_TOKEN_READ is required');

  return {
    metaApiVersion: parsed.data.META_API_VERSION,
    readToken,
    writeToken: parsed.data.META_ACCESS_TOKEN_WRITE,
    appSecret: parsed.data.META_APP_SECRET,
    businessId: parsed.data.META_BUSINESS_ID,
    adAccountAllowlist: parseCsv(parsed.data.META_AD_ACCOUNT_ALLOWLIST).map(normalizeAdAccountId),
    mode: parsed.data.META_MCP_MODE,
    writesEnabled: parsed.data.META_MCP_WRITES_ENABLED,
    dailyBudgetCapCop: parsed.data.META_MCP_DAILY_BUDGET_CAP_COP,
    campaignBudgetCapCop: parsed.data.META_MCP_CAMPAIGN_BUDGET_CAP_COP,
    allowedLandingDomains: parseCsv(parsed.data.META_MCP_ALLOWED_LANDING_DOMAINS).map((domain) => domain.toLowerCase()),
    auditDir: parsed.data.META_MCP_AUDIT_DIR,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function isAccountAllowed(config: Pick<MetaAdsConfig, 'adAccountAllowlist'>, accountId: string): boolean {
  return config.adAccountAllowlist.includes(normalizeAdAccountId(accountId));
}

export function getTokenForMode(config: MetaAdsConfig, write: boolean): string {
  if (!write) return config.readToken;
  if (!config.writeToken) throw new Error('Write token is not configured. Set META_ACCESS_TOKEN_WRITE.');
  return config.writeToken;
}

export function sanitizeSecrets(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g, 'Bearer [REDACTED]')
      .replace(/\b(EAA|EAAG|EAAB)[A-Za-z0-9]{12,}\b/g, '[REDACTED_META_TOKEN]')
      .replace(/\bgho_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]');
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeSecrets(item, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (/(authorization|token|secret|password|api[_-]?key|private[_-]?key)/i.test(key)) {
        return [key, '[REDACTED]'];
      }
      return [key, sanitizeSecrets(nested, seen)];
    }),
  );
}
