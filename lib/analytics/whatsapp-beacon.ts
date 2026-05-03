/**
 * Client-side beacon for the `whatsapp_cta_click` funnel event (SPEC #337).
 *
 * Fired from any WhatsApp CTA BEFORE the wa.me redirect — ensures the server
 * has a deterministic record of the click for funnel attribution and Meta
 * CAPI dedupe, even when third-party pixels are blocked.
 *
 * Strategy:
 *   - Uses `navigator.sendBeacon()` so the request survives the page
 *     navigation that immediately follows the click. Falls back to
 *     `fetch(..., { keepalive: true })` when sendBeacon is unavailable.
 *   - Fire-and-forget: never awaits, never throws — analytics must never
 *     block a user action.
 *   - The endpoint is first-party (`/api/growth/events/whatsapp-cta`) so this
 *     is independent of GA4/GTM/Meta consent — STRICT_ADS_ZERO=1 unaffected.
 *
 * @see app/api/growth/events/whatsapp-cta/route.ts
 * @see lib/growth/event-id.ts
 */

import { getOrCreateReferenceCode } from './reference-code';

export interface WhatsAppBeaconPayload {
  /** Stable per-session id. Auto-derived from cookie/storage when omitted. */
  reference_code?: string | null;
  /** Hero, sticky, sidebar, waflow_submit, waflow_quick_skip, ... */
  location_context?: string | null;
  variant?: string | null;
  destination_slug?: string | null;
  package_slug?: string | null;
  /** Pixel/CAPI dedupe id for Meta Contact. */
  contact_event_id?: string | null;
  /** Locale string (BCP-47), e.g. "es-CO". Defaults to es-CO server-side. */
  locale?: string | null;
  market?: 'CO' | 'MX' | 'US' | 'CA' | 'EU' | 'OTHER' | null;
  /** Override subdomain (defaults to host's first label). */
  subdomain?: string | null;
}

const ENDPOINT = '/api/growth/events/whatsapp-cta';

function deriveSubdomainFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  const parts = host.split('.');
  if (parts.length < 3) return null; // e.g. "example.com" → no subdomain
  return parts[0];
}

function isJsonAcceptable(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.sendBeacon === 'function' || typeof fetch === 'function';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildFbcFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (!fbclid) return null;
  return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
}

/**
 * Fire the WhatsApp CTA server beacon. Non-blocking. Safe to call before
 * `window.location.href = wa.me/...` or `window.open(wa.me/...)`.
 */
export function sendWhatsAppCtaBeacon(payload: WhatsAppBeaconPayload = {}): void {
  if (typeof window === 'undefined') return;
  if (!isJsonAcceptable()) return;

  try {
    const referenceCode =
      (payload.reference_code && payload.reference_code.trim()) ||
      getOrCreateReferenceCode();
    if (!referenceCode || referenceCode.length < 8) return;

    const body = {
      reference_code: referenceCode,
      source_url: window.location.href,
      page_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      subdomain: payload.subdomain ?? deriveSubdomainFromHost(),
      locale: payload.locale ?? document.documentElement.lang ?? null,
      market: payload.market ?? null,
      location_context: payload.location_context ?? null,
      variant: payload.variant ?? null,
      destination_slug: payload.destination_slug ?? null,
      package_slug: payload.package_slug ?? null,
      contact_event_id: payload.contact_event_id ?? null,
      fbp: readCookie('_fbp'),
      fbc: readCookie('_fbc') ?? buildFbcFromUrl(),
      occurred_at: new Date().toISOString(),
    };

    const json = JSON.stringify(body);

    if (typeof navigator.sendBeacon === 'function') {
      // sendBeacon defaults to text/plain; the route handler uses
      // request.json() which accepts any content-type as long as the body is
      // valid JSON. We pass a Blob with explicit type for clarity.
      const blob = new Blob([json], { type: 'application/json' });
      const queued = navigator.sendBeacon(ENDPOINT, blob);
      if (queued) return;
      // Fall through to fetch keepalive when the UA refused (e.g. quota).
    }

    // Fallback: fetch with keepalive so the request survives navigation.
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined);
  } catch {
    // Never let analytics break a user action.
  }
}
