/**
 * ItineraryItemRenderer — server component.
 * Routes each item through the typed p2 timeline (#256).
 * Kept as a compatibility wrapper for one release.
 */

import { Badge } from '@/components/ui/badge';
import { ActivityScheduleInline } from '@/components/site/activity-schedule-inline';
import type { ScheduleEntry, ScheduleEventType } from '@bukeer/website-contract';
import { ScheduleEntrySchema } from '@bukeer/website-contract';
import { z } from 'zod';
import { FlightRow } from '@/components/site/product-detail/p2/flight-row';
import { TransferRow } from '@/components/site/product-detail/p2/transfer-row';
import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';

export interface ItineraryItem {
  day_number?: number;
  /** Spanish capitalized: 'Hoteles' | 'Actividades' | 'Transporte' | 'Vuelos'. Defaults to generic fallback. */
  product_type?: string;
  id_product?: string;
  destination?: string;
  title?: string;
  description?: string;
  // hotel fields
  star_rating?: number;
  amenities?: string[];
  hotel_slug?: string;
  // activity fields
  schedule_data?: unknown[];
  activity_slug?: string;
  // transport fields
  from_location?: string;
  to_location?: string;
  duration?: string;
  // flight fields
  marketing_carrier?: string;
  flight_number?: string;
  departure?: string;
  arrival?: string;
  /** V2 typed itinerary model (#256). */
  event_type?: ScheduleEventType | string;
}

interface ItineraryItemRendererProps {
  item: ItineraryItem;
}

function parseScheduleData(raw: unknown[]): ScheduleEntry[] {
  const result = z.array(ScheduleEntrySchema).safeParse(raw);
  return result.success ? result.data : [];
}

const LEGACY_PRODUCT_TYPE_TO_EVENT: Record<string, ScheduleEventType> = {
  Hoteles: 'lodging',
  Actividades: 'activity',
  Transporte: 'transport',
  Vuelos: 'flight',
};

function inferEventTypeFromText(textValue: string): ScheduleEventType | null {
  const normalized = textValue.toLowerCase();

  if (/\b(vuelo|flight|aeropuerto|boarding)\b/.test(normalized)) return 'flight';
  if (/\b(traslado|transfer|transporte|bus|tren|shuttle)\b/.test(normalized)) return 'transport';
  if (/\b(desayuno|almuerzo|cena|comida|meal|dinner|lunch|breakfast)\b/.test(normalized)) return 'meal';
  if (/\b(hotel|hospedaje|alojamiento|check-?in|check-?out|lodging)\b/.test(normalized)) return 'lodging';
  if (/\b(libre|free time|tiempo libre|descanso)\b/.test(normalized)) return 'free_time';
  return null;
}

function resolveEventType(item: ItineraryItem): ScheduleEventType {
  if (
    item.event_type === 'transport' ||
    item.event_type === 'activity' ||
    item.event_type === 'meal' ||
    item.event_type === 'lodging' ||
    item.event_type === 'free_time' ||
    item.event_type === 'flight'
  ) {
    return item.event_type;
  }

  const legacyType = item.product_type ? LEGACY_PRODUCT_TYPE_TO_EVENT[item.product_type] : undefined;
  if (legacyType) return legacyType;

  if (item.marketing_carrier || item.flight_number || item.departure || item.arrival) {
    return 'flight';
  }

  if (item.from_location || item.to_location || item.duration) {
    return 'transport';
  }

  if (item.hotel_slug || typeof item.star_rating === 'number') {
    return 'lodging';
  }

  if (Array.isArray(item.schedule_data) && item.schedule_data.length > 0) {
    return 'activity';
  }

  const inferred = inferEventTypeFromText(`${item.title ?? ''} ${item.description ?? ''}`);
  return inferred ?? 'activity';
}

const EVENT_TYPE_BADGE_LABEL: Record<ScheduleEventType, string | null> = {
  transport: null,
  activity: null,
  flight: null,
  meal: 'Comida',
  free_time: 'Tiempo libre',
  lodging: 'Alojamiento',
};

function ActivityBody({ item }: { item: ItineraryItem }) {
  const scheduleData = Array.isArray(item.schedule_data) ? parseScheduleData(item.schedule_data) : [];

  return (
    <div className="space-y-1" data-event-type="activity">
      {item.title && <p className="font-medium leading-snug">{item.title}</p>}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
      {scheduleData.length > 0 && (
        <ActivityScheduleInline
          steps={scheduleData}
          activitySlug={item.activity_slug}
          activityName={item.title ?? 'Actividad'}
        />
      )}
    </div>
  );
}

function GenericBody({ item, eventType }: { item: ItineraryItem; eventType: ScheduleEventType }) {
  const badgeLabel = EVENT_TYPE_BADGE_LABEL[eventType];

  return (
    <div className="space-y-1" data-event-type={eventType}>
      {badgeLabel && (
        <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">
          {badgeLabel}
        </Badge>
      )}
      {item.title && <p className="font-medium leading-snug">{item.title}</p>}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

export function ItineraryItemRenderer({ item }: ItineraryItemRendererProps) {
  const resolvedEventType = resolveEventType(item);

  if (resolvedEventType === 'flight') {
    return (
      <div data-event-type="flight">
        <FlightRow
          carrier={item.marketing_carrier}
          flightNumber={item.flight_number}
          departure={item.departure}
          arrival={item.arrival}
          title={item.title}
          description={item.description}
        />
      </div>
    );
  }

  if (resolvedEventType === 'transport') {
    return (
      <div data-event-type="transport">
        <TransferRow
          fromLocation={item.from_location}
          toLocation={item.to_location}
          duration={item.duration}
          title={item.title}
          description={item.description}
        />
      </div>
    );
  }

  if (resolvedEventType === 'lodging') {
    if (item.product_type === 'Hoteles' || item.hotel_slug || typeof item.star_rating === 'number') {
      return (
        <div data-event-type="lodging">
          <HotelCard
            title={item.title}
            starRating={item.star_rating}
            amenities={item.amenities}
            hotelSlug={item.hotel_slug}
            description={item.description}
          />
        </div>
      );
    }
    return <GenericBody item={item} eventType="lodging" />;
  }

  if (resolvedEventType === 'activity') {
    return <ActivityBody item={item} />;
  }

  return <GenericBody item={item} eventType={resolvedEventType} />;
}
