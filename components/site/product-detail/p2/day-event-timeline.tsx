import type { ScheduleEntry, ScheduleEventType } from '@bukeer/website-contract';
import { TimelineEvent } from './timeline-event';
import { FlightRow } from './flight-row';
import { TransferRow } from './transfer-row';
import { HotelCard } from './hotel-card';

export interface DayEventTimelineProps {
  day?: number | null;
  events: ScheduleEntry[];
  className?: string;
}

interface ExtendedScheduleEntry extends ScheduleEntry {
  marketing_carrier?: string;
  flight_number?: string;
  departure?: string;
  arrival?: string;
  from_location?: string;
  to_location?: string;
  duration?: string;
  star_rating?: number;
  amenities?: string[];
  hotel_slug?: string;
}

function hasTypedFields(event: ExtendedScheduleEntry, eventType: ScheduleEventType): boolean {
  if (eventType === 'flight') {
    return Boolean(event.marketing_carrier || event.flight_number || event.departure || event.arrival);
  }
  if (eventType === 'transport') {
    return Boolean(event.from_location || event.to_location || event.duration);
  }
  if (eventType === 'lodging') {
    return Boolean(event.hotel_slug || typeof event.star_rating === 'number' || (event.amenities && event.amenities.length > 0));
  }
  return false;
}

function TypedContent({ event, eventType }: { event: ExtendedScheduleEntry; eventType: ScheduleEventType }) {
  if (eventType === 'flight') {
    return (
      <FlightRow
        carrier={event.marketing_carrier}
        flightNumber={event.flight_number}
        departure={event.departure ?? event.time}
        arrival={event.arrival}
        title={event.title}
        description={event.description}
      />
    );
  }
  if (eventType === 'transport') {
    return (
      <TransferRow
        fromLocation={event.from_location}
        toLocation={event.to_location}
        duration={event.duration}
        title={event.title}
        description={event.description}
      />
    );
  }
  if (eventType === 'lodging') {
    return (
      <HotelCard
        title={event.title}
        starRating={event.star_rating}
        amenities={event.amenities}
        hotelSlug={event.hotel_slug}
        description={event.description}
      />
    );
  }
  return null;
}

export function DayEventTimeline({ day, events, className = '' }: DayEventTimelineProps) {
  if (events.length === 0) return null;

  return (
    <section
      className={className}
      data-testid={day != null ? `timeline-day-${day}` : 'timeline-day'}
      aria-label={day != null ? `Día ${day}` : 'Programa'}
    >
      {day != null && (
        <h3
          className="mb-4 text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Día {day}
        </h3>
      )}

      <ol className="space-y-0" aria-label={day != null ? `Eventos del día ${day}` : 'Eventos'}>
        {events.map((event, index) => {
          const ext = event as ExtendedScheduleEntry;
          const eventType = (ext.event_type ?? 'activity') as ScheduleEventType;
          const useTyped = hasTypedFields(ext, eventType);

          return (
            <TimelineEvent
              key={`${index}-${ext.title}`}
              eventType={eventType}
              title={ext.title}
              description={ext.description}
              time={ext.time}
              isLast={index === events.length - 1}
            >
              {useTyped ? <TypedContent event={ext} eventType={eventType} /> : undefined}
            </TimelineEvent>
          );
        })}
      </ol>
    </section>
  );
}
