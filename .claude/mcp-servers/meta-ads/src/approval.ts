import crypto from 'node:crypto';

import type { ApprovalIssueInput, ApprovalStore, ApprovalToken, ApprovalVerification, ApprovalVerifyInput } from './types.js';

interface StoredApproval {
  actor: string;
  role: string;
  tool: string;
  payloadHash: string;
  expiresAtMs: number;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(',')}}`;
}

export function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly tokens = new Map<string, StoredApproval>();

  issue(input: ApprovalIssueInput): ApprovalToken {
    const token = crypto.randomBytes(24).toString('base64url');
    const payloadHash = hashPayload(input.payload);
    const expiresAtMs = Date.now() + (input.ttlSeconds ?? 900) * 1000;
    this.tokens.set(token, { actor: input.actor, role: input.role, tool: input.tool, payloadHash, expiresAtMs });
    return { approvalToken: token, payloadHash, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  verify(input: ApprovalVerifyInput): ApprovalVerification {
    if (input.confirm !== true) return { ok: false, reason: 'confirm=true is required' };
    const stored = this.tokens.get(input.token);
    if (!stored) return { ok: false, reason: 'approval token was not found' };
    if (stored.expiresAtMs < Date.now()) return { ok: false, reason: 'approval token expired' };
    if (stored.actor !== input.actor) return { ok: false, reason: 'approval actor mismatch' };
    if (stored.role !== input.role) return { ok: false, reason: 'approval role mismatch' };
    if (stored.tool !== input.tool) return { ok: false, reason: 'approval tool mismatch' };
    const payloadHash = hashPayload(input.payload);
    if (stored.payloadHash !== payloadHash) return { ok: false, reason: 'approval payload hash mismatch', payloadHash };
    return { ok: true, payloadHash };
  }
}
