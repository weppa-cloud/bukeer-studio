export type MetaMcpRole = 'read' | 'draft' | 'operator' | 'admin';
export type MetaMcpMode = 'dry-run' | 'live';
export type AuditOutcome = 'success' | 'blocked' | 'error';

export interface MetaAdsConfig {
  metaApiVersion: string;
  readToken: string;
  writeToken?: string;
  appSecret?: string;
  businessId?: string;
  adAccountAllowlist: string[];
  mode: MetaMcpMode;
  writesEnabled: boolean;
  dailyBudgetCapCop?: number;
  campaignBudgetCapCop?: number;
  allowedLandingDomains: string[];
  auditDir: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export interface MetaApiClient {
  get(path: string, params?: Record<string, unknown>): Promise<unknown>;
  post(path: string, body?: Record<string, unknown>, options?: { write?: boolean }): Promise<unknown>;
}

export interface AuditLogger {
  log(event: AuditEvent): Promise<void>;
}

export interface ApprovalStore {
  issue(input: ApprovalIssueInput): ApprovalToken;
  verify(input: ApprovalVerifyInput): ApprovalVerification;
}

export interface ToolContext {
  config: MetaAdsConfig;
  meta: MetaApiClient;
  audit: AuditLogger;
  approvals: ApprovalStore;
}

export interface ApprovalIssueInput {
  actor: string;
  role: MetaMcpRole;
  tool: string;
  payload: unknown;
  ttlSeconds?: number;
}

export interface ApprovalVerifyInput extends ApprovalIssueInput {
  token: string;
  confirm?: boolean;
}

export interface ApprovalToken {
  approvalToken: string;
  payloadHash: string;
  expiresAt: string;
}

export interface ApprovalVerification {
  ok: boolean;
  reason?: string;
  payloadHash?: string;
}

export interface AuditEvent {
  timestamp?: string;
  actor?: string;
  tool: string;
  role?: MetaMcpRole;
  accountId?: string;
  input?: unknown;
  diff?: unknown;
  dryRun?: boolean;
  approvalTokenHash?: string;
  metaResponse?: unknown;
  errorCategory?: string;
  resultId?: string;
  outcome: AuditOutcome;
  durationMs?: number;
}
