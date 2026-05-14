import { createHash } from 'node:crypto';
import type { SourceRef } from './types';

export function buildIdempotencyKey(input: {
  accountId: string;
  websiteId: string;
  profileId: string;
  windowStart: string;
  windowEnd: string;
  mode: string;
  sourceRefs?: SourceRef[];
}): string {
  const scopeHash = hashJson({ source_refs: input.sourceRefs ?? [] }).slice(0, 16);
  return [
    'growth-provider-runner',
    'v1',
    input.accountId,
    input.websiteId,
    input.profileId,
    input.windowStart,
    input.windowEnd,
    input.mode,
    scopeHash,
  ].join(':');
}

export function evidenceFingerprint(input: {
  accountId: string;
  websiteId: string;
  profileId: string;
  windowStart: string;
  windowEnd: string;
  sourceRefs: SourceRef[];
  rowCount?: number;
}): string {
  return hashJson({
    account_id: input.accountId,
    website_id: input.websiteId,
    profile_id: input.profileId,
    window: { start: input.windowStart, end: input.windowEnd },
    source_refs: input.sourceRefs,
    row_count: input.rowCount ?? 0,
  });
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}
