/**
 * lib/funnel/event-id — F1 (#420) helpers
 *
 * Two distinct id concepts coexist in the funnel_events SOT (per ADR-029
 * §"Implementation reality check"):
 *
 *   1. event_id (PK):   sha256(reference_code:event_name:occurred_at_s).
 *                       Stable, deterministic, deduplicates writers.
 *                       Re-exported here from lib/growth/event-id for
 *                       discoverability under the new lib/funnel namespace.
 *
 *   2. pixel_event_id:  UUIDv4. Browser-paired id used for Pixel↔CAPI dedup.
 *                       Browser mints it for `fbq('track', ..., {eventID})`;
 *                       server forwards the SAME id to Meta CAPI as the
 *                       `event_id` field. The dispatcher reads
 *                       funnel_events.pixel_event_id (NOT event_id) when
 *                       building Meta payloads.
 *
 * Edge-first (ADR-007): no Node `crypto`. Web Crypto where available; fall
 * back to a Math.random-seeded UUIDv4 polyfill for environments without
 * crypto.randomUUID (legacy Edge runtimes).
 */

export {
  buildEventId,
  isValidEventId,
  type EventIdInput,
} from '@/lib/growth/event-id';

/**
 * Mint a UUIDv4 for use as funnel_events.pixel_event_id when a browser-side
 * id is unavailable (e.g. Chatwoot webhook, Flutter CRM RPC, db_trigger).
 *
 * Format: 8-4-4-4-12 lowercase hex with the canonical UUIDv4 variant +
 * version bits set. Suitable to send to Meta CAPI as the `event_id` field.
 */
export function mintPixelEventId(): string {
  // Prefer the platform implementation when available (Node 19+, modern
  // browsers, Cloudflare Workers, Supabase Edge Functions).
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  // Fallback for older runtimes — uses crypto.getRandomValues if present,
  // else Math.random (acceptable: this id is not used for security, only
  // dedup, and fallback is a defensive last resort).
  const bytes = new Uint8Array(16);
  if (c && typeof (c as { getRandomValues?: (a: Uint8Array) => Uint8Array }).getRandomValues === 'function') {
    (c as { getRandomValues: (a: Uint8Array) => Uint8Array }).getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Per RFC 4122 §4.4: set version (4) and variant (10) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

const PIXEL_EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * UUID-format check used for guarding pixel_event_id values entering the
 * funnel_events writer. Accepts any RFC 4122 v1-v8 (we mint v4).
 */
export function isValidPixelEventId(value: string): boolean {
  return PIXEL_EVENT_ID_PATTERN.test(value);
}
