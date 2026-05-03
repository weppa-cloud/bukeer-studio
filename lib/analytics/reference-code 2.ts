/**
 * Stable browser-side `reference_code` for SPEC #337 funnel events.
 *
 * The reference_code is the dedupe key behind every funnel event:
 *   event_id = sha256(reference_code + ':' + event_name + ':' + occurred_at_s)
 *
 * Lifetime: a single browsing session. We persist in `localStorage` (24h TTL)
 * so a reload or in-tab navigation keeps the same id, which lets the server
 * dedupe Beacon + onClick double-fires. We do NOT set a long-lived cookie —
 * privacy by default (see docs/ops/growth-attribution-governance.md).
 *
 * Format: `WEB-XXXXXXXXXX` (alpha-numeric, length 14). Compatible with the
 * WAFlow `makeWaflowRef()` shape so a session that started in WAFlow and
 * later clicks a non-WAFlow CTA still attributes to the same reference_code
 * (the WAFlow drawer mints/reads this same key when integrated).
 */

const STORAGE_KEY = 'bukeer:growth:reference-code';
const TTL_MS = 24 * 60 * 60 * 1000;

interface StoredEntry {
  code: string;
  createdAt: number;
}

function readStored(): StoredEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredEntry>;
    if (!parsed.code || typeof parsed.code !== 'string') return null;
    if (typeof parsed.createdAt !== 'number') return null;
    if (Date.now() - parsed.createdAt > TTL_MS) return null;
    return { code: parsed.code, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

function writeStored(entry: StoredEntry): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be disabled (Safari private mode, quota). Swallow.
  }
}

function mintReferenceCode(): string {
  // 10 random alphanumeric chars (uppercase) → 14-char prefixed id.
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';

  if (typeof globalThis !== 'undefined') {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.getRandomValues) {
      const buf = new Uint8Array(10);
      c.getRandomValues(buf);
      for (let i = 0; i < buf.length; i += 1) {
        suffix += ALPHABET[buf[i] % ALPHABET.length];
      }
      return `WEB-${suffix}`;
    }
  }

  // Fallback (very rarely hit) — Math.random is fine for an attribution id.
  for (let i = 0; i < 10; i += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `WEB-${suffix}`;
}

/**
 * Get the active reference_code, minting and persisting a new one when none
 * exists or the TTL elapsed. SSR-safe (returns null on the server).
 */
export function getOrCreateReferenceCode(): string | null {
  if (typeof window === 'undefined') return null;

  const existing = readStored();
  if (existing) return existing.code;

  const code = mintReferenceCode();
  writeStored({ code, createdAt: Date.now() });
  return code;
}

/**
 * Read the active reference_code without minting a new one. Used when the
 * caller wants to *attach* a beacon to an existing session but should
 * gracefully no-op when there is none (e.g. server-side, very first paint).
 */
export function readReferenceCode(): string | null {
  return readStored()?.code ?? null;
}
