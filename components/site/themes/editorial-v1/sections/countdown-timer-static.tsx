/**
 * editorial-v1 Countdown Timer Static — server-safe urgency bar.
 *
 * Replaces the client-side `countdown_timer` section type with a static
 * urgency bar that carries zero client JavaScript. This trades a live
 * countdown for a Lighthouse-safe, instantly interactive component.
 *
 * Design: dark primary-colored horizontal bar
 *   Left:  calendar icon + urgency title from content.title
 *   Right: CTA button (ctaText → ctaUrl)
 *
 * When `targetDate` is provided and is in the past, we fall back to
 * `content.fallbackText`. If both are empty the section renders null.
 *
 * Content contract:
 *   title?:        string  — urgency message shown as static text
 *   ctaText?:      string  — CTA button label
 *   ctaUrl?:       string  — CTA href
 *   targetDate?:   string  — ISO date string (used only to detect expiry)
 *   fallbackText?: string  — text shown when targetDate is past
 *   mode?:         'departure' | 'offer'
 *
 * Server component. No `'use client'`. No countdown numbers.
 */

import type { ReactElement } from 'react';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { Icons } from '../primitives/icons';
import { localizeEditorialText } from '../i18n';

export interface EditorialCountdownTimerStaticProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface CountdownTimerContent {
  title?: string;
  ctaText?: string;
  ctaUrl?: string;
  targetDate?: string;
  fallbackText?: string;
  mode?: 'departure' | 'offer';
}

function isDatePast(iso: string | undefined): boolean {
  if (!iso) return false;
  try {
    return new Date(iso).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function CountdownTimerStaticSection({
  section,
  website,
}: EditorialCountdownTimerStaticProps): ReactElement | null {
  const content = (section.content || {}) as CountdownTimerContent;

  const past = isDatePast(content.targetDate);

  // Resolve the display message: if date is past use fallbackText; otherwise use title.
  const rawMessage = past
    ? content.fallbackText?.trim() || content.title?.trim() || ''
    : content.title?.trim() || content.fallbackText?.trim() || '';

  const message = localizeEditorialText(website, rawMessage);
  const ctaText = localizeEditorialText(website, content.ctaText?.trim() || '');
  const ctaUrl = content.ctaUrl?.trim() || '';

  // Nothing to show: no message and no CTA
  if (!message && !ctaText) return null;

  return (
    <section
      className="ev-section ev-urgency-bar"
      data-screen-label="UrgencyBar"
      aria-label={message || ctaText}
      style={{ padding: '12px 0', background: 'var(--c-primary, #1d4ed8)' }}
    >
      <div
        className="ev-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: icon + message */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#fff',
            flex: '1 1 auto',
            minWidth: 0,
          }}
        >
          <span aria-hidden="true" style={{ flexShrink: 0, opacity: 0.85 }}>
            {Icons.calendar({ size: 18 })}
          </span>
          {message ? (
            <span
              className="body-md"
              style={{ fontWeight: 500, color: '#fff' }}
            >
              {message}
            </span>
          ) : null}
        </div>

        {/* Right: CTA button */}
        {ctaText && ctaUrl ? (
          <a
            href={ctaUrl}
            className="btn btn-accent"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {ctaText}
            {Icons.arrow({ size: 14 })}
          </a>
        ) : ctaText ? (
          <span
            className="chip chip-accent"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {ctaText}
          </span>
        ) : null}
      </div>
    </section>
  );
}

export default CountdownTimerStaticSection;
