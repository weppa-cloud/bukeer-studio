/**
 * editorial-v1 — Package detail page.
 *
 * Composes existing p1/p2/p3 primitives inside the editorial CSS scope.
 * Mounted by the `TemplateSlot` dispatcher when the website opts into
 * `editorial-v1` (see `../template-slot.tsx`).
 *
 * Strategy:
 *   - Delegate hero / gallery / pricing / WhatsApp flow to the generic
 *     `<ProductLandingPage>` via the `children` fallback. No duplication.
 *   - Wave 3 scope: render an EDITORIAL OVERLAY (breadcrumb strip,
 *     ItineraryMap on ColombiaMap, editorial day-event timeline, hotels
 *     card grid, flights list, editorial FAQ header) on top of that
 *     generic body, all inside a `data-template-set="editorial-v1"`
 *     wrapper so the scoped CSS resolves.
 *
 * Reused primitives:
 *   - p1/hero-split (inherited from children)
 *   - p1/gallery-strip (inherited)
 *   - p1/summary-sidebar (inherited as sticky rail)
 *   - p2/day-event-timeline, timeline-event, flight-row, transfer-row
 *   - p2/hotel-card (variant="card" for lodging cards)
 *   - p3/pricing-tiers (layout="grid", inherited)
 *   - p3/related-carousel (inherited)
 *   - p3/whatsapp-flow (inherited)
 *   - editorial-v1 ColombiaMap for the ItineraryMap block
 *   - site/meeting-point-map (fallback when a circuit can't be derived)
 *
 * SEO: the generic `<ProductLandingPage>` still emits
 * `<ProductSchema>`, `<OrganizationSchema>` and FAQ JSON-LD. We do NOT
 * re-emit any of those here to avoid duplicate JSON-LD blocks.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ScheduleEventType } from '@bukeer/website-contract';
import { ColombiaMap, type ColombiaMapPin } from '../maps/colombia-map';
import { Eyebrow } from '../primitives/eyebrow';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';
import { FlightRow } from '@/components/site/product-detail/p2/flight-row';
import { DayEventTimeline } from '@/components/site/product-detail/p2/day-event-timeline';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { getPackageCircuitStops, withCoords } from '@/lib/products/package-circuit';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface EditorialPackageDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
}

interface EditorialPackageDetailProps {
  website: WebsiteData;
  payload?: unknown;
  /**
   * The generic page body rendered by the dispatcher's fallback. We wrap
   * it with editorial chrome instead of rebuilding hero/gallery/pricing
   * from scratch.
   */
  children?: ReactNode;
}

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
}

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
  const destinationHint = typeof (product as unknown as Record<string, unknown>).destination === 'string'
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

export function EditorialPackageDetail({
  website,
  payload,
  children,
}: EditorialPackageDetailProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ??
    website.content?.locale ??
    website.default_locale ??
    'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const resolvedPayload = payload as EditorialPackageDetailPayload | undefined;

  if (!resolvedPayload || !resolvedPayload.product) {
    // No payload → fall back to the generic body untouched.
    return <>{children}</>;
  }

  const { product, basePath, displayName, displayLocation } = resolvedPayload;
  const itineraryItems = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as ReadonlyArray<Record<string, unknown>>)
    : [];

  const lodgingEntries = extractLodging(itineraryItems);
  const flightEntries = extractFlights(itineraryItems);
  const timelineItems = extractTimeline(itineraryItems);
  const timelineGroups = groupByDay(timelineItems);
  const mapPins = buildMapPins(product);

  const breadcrumbItems = [
    { label: editorialText('editorialBreadcrumbHome'), href: `${basePath}/` },
    { label: editorialText('editorialBreadcrumbPackages'), href: `${basePath}/paquetes` },
    { label: displayName },
  ];

  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="package-detail"
      className="editorial-package-detail"
    >
      {/* Generic body: hero, gallery, pricing, CTA, WhatsApp flow, SEO schemas */}
      {children}

      {/* Editorial overlay sections — appended after the generic body so the
          generic component continues to own SEO/ISR/state. */}
      <div className="mx-auto max-w-7xl px-6 pb-16 space-y-16">
        <section data-testid="editorial-package-breadcrumbs" className="pt-4">
          <Breadcrumbs items={breadcrumbItems} />
          {displayLocation ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--c-ink-2)' }}>
              {displayLocation}
            </p>
          ) : null}
        </section>

        {mapPins.length > 0 ? (
          <section data-testid="editorial-package-map" className="route-map">
            <div className="rm-head">
              <Eyebrow>{editorialText('editorialPackageMapTitle')}</Eyebrow>
              <small>{mapPins.length} {editorialText('editorialPackageStopsSuffix')}</small>
            </div>
            <ColombiaMap pins={mapPins} height={460} />
          </section>
        ) : null}

        {timelineGroups.length > 0 ? (
          <section data-testid="editorial-package-timeline" className="day-list-v2">
            <div className="mb-6">
              <Eyebrow>{editorialText('editorialPackageTimelineEyebrow')}</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialPackageTimelineTitle')}</h2>
            </div>
            <div className="space-y-8">
              {timelineGroups.map((group, idx) => (
                <DayEventTimeline
                  key={`day-${idx}-${group.day ?? 'single'}`}
                  day={group.day}
                  events={group.entries.map((item) => ({
                    day: item.day ?? undefined,
                    title: item.title,
                    description: item.description ?? undefined,
                    time: item.time ?? undefined,
                    event_type: item.event_type,
                  }))}
                />
              ))}
            </div>
          </section>
        ) : null}

        {lodgingEntries.length > 0 ? (
          <section data-testid="editorial-package-hotels">
            <div className="mb-6">
              <Eyebrow>{editorialText('editorialPackageHotelsEyebrow')}</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialPackageHotelsTitle')}</h2>
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
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialPackageFlightsTitle')}</h2>
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
    </div>
  );
}
