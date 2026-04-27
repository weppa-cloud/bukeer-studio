import { sha256Hex } from '@/lib/meta/conversions-api';
import type { FunnelEventName } from '@bukeer/website-contract';

/**
 * Growth event_id contract — SPEC #337 (ADR-018)
 *
 * event_id = lowercase(sha256(reference_code + ':' + event_name + ':' + occurred_at_s))
 *
 * `occurred_at_s` is the unix epoch in seconds (millis truncated). Truncating
 * to seconds keeps browser pixel and server CAPI/Events API aligned even when
 * their wall clocks differ by sub-second amounts.
 *
 * The same event_id MUST be sent from browser pixel and server CAPI/Events API
 * for dedupe via meta_conversion_events (provider, event_name, event_id).
 */

export interface EventIdInput {
  reference_code: string;
  event_name: FunnelEventName;
  occurred_at: Date | string | number;
}

function toEpochSeconds(occurred_at: Date | string | number): number {
  if (occurred_at instanceof Date) return Math.floor(occurred_at.getTime() / 1000);
  if (typeof occurred_at === 'number') return Math.floor(occurred_at / (occurred_at > 1e12 ? 1000 : 1));
  const d = new Date(occurred_at);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`event-id: invalid occurred_at "${occurred_at}"`);
  }
  return Math.floor(d.getTime() / 1000);
}

export async function buildEventId(input: EventIdInput): Promise<string> {
  if (!input.reference_code || input.reference_code.length < 8) {
    throw new Error('event-id: reference_code must be at least 8 chars');
  }
  const seconds = toEpochSeconds(input.occurred_at);
  const payload = `${input.reference_code}:${input.event_name}:${seconds}`;
  return (await sha256Hex(payload)).toLowerCase();
}

export function isValidEventId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
