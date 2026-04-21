/**
 * editorial-v1 — Editorial overlay for package detail pages.
 *
 * Extracted from `package-detail.tsx` so it can be rendered as a server
 * component in `page.tsx` and passed as `renderAfterMain` to the client
 * `<ProductLandingPage>`. This positions the editorial sections (stats bar,
 * Colombia map, timeline, hotels, flights) BETWEEN the description/pricing
 * grid and the FAQ/related sections, rather than after all generic content.
 *
 * Server component — no 'use client'.
 */

import type { ProductData, ScheduleEventType } from '@bukeer/website-contract';
import { ColombiaMap, type ColombiaMapPin } from '../maps/colombia-map';
import { Eyebrow } from '../primitives/eyebrow';
import { PackageStatsBar } from '../primitives/package-stats-bar';
import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';
import { FlightRow } from '@/components/site/product-detail/p2/flight-row';
import { DayEventTimeline } from '@/components/site/product-detail/p2/day-event-timeline';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { getPackageCircuitStops, withCoords } from '@/lib/products/package-circuit';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface LodgingEntry {
  title: string;
  city: string | null;
  nights: number | null;
  stars: number | null;
  amenities: string[] | null;
  description: string | null;
  hotelSlug: string | null;
  imageUrl: string | null;
}

interface FlightEntry {
  carrier: string | null;
  flightNumber: string | null;
  departure: string | null;
  arrival: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  title: string;
  description: string | null;
}

interface TimelineItem {
  day: number | null;
  title: string;
  description: string | null;
  time: string | null;
  event_type: ScheduleEventType;
  marketing_carrier?: string | null;
  flight_number?: string | null;
  departure?: string | null;
  arrival?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  duration?: string | null;
  star_rating?: number | null;
  amenities?: string[] | null;
  hotel_slug?: string | null;
  schedule_data?: unknown[] | null;
  activity_slug?: string | null;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (typeof value !== 'string') return null;
  const cleaned = sanitizeProductCopy(value);
  return cleaned.length > 0 ? cleaned : null;
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readStringArray(source: Record<string, unknown>, key: string): string[] | null {
  const value = source[key];
  if (!Array.isArray(value)) return null;
  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return items.length > 0 ? items : null;
}

function readUnknownArray(source: Record<string, unknown>, key: string): unknown[] | null {
  const value = source[key];
  return Array.isArray(value) && value.length > 0 ? value : null;
}

function extractLodging(itineraryItems: ReadonlyArray<Record<string, unknown>>): LodgingEntry[] {
  const out: LodgingEntry[] = [];
  for (const entry of itineraryItems) {
    const eventType = entry.event_type;
    if (eventType !== 'lodging') continue;
    const title = readString(entry, 'title');
    if (!title) continue;
    out.push({
      title,
      city: readString(entry, 'city') ?? readString(entry, 'location'),
      nights: readNumber(entry, 'nights'),
      stars: readNumber(entry, 'star_rating') ?? readNumber(entry, 'stars'),
      amenities: readStringArray(entry, 'amenities'),
      description: readString(entry, 'description'),
      hotelSlug: readString(entry, 'hotel_slug') ?? readString(entry, 'slug'),
      imageUrl: readString(entry, 'image') ?? readString(entry, 'image_url'),
    });
  }
  return out;
}

function extractFlights(itineraryItems: ReadonlyArray<Record<string, unknown>>): FlightEntry[] {
  const out: FlightEntry[] = [];
  for (const entry of itineraryItems) {
    if (entry.event_type !== 'flight') continue;
    const title = readString(entry, 'title');
    if (!title) continue;
    out.push({
      carrier: readString(entry, 'marketing_carrier') ?? readString(entry, 'carrier'),
      flightNumber: readString(entry, 'flight_number'),
      departure: readString(entry, 'departure') ?? readString(entry, 'time'),
      arrival: readString(entry, 'arrival'),
      fromLocation: readString(entry, 'from_location'),
      toLocation: readString(entry, 'to_location'),
      title,
      description: readString(entry, 'description'),
    });
  }
  return out;
}

function extractTimeline(itineraryItems: ReadonlyArray<Record<string, unknown>>): TimelineItem[] {
  return itineraryItems
    .map((entry): TimelineItem | null => {
      const title = readString(entry, 'title');
      if (!title) return null;
      const rawType = entry.event_type;
      const eventType: ScheduleEventType =
        rawType === 'transport' ||
        rawType === 'activity' ||
        rawType === 'meal' ||
        rawType === 'lodging' ||
        rawType === 'free_time' ||
        rawType === 'flight'
          ? rawType
          : 'activity';
      return {
        day: readNumber(entry, 'day'),
        title,
        description: readString(entry, 'description'),
        time: readString(entry, 'time'),
        event_type: eventType,
        marketing_carrier: readString(entry, 'marketing_carrier') ?? readString(entry, 'carrier'),
        flight_number: readString(entry, 'flight_number'),
        departure: readString(entry, 'departure'),
        arrival: readString(entry, 'arrival'),
        from_location: readString(entry, 'from_location'),
        to_location: readString(entry, 'to_location'),
        duration: readString(entry, 'duration'),
        star_rating: readNumber(entry, 'star_rating') ?? readNumber(entry, 'stars'),
        amenities: readStringArray(entry, 'amenities'),
        hotel_slug: readString(entry, 'hotel_slug') ?? readString(entry, 'slug'),
        schedule_data: readUnknownArray(entry, 'schedule_data') ?? readUnknownArray(entry, 'steps'),
        activity_slug: readString(entry, 'activity_slug'),
      };
    })
    .filter((row): row is TimelineItem => row !== null);
}

function groupByDay(items: TimelineItem[]): Array<{ day: number | null; entries: TimelineItem[] }> {
  const groups: Array<{ day: number | null; entries: TimelineItem[] }> = [];
  const index = new Map<string, { day: number | null; entries: TimelineItem[] }>();

  for (const item of items) {
    const key = item.day === null || item.day === undefined ? 'single' : String(item.day);
    let bucket = index.get(key);
    if (!bucket) {
      bucket = { day: item.day ?? null, entries: [] };
      index.set(key, bucket);
      groups.push(bucket);
    }
    bucket.entries.push(item);
  }

  return groups;
}

/**
 * Build ColombiaMap pins from the package itinerary. Delegates to the
 * same lookup logic used by the generic `PackageCircuitMap` so pin
 * positions stay in sync.
 */
function buildMapPins(product: ProductData): ColombiaMapPin[] {
  const itineraryItems = Array.isArray(product.itinerary_items) ? product.itinerary_items : [];
  const destinationHint =
    typeof (product as unknown as Record<string, unknown>).destination === 'string'
      ? String((product as unknown as Record<string, unknown>).destination)
      : product.location ?? null;
  const stops = getPackageCircuitStops({
    itineraryItems,
    name: product.name ?? null,
    destination: destinationHint,
  });
  const mapped = withCoords(stops);
  return mapped.map((stop, index) => ({
    id: `stop-${index + 1}-${stop.city}`,
    lat: stop.lat,
    lng: stop.lng,
    label: stop.city,
  }));
}

// ---------------------------------------------------------------------------
// Exported components
// ---------------------------------------------------------------------------

export interface EditorialPackageOverlayProps {
  product: ProductData;
  resolvedLocale?: string;
}

/**
 * Server component that renders the editorial overlay sections:
 * stats bar, Colombia map, day timeline, hotel cards, and flight list.
 *
 * Intended to be passed as `renderAfterMain` to `<ProductLandingPage>` from
 * `page.tsx`, so these sections appear between pricing and FAQ.
 */
export function EditorialPackageOverlay({
  product,
  resolvedLocale = 'es-CO',
}: EditorialPackageOverlayProps) {
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const itineraryItems = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as ReadonlyArray<Record<string, unknown>>)
    : [];

  const lodgingEntries = extractLodging(itineraryItems);
  const flightEntries = extractFlights(itineraryItems);
  const timelineItems = extractTimeline(itineraryItems);
  const timelineGroups = groupByDay(timelineItems);
  const mapPins = buildMapPins(product);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 space-y-16">
      <section data-testid="editorial-package-stats" className="pt-4">
        <PackageStatsBar
          nights={product.duration_nights ?? null}
          days={product.duration_days ?? null}
          destinationsCount={mapPins.length > 0 ? mapPins.length : null}
          rating={product.rating ?? null}
          reviewCount={product.review_count ?? null}
          locale={resolvedLocale}
        />
      </section>

      {mapPins.length > 0 ? (
        <section data-testid="editorial-package-map" className="route-map">
          <div className="rm-head">
            <Eyebrow>{editorialText('editorialPackageMapTitle')}</Eyebrow>
            <small>
              {mapPins.length} {editorialText('editorialPackageStopsSuffix')}
            </small>
          </div>
          <ColombiaMap pins={mapPins} height={460} numberedRoute />
        </section>
      ) : null}

      {timelineGroups.length > 0 ? (
        <section data-testid="editorial-package-timeline" className="day-list-v2">
          <div className="mb-6">
            <Eyebrow>{editorialText('editorialPackageTimelineEyebrow')}</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">
              {editorialText('editorialPackageTimelineTitle')}
            </h2>
          </div>
          <div className="space-y-8">
            {timelineGroups.map((group, idx) => (
              <DayEventTimeline
                key={`day-${idx}-${group.day ?? 'single'}`}
                day={group.day}
                events={group.entries.map((item) => {
                  const extras: Record<string, unknown> = {};
                  if (item.marketing_carrier) extras.marketing_carrier = item.marketing_carrier;
                  if (item.flight_number) extras.flight_number = item.flight_number;
                  if (item.departure) extras.departure = item.departure;
                  if (item.arrival) extras.arrival = item.arrival;
                  if (item.from_location) extras.from_location = item.from_location;
                  if (item.to_location) extras.to_location = item.to_location;
                  if (item.duration) extras.duration = item.duration;
                  if (typeof item.star_rating === 'number') extras.star_rating = item.star_rating;
                  if (item.amenities) extras.amenities = item.amenities;
                  if (item.hotel_slug) extras.hotel_slug = item.hotel_slug;
                  if (item.schedule_data) extras.schedule_data = item.schedule_data;
                  if (item.activity_slug) extras.activity_slug = item.activity_slug;
                  return {
                    day: item.day ?? undefined,
                    title: item.title,
                    description: item.description ?? undefined,
                    time: item.time ?? undefined,
                    event_type: item.event_type,
                    ...extras,
                  };
                })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {lodgingEntries.length > 0 ? (
        <section data-testid="editorial-package-hotels">
          <div className="mb-6">
            <Eyebrow>{editorialText('editorialPackageHotelsEyebrow')}</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">
              {editorialText('editorialPackageHotelsTitle')}
            </h2>
          </div>
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
          >
            {lodgingEntries.map((hotel, idx) => (
              <HotelCard
                key={`hotel-${idx}-${hotel.title}`}
                variant="card"
                title={hotel.title}
                city={hotel.city}
                nights={hotel.nights}
                starRating={hotel.stars}
                amenities={hotel.amenities}
                description={hotel.description}
                hotelSlug={hotel.hotelSlug}
                imageUrl={hotel.imageUrl}
              />
            ))}
          </div>
        </section>
      ) : null}

      {flightEntries.length > 0 ? (
        <section data-testid="editorial-package-flights">
          <div className="mb-6">
            <Eyebrow>{editorialText('editorialPackageFlightsEyebrow')}</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">
              {editorialText('editorialPackageFlightsTitle')}
            </h2>
          </div>
          <div className="flights-list space-y-3">
            {flightEntries.map((flight, idx) => (
              <div
                key={`flight-${idx}`}
                className="flight-row rounded-xl border p-4"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-line)',
                }}
              >
                <FlightRow
                  carrier={flight.carrier}
                  flightNumber={flight.flightNumber}
                  departure={flight.departure}
                  arrival={flight.arrival}
                  title={flight.title}
                  description={flight.description}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
