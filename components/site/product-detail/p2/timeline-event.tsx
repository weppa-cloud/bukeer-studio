import type { ReactNode } from 'react';
import { BedDouble, Compass, Bus, Plane, UtensilsCrossed, Clock } from 'lucide-react';
import type { ScheduleEventType } from '@bukeer/website-contract';

export interface TimelineEventProps {
  eventType: ScheduleEventType;
  title: string;
  description?: string | null;
  time?: string | null;
  isLast?: boolean;
  children?: ReactNode;
}

/**
 * Variant token map — each event_type pulls its visible stripe/dot/chip color
 * from the scoped theme (editorial-v1 or global tokens). We rely on CSS vars
 * with graceful fallbacks so the component works outside the editorial scope:
 *   - lodging   → primary token  (alojamiento = brand anchor)
 *   - activity  → secondary token (experiencias = explore accent)
 *   - transport → tertiary token  (traslados = logistic accent-2)
 *   - flight    → accent token    (vuelos = bold accent)
 *   - meal      → accent-3 token  (comida)
 *   - free_time → muted foreground
 */
const EVENT_TYPE_COLORS: Record<ScheduleEventType, string> = {
  lodging: 'var(--c-primary, hsl(var(--primary)))',
  activity: 'var(--c-accent, hsl(var(--secondary, var(--primary))))',
  transport: 'var(--c-accent-2, hsl(var(--accent-2, var(--accent))))',
  flight: 'var(--c-accent, hsl(var(--accent, var(--primary))))',
  meal: 'var(--c-accent-3, hsl(var(--accent-3, var(--accent))))',
  free_time: 'var(--text-muted, hsl(var(--muted-foreground)))',
};

const EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  transport: 'Traslado',
  activity: 'Actividad',
  meal: 'Comida',
  lodging: 'Hospedaje',
  free_time: 'Tiempo libre',
  flight: 'Vuelo',
};

function EventIcon({ eventType }: { eventType: ScheduleEventType }) {
  const iconProps = {
    'aria-hidden': true as const,
    className: 'h-3.5 w-3.5',
    strokeWidth: 2,
  };

  if (eventType === 'flight') return <Plane {...iconProps} />;
  if (eventType === 'transport') return <Bus {...iconProps} />;
  if (eventType === 'meal') return <UtensilsCrossed {...iconProps} />;
  if (eventType === 'lodging') return <BedDouble {...iconProps} />;
  if (eventType === 'free_time') return <Clock {...iconProps} />;
  return <Compass {...iconProps} />;
}

export function TimelineEvent({ eventType, title, description, time, isLast, children }: TimelineEventProps) {
  const dotColor = EVENT_TYPE_COLORS[eventType];
  const label = EVENT_TYPE_LABELS[eventType];

  return (
    <li className="relative flex gap-4" data-testid={`timeline-event-${eventType}`} data-event-type={eventType}>
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
            style={{ borderColor: 'color-mix(in srgb, var(--border-medium, var(--c-line, hsl(var(--border)))) 60%, transparent)' }}
            aria-hidden="true"
          />
        )}
      </div>

      <div
        className="pb-6 flex-1 min-w-0 pl-4 rounded-r-lg"
        // Per-property border overrides so Tailwind preflight's global
        // `* { border-width: 0 }` reset cannot blank our variant stripe.
        style={{
          borderLeftWidth: '3px',
          borderLeftStyle: 'solid',
          borderLeftColor: dotColor,
          backgroundImage: `linear-gradient(to right, color-mix(in srgb, ${dotColor} 5%, transparent), transparent 40%)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `color-mix(in srgb, ${dotColor} 14%, var(--bg-card, hsl(var(--card))))`, color: dotColor }}
          >
            {label}
          </span>
          {time && (
            <time
              dateTime={time}
              className="text-xs font-mono"
              style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
            >
              {time}
            </time>
          )}
        </div>

        {children ?? (
          <>
            <p className="font-medium leading-snug" style={{ color: 'var(--text-heading, hsl(var(--foreground)))' }}>
              {title}
            </p>
            {description && (
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
                {description}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  );
}
