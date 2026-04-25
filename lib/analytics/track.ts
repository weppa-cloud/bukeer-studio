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
    fbq?: (...args: unknown[]) => void;
    BukeerAnalytics?: {
      load?: () => void;
      loaded?: boolean;
      loaders?: Array<() => void>;
    };
  }
}

/** Event payload — flexible shape for per-CTA context (product id/type, tenant, etc.). */
export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Well-known event names — extend as new CTAs are wired.
 *
 * editorial-v1 template events (payload shapes documented below):
 *  - `destination_card_click`   { destination_id | destinationSlug, region?, surface? | source? }
 *  - `package_card_click`       { packageId, slug, source? }
 *  - `activity_card_click`      { activitySlug, source? }                   (reserved)
 *  - `hotel_card_click`         { hotelSlug, source? }                      (reserved)
 *  - `itinerary_day_toggle`     { packageSlug, dayNumber, opened }          (reserved)
 *  - `pricing_tier_select`      { packageSlug, tierKey }
 *  - `region_filter_change`     { region, destinationId? }
 *  - `explore_map_pin_click`    (merged into destination_card_click w/ surface='pin')
 *  - `hero_search_submit`       { destino, from, to, pax }                  (reserved)
 *  - `waflow_open`              { variant }
 *  - `waflow_step_next`         { variant, from, to }
 *  - `waflow_submit`            { variant }
 *  - `matchmaker_submit`        { group, region, style }                    (reserved)
 *  - `currency_switch`          { from, to, surface? }                      (surface: 'header' | 'footer')
 *  - `locale_switch`            { from, to, surface? }                      (surface: 'header' | 'footer')
 *
 * Base catalogue (generic site) events retain the same shape across templates.
 * Adding a new event name: prefer listing it here before firing so the
 * `AnalyticsEventName` union keeps autocomplete useful.
 */
export type AnalyticsEventName =
  // Generic site
  | 'whatsapp_cta_click'
  | 'cal_booking_click'
  | 'quote_form_submit'
  | 'phone_cta_click'
  | 'email_cta_click'
  | 'map_marker_click'
  | 'gallery_open'
  | 'sticky_cta_click'
  // editorial-v1
  | 'destination_card_click'
  | 'package_card_click'
  | 'activity_card_click'
  | 'hotel_card_click'
  | 'itinerary_day_toggle'
  | 'pricing_tier_select'
  | 'region_filter_change'
  | 'explore_map_pin_click'
  | 'hero_search_submit'
  | 'waflow_open'
  | 'waflow_step_next'
  | 'waflow_submit'
  | 'matchmaker_submit'
  | 'currency_switch'
  | 'locale_switch'
  | (string & {}); // allow other strings without losing autocomplete on the known ones

const META_STANDARD_EVENTS: Partial<Record<string, 'Contact' | 'Lead' | 'Schedule'>> = {
  whatsapp_cta_click: 'Contact',
  phone_cta_click: 'Contact',
  email_cta_click: 'Contact',
  cal_booking_click: 'Schedule',
  quote_form_submit: 'Lead',
  waflow_submit: 'Lead',
  matchmaker_submit: 'Lead',
};

function sendAnalyticsEvent(
  name: AnalyticsEventName,
  params: Record<string, string | number | boolean>
): boolean {
  let sent = false;

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
    sent = true;
  } else if (Array.isArray(window.dataLayer)) {
    // Fallback to pushing a GTM-style event when gtag isn't exposed but dataLayer exists.
    window.dataLayer.push({ event: name, ...params });
    sent = true;
  }

  if (typeof window.fbq === 'function') {
    const standardEvent = META_STANDARD_EVENTS[name];
    if (standardEvent) {
      window.fbq('track', standardEvent, params);
    }
    window.fbq('trackCustom', name, params);
    sent = true;
  }

  return sent;
}

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

    let sent = sendAnalyticsEvent(name, cleaned);
    if (!sent && window.BukeerAnalytics?.load) {
      window.BukeerAnalytics.load();

      const retry = () => {
        if (sent) return;
        sent = sendAnalyticsEvent(name, cleaned);
      };

      window.setTimeout(retry, 0);
      window.setTimeout(retry, 350);
      window.setTimeout(retry, 1200);
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
