/**
 * Minimal analytics event helper for the public website.
 *
 * Strategy: emit a `gtag('event', ...)` call when GA4 / GTM is loaded on the
 * page (via `components/analytics/google-tag-manager.tsx`). When analytics
 * hasn't been wired (e.g. preview/dev), the call is a no-op and emits a
 * `[analytics.*]` console log in dev so CTAs can still be verified in QA.
 *
 * Safe to call from any component — SSR-safe (no-ops on the server),
 * never throws. All params optional so callers don't need defensive checks.
 *
 * Example:
 *   import { trackEvent } from '@/lib/analytics/track';
 *   onClick={() => trackEvent('whatsapp_cta_click', { product_id: '123' })}
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Event payload — flexible shape for per-CTA context (product id/type, tenant, etc.). */
export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

/** Well-known event names — extend as new CTAs are wired. */
export type AnalyticsEventName =
  | 'whatsapp_cta_click'
  | 'cal_booking_click'
  | 'quote_form_submit'
  | 'phone_cta_click'
  | 'email_cta_click'
  | 'map_marker_click'
  | 'gallery_open'
  | 'sticky_cta_click'
  | (string & {}); // allow other strings without losing autocomplete on the known ones

/**
 * Fire an analytics event.
 *
 * - On the server or in environments without gtag: no-op (plus dev console log).
 * - In the browser with gtag: dispatches via `window.gtag('event', name, params)`.
 * - Never throws; never blocks the caller (e.g. navigation after a CTA click).
 */
export function trackEvent(
  name: AnalyticsEventName,
  params: AnalyticsEventParams = {}
): void {
  try {
    if (typeof window === 'undefined') return;

    // Strip null/undefined keys so GA4 doesn't record "null"-valued dimensions.
    const cleaned: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      cleaned[key] = value;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, cleaned);
    } else if (Array.isArray(window.dataLayer)) {
      // Fallback to pushing a GTM-style event when gtag isn't exposed but dataLayer exists.
      window.dataLayer.push({ event: name, ...cleaned });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[analytics.${name}]`, cleaned);
    }
  } catch {
    // Never let analytics failure break a user action.
  }
}

/**
 * @deprecated Use `trackEvent` directly. Kept as a no-throw helper for callsites
 * that want a guaranteed-safe handler reference (e.g. onClick={safeTrack(...)}).
 */
export function safeTrack(name: AnalyticsEventName, params: AnalyticsEventParams = {}) {
  return () => trackEvent(name, params);
}
