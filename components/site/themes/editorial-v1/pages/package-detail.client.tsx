'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseImageUrl } from '@/lib/images/supabase-transform';
import type { ActivityOption, ProductData, ProductFAQ, ScheduleEventType } from '@bukeer/website-contract';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { PlannerData } from '@/lib/supabase/get-planners';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { convertCurrencyAmount } from '@/lib/site/currency';
import { usePreferredCurrency } from '@/lib/site/use-preferred-currency';
import { getPackageCircuitStops, withCoords, type PackageCircuitStopWithCoords } from '@/lib/products/package-circuit';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';
import { MediaLightbox } from '@/components/site/media-lightbox';
import { ProductVideoHero } from '@/components/site/product-video-hero';
import { PackageCircuitMap } from '@/components/site/package-circuit-map';
import { MeetingPointMap } from '@/components/site/meeting-point-map';
import { HotelCard } from '@/components/site/product-detail/p2/hotel-card';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Rating } from '../primitives/rating';
import { Icons } from '../primitives/icons';
import { EditorialGalleryMosaic } from '../primitives/editorial-gallery-mosaic';
import { EditorialDateField } from '../primitives/editorial-date-field';
import { WaflowCTAButton } from '../waflow/cta-button';
import { editorialHtml } from '../primitives/rich-heading';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

interface EditorialPackageDetailClientProps {
  website: WebsiteData;
  basePath: string;
  product: ProductData;
  displayName: string;
  displayLocation: string | null;
  resolvedLocale: string;
  googleReviews: GoogleReviewProp[];
  similarProducts: ProductData[];
  planner?: PlannerData | null;
  faqs: ProductFAQ[];
}

interface TimelineItem {
  day: number;
  time: string;
  label: string;
  title: string;
  note: string | null;
  location: string | null;
  imageUrl: string | null;
  productId?: string | null;
  tone: 'transporte' | 'actividad' | 'comida' | 'alojamiento' | 'libre' | 'vuelo';
}

const EVENT_ICON_BY_TONE: Record<TimelineItem['tone'], ReactNode> = {
  transporte: <Icons.compass size={14} />,
  actividad: <Icons.sparkle size={14} />,
  comida: <Icons.leaf size={14} />,
  alojamiento: <Icons.award size={14} />,
  libre: <Icons.clock size={14} />,
  vuelo: <Icons.compass size={14} />,
};

interface RouteStopItem {
  name: string;
  nights: number;
}

interface PackageHotelItem {
  productId?: string | null;
  title: string;
  city: string | null;
  category: string | null;
  starRating: number | null;
  amenities: string[];
  nights: number | null;
  imageUrl: string | null;
}

interface FlightItem {
  from: string;
  to: string;
  dateLabel: string;
  metaLabel: string;
}

interface PackageVersionLike {
  version_number?: unknown;
  version_label?: unknown;
  passenger_count?: unknown;
  total_price?: unknown;
  base_currency?: unknown;
  services_snapshot_summary?: unknown;
  price_per_person?: unknown;
  is_base_version?: unknown;
}

interface PackageVersionOption extends ActivityOption {
  price_per_person?: number;
}

interface PackageMediaCollection {
  gallery: string[];
  byDay: Record<number, string[]>;
}

const CAL_SCHEDULE_URL = 'https://cal.com/colombiatours-travel/30min';

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return sanitizeProductCopy(item);
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const label = record.label;
          return typeof label === 'string' ? sanitizeProductCopy(label) : '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|,|;/g)
      .map((entry) => sanitizeProductCopy(entry))
      .filter(Boolean);
  }
  return [];
}

function looksLikeImageUrl(value: string): boolean {
  const url = value.trim();
  if (!url) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return false;
  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url)) return true;
  if (/supabase\.co\/storage\/|images\.unsplash\.com\/|res\.cloudinary\.com\//i.test(url)) return true;
  return /^https?:\/\//i.test(url);
}

function toImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!looksLikeImageUrl(cleaned)) return null;
  return cleaned;
}

function isPromotionalAssetUrl(url: string): boolean {
  const normalized = decodeURIComponent(url).toLowerCase();
  return /(flyer|promo|publicidad|advert|banner|seguro|asistencia|medical|medica)/.test(normalized);
}

function filterEditorialImageUrls(urls: string[]): string[] {
  const filtered = urls.filter((url) => !isPromotionalAssetUrl(url));
  return filtered.length > 0 ? filtered : urls;
}

function extractImageUrls(value: unknown, maxDepth = 3): string[] {
  const urls: string[] = [];
  const visited = new WeakSet<object>();
  const stack: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];

  const add = (url: string) => {
    if (!urls.includes(url)) urls.push(url);
  };

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current.depth > maxDepth) continue;

    const node = current.node;
    if (typeof node === 'string') {
      const parsed = toImageUrl(node);
      if (parsed) add(parsed);
      continue;
    }

    if (!node || typeof node !== 'object') continue;

    if (Array.isArray(node)) {
      for (const item of node) {
        stack.push({ node: item, depth: current.depth + 1 });
      }
      continue;
    }

    if (visited.has(node as object)) continue;
    visited.add(node as object);

    const record = node as Record<string, unknown>;
    const directKeys = [
      'url',
      'image',
      'image_url',
      'photo',
      'photo_url',
      'cover_image_url',
      'thumbnail',
      'src',
      'media_url',
      'hero_image',
      'activity_image',
    ];
    for (const key of directKeys) {
      const parsed = toImageUrl(record[key]);
      if (parsed) add(parsed);
    }

    const nestedKeys = [
      'images',
      'photos',
      'program_gallery',
      'gallery',
      'media',
      'activity',
      'schedule_data',
      'steps',
      'items',
    ];
    for (const key of nestedKeys) {
      if (record[key] !== undefined) {
        stack.push({ node: record[key], depth: current.depth + 1 });
      }
    }
  }

  return urls;
}

function resolvePackageMedia(product: ProductData): PackageMediaCollection {
  const gallery: string[] = [];
  const byDay: Record<number, string[]> = {};

  const addGallery = (url: string) => {
    if (!gallery.includes(url)) gallery.push(url);
  };
  const addDay = (day: number, url: string) => {
    if (!Number.isFinite(day) || day <= 0) return;
    if (!byDay[day]) byDay[day] = [];
    if (!byDay[day].includes(url)) byDay[day].push(url);
  };

  const programGalleryUrls = filterEditorialImageUrls(
    extractImageUrls((product as ProductData & { program_gallery?: unknown }).program_gallery)
  );
  const hasCuratedPackageGallery = programGalleryUrls.length > 0;
  const packageDayMediaRaw = (product as ProductData & { package_day_media?: unknown }).package_day_media;
  const hasEnrichedDayMedia =
    Boolean(packageDayMediaRaw)
    && typeof packageDayMediaRaw === 'object'
    && !Array.isArray(packageDayMediaRaw)
    && Object.keys(packageDayMediaRaw as Record<string, unknown>).length > 0;
  programGalleryUrls.forEach(addGallery);
  if (!hasCuratedPackageGallery) {
    filterEditorialImageUrls(extractImageUrls(product.photos)).forEach(addGallery);
    filterEditorialImageUrls(extractImageUrls(product.images)).forEach(addGallery);
    filterEditorialImageUrls(extractImageUrls(product.image)).forEach(addGallery);
  }

  const itinerary = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as Array<Record<string, unknown>>)
    : [];
  itinerary.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const dayCandidate = parseMaybeNumber(entry.day) ?? parseMaybeNumber(entry.day_number);
    const day = dayCandidate && dayCandidate > 0 ? dayCandidate : index + 1;
    const urls = filterEditorialImageUrls(extractImageUrls(entry));
    urls.forEach((url) => {
      if (!hasCuratedPackageGallery) addGallery(url);
      if (!hasEnrichedDayMedia) addDay(day, url);
    });
  });

  if (gallery.length === 0) {
    const fallback = Object.values(byDay).flat();
    fallback.forEach(addGallery);
  }

  const packageDayMedia = packageDayMediaRaw;
  if (packageDayMedia && typeof packageDayMedia === 'object' && !Array.isArray(packageDayMedia)) {
    for (const [dayKey, raw] of Object.entries(packageDayMedia as Record<string, unknown>)) {
      const day = Number(dayKey);
      if (!Number.isFinite(day) || day <= 0) continue;
      filterEditorialImageUrls(extractImageUrls(raw, 1)).forEach((url) => {
        if (!hasCuratedPackageGallery) addGallery(url);
        addDay(day, url);
      });
    }
  }

  return { gallery, byDay };
}

function resolvePackageHotelItemsFromPayload(product: ProductData): PackageHotelItem[] {
  const payload = (product as ProductData & { package_hotel_items?: unknown }).package_hotel_items;
  if (!Array.isArray(payload) || payload.length === 0) return [];

  return payload.reduce<PackageHotelItem[]>((acc, raw) => {
      if (!raw || typeof raw !== 'object') return acc;
      const row = raw as Record<string, unknown>;
      const title = sanitizeProductCopy(row.title);
      if (!title) return acc;
      const city = sanitizeProductCopy(row.city) || null;
      const category = sanitizeProductCopy(row.category) || null;
      const starRating = parseMaybeNumber(row.starRating) ?? parseMaybeNumber(row.star_rating);
      const amenities = Array.isArray(row.amenities)
        ? row.amenities.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).slice(0, 4)
        : [];
      const nights = parseMaybeNumber(row.nights);
      const imageUrl = extractImageUrls(row.imageUrl, 0)[0] ?? null;
      acc.push({
        productId: sanitizeProductCopy(row.productId) || null,
        title,
        city,
        category,
        starRating,
        amenities,
        nights,
        imageUrl,
      });
      return acc;
    }, []);
}

function resolveImages(product: ProductData): string[] {
  const urls: string[] = [];
  const push = (value: unknown) => {
    extractImageUrls(value).forEach((url) => {
      if (!urls.includes(url)) urls.push(url);
    });
  };
  push((product as ProductData & { program_gallery?: unknown }).program_gallery);
  push(product.photos);
  push(product.images);
  push(product.image);
  return urls;
}

function resolveDuration(product: ProductData): string {
  if (typeof product.duration === 'string' && product.duration.trim().length > 0) return product.duration.trim();
  if (typeof product.duration_days === 'number' && typeof product.duration_nights === 'number') {
    return `${product.duration_days} días / ${product.duration_nights} noches`;
  }
  if (typeof product.duration_days === 'number') return `${product.duration_days} días`;
  return '—';
}

function resolveGroup(product: ProductData): string {
  const packageVersions = (product as ProductData & { package_versions?: unknown }).package_versions;
  const versionPax = Array.isArray(packageVersions)
    ? packageVersions
        .map((version) => {
          if (!version || typeof version !== 'object') return null;
          return parseMaybeNumber((version as PackageVersionLike).passenger_count);
        })
        .filter((value): value is number => value !== null && value > 0)
    : [];
  if (versionPax.length > 0) return `Hasta ${Math.max(...versionPax)}`;
  const options = Array.isArray(product.options) ? product.options : [];
  const maxUnits = options
    .map((option) => (typeof option.max_units === 'number' ? option.max_units : null))
    .filter((value): value is number => value !== null);
  if (maxUnits.length > 0) return `Hasta ${Math.max(...maxUnits)}`;
  return 'Privado o compartido';
}

function resolvePackageVersionOptions(product: ProductData): PackageVersionOption[] {
  const rawVersions = (product as ProductData & { package_versions?: unknown }).package_versions;
  if (!Array.isArray(rawVersions) || rawVersions.length === 0) return [];

  const mapped = rawVersions
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const row = raw as PackageVersionLike;
      const versionNumber = parseMaybeNumber(row.version_number);
      const totalPrice = parseMaybeNumber(row.total_price);
      if (!versionNumber || !totalPrice || totalPrice <= 0) return null;
      const pax = parseMaybeNumber(row.passenger_count);
      const pricePerPerson = parseMaybeNumber(row.price_per_person);
      const label = sanitizeProductCopy(row.version_label) || `Versión ${versionNumber}`;
      const summary = sanitizeProductCopy(row.services_snapshot_summary);
      const currency = sanitizeProductCopy(row.base_currency) || sanitizeProductCopy(product.currency) || 'COP';
      const id = `pkgv-${versionNumber}`;
      const displayName = pax
        ? `${label} · ${pax} ${pax === 1 ? 'persona' : 'personas'}`
        : label;
      const option: PackageVersionOption = {
        id,
        name: displayName,
        pricing_per: 'BOOKING',
        min_units: pax || undefined,
        max_units: pax || undefined,
        price_per_person: pricePerPerson && pricePerPerson > 0 ? Math.floor(pricePerPerson) : undefined,
        prices: [
          {
            unit_type_code: 'PACKAGE_VERSION',
            season: summary || 'Total versión',
            price: totalPrice,
            currency,
          },
        ],
      };
      return option;
    })
    .filter((row): row is ActivityOption => Boolean(row));

  return mapped.sort((a, b) => {
    const aIsBase = /base/i.test(a.name);
    const bIsBase = /base/i.test(b.name);
    if (aIsBase !== bIsBase) return aIsBase ? -1 : 1;
    const aPax = typeof a.max_units === 'number' ? a.max_units : Number.MAX_SAFE_INTEGER;
    const bPax = typeof b.max_units === 'number' ? b.max_units : Number.MAX_SAFE_INTEGER;
    if (aPax !== bPax) return aPax - bPax;
    return a.name.localeCompare(b.name);
  });
}

function getOptionPerPersonPrice(option: ActivityOption | null | undefined): number | null {
  const explicitPerPerson = parseMaybeNumber((option as { price_per_person?: unknown } | null | undefined)?.price_per_person);
  if (explicitPerPerson && explicitPerPerson > 0) return Math.floor(explicitPerPerson);

  const total = parseMaybeNumber(option?.prices?.[0]?.price);
  if (!total || total <= 0) return null;

  const fixedPax = getOptionFixedPax(option);

  if (!fixedPax || fixedPax <= 0) return total;
  return total / fixedPax;
}

function getOptionFixedPax(option: ActivityOption | null | undefined): number | null {
  return typeof option?.min_units === 'number'
    && typeof option.max_units === 'number'
    && option.min_units === option.max_units
    ? option.min_units
    : null;
}

function resolveCheapestPerPersonOption(options: ActivityOption[]): ActivityOption | null {
  return options.reduce<ActivityOption | null>((best, current) => {
    const currentPrice = getOptionPerPersonPrice(current);
    if (currentPrice === null) return best;
    if (!best) return current;

    const bestPrice = getOptionPerPersonPrice(best);
    return bestPrice === null || currentPrice < bestPrice ? current : best;
  }, null);
}

function mapTone(raw: unknown): TimelineItem['tone'] {
  const event = typeof raw === 'string' ? raw : 'activity';
  if (event === 'transport') return 'transporte';
  if (event === 'meal') return 'comida';
  if (event === 'lodging') return 'alojamiento';
  if (event === 'free_time') return 'libre';
  if (event === 'flight') return 'vuelo';
  return 'actividad';
}

function mapLabel(tone: TimelineItem['tone']): string {
  if (tone === 'transporte') return 'Transporte';
  if (tone === 'comida') return 'Comida';
  if (tone === 'alojamiento') return 'Alojamiento';
  if (tone === 'libre') return 'Tiempo libre';
  if (tone === 'vuelo') return 'Vuelo';
  return 'Actividad';
}

function normalizeRouteCity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(de indias|d\.c\.|dc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pushRouteStopsFromText(target: string[], text: string | null | undefined): void {
  const value = sanitizeProductCopy(text);
  if (!value) return;

  const stops = getPackageCircuitStops({ destination: value, name: value });
  for (const stop of stops) {
    const key = normalizeRouteCity(stop);
    if (!key || target.some((existing) => normalizeRouteCity(existing) === key)) continue;
    target.push(stop);
  }
}

function insertRouteStop(target: string[], stop: string, afterStop?: string | null, beforeStop?: string | null): void {
  const key = normalizeRouteCity(stop);
  if (!key || target.some((existing) => normalizeRouteCity(existing) === key)) return;

  const afterIndex = afterStop
    ? target.findIndex((existing) => normalizeRouteCity(existing) === normalizeRouteCity(afterStop))
    : -1;
  if (afterIndex >= 0) {
    target.splice(afterIndex + 1, 0, stop);
    return;
  }

  const beforeIndex = beforeStop
    ? target.findIndex((existing) => normalizeRouteCity(existing) === normalizeRouteCity(beforeStop))
    : -1;
  if (beforeIndex >= 0) {
    target.splice(beforeIndex, 0, stop);
    return;
  }

  target.push(stop);
}

function resolveRouteStopNamesFromProgram(product: ProductData, timeline: TimelineItem[], destinationHint: string | null): string[] {
  const mainStops: string[] = [];
  pushRouteStopsFromText(mainStops, destinationHint);
  pushRouteStopsFromText(mainStops, product.name ?? null);

  const timelineStops: string[] = [];
  const addTimelineText = (value: string | null | undefined) => pushRouteStopsFromText(timelineStops, value);

  for (const item of timeline) {
    if (item.tone === 'transporte' || item.tone === 'vuelo' || item.tone === 'comida') continue;
    addTimelineText(item.location);
    addTimelineText(item.title);
  }

  const rawItinerary = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as Array<Record<string, unknown>>)
    : [];
  for (const item of rawItinerary) {
    const productType = sanitizeProductCopy(item.product_type).toLowerCase();
    if (productType.includes('transporte') || productType.includes('transfer') || productType.includes('vuelo') || productType.includes('flight')) {
      continue;
    }
    addTimelineText(sanitizeProductCopy(item.destination));
    addTimelineText(sanitizeProductCopy(item.product_name));
  }

  const ordered = [...mainStops];
  if (ordered.length === 0) {
    return timelineStops;
  }

  timelineStops.forEach((stop, index) => {
    if (ordered.some((existing) => normalizeRouteCity(existing) === normalizeRouteCity(stop))) return;
    const previousMain = [...timelineStops.slice(0, index)]
      .reverse()
      .find((candidate) => mainStops.some((mainStop) => normalizeRouteCity(mainStop) === normalizeRouteCity(candidate)));
    const nextMain = timelineStops.slice(index + 1)
      .find((candidate) => mainStops.some((mainStop) => normalizeRouteCity(mainStop) === normalizeRouteCity(candidate)));
    insertRouteStop(ordered, stop, previousMain, nextMain);
  });

  return ordered;
}

function readHotelNightsByRouteStop(product: ProductData, stops: PackageCircuitStopWithCoords[]): Map<string, number> {
  const itinerary = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as Array<Record<string, unknown>>)
    : [];
  const nightsByStop = new Map<string, number>();

  for (const entry of itinerary) {
    const productType = sanitizeProductCopy(entry.product_type).toLowerCase();
    const nights = parseMaybeNumber(entry.hotel_nights);
    const destination = sanitizeProductCopy(entry.destination);
    if (!productType.includes('hotel') || !nights || nights <= 0 || !destination) continue;

    const destinationKey = normalizeRouteCity(destination);
    const stop = stops.find((candidate) => {
      const stopKey = normalizeRouteCity(candidate.city);
      return destinationKey === stopKey || destinationKey.includes(stopKey) || stopKey.includes(destinationKey);
    });
    if (!stop) continue;

    nightsByStop.set(stop.city, (nightsByStop.get(stop.city) ?? 0) + nights);
  }

  return nightsByStop;
}

function inferLodgingFromRecord(entry: Record<string, unknown>): boolean {
  if (entry.event_type === 'lodging') return true;
  const merged = `${sanitizeProductCopy(entry.title)} ${sanitizeProductCopy(entry.description)}`.toLowerCase();
  return /\b(hotel|hospedaje|alojamiento|check-?in|lodge|resort)\b/.test(merged);
}

function inferFlightFromRecord(entry: Record<string, unknown>): boolean {
  if (entry.event_type === 'flight') return true;
  const productType = sanitizeProductCopy(entry.product_type).toLowerCase();
  if (productType.includes('vuelo') || productType.includes('flight')) return true;
  if (typeof entry.flight_departure === 'string' || typeof entry.flight_arrival === 'string') return true;
  const merged = `${sanitizeProductCopy(entry.title)} ${sanitizeProductCopy(entry.description)} ${sanitizeProductCopy(entry.product_name)}`.toLowerCase();
  return /\b(vuelo|flight|aeropuerto|airline|boarding)\b/.test(merged);
}

function parseMaybeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveFlightEndpoint(entry: Record<string, unknown>, kind: 'from' | 'to'): string {
  const preferred = kind === 'from'
    ? [entry.flight_departure, entry.from_location, entry.origin, entry.departure]
    : [entry.flight_arrival, entry.to_location, entry.destination, entry.arrival];
  for (const candidate of preferred) {
    const value = sanitizeProductCopy(candidate);
    if (value) return value;
  }
  return kind === 'from' ? 'Origen' : 'Destino';
}

function getTodayDateInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function isGenericTimelineTitle(value: string, packageName?: string | null): boolean {
  const normalized = sanitizeProductCopy(value).toLowerCase();
  if (!normalized) return true;
  if (normalized.includes(' en un solo viaje')) return true;
  if (packageName && sanitizeProductCopy(packageName).toLowerCase() === normalized) return true;
  return /^(actividad|servicio|hotel|vuelo|transporte)( \+ (actividad|servicio|hotel|vuelo|transporte))*$/i.test(normalized);
}

function resolvePackageProgramItemsFromPayload(product: ProductData): TimelineItem[] {
  const payload = (product as ProductData & { package_program_items?: unknown }).package_program_items;
  if (!Array.isArray(payload) || payload.length === 0) return [];
  return payload.reduce<TimelineItem[]>((acc, raw, index) => {
    if (!raw || typeof raw !== 'object') return acc;
    const row = raw as Record<string, unknown>;
    const rawTitle = sanitizeProductCopy(row.title);
    const note = sanitizeProductCopy(row.note) || null;
    const fallbackTitleFromNote = note
      ? note.split(/\n|,|;| {2,}/g).map((part) => part.trim()).find((part) => part.length > 0) ?? null
      : null;
    const title = (!isGenericTimelineTitle(rawTitle, product.name) ? rawTitle : '') || fallbackTitleFromNote || rawTitle;
    if (!title) return acc;
    const parsedDay = parseMaybeNumber(row.day);
    const day = parsedDay && parsedDay > 0 ? parsedDay : index + 1;
    const toneRaw = sanitizeProductCopy(row.tone).toLowerCase();
    const tone: TimelineItem['tone'] =
      toneRaw === 'transporte'
        ? 'transporte'
        : toneRaw === 'comida'
          ? 'comida'
          : toneRaw === 'alojamiento'
            ? 'alojamiento'
            : toneRaw === 'libre'
              ? 'libre'
              : toneRaw === 'vuelo'
                ? 'vuelo'
                : 'actividad';
    const label = sanitizeProductCopy(row.label) || mapLabel(tone);
    const location = sanitizeProductCopy(row.location) || null;
    const imageUrl = extractImageUrls(row.imageUrl, 0)[0] ?? null;
    const time = sanitizeProductCopy(row.time) || '—';
    const productId = sanitizeProductCopy(row.productId) || null;
    acc.push({
      day,
      time,
      label,
      title,
      note,
      location,
      imageUrl,
      productId,
      tone,
    });
    return acc;
  }, []);
}

function buildTimeline(product: ProductData, payloadItems: TimelineItem[]): TimelineItem[] {
  if (payloadItems.length > 0) {
    return payloadItems.sort((a, b) => (a.day - b.day) || a.time.localeCompare(b.time));
  }

  const itinerary = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as Array<Record<string, unknown>>)
    : [];
  const rows = itinerary
    .map((entry, index): TimelineItem | null => {
      const titleRaw = entry.title;
      const title = typeof titleRaw === 'string' ? sanitizeProductCopy(titleRaw) : '';
      if (!title) return null;
      const tone = mapTone(entry.event_type as ScheduleEventType);
      const dayValue = typeof entry.day === 'number'
        ? entry.day
        : typeof entry.day_number === 'number'
          ? entry.day_number
          : index + 1;
      const timeRaw = typeof entry.time === 'string' ? sanitizeProductCopy(entry.time) : '';
      const noteRaw = typeof entry.description === 'string' ? sanitizeProductCopy(entry.description) : '';
      const scheduleData = Array.isArray(entry.schedule_data)
        ? (entry.schedule_data as Array<Record<string, unknown>>)
        : [];
      const scheduleSummary = scheduleData
        .map((step) => sanitizeProductCopy(step?.title))
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ');
      return {
        day: dayValue > 0 ? dayValue : index + 1,
        time: timeRaw || '—',
        label: mapLabel(tone),
        title,
        note: noteRaw || scheduleSummary || null,
        location: sanitizeProductCopy(entry.destination) || null,
        imageUrl: extractImageUrls(entry.image, 0)[0] ?? null,
        tone,
      };
    })
    .filter((item): item is TimelineItem => Boolean(item));

  if (rows.length > 0) return rows;

  return [
    {
      day: 1,
      time: 'Llegada',
      label: 'Transporte',
      title: 'Inicio del recorrido',
      note: 'Recepción y coordinación de logística.',
      location: null,
      imageUrl: null,
      tone: 'transporte',
    },
    {
      day: 2,
      time: 'Mañana',
      label: 'Actividad',
      title: 'Experiencias destacadas',
      note: 'Recorridos guiados y actividades seleccionadas.',
      location: null,
      imageUrl: null,
      tone: 'actividad',
    },
    {
      day: 3,
      time: 'Tarde',
      label: 'Alojamiento',
      title: 'Check-in y descanso',
      note: 'Hospedaje con servicios recomendados.',
      location: null,
      imageUrl: null,
      tone: 'alojamiento',
    },
  ];
}

export function EditorialPackageDetailClient({
  website,
  basePath,
  product,
  displayName,
  displayLocation,
  resolvedLocale: _resolvedLocale,
  googleReviews,
  similarProducts,
  planner,
  faqs,
}: EditorialPackageDetailClientProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [reviewKeyword, setReviewKeyword] = useState('');
  const initialPackageOptions = useMemo(() => resolvePackageVersionOptions(product), [product]);
  const options = useMemo(() => (Array.isArray(product.options) ? product.options : []), [product.options]);
  const initialSelectedOption = useMemo(() => {
    if (initialPackageOptions.length > 0) {
      return resolveCheapestPerPersonOption(initialPackageOptions) ?? initialPackageOptions[0] ?? null;
    }
    return options[0] ?? null;
  }, [initialPackageOptions, options]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(() => {
    return initialSelectedOption?.id || 'base';
  });
  const [pax, setPax] = useState(() => getOptionFixedPax(initialSelectedOption) ?? 2);
  const [datePref, setDatePref] = useState('');
  const minDate = getTodayDateInputValue();

  const media = useMemo(() => resolvePackageMedia(product), [product]);
  const curatedPackageGallery = useMemo(
    () => filterEditorialImageUrls(
      extractImageUrls((product as ProductData & { program_gallery?: unknown }).program_gallery)
    ),
    [product]
  );
  const images = media.gallery;
  const highlights = useMemo(() => normalizeTextList(product.highlights), [product.highlights]);
  const recommendations = useMemo(() => normalizeTextList(product.recommendations), [product.recommendations]);
  const inclusions = useMemo(() => normalizeTextList(product.inclusions), [product.inclusions]);
  const exclusions = useMemo(() => normalizeTextList(product.exclusions), [product.exclusions]);
  const programItems = useMemo(() => resolvePackageProgramItemsFromPayload(product), [product]);
  const timeline = useMemo(() => buildTimeline(product, programItems), [product, programItems]);
  const { currencyConfig, preferredCurrency } = usePreferredCurrency(website.content.account);

  const reviewRating = useMemo(() => {
    if (typeof product.rating === 'number' && product.rating > 0) return product.rating;
    if (googleReviews.length === 0) return null;
    return googleReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / googleReviews.length;
  }, [googleReviews, product.rating]);
  const reviewCount = typeof product.review_count === 'number' && product.review_count > 0
    ? product.review_count
    : googleReviews.length;
  const filteredReviews = useMemo(() => {
    const query = reviewKeyword.trim().toLowerCase();
    if (!query) return googleReviews;
    return googleReviews.filter((review) => {
      const haystack = `${review.author_name} ${review.text} ${review.response?.text || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [googleReviews, reviewKeyword]);

  const sourcePrice = typeof product.price === 'number' ? product.price : null;
  const sourceCurrency = product.currency || 'COP';
  const displayCurrency = preferredCurrency ?? sourceCurrency;
  const formatInPreferredCurrency = (amount: number | null | undefined, fromCurrency: string | null | undefined) => {
    const targetCurrency = preferredCurrency ?? fromCurrency ?? sourceCurrency;
    const converted = convertCurrencyAmount(amount, fromCurrency ?? sourceCurrency, targetCurrency, currencyConfig);
    return formatPriceOrConsult(converted, targetCurrency);
  };
  const whatsappUrl = buildWhatsAppUrl({
    phone: website.content?.social?.whatsapp,
    productName: displayName,
    location: displayLocation || product.location || product.city || product.country,
    ref: product.id,
    url: website.custom_domain
      ? `https://${website.custom_domain}${basePath}`
      : website.subdomain
        ? `https://${website.subdomain}.bukeer.com${basePath}`
        : undefined,
  });

  const breadcrumbItems = [
    { label: 'Inicio', href: `${basePath}/` },
    { label: 'Paquetes', href: `${basePath}/paquetes` },
    { label: displayName },
  ];

  const explicitHeroImage = useMemo(() => {
    const socialImage = filterEditorialImageUrls(
      extractImageUrls((product as ProductData & { social_image?: unknown }).social_image)
    )[0];
    const coverFromProduct = filterEditorialImageUrls(extractImageUrls(product.image))[0];
    return socialImage || coverFromProduct || null;
  }, [product]);
  const heroImage = explicitHeroImage || curatedPackageGallery[0] || images[0] || null;
  const optionsForRail: ActivityOption[] = initialPackageOptions.length > 0
    ? initialPackageOptions
    : options.length > 0
      ? options
      : [{ id: 'base', name: 'Plan base', pricing_per: 'UNIT', prices: [] }];
  const selectedOption = optionsForRail.find((option) => option.id === selectedOptionId) || optionsForRail[0];
  useEffect(() => {
    const fixedPax = getOptionFixedPax(selectedOption);
    if (fixedPax && fixedPax !== pax) {
      setPax(fixedPax);
    }
  }, [pax, selectedOption]);
  const selectedOptionBasePrice = selectedOption?.prices?.[0];
  const selectedPerPersonPrice = getOptionPerPersonPrice(selectedOption);
  const displayPrice = convertCurrencyAmount(
    selectedPerPersonPrice ?? sourcePrice,
    selectedOptionBasePrice?.currency ?? sourceCurrency,
    displayCurrency,
    currencyConfig,
  );
  const priceLabel = formatPriceOrConsult(displayPrice, displayCurrency);
  const waflowPrefill = useMemo(() => ({
    when: datePref ? `Fecha exacta: ${datePref}` : 'Flexible',
    adults: pax,
    children: 0,
    notes: [
      `Paquete de interés: ${displayName}`,
      datePref ? `Fecha tentativa: ${datePref}` : null,
      `Personas: ${pax}`,
      selectedOption?.name ? `Opción elegida: ${selectedOption.name}` : null,
    ].filter(Boolean).join('\n'),
  }), [datePref, pax, displayName, selectedOption?.name]);
  const waflowPackageContext = useMemo(() => ({
    slug: product.slug || toSlug(displayName) || 'paquete',
    title: displayName,
    days: typeof product.duration_days === 'number' ? product.duration_days : null,
    nights: typeof product.duration_nights === 'number' ? product.duration_nights : null,
    currency: sourceCurrency ?? 'COP',
    price: sourcePrice,
    tier: selectedOption?.name || null,
    heroImageUrl: heroImage,
    destinationSlug: toSlug(displayLocation || product.location || product.city || product.country || 'colombia'),
  }), [
    product.slug,
    displayName,
    product.duration_days,
    product.duration_nights,
    sourceCurrency,
    sourcePrice,
    selectedOption?.name,
    heroImage,
    displayLocation,
    product.location,
    product.city,
    product.country,
  ]);

  const routeStops = useMemo(() => {
    const itineraryItems = Array.isArray(product.itinerary_items) ? product.itinerary_items : [];
    const destinationHint =
      typeof (product as unknown as Record<string, unknown>).destination === 'string'
        ? String((product as unknown as Record<string, unknown>).destination)
        : product.location ?? null;
    const stopsFromProgram = resolveRouteStopNamesFromProgram(product, timeline, destinationHint);
    const stops = stopsFromProgram.length > 0 ? stopsFromProgram : getPackageCircuitStops({
      itineraryItems,
      name: product.name ?? null,
      destination: destinationHint,
    });
    return withCoords(stops);
  }, [product, timeline]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<number, TimelineItem[]>();
    for (const item of timeline) {
      if (!groups.has(item.day)) groups.set(item.day, []);
      groups.get(item.day)?.push(item);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [timeline]);

  const defaultOpenDay = groupedTimeline[0]?.[0] ?? null;

  const routeStopsWithNights = useMemo<RouteStopItem[]>(() => {
    if (routeStops.length === 0) return [];
    const curatedNights = readHotelNightsByRouteStop(product, routeStops);
    if (curatedNights.size > 0) {
      return routeStops.map((stop, index) => {
        const stopName = stop.city || `Parada ${index + 1}`;
        return { name: stopName, nights: Math.max(1, curatedNights.get(stopName) ?? 1) };
      });
    }

    const totalNights = typeof product.duration_nights === 'number' && product.duration_nights > 0
      ? product.duration_nights
      : Math.max(routeStops.length, 1);
    const base = Math.max(1, Math.floor(totalNights / routeStops.length));
    let remaining = totalNights;
    return routeStops.map((stop, index) => {
      const nights = index === routeStops.length - 1
        ? Math.max(1, remaining)
        : Math.max(1, base);
      remaining -= nights;
      const stopName = typeof stop === 'string'
        ? stop
        : typeof stop?.city === 'string'
          ? stop.city
          : `Parada ${index + 1}`;
      return { name: stopName, nights };
    });
  }, [routeStops, product]);

  const packageHotels = useMemo<PackageHotelItem[]>(() => {
    const galleryForHotels = curatedPackageGallery.length > 0 ? curatedPackageGallery : images;
    const hotelsFromPayload = resolvePackageHotelItemsFromPayload(product);
    if (hotelsFromPayload.length > 0) {
      return hotelsFromPayload.slice(0, 4).map((hotel, index) => ({
        ...hotel,
        imageUrl: hotel.imageUrl || galleryForHotels[index % Math.max(galleryForHotels.length, 1)] || null,
      }));
    }

    const itinerary = Array.isArray(product.itinerary_items)
      ? (product.itinerary_items as Array<Record<string, unknown>>)
      : [];
    const linkedHotelRows = itinerary
      .filter((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const productType = sanitizeProductCopy((entry as Record<string, unknown>).product_type).toLowerCase();
        if (productType.includes('hotel') || productType === 'lodging') return true;
        return inferLodgingFromRecord(entry);
      });
    const hotelsFromItinerary = linkedHotelRows
      .map((entry, index) => {
        const title = sanitizeProductCopy(
          typeof entry.hotel_name === 'string'
            ? entry.hotel_name
            : typeof entry.product_name === 'string'
              ? entry.product_name
            : typeof entry.title === 'string'
              ? entry.title
              : ''
        );
        const city = sanitizeProductCopy(
          typeof entry.city === 'string'
            ? entry.city
            : typeof entry.destination === 'string'
              ? entry.destination
              : typeof entry.location === 'string'
                ? entry.location
                : displayLocation || product.location || product.city || ''
        ) || null;
        const category = sanitizeProductCopy(
          typeof entry.category === 'string'
            ? entry.category
            : typeof entry.hotel_category === 'string'
              ? entry.hotel_category
              : 'Hotel seleccionado'
        ) || null;
        const nights = parseMaybeNumber(entry.nights);
        const starRating = parseMaybeNumber(entry.star_rating) ?? parseMaybeNumber(entry.rating);
        const amenities = Array.isArray(entry.amenities)
          ? entry.amenities.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).slice(0, 4)
          : [];
        return {
          title: title || `Alojamiento ${index + 1}`,
          city,
          category,
          starRating,
          amenities,
          nights,
          imageUrl: galleryForHotels[index % Math.max(galleryForHotels.length, 1)] || null,
        } satisfies PackageHotelItem;
      });

    if (hotelsFromItinerary.length > 0) return hotelsFromItinerary.slice(0, 4);

    if (routeStopsWithNights.length > 0) {
      return routeStopsWithNights.slice(0, 3).map((stop, index) => ({
        title: `Hotel en ${stop.name}`,
        city: stop.name,
        category: 'Selección editorial',
        starRating: null,
        amenities: ['Desayuno', 'Wi-Fi'],
        nights: stop.nights,
        imageUrl: galleryForHotels[index % Math.max(galleryForHotels.length, 1)] || null,
      }));
    }

    return [];
  }, [curatedPackageGallery, product.itinerary_items, product.location, product.city, displayLocation, images, routeStopsWithNights]);

  const domesticFlights = useMemo<FlightItem[]>(() => {
    const itinerary = Array.isArray(product.itinerary_items)
      ? (product.itinerary_items as Array<Record<string, unknown>>)
      : [];
    const flightRows = itinerary.filter((entry) => entry && typeof entry === 'object' && inferFlightFromRecord(entry));
    const timelineFlights = timeline.filter((entry) => entry.tone === 'vuelo');
    const fromItinerary = flightRows.map((entry, index) => {
        const from = resolveFlightEndpoint(entry, 'from');
        const to = resolveFlightEndpoint(entry, 'to');
        const dayFromItinerary = parseMaybeNumber(entry.day) ?? parseMaybeNumber(entry.day_number);
        const dayFromTimeline = timelineFlights[index]?.day ?? null;
        const day = dayFromItinerary || dayFromTimeline;
        const dateLabel = day ? `Día ${day}` : `Tramo ${index + 1}`;
        const productName = sanitizeProductCopy(entry.product_name);
        const carrierRaw = sanitizeProductCopy(entry.carrier);
        const carrier = carrierRaw && !looksLikeUuid(carrierRaw) ? carrierRaw : '';
        const number = sanitizeProductCopy(entry.flight_number);
        const duration = sanitizeProductCopy(entry.duration);
        const metaParts = [productName, carrier, number, duration].filter(Boolean);
        return {
          from,
          to,
          dateLabel,
          metaLabel: metaParts.length > 0 ? metaParts.join(' · ') : 'Vuelo doméstico',
        } satisfies FlightItem;
      });
    if (fromItinerary.length > 0) {
      return fromItinerary
        .filter((flight) => flight.from !== 'Origen' || flight.to !== 'Destino')
        .slice(0, 6);
    }

    if (routeStopsWithNights.length >= 2) {
      return routeStopsWithNights.slice(0, 2).map((stop, index, arr) => ({
        from: index === 0 ? 'Internacional' : arr[index - 1].name,
        to: stop.name,
        dateLabel: `Día ${index + 1}`,
        metaLabel: 'Vuelo doméstico',
      }));
    }

    if (routeStopsWithNights.length === 1 && typeof product.duration_days === 'number' && product.duration_days >= 4) {
      return [
        {
          from: 'Internacional',
          to: routeStopsWithNights[0].name,
          dateLabel: 'Día 1',
          metaLabel: 'Vuelo de llegada',
        },
      ];
    }

    return [];
  }, [product.itinerary_items, routeStopsWithNights, product.duration_days, timeline]);

  const plannerName = planner?.fullName?.trim() || null;
  const plannerRole = planner
    ? planner.specialty || planner.position || planner.role || 'Travel planner'
    : null;
  const plannerMeta = planner
    ? [
        planner.locationName,
        ...(planner.regions ?? []).slice(0, 2),
        ...(planner.languages ?? []).slice(0, 2),
      ]
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .join(' · ')
    : null;
  const plannerProfileHref = planner?.slug ? `${basePath}/planners/${planner.slug}` : `${basePath}/planners`;

  return (
    <>
      <div data-screen-label="PackageDetail">
        <section data-testid="detail-hero" className="pkg-detail-hero relative overflow-hidden rounded-b-[28px]">
          {heroImage ? (
            <div className="relative h-[520px] w-full">
              <Image
                src={supabaseImageUrl(heroImage, { width: 1200, quality: 74 })}
                alt={displayName}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
              <div className="pkg-detail-hero-wash absolute inset-0" />
            </div>
          ) : (
            <div
              className="h-[520px] w-full"
              style={{ background: 'linear-gradient(135deg, var(--ev-hero-green), var(--ev-hero-green-2))' }}
            />
          )}

          <div className="absolute inset-x-0 bottom-20 z-10 md:bottom-24">
            <div className="pkg-detail-hero-content mx-auto w-full max-w-7xl px-6">
              <div data-testid="detail-breadcrumb" className="mb-4">
                <Breadcrumbs items={breadcrumbItems} tone="inverse" className="pkg-hero-breadcrumb" />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="chip chip-white">Paquetes</span>
                {displayLocation ? <span className="chip chip-white">{displayLocation}</span> : null}
                {reviewRating ? (
                  <span className="chip chip-white">
                    <Rating value={reviewRating} count={reviewCount} size={14} />
                  </span>
                ) : null}
              </div>
              <h1 className="display-lg text-white" dangerouslySetInnerHTML={editorialHtml(displayName) || { __html: displayName }} />
              <div className="pkg-detail-hero-actions mt-4 flex flex-wrap items-center gap-3">
                <span className="pkg-detail-hero-price inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                  Desde {priceLabel}
                </span>
                {whatsappUrl ? (
                  <WaflowCTAButton
                    variant="D"
                    pkg={waflowPackageContext}
                    prefill={waflowPrefill}
                    fallbackHref={whatsappUrl || undefined}
                    className="btn btn-accent btn-sm"
                  >
                    <Icons.whatsapp size={14} /> Personalizar por WhatsApp
                  </WaflowCTAButton>
                ) : null}
                {product.video_url ? (
                  <ProductVideoHero
                    videoUrl={product.video_url}
                    videoCaption={product.video_caption}
                    productId={product.id}
                    productName={displayName}
                    className="pkg-hero-video"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto mt-[-10px] md:mt-[-28px] w-full max-w-7xl px-6">
          <div className="pkg-meta">
            <div className="ov-item"><small>Duración</small><strong>{resolveDuration(product)}</strong></div>
            <div className="ov-item"><small>Tipo</small><strong>Circuito editorial</strong></div>
            <div className="ov-item"><small>Nivel</small><strong>Moderado</strong></div>
            <div className="ov-item"><small>Idioma</small><strong>ES · EN</strong></div>
            <div className="ov-item"><small>Grupo</small><strong>{resolveGroup(product)}</strong></div>
            <div className="ov-item">
              <small>Reseñas</small>
              <strong>{reviewRating ? `${reviewRating.toFixed(1)} ★ · ${reviewCount}` : '—'}</strong>
            </div>
          </div>

          <div className="pkg-body mt-8">
            <div className="detail-main space-y-10">
              <EditorialGalleryMosaic
                images={images}
                displayName={displayName}
                sectionTestId="detail-gallery"
                activeImageIndex={activeImageIndex}
                onSelectImage={setActiveImageIndex}
                onOpenLightbox={() => setLightboxOpen(true)}
                emptyMessage="Galería pendiente de curaduría visual."
              />

              <section data-testid="detail-description">
                <h2 className="text-2xl font-bold">Un viaje que <em>sabe a Colombia.</em></h2>
                <p className="body-lg mt-4 text-[var(--c-ink-2)]">
                  {product.description || 'Paquete diseñado por expertos locales con logística coordinada y soporte personalizado.'}
                </p>
              </section>

              <section data-testid="detail-highlights">
                <div className="highlights-grid">
                  {(highlights.length > 0
                    ? highlights
                    : [
                      'Itinerario curado por especialistas locales',
                      'Acompañamiento antes y durante el viaje',
                      'Experiencias auténticas con logística integrada',
                      'Asistencia 24/7 durante todo el recorrido',
                      'Logística integral en un solo contacto',
                      'Operador local certificado',
                    ]).slice(0, 6).map((item, index) => (
                    <article key={`${index}-${item}`} className="hl-card">
                      <div className="ic"><Icons.sparkle size={18} /></div>
                      <b>{item}</b>
                    </article>
                  ))}
                </div>
              </section>

              <div data-testid="detail-map">
                {routeStops.length > 0 ? (
                  <PackageCircuitMap
                    stops={routeStops}
                    analyticsContext={{ product_id: product.id, product_type: 'package' }}
                  />
                ) : (
                  <MeetingPointMap
                    title="Punto de encuentro"
                    subtitle="Coordinamos ubicación exacta al confirmar tu reserva."
                    meetingPoint={product.meeting_point}
                    locale={_resolvedLocale}
                  />
                )}
                {routeStops.length === 0 && !product.meeting_point ? (
                  <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-6 text-sm text-[var(--c-muted)]">
                    Mapa disponible al confirmar itinerario final.
                  </div>
                ) : null}
              </div>

              {routeStopsWithNights.length > 0 ? (
                <section className="route-map" data-testid="detail-route-strip">
                  <div className="rm-head">
                    <span className="label">Ruta del viaje</span>
                    <small>{routeStopsWithNights.length} paradas · recorrido completo</small>
                  </div>
                  <div className="rm-track">
                    <div className="rm-line" />
                    {routeStopsWithNights.map((stop, index) => (
                      <div key={`${stop.name}-${index}`} className="rm-stop">
                        <div className="rm-dot">{index + 1}</div>
                        <b>{stop.name}</b>
                        <small>{stop.nights} noche{stop.nights !== 1 ? 's' : ''}</small>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-itinerary">
                <h2 className="text-2xl font-bold">Programa <em>día a día</em></h2>
                <p className="body-md mt-2 mb-6 text-[var(--c-ink-2)]">
                  Cada día con horario, transporte, actividades y alojamiento. Todo ajustable por tu planner.
                </p>
                <div className="day-list day-list-v2">
                  {groupedTimeline.map(([day, entries]) => (
                    <div
                      key={day}
                      data-testid={`timeline-day-${day}`}
                      className={`day-card ${(openDay === null ? day === defaultOpenDay : openDay === day) ? 'open' : ''}`}
                    >
                      <button
                        type="button"
                        className="day-head"
                        onClick={() => setOpenDay(openDay === day ? null : day)}
                      >
                        <div className="num">{String(day).padStart(2, '0')}</div>
                        <div>
                          <small>{entries[0]?.location || displayLocation || product.location || product.city || 'Ruta editorial'}</small>
                          <h3>{entries[0]?.title || `Día ${day}`}</h3>
                        </div>
                        <div className="day-summary">
                          {entries.slice(0, 3).map((event, index) => (
                            <span key={`${day}-${index}`} className={`evt-pill evt-pill-${event.tone}`}>
                              {EVENT_ICON_BY_TONE[event.tone]}
                            </span>
                          ))}
                        </div>
                        <div className="chev" aria-hidden>▸</div>
                      </button>
                      <div className="day-body">
                        <div className="day-inner-v2">
                          <div className="day-timeline">
                            {entries.map((event, index) => (
                              <div
                                key={`${day}-${event.title}-${index}`}
                                data-testid={`timeline-event-${event.tone === 'vuelo' ? 'flight' : event.tone === 'transporte' ? 'transport' : event.tone === 'alojamiento' ? 'lodging' : event.tone === 'comida' ? 'meal' : event.tone === 'libre' ? 'free_time' : 'activity'}`}
                                className={`evt evt-${event.tone}`}
                              >
                                <div className="evt-time">{event.time}</div>
                                <div className="evt-dot"><span>{EVENT_ICON_BY_TONE[event.tone]}</span></div>
                                <div className="evt-body">
                                  <small>{event.label}</small>
                                  <b>{event.title}</b>
                                  {event.note ? <p>{event.note}</p> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="day-media">
                            {(entries.some((entry) => Boolean(entry.imageUrl)) || media.byDay[day]?.length || images.length > 0) ? (
                              <Image
                                src={supabaseImageUrl(
                                  entries.find((entry) => Boolean(entry.imageUrl))?.imageUrl
                                  || (media.byDay[day]?.[0])
                                  || images[(Math.max(day, 1) - 1) % images.length],
                                  { width: 420, quality: 70 },
                                )}
                                alt={`${displayName} día ${day}`}
                                fill
                                sizes="(max-width: 1024px) 100vw, 300px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-[var(--c-surface-2)]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {packageHotels.length > 0 ? (
                <section data-testid="detail-hotels">
                  <h2 className="text-2xl font-bold">Alojamientos <em>seleccionados</em></h2>
                  <p className="body-md mt-2 mb-6 text-[var(--c-muted)]">
                    Hoteles boutique y fincas curadas por tu planner. Se pueden ajustar por categoría sin cambiar el resto del viaje.
                  </p>
                  <div className="hotels-grid">
                    {packageHotels.map((hotel, index) => (
                      <HotelCard
                        key={`${hotel.title}-${index}`}
                        variant="card"
                        title={hotel.title}
                        city={hotel.city}
                        category={hotel.category}
                        starRating={hotel.starRating}
                        amenities={hotel.amenities}
                        nights={hotel.nights}
                        imageUrl={hotel.imageUrl}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {domesticFlights.length > 0 ? (
                <section data-testid="detail-flights">
                  <h2 className="text-2xl font-bold">Vuelos <em>domésticos</em></h2>
                  <p className="body-md mt-2 mb-5 text-[var(--c-muted)]">Incluidos en el paquete. Horarios se confirman al cotizar.</p>
                  <div className="flights-list">
                    {domesticFlights.map((flight, index) => (
                      <div key={`${flight.from}-${flight.to}-${index}`} className="flight-row">
                        <div className="f-ic"><Icons.compass size={16} /></div>
                        <div className="f-route">
                          <b>{flight.from}</b>
                          <span className="f-arrow">→</span>
                          <b>{flight.to}</b>
                        </div>
                        <div className="f-meta">
                          <small>{flight.dateLabel}</small>
                          <span>{flight.metaLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-options">
                <h2 className="text-2xl font-bold">Opciones <em>disponibles</em></h2>
                <div className="price-table mt-5">
                  {optionsForRail.map((option) => {
                    const basePrice = option.prices?.[0];
                    const fixedPax = typeof option.min_units === 'number'
                      && typeof option.max_units === 'number'
                      && option.min_units === option.max_units
                      ? option.min_units
                      : null;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOptionId(option.id)}
                        className={`price-col text-left ${selectedOptionId === option.id ? 'selected' : ''}`}
                      >
                        <h4>{option.name}</h4>
                        <div className="pr">{formatInPreferredCurrency(basePrice?.price ?? sourcePrice, basePrice?.currency ?? sourceCurrency)}</div>
                        <div className="per">{option.pricing_per === 'UNIT' ? 'por persona' : 'total por versión'}</div>
                        <ul>
                          {fixedPax ? <li>{fixedPax} {fixedPax === 1 ? 'persona' : 'personas'}</li> : null}
                          {!fixedPax && typeof option.min_units === 'number' ? <li>Mínimo {option.min_units}</li> : null}
                          {!fixedPax && typeof option.max_units === 'number' ? <li>Grupo hasta {option.max_units}</li> : null}
                          {basePrice?.season ? <li>{basePrice.season}</li> : null}
                          {Array.isArray(option.start_times) && option.start_times.length > 0 ? <li>{option.start_times.length} salidas</li> : null}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section data-testid="detail-inclusions">
                <h2 className="text-2xl font-bold">Incluye / No incluye</h2>
                <div className="incl-grid mt-5">
                  <div className="incl-col yes">
                    <b>Incluye</b>
                    <ul>
                      {(inclusions.length > 0 ? inclusions : ['Asistencia del equipo durante todo el recorrido']).map((item) => (
                        <li key={item}><span className="mark"><Icons.check size={14} /></span>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="incl-col no">
                    <div data-testid="detail-exclusions" />
                    <b>No incluye</b>
                    <ul>
                      {(exclusions.length > 0 ? exclusions : ['Gastos personales', 'Servicios no especificados']).map((item) => (
                        <li key={item}><span className="mark"><Icons.close size={14} /></span>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {recommendations.length > 0 ? (
                <section>
                  <h2 className="text-2xl font-bold">Recomendaciones para el viaje</h2>
                  <div className="recs-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {recommendations.slice(0, 12).map((item, index) => (
                      <div key={`${index}-${item}`} className="rec-card">
                        <small className="label">Tip</small>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-reviews">
                <h2 className="text-2xl font-bold">Lo que dicen los viajeros</h2>
                <div className="mt-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icons.star size={18} />
                      <b className="text-3xl">{reviewRating?.toFixed(1) || '—'}</b>
                      <span className="text-sm text-[var(--c-muted)]">{reviewCount} reseñas</span>
                    </div>
                    {googleReviews.length > 0 ? (
                      <div className="pkg-reviews-search">
                        <input
                          type="search"
                          value={reviewKeyword}
                          onChange={(event) => setReviewKeyword(event.target.value)}
                          placeholder="Buscar por palabra clave (ej. guía, comida, hotel)"
                          className="pkg-reviews-input"
                          aria-label="Buscar reseñas por palabra clave"
                        />
                        {reviewKeyword.trim().length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setReviewKeyword('')}
                            className="pkg-reviews-clear"
                          >
                            Limpiar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {googleReviews.length > 0 ? (
                    filteredReviews.length > 0 ? (
                      <>
                        {reviewKeyword.trim().length > 0 ? (
                          <p className="mb-3 text-xs uppercase tracking-wider text-[var(--c-muted)]">
                            {filteredReviews.length} resultado(s) para “{reviewKeyword.trim()}”
                          </p>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-2">
                          {filteredReviews.slice(0, 6).map((review, index) => (
                            <article key={`${review.author_name}-${index}`} className="rounded-xl border border-[var(--c-line)] bg-[var(--c-bg)] p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <b>{review.author_name}</b>
                                <span className="text-sm text-[var(--c-muted)]">{review.rating.toFixed(1)} ★</span>
                              </div>
                              <p className="text-sm text-[var(--c-ink-2)]">{review.text}</p>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--c-muted)]">
                        No encontramos reseñas con esa palabra clave. Prueba con otro término.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-[var(--c-muted)]">
                      Aún no hay reseñas publicadas para este paquete.
                    </p>
                  )}
                </div>
              </section>

              <section data-testid="detail-faq">
                <h2 className="text-3xl font-bold text-center">Preguntas frecuentes</h2>
                <div className="faq-list mt-6">
                  {faqs.map((faq, index) => (
                    <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={`${faq.question}-${index}`}>
                      <button className="faq-q" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                        <span>{faq.question}</span>
                        <span className="plus"><Icons.plus size={14} /></span>
                      </button>
                      <div className="faq-a">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              </section>

              {plannerName ? (
                <section data-testid="detail-planner-assigned">
                  <h2 className="text-2xl font-bold">Tu travel planner para este <em>paquete</em></h2>
                  <div className="planner-detail mt-5">
                    <div
                      className="av"
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {planner?.photo ? (
                        <Image
                          src={planner.photo}
                          alt={plannerName}
                          fill
                          sizes="72px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <span aria-hidden="true">{getInitials(plannerName)}</span>
                      )}
                    </div>
                    <div>
                      <b>{plannerName}</b>
                      <small>{[plannerRole, plannerMeta].filter(Boolean).join(' · ')}</small>
                      <p>
                        {planner?.tagline || planner?.quote || planner?.bio || 'Ajusta fechas, ritmo y alojamientos según tu estilo de viaje. Te acompaña antes y durante la experiencia.'}
                      </p>
                    </div>
                    <div className="planner-actions">
                      {whatsappUrl ? (
                        <WaflowCTAButton
                          variant="D"
                          pkg={waflowPackageContext}
                          prefill={waflowPrefill}
                          fallbackHref={whatsappUrl || undefined}
                          className="btn btn-accent btn-sm"
                        >
                          <Icons.whatsapp size={14} /> Hablar por WhatsApp
                        </WaflowCTAButton>
                      ) : null}
                      <Link href={plannerProfileHref} className="btn btn-outline btn-sm">
                        Ver perfil
                      </Link>
                    </div>
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-trust">
                <h2 className="text-2xl font-bold">Reserva con confianza</h2>
                <div className="trust-row mt-5">
                  <div className="trust-item"><div className="ic"><Icons.shield size={18} /></div><div><b>RNT vigente</b><small>Operador turístico con registro activo</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.award size={18} /></div><div><b>Afiliados al sector</b><small>Alianzas con proveedores certificados</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.check size={18} /></div><div><b>Protocolos de seguridad</b><small>Verificados en cada destino</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.users size={18} /></div><div><b>Guías certificados</b><small>Equipo local y trayectoria comprobada</small></div></div>
                </div>
              </section>

              <section data-testid="detail-similares">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Experiencias similares</h2>
                  <Link href={`${basePath}/paquetes`} className="text-xs uppercase tracking-wider text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                    Ver todos
                  </Link>
                </div>
                {similarProducts.length > 0 ? (
                  <div className="similar-grid">
                    {similarProducts.slice(0, 6).map((similar) => {
                      const similarImage = resolveImages(similar)[0] || similar.image || null;
                      const similarPrice = formatInPreferredCurrency(
                        typeof similar.price === 'number' ? similar.price : null,
                        similar.currency || sourceCurrency,
                      );
                      return (
                        <article key={similar.id} className="similar-card">
                          <Link href={`${basePath}/paquetes/${similar.slug}`}>
                            <div className="similar-media">
                              {similarImage ? (
                                <Image
                                  src={supabaseImageUrl(similarImage, { width: 520, quality: 70 })}
                                  alt={similar.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="similar-body">
                              <h3>{similar.name}</h3>
                              <p>{similar.location || similar.city || 'Colombia'}</p>
                              <div className="similar-foot">
                                <span>{similarPrice}</span>
                                <strong>Ver paquete</strong>
                              </div>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="similar-empty">
                    Te sugeriremos experiencias similares cuando haya más opciones activas.
                  </div>
                )}
              </section>
            </div>

            <aside data-testid="detail-sidebar" className="detail-rail">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--c-muted)]">Desde · por persona</div>
                <div className="text-3xl font-semibold">{priceLabel}</div>
                <div className="mt-1 text-xs text-[var(--c-muted)]">Opción {selectedOption?.name?.toLowerCase() || 'base'}</div>
              </div>

              <div className="rail-form grid gap-3">
                <EditorialDateField
                  label="Fecha"
                  value={datePref}
                  min={minDate}
                  ariaLabel="Fecha tentativa"
                  helperText="Selecciona una fecha estimada"
                  onChange={setDatePref}
                />
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Personas
                  <select value={pax} onChange={(event) => setPax(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                      <option key={value} value={value}>{value} {value === 1 ? 'persona' : 'personas'}</option>
                    ))}
                  </select>
                </label>
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Opción
                  <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
                    {optionsForRail.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <WaflowCTAButton
                variant="D"
                pkg={waflowPackageContext}
                prefill={waflowPrefill}
                fallbackHref={whatsappUrl || undefined}
                className="btn btn-accent"
              >
                Personalizar este paquete <Icons.arrow size={14} />
              </WaflowCTAButton>
              <div className="rail-share">
                <button><Icons.heart size={14} /> Guardar</button>
                <button><Icons.arrowUpRight size={14} /> Compartir</button>
              </div>
            </aside>
          </div>
        </div>

        <section data-testid="detail-cta-final" className="py-16 px-4 bg-primary/5 mt-10 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para vivir este paquete?</h2>
            <p className="text-muted-foreground mb-8">Te ayudamos a ajustar itinerario, fechas y servicios en minutos.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <WaflowCTAButton
                variant="D"
                pkg={waflowPackageContext}
                prefill={waflowPrefill}
                fallbackHref={whatsappUrl || undefined}
                className="btn btn-accent"
              >
                <Icons.whatsapp size={16} /> Personalizar por WhatsApp
              </WaflowCTAButton>
              <a
                href={CAL_SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Agendar llamada
              </a>
            </div>
          </div>
        </section>
      </div>

      <WaflowCTAButton
        variant="D"
        pkg={waflowPackageContext}
        prefill={waflowPrefill}
        fallbackHref={whatsappUrl || undefined}
        className="pkg-sticky-wa"
      >
        <span data-testid="mobile-sticky-bar" className="inline-flex items-center gap-2">
          <Icons.whatsapp size={16} />
          <span>Personalizar</span>
        </span>
      </WaflowCTAButton>

      {lightboxOpen && images.length > 0 ? (
        <MediaLightbox
          type="image"
          images={images}
          activeIndex={activeImageIndex}
          altPrefix={displayName}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
          onPrev={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
          onThumb={(index) => setActiveImageIndex(index)}
        />
      ) : null}
    </>
  );
}
