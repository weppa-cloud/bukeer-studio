'use client';

import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics/track';

interface CalBookingCTAProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  bookingLink?: string | null;
  label?: string;
  /** Free-form tag describing where on the page this CTA appears. */
  analyticsLocation?: string;
  /** Optional extra dimensions merged into the analytics event payload. */
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}

export function CalBookingCTA({
  bookingLink,
  label = 'Agendar llamada',
  className,
  analyticsLocation,
  analyticsContext,
  onClick,
  ...anchorProps
}: CalBookingCTAProps) {
  if (!bookingLink) {
    return null;
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackEvent('cal_booking_click', {
      booking_link: bookingLink,
      location_context: analyticsLocation ?? null,
      ...(analyticsContext ?? {}),
    });
    onClick?.(event);
  };

  return (
    <a
      href={bookingLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted',
        className
      )}
      {...anchorProps}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
