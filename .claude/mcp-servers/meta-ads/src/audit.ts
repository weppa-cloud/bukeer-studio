import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { hashToken } from './approval.js';
import { sanitizeSecrets } from './config.js';
import type { AuditEvent, AuditLogger, MetaAdsConfig } from './types.js';

export class JsonlAuditLogger implements AuditLogger {
  constructor(private readonly config: Pick<MetaAdsConfig, 'auditDir'>) {}

  async log(event: AuditEvent): Promise<void> {
    const sanitized = sanitizeAuditEvent({ ...event, timestamp: event.timestamp ?? new Date().toISOString() });
    const file = path.join(this.config.auditDir, `${sanitized.timestamp?.slice(0, 10)}.jsonl`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, `${JSON.stringify(sanitized)}\n`, 'utf8');
  }
}

export class CompositeAuditLogger implements AuditLogger {
  private readonly local: JsonlAuditLogger;
  private readonly supabase?: SupabaseClient;

  constructor(private readonly config: MetaAdsConfig) {
    this.local = new JsonlAuditLogger(config);
    if (config.supabaseUrl && config.supabaseServiceRoleKey) {
      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false } });
    }
  }

  async log(event: AuditEvent): Promise<void> {
    await this.local.log(event);
    if (!this.supabase) return;
    try {
      const e = sanitizeAuditEvent(event);
      await this.supabase.from('meta_ads_mcp_audit_log').insert({
        timestamp: e.timestamp ?? new Date().toISOString(),
        actor: e.actor,
        tool: e.tool,
        role: e.role,
        account_id: e.accountId,
        input: e.input,
        diff: e.diff,
        dry_run: e.dryRun,
        approval_token_hash: e.approvalTokenHash,
        meta_response: e.metaResponse,
        error_category: e.errorCategory,
        result_id: e.resultId,
        outcome: e.outcome,
        duration_ms: e.durationMs,
      });
    } catch {
      await this.local.log({ tool: 'audit_supabase_fallback', outcome: 'error', errorCategory: 'SUPABASE_AUDIT_FAILED' });
    }
  }
}

export function sanitizeAuditEvent(event: AuditEvent): AuditEvent {
  return sanitizeSecrets({
    ...event,
    approvalTokenHash: event.approvalTokenHash ? hashToken(event.approvalTokenHash) : undefined,
  }) as AuditEvent;
}
