/**
 * ItineraryItemRenderer — server component.
 * Renders a single itinerary day item with variant rendering per product_type.
 * Supports: 'Hoteles', 'Actividades', 'Transporte', 'Vuelos', and generic fallback.
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ActivityScheduleInline } from '@/components/site/activity-schedule-inline';
import { HOTEL_AMENITIES_MAX } from '@bukeer/website-contract';
import type { ScheduleEntry, ScheduleEventType } from '@bukeer/website-contract';
import { ScheduleEntrySchema } from '@bukeer/website-contract';
import { z } from 'zod';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

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

const text = getPublicUiExtraTextGetter('es-CO');

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
  // Backwards-compatible bridge for one release:
  // prefer typed `event_type`, then legacy `product_type`, then field/text inference.
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

function eventTypeLabel(eventType: ScheduleEventType): string | null {
  switch (eventType) {
    case 'meal':
      return 'Comida';
    case 'free_time':
      return 'Tiempo libre';
    case 'lodging':
      return 'Alojamiento';
    default:
      return null;
  }
}

// --- Hotel Variant ---
function HotelVariant({ item }: { item: ItineraryItem }) {
  const stars = typeof item.star_rating === 'number'
    ? Math.max(1, Math.min(5, Math.round(item.star_rating)))
    : 0;
  const amenities = Array.isArray(item.amenities)
    ? item.amenities.slice(0, HOTEL_AMENITIES_MAX)
    : [];

  return (
    <div className="space-y-2">
      {item.title && (
        <p className="font-medium leading-snug">{item.title}</p>
      )}
      {stars > 0 && (
        <div className="flex items-center gap-0.5" aria-label={`${stars} estrellas`}>
          {Array.from({ length: stars }).map((_, i) => (
            <svg
              key={i}
              className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}
      {amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {amenities.map((amenity) => (
            <Badge key={amenity} variant="outline" className="text-xs font-normal">
              {amenity}
            </Badge>
          ))}
        </div>
      )}
      {item.hotel_slug && (
        <Link
          href={`/hoteles/${item.hotel_slug}`}
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
          aria-label={`Ver detalles del hotel ${item.title ?? ''}`}
        >
          {text('itineraryViewHotel')}
        </Link>
      )}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

// --- Activity Variant ---
function ActivityVariant({ item }: { item: ItineraryItem }) {
  const scheduleData = Array.isArray(item.schedule_data)
    ? parseScheduleData(item.schedule_data)
    : [];

  return (
    <div className="space-y-1">
      {item.title && (
        <p className="font-medium leading-snug">{item.title}</p>
      )}
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

// --- Transport Variant ---
function TransportVariant({ item }: { item: ItineraryItem }) {
  const route = [item.from_location, item.to_location].filter(Boolean).join(' → ');
  const label = [route, item.duration].filter(Boolean).join(' · ');

  return (
    <div className="space-y-1">
      {label && (
        <p className="font-medium leading-snug">{label}</p>
      )}
      {!label && item.title && (
        <p className="font-medium leading-snug">{item.title}</p>
      )}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

// --- Flight Variant ---
function FlightVariant({ item }: { item: ItineraryItem }) {
  const carrier = item.marketing_carrier ?? '';
  const flightId = item.flight_number ?? '';
  const flightLabel = [carrier, flightId].filter(Boolean).join(' ');
  const timeLabel = [item.departure, item.arrival].filter(Boolean).join(' → ');
  const headline = [flightLabel, timeLabel].filter(Boolean).join(' · ')
    || (flightId ? `Vuelo ${flightId}` : null);

  return (
    <div className="space-y-1">
      {headline && (
        <p className="font-medium leading-snug">{headline}</p>
      )}
      {!headline && item.title && (
        <p className="font-medium leading-snug">{item.title}</p>
      )}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

// --- Generic Fallback ---
function GenericVariant({ item, eventType }: { item: ItineraryItem; eventType: ScheduleEventType }) {
  const badgeLabel = eventTypeLabel(eventType);

  return (
    <div className="space-y-1">
      {badgeLabel && (
        <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wide">
          {badgeLabel}
        </Badge>
      )}
      {item.title && (
        <p className="font-medium leading-snug">{item.title}</p>
      )}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

// --- Main Renderer ---
export function ItineraryItemRenderer({ item }: ItineraryItemRendererProps) {
  const resolvedEventType = resolveEventType(item);

  switch (resolvedEventType) {
    case 'lodging':
      if (item.product_type === 'Hoteles' || item.hotel_slug || typeof item.star_rating === 'number') {
        return <HotelVariant item={item} />;
      }
      return <GenericVariant item={item} eventType={resolvedEventType} />;
    case 'activity':
      return <ActivityVariant item={item} />;
    case 'transport':
      return <TransportVariant item={item} />;
    case 'flight':
      return <FlightVariant item={item} />;
    case 'meal':
    case 'free_time':
      return <GenericVariant item={item} eventType={resolvedEventType} />;
    default:
      // Keep existing legacy branch behavior intact if future enum values appear.
      switch (item.product_type ?? '') {
        case 'Hoteles':
          return <HotelVariant item={item} />;
        case 'Actividades':
          return <ActivityVariant item={item} />;
        case 'Transporte':
          return <TransportVariant item={item} />;
        case 'Vuelos':
          return <FlightVariant item={item} />;
        default:
          return <GenericVariant item={item} eventType="activity" />;
      }
  }
}
