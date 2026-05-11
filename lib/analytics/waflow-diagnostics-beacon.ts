/**
 * Client-side beacon for WAFlow diagnostic funnel events.
 *
 * These events are observation-only. They make WAFlow abandonment visible in
 * the first-party `funnel_events` ledger and GA4 Measurement Protocol, even
 * when third-party analytics are blocked or not loaded yet.
 */

import { getOrCreateReferenceCode } from './reference-code';

export type WaflowDiagnosticEventName =
  | 'waflow_open'
  | 'waflow_validation_error'
  | 'waflow_abandon';

export interface WaflowDiagnosticBeaconPayload {
  event_name: WaflowDiagnosticEventName;
  reference_code?: string | null;
  variant?: string | null;
  step?: string | null;
  reason?: string | null;
  fields?: string | null;
  destination_slug?: string | null;
  destination_name?: string | null;
  package_slug?: string | null;
  package_title?: string | null;
  has_phone?: boolean | null;
  has_name?: boolean | null;
  locale?: string | null;
  market?: 'CO' | 'MX' | 'US' | 'CA' | 'EU' | 'OTHER' | null;
  subdomain?: string | null;
}

const ENDPOINT = '/api/growth/events/waflow-diagnostic';

function deriveSubdomainFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  const parts = host.split('.');
  if (parts.length < 3) return null;
  return parts[0];
}

function canSendJson(): boolean {
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

export function sendWaflowDiagnosticBeacon(payload: WaflowDiagnosticBeaconPayload): void {
  if (typeof window === 'undefined') return;
  if (!canSendJson()) return;

  try {
    const referenceCode =
      (payload.reference_code && payload.reference_code.trim()) ||
      getOrCreateReferenceCode();
    if (!referenceCode || referenceCode.length < 8) return;

    const body = {
      event_name: payload.event_name,
      reference_code: referenceCode,
      source_url: window.location.href,
      page_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      subdomain: payload.subdomain ?? deriveSubdomainFromHost(),
      locale: payload.locale ?? document.documentElement.lang ?? null,
      market: payload.market ?? null,
      variant: payload.variant ?? null,
      step: payload.step ?? null,
      reason: payload.reason ?? null,
      fields: payload.fields ?? null,
      destination_slug: payload.destination_slug ?? null,
      destination_name: payload.destination_name ?? null,
      package_slug: payload.package_slug ?? null,
      package_title: payload.package_title ?? null,
      has_phone: payload.has_phone ?? null,
      has_name: payload.has_name ?? null,
      fbp: readCookie('_fbp'),
      fbc: readCookie('_fbc') ?? buildFbcFromUrl(),
      occurred_at: new Date().toISOString(),
    };

    const json = JSON.stringify(body);

    if (typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(
        ENDPOINT,
        new Blob([json], { type: 'application/json' }),
      );
      if (queued) return;
    }

    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined);
  } catch {
    // Never let diagnostics break the WAFlow interaction.
  }
}
