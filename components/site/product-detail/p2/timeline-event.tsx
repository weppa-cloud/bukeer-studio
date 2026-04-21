import type { ReactNode } from 'react';
import type { ScheduleEventType } from '@bukeer/website-contract';

export interface TimelineEventProps {
  eventType: ScheduleEventType;
  title: string;
  description?: string | null;
  time?: string | null;
  isLast?: boolean;
  children?: ReactNode;
}

const EVENT_TYPE_COLORS: Record<ScheduleEventType, string> = {
  transport: 'var(--accent-2)',
  activity: 'var(--accent)',
  meal: 'var(--accent-3)',
  lodging: 'var(--accent-3)',
  free_time: 'var(--chart-5)',
  flight: 'var(--accent-2)',
};

const EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  transport: 'Traslado',
  activity: 'Actividad',
  meal: 'Comida',
  lodging: 'Alojamiento',
  free_time: 'Tiempo libre',
  flight: 'Vuelo',
};

function EventIcon({ eventType }: { eventType: ScheduleEventType }) {
  if (eventType === 'flight') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }
  if (eventType === 'transport') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );
  }
  if (eventType === 'meal') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (eventType === 'lodging') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (eventType === 'free_time') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

export function TimelineEvent({ eventType, title, description, time, isLast, children }: TimelineEventProps) {
  const dotColor = EVENT_TYPE_COLORS[eventType];
  const label = EVENT_TYPE_LABELS[eventType];

  return (
    <li className="relative flex gap-4" data-testid={`timeline-event-${eventType}`}>
      <div className="flex flex-col items-center">
        <span
          className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-card"
          style={{ borderColor: dotColor, color: dotColor }}
          aria-hidden="true"
        >
          <EventIcon eventType={eventType} />
        </span>
        {!isLast && (
          <span
            className="mt-1 flex-1 w-px border-l border-dashed"
            style={{ borderColor: 'color-mix(in srgb, var(--border-medium) 60%, transparent)' }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="pb-6 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `color-mix(in srgb, ${dotColor} 12%, var(--bg-card))`, color: dotColor }}
          >
            {label}
          </span>
          {time && (
            <time
              dateTime={time}
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {time}
            </time>
          )}
        </div>

        {children ?? (
          <>
            <p className="font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
              {title}
            </p>
            {description && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  );
}
