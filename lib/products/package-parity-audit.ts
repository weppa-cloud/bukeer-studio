import type { ProductData, ProductFAQ } from '@bukeer/website-contract';
import { getCategoryProducts, getProductPage } from '@/lib/supabase/get-pages';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { PACKAGE_FAQS_DEFAULT } from '@/lib/products/package-faqs-default';

type TimelineTone = 'transporte' | 'actividad' | 'comida' | 'alojamiento' | 'libre' | 'vuelo';

interface PackageProgramRow {
  day: number;
  productId: string | null;
  productType: string | null;
  title: string;
  note: string | null;
  location: string | null;
  imageUrl: string | null;
  time: string | null;
  tone: TimelineTone;
}

interface PackageHotelRow {
  productId: string | null;
  title: string;
  city: string | null;
  imageUrl: string | null;
}

interface PackageGallerySummary {
  urls: string[];
  curatedCount: number;
  promotionalCount: number;
}

interface PackageSeoSummary {
  productSchema: boolean;
  breadcrumbSchema: boolean;
  faqSchema: boolean;
  organizationSchema: boolean;
  faqCount: number;
}

export interface PackageParityView {
  productId: string;
  productSlug: string;
  program: {
    items: PackageProgramRow[];
    genericTitles: string[];
  };
  gallery: PackageGallerySummary;
  hotels: PackageHotelRow[];
  flights: {
    count: number;
  };
  similar: {
    count: number;
  };
  seo: PackageSeoSummary;
  ux: {
    heroContrastReady: boolean;
    ctaVideoOverlapGuard: boolean;
  };
}

export interface PackageParityDiff {
  program: {
    expectedCount: number;
    renderedCount: number;
    missingByProductId: string[];
    genericRenderedTitles: string[];
  };
  gallery: {
    expectedCount: number;
    renderedCount: number;
    overlapCount: number;
    missingSample: string[];
    renderedPromotionalCount: number;
  };
  hotels: {
    expectedCount: number;
    renderedCount: number;
    missingByProductId: string[];
  };
  flights: {
    expectedCount: number;
    renderedCount: number;
  };
  similar: {
    expectedCount: number;
    renderedCount: number;
  };
  seo: {
    missing: string[];
  };
}

export interface PackageParityScoreSection {
  section: 'program' | 'gallery' | 'hotels' | 'flights' | 'seo' | 'ux';
  weight: number;
  ratio: number;
  points: number;
}

export interface PackageParityScore {
  baseline_score: number;
  target_score: number;
  delta: number;
  pass_threshold_95: boolean;
  sections: PackageParityScoreSection[];
  gaps: string[];
}

export interface PackageParityAuditResult {
  expected: PackageParityView;
  rendered: PackageParityView;
  diff: PackageParityDiff;
  score: PackageParityScore;
}

interface BuildAuditInput {
  subdomain: string;
  productSlug: string;
  locale?: string;
}

interface ItineraryItemRecord {
  id_product?: unknown;
  product_type?: unknown;
  day_number?: unknown;
  day?: unknown;
  destination?: unknown;
  product_name?: unknown;
  rate_name?: unknown;
  personalized_message?: unknown;
  start_time?: unknown;
  departure_time?: unknown;
  flight_departure?: unknown;
  flight_arrival?: unknown;
  order?: unknown;
  flight_number?: unknown;
  airline?: unknown;
}

const SCORE_WEIGHTS = {
  program: 35,
  gallery: 25,
  hotels: 15,
  flights: 10,
  seo: 10,
  ux: 5,
} as const;

function sanitizeCopy(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function toOptionalString(value: unknown): string | null {
  const cleaned = sanitizeCopy(value);
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
  }
  return null;
}

function isActivityLikeProductType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeAscii(value);
  return normalized === 'actividad' || normalized === 'actividades' || normalized === 'activity' || normalized === 'servicio' || normalized === 'servicios';
}

function isHotelLikeProductType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeAscii(value);
  return normalized === 'hotel' || normalized === 'hoteles' || normalized === 'lodging';
}

function isTransferLikeProductType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeAscii(value);
  return normalized === 'transporte' || normalized === 'transfer' || normalized === 'transfers';
}

function isFlightLikeProductType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = normalizeAscii(value);
  return normalized === 'vuelo' || normalized === 'vuelos' || normalized === 'flight' || normalized === 'flights';
}

function mapTone(productType: string | null): TimelineTone {
  if (productType && isHotelLikeProductType(productType)) return 'alojamiento';
  if (productType && isTransferLikeProductType(productType)) return 'transporte';
  if (productType && isFlightLikeProductType(productType)) return 'vuelo';
  return 'actividad';
}

function extractImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const candidate =
      toOptionalString(record.image_url)
      ?? toOptionalString(record.main_image)
      ?? toOptionalString(record.url);
    if (candidate && !urls.includes(candidate)) urls.push(candidate);
  }
  return urls;
}

function looksLikeImageUrl(value: string): boolean {
  const url = value.trim();
  if (!url) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) return false;
  if (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url)) return true;
  if (/supabase\.co\/storage\/|images\.unsplash\.com\/|res\.cloudinary\.com\//i.test(url)) return true;
  return /^https?:\/\//i.test(url);
}

function isPromotionalAssetUrl(url: string): boolean {
  const normalized = decodeURIComponent(url).toLowerCase();
  return /(flyer|promo|publicidad|advert|banner|seguro|asistencia|medical|medica)/.test(normalized);
}

function filterEditorialImageUrls(urls: string[]): string[] {
  const filtered = urls.filter((url) => !isPromotionalAssetUrl(url));
  return filtered.length > 0 ? filtered : urls;
}

function isGenericTimelineTitle(value: string, packageName?: string | null): boolean {
  const normalized = normalizeAscii(value);
  if (!normalized) return true;
  if (normalized.includes(' en un solo viaje')) return true;
  if (packageName && normalized === normalizeAscii(packageName)) return true;
  if (/^(actividad|servicio|hotel|vuelo|transporte)$/.test(normalized)) return true;
  return /^(actividad|servicio|hotel|vuelo|transporte)( \+ (actividad|servicio|hotel|vuelo|transporte))+$/i.test(normalized);
}

function firstMeaningfulPhrase(value: string | null): string | null {
  if (!value) return null;
  const phrase = value
    .split(/\n|,|;| {2,}/g)
    .map((part) => sanitizeCopy(part))
    .find((part) => part.length > 0);
  return phrase ?? null;
}

function unique<T>(rows: T[]): T[] {
  return Array.from(new Set(rows));
}

function buildRenderedView(args: {
  product: ProductData;
  productSlug: string;
  faqSource: ProductFAQ[];
  similarCount: number;
  whatsappExists: boolean;
}): PackageParityView {
  const { product, productSlug, faqSource, similarCount, whatsappExists } = args;
  const payloadProgram = Array.isArray((product as ProductData & { package_program_items?: unknown }).package_program_items)
    ? ((product as ProductData & { package_program_items?: Array<Record<string, unknown>> }).package_program_items ?? [])
    : [];

  const renderedProgram: PackageProgramRow[] = payloadProgram.reduce<PackageProgramRow[]>((acc, row, index) => {
    if (!row || typeof row !== 'object') return acc;
    const titleRaw = sanitizeCopy(row.title);
    const note = toOptionalString(row.note);
    const fallbackTitle = firstMeaningfulPhrase(note);
    const packageName = toOptionalString(product.name);
    const title = !isGenericTimelineTitle(titleRaw, packageName) ? titleRaw : fallbackTitle ?? titleRaw;
    if (!title) return acc;
    const productId = toOptionalString(row.productId);
    const productType = toOptionalString(row.productType);
    const day = parsePositiveInt(row.day) ?? index + 1;
    const imageUrl = toOptionalString(row.imageUrl);
    const tone = mapTone(toOptionalString(row.tone) ?? productType);
    const time = toOptionalString(row.time);
    acc.push({
      day,
      productId,
      productType,
      title,
      note,
      location: toOptionalString(row.location),
      imageUrl,
      time,
      tone,
    });
    return acc;
  }, []);

  const renderedGenericTitles = renderedProgram
    .filter((row) => isGenericTimelineTitle(row.title, product.name))
    .map((row) => row.title);

  const dayMediaRaw = (product as ProductData & { package_day_media?: unknown }).package_day_media;
  const dayMediaUrls: string[] = [];
  if (dayMediaRaw && typeof dayMediaRaw === 'object' && !Array.isArray(dayMediaRaw)) {
    for (const raw of Object.values(dayMediaRaw as Record<string, unknown>)) {
      if (Array.isArray(raw)) {
        for (const value of raw) {
          if (typeof value === 'string' && looksLikeImageUrl(value) && !dayMediaUrls.includes(value)) {
            dayMediaUrls.push(value);
          }
        }
      }
    }
  }

  const rawProgramGallery = Array.isArray((product as ProductData & { program_gallery?: unknown }).program_gallery)
    ? ((product as ProductData & { program_gallery?: unknown[] }).program_gallery ?? [])
    : [];
  const curatedGallery = rawProgramGallery
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).url === 'string') {
        return String((value as Record<string, unknown>).url);
      }
      return null;
    })
    .filter((value): value is string => Boolean(value && looksLikeImageUrl(value)));
  const baseImages = Array.isArray(product.images)
    ? product.images.filter((value): value is string => typeof value === 'string' && looksLikeImageUrl(value))
    : [];
  const renderedGalleryUrls = unique(filterEditorialImageUrls([...curatedGallery, ...baseImages, ...dayMediaUrls]));

  const renderedHotels = Array.isArray((product as ProductData & { package_hotel_items?: unknown }).package_hotel_items)
    ? (((product as ProductData & { package_hotel_items?: Array<Record<string, unknown>> }).package_hotel_items ?? []).reduce<PackageHotelRow[]>((acc, row) => {
      const title = sanitizeCopy(row.title);
      if (!title) return acc;
      acc.push({
        productId: toOptionalString(row.productId),
        title,
        city: toOptionalString(row.city),
        imageUrl: toOptionalString(row.imageUrl),
      });
      return acc;
    }, []))
    : [];

  const renderedFlights = renderedProgram.filter((row) => row.tone === 'vuelo').length;

  return {
    productId: String(product.id ?? ''),
    productSlug,
    program: {
      items: renderedProgram,
      genericTitles: renderedGenericTitles,
    },
    gallery: {
      urls: renderedGalleryUrls,
      curatedCount: curatedGallery.length,
      promotionalCount: renderedGalleryUrls.filter((url) => isPromotionalAssetUrl(url)).length,
    },
    hotels: renderedHotels,
    flights: { count: renderedFlights },
    similar: { count: similarCount },
    seo: {
      productSchema: Boolean(product.id && product.name),
      breadcrumbSchema: true,
      faqSchema: faqSource.length > 0,
      organizationSchema: true,
      faqCount: faqSource.length,
    },
    ux: {
      heroContrastReady: true,
      ctaVideoOverlapGuard: !product.video_url || whatsappExists,
    },
  };
}

async function buildExpectedView(args: {
  product: ProductData;
  productSlug: string;
  subdomain: string;
  faqSource: ProductFAQ[];
  similarCount: number;
  whatsappExists: boolean;
}): Promise<PackageParityView> {
  const { product, productSlug, subdomain, faqSource, similarCount, whatsappExists } = args;
  const supabase = createSupabaseServiceRoleClient();
  const packageId = String(product.id ?? '');
  const itinerarySelect =
    'id_product,product_type,day_number,date,start_time,destination,product_name,rate_name,personalized_message,flight_departure,flight_arrival,departure_time,flight_number,airline,order';

  let rows: ItineraryItemRecord[] = [];
  const direct = await supabase
    .from('itinerary_items')
    .select(itinerarySelect)
    .or(`id_itinerary.eq.${packageId},source_package_id.eq.${packageId}`)
    .not('id_product', 'is', null)
    .limit(500);
  if (!direct.error && Array.isArray(direct.data) && direct.data.length > 0) {
    rows = direct.data as ItineraryItemRecord[];
  } else {
    const byItinerary = await supabase
      .from('itineraries')
      .select('id')
      .eq('source_package_id', packageId)
      .limit(50);
    const itineraryIds = Array.isArray(byItinerary.data)
      ? byItinerary.data
          .map((row) => toOptionalString((row as Record<string, unknown>).id))
          .filter((value): value is string => Boolean(value))
      : [];
    if (itineraryIds.length > 0) {
      const byIds = await supabase
        .from('itinerary_items')
        .select(itinerarySelect)
        .in('id_itinerary', itineraryIds)
        .not('id_product', 'is', null)
        .limit(500);
      if (!byIds.error && Array.isArray(byIds.data)) {
        rows = byIds.data as ItineraryItemRecord[];
      }
    }
  }

  const productIds = unique(
    rows
      .map((row) => toOptionalString(row.id_product))
      .filter((value): value is string => Boolean(value))
  );

  const mediaByProductId = new Map<string, string[]>();
  await Promise.all(
    productIds.map(async (productId) => {
      const { data, error } = await supabase.rpc('function_get_images_and_main_image', { p_id: productId });
      if (error) return;
      const urls = filterEditorialImageUrls(extractImageUrls(data));
      if (urls.length > 0) mediaByProductId.set(productId, urls);
    })
  );

  const activityIds = unique(
    rows
      .filter((row) => isActivityLikeProductType(row.product_type))
      .map((row) => toOptionalString(row.id_product))
      .filter((value): value is string => Boolean(value))
  );
  const activityMeta = new Map<string, { name: string | null; description: string | null }>();
  if (activityIds.length > 0) {
    const activities = await supabase
      .from('activities')
      .select('id,name,description')
      .in('id', activityIds);
    if (!activities.error && Array.isArray(activities.data)) {
      for (const raw of activities.data as Array<Record<string, unknown>>) {
        const id = toOptionalString(raw.id);
        if (!id) continue;
        activityMeta.set(id, {
          name: toOptionalString(raw.name),
          description: toOptionalString(raw.description),
        });
      }
    }
  }

  const hotelRows = rows.filter((row) => isHotelLikeProductType(row.product_type));
  const accountHotelIds = unique(
    hotelRows
      .map((row) => toOptionalString(row.id_product))
      .filter((value): value is string => Boolean(value))
  );
  const accountHotelMap = new Map<string, Record<string, unknown>>();
  if (accountHotelIds.length > 0) {
    const accountHotels = await supabase
      .from('account_hotels')
      .select('id,master_hotel_id,custom_name')
      .in('id', accountHotelIds);
    if (!accountHotels.error && Array.isArray(accountHotels.data)) {
      for (const raw of accountHotels.data as Array<Record<string, unknown>>) {
        const id = toOptionalString(raw.id);
        if (!id) continue;
        accountHotelMap.set(id, raw);
      }
    }
  }
  const masterHotelIds = unique(
    Array.from(accountHotelMap.values())
      .map((row) => toOptionalString(row.master_hotel_id))
      .filter((value): value is string => Boolean(value))
  );
  const masterHotelMap = new Map<string, Record<string, unknown>>();
  if (masterHotelIds.length > 0) {
    const masterHotels = await supabase
      .from('master_hotels')
      .select('id,name,city')
      .in('id', masterHotelIds);
    if (!masterHotels.error && Array.isArray(masterHotels.data)) {
      for (const raw of masterHotels.data as Array<Record<string, unknown>>) {
        const id = toOptionalString(raw.id);
        if (!id) continue;
        masterHotelMap.set(id, raw);
      }
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const dayA = parsePositiveInt(a.day_number) ?? parsePositiveInt(a.day) ?? Number.MAX_SAFE_INTEGER;
    const dayB = parsePositiveInt(b.day_number) ?? parsePositiveInt(b.day) ?? Number.MAX_SAFE_INTEGER;
    if (dayA !== dayB) return dayA - dayB;
    const orderA = parsePositiveInt(a.order) ?? Number.MAX_SAFE_INTEGER;
    const orderB = parsePositiveInt(b.order) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = toOptionalString(a.departure_time) ?? toOptionalString(a.start_time) ?? '';
    const timeB = toOptionalString(b.departure_time) ?? toOptionalString(b.start_time) ?? '';
    return timeA.localeCompare(timeB);
  });

  const expectedProgram: PackageProgramRow[] = sortedRows.map((row, index) => {
    const productId = toOptionalString(row.id_product);
    const productType = toOptionalString(row.product_type);
    const from = toOptionalString(row.flight_departure);
    const to = toOptionalString(row.flight_arrival);
    const flightRoute = from && to ? `${from} → ${to}` : null;
    const activity = productId ? activityMeta.get(productId) : null;
    const accountHotel = productId ? accountHotelMap.get(productId) : null;
    const masterHotelId = accountHotel ? toOptionalString(accountHotel.master_hotel_id) : null;
    const masterHotel = masterHotelId ? masterHotelMap.get(masterHotelId) : null;
    const personalized = toOptionalString(row.personalized_message);
    const personalizedTitle = firstMeaningfulPhrase(personalized);
    const titleCandidates = [
      accountHotel ? toOptionalString(accountHotel.custom_name) : null,
      activity?.name ?? null,
      toOptionalString(row.product_name),
      toOptionalString(row.rate_name),
      flightRoute,
    ].filter((value): value is string => Boolean(value));
    const title =
      titleCandidates.find((value) => !isGenericTimelineTitle(value, product.name))
      ?? (personalizedTitle && !isGenericTimelineTitle(personalizedTitle, product.name) ? personalizedTitle : null)
      ?? titleCandidates[0]
      ?? (isHotelLikeProductType(productType) ? 'Hotel seleccionado' : null)
      ?? (isTransferLikeProductType(productType) ? 'Traslado' : null)
      ?? (isFlightLikeProductType(productType) ? 'Vuelo' : null)
      ?? 'Actividad';
    const tone = mapTone(productType);
    const imageUrl = productId ? (mediaByProductId.get(productId)?.[0] ?? null) : null;
    const location =
      toOptionalString(row.destination)
      ?? (masterHotel ? toOptionalString(masterHotel.city) : null);
    return {
      day: parsePositiveInt(row.day_number) ?? parsePositiveInt(row.day) ?? index + 1,
      productId,
      productType,
      title,
      note: personalized ?? activity?.description ?? null,
      location,
      imageUrl,
      time: toOptionalString(row.departure_time) ?? toOptionalString(row.start_time),
      tone,
    };
  });

  const expectedHotels: PackageHotelRow[] = hotelRows.reduce<PackageHotelRow[]>((acc, row) => {
    const productId = toOptionalString(row.id_product);
    if (!productId) return acc;
    const accountHotel = accountHotelMap.get(productId);
    const masterHotel = accountHotel
      ? masterHotelMap.get(toOptionalString(accountHotel.master_hotel_id) ?? '')
      : null;
    const title =
      toOptionalString(accountHotel?.custom_name)
      ?? toOptionalString(row.product_name)
      ?? toOptionalString(masterHotel?.name)
      ?? 'Hotel seleccionado';
    acc.push({
      productId,
      title,
      city: toOptionalString(row.destination) ?? toOptionalString(masterHotel?.city),
      imageUrl: mediaByProductId.get(productId)?.[0] ?? null,
    });
    return acc;
  }, []);

  const expectedGalleryUrls = unique(
    filterEditorialImageUrls(
      Array.from(mediaByProductId.values()).flat()
    )
  );

  const expectedFlights = rows.filter((row) => isFlightLikeProductType(row.product_type)).length;

  return {
    productId: packageId,
    productSlug,
    program: {
      items: expectedProgram,
      genericTitles: expectedProgram.filter((row) => isGenericTimelineTitle(row.title, product.name)).map((row) => row.title),
    },
    gallery: {
      urls: expectedGalleryUrls,
      curatedCount: expectedGalleryUrls.length,
      promotionalCount: 0,
    },
    hotels: expectedHotels,
    flights: { count: expectedFlights },
    similar: { count: similarCount },
    seo: {
      productSchema: Boolean(product.id && product.name),
      breadcrumbSchema: true,
      faqSchema: faqSource.length > 0,
      organizationSchema: true,
      faqCount: faqSource.length,
    },
    ux: {
      heroContrastReady: true,
      ctaVideoOverlapGuard: !product.video_url || whatsappExists,
    },
  };
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 1;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function computeDiff(expected: PackageParityView, rendered: PackageParityView): PackageParityDiff {
  const expectedProgramIds = unique(
    expected.program.items
      .map((item) => item.productId)
      .filter((value): value is string => Boolean(value))
  );
  const renderedProgramIds = new Set(
    rendered.program.items
      .map((item) => item.productId)
      .filter((value): value is string => Boolean(value))
  );
  const missingProgramById = expectedProgramIds.filter((id) => !renderedProgramIds.has(id));

  const expectedGallerySet = new Set(expected.gallery.urls);
  const renderedGallerySet = new Set(rendered.gallery.urls);
  const overlap = Array.from(expectedGallerySet).filter((url) => renderedGallerySet.has(url));
  const missingGallery = Array.from(expectedGallerySet).filter((url) => !renderedGallerySet.has(url));

  const expectedHotelIds = unique(
    expected.hotels.map((item) => item.productId).filter((value): value is string => Boolean(value))
  );
  const renderedHotelIds = new Set(
    rendered.hotels.map((item) => item.productId).filter((value): value is string => Boolean(value))
  );

  const missingSeo: string[] = [];
  if (!rendered.seo.productSchema) missingSeo.push('Product');
  if (!rendered.seo.breadcrumbSchema) missingSeo.push('Breadcrumb');
  if (!rendered.seo.faqSchema) missingSeo.push('FAQ');
  if (!rendered.seo.organizationSchema) missingSeo.push('Organization');

  return {
    program: {
      expectedCount: expected.program.items.length,
      renderedCount: rendered.program.items.length,
      missingByProductId: missingProgramById,
      genericRenderedTitles: rendered.program.genericTitles,
    },
    gallery: {
      expectedCount: expected.gallery.urls.length,
      renderedCount: rendered.gallery.urls.length,
      overlapCount: overlap.length,
      missingSample: missingGallery.slice(0, 8),
      renderedPromotionalCount: rendered.gallery.promotionalCount,
    },
    hotels: {
      expectedCount: expected.hotels.length,
      renderedCount: rendered.hotels.length,
      missingByProductId: expectedHotelIds.filter((id) => !renderedHotelIds.has(id)),
    },
    flights: {
      expectedCount: expected.flights.count,
      renderedCount: rendered.flights.count,
    },
    similar: {
      expectedCount: expected.similar.count,
      renderedCount: rendered.similar.count,
    },
    seo: {
      missing: missingSeo,
    },
  };
}

function computeScore(diff: PackageParityDiff, rendered: PackageParityView): PackageParityScore {
  const programCoverage = ratio(
    diff.program.expectedCount - diff.program.missingByProductId.length,
    diff.program.expectedCount
  );
  const programGenericPenalty = rendered.program.items.length > 0
    ? 1 - ratio(diff.program.genericRenderedTitles.length, rendered.program.items.length)
    : 1;
  const programRatio = Math.max(0, Math.min(1, (programCoverage * 0.8) + (programGenericPenalty * 0.2)));

  const galleryOverlapRatio = ratio(diff.gallery.overlapCount, diff.gallery.expectedCount);
  const galleryPromoPenalty = rendered.gallery.urls.length > 0
    ? 1 - ratio(diff.gallery.renderedPromotionalCount, rendered.gallery.urls.length)
    : 1;
  const galleryRatio = Math.max(0, Math.min(1, (galleryOverlapRatio * 0.9) + (galleryPromoPenalty * 0.1)));

  const hotelsRatio = ratio(
    diff.hotels.expectedCount - diff.hotels.missingByProductId.length,
    diff.hotels.expectedCount
  );
  const flightsRatio = ratio(Math.min(diff.flights.expectedCount, diff.flights.renderedCount), diff.flights.expectedCount);

  const seoChecks = [
    rendered.seo.productSchema,
    rendered.seo.breadcrumbSchema,
    rendered.seo.faqSchema,
    rendered.seo.organizationSchema,
  ];
  const seoRatio = ratio(seoChecks.filter(Boolean).length, seoChecks.length);

  const uxChecks = [rendered.ux.heroContrastReady, rendered.ux.ctaVideoOverlapGuard];
  const uxRatio = ratio(uxChecks.filter(Boolean).length, uxChecks.length);

  const sections: PackageParityScoreSection[] = [
    { section: 'program', weight: SCORE_WEIGHTS.program, ratio: programRatio, points: SCORE_WEIGHTS.program * programRatio },
    { section: 'gallery', weight: SCORE_WEIGHTS.gallery, ratio: galleryRatio, points: SCORE_WEIGHTS.gallery * galleryRatio },
    { section: 'hotels', weight: SCORE_WEIGHTS.hotels, ratio: hotelsRatio, points: SCORE_WEIGHTS.hotels * hotelsRatio },
    { section: 'flights', weight: SCORE_WEIGHTS.flights, ratio: flightsRatio, points: SCORE_WEIGHTS.flights * flightsRatio },
    { section: 'seo', weight: SCORE_WEIGHTS.seo, ratio: seoRatio, points: SCORE_WEIGHTS.seo * seoRatio },
    { section: 'ux', weight: SCORE_WEIGHTS.ux, ratio: uxRatio, points: SCORE_WEIGHTS.ux * uxRatio },
  ];

  const baseline = Math.round(sections.reduce((sum, section) => sum + section.points, 0));
  const target = 100;
  const gaps: string[] = [];
  if (diff.program.missingByProductId.length > 0 || diff.program.genericRenderedTitles.length > 0) {
    gaps.push('Programa: faltan ítems reales o persisten títulos genéricos.');
  }
  if (diff.gallery.overlapCount < diff.gallery.expectedCount || diff.gallery.renderedPromotionalCount > 0) {
    gaps.push('Galería: cobertura incompleta o mezcla de assets promocionales.');
  }
  if (diff.hotels.missingByProductId.length > 0) {
    gaps.push('Hoteles: faltan hoteles relacionados por id_product.');
  }
  if (diff.flights.renderedCount < diff.flights.expectedCount) {
    gaps.push('Vuelos/logística: faltan tramos esperados en el render.');
  }
  if (diff.seo.missing.length > 0) {
    gaps.push(`SEO estructurado: faltan esquemas ${diff.seo.missing.join(', ')}.`);
  }
  if (!rendered.ux.ctaVideoOverlapGuard || !rendered.ux.heroContrastReady) {
    gaps.push('UX crítica: revisar contraste del header y solape CTA/video.');
  }

  return {
    baseline_score: baseline,
    target_score: target,
    delta: target - baseline,
    pass_threshold_95: baseline >= 95,
    sections,
    gaps,
  };
}

export async function buildPackageParityAudit(input: BuildAuditInput): Promise<PackageParityAuditResult | null> {
  const productPage = await getProductPage(input.subdomain, 'package', input.productSlug, {
    locale: input.locale,
  });
  if (!productPage?.product) return null;

  const product = productPage.product;
  const faqSource = Array.isArray(productPage.page?.custom_faq) && productPage.page.custom_faq.length > 0
    ? productPage.page.custom_faq
    : PACKAGE_FAQS_DEFAULT;
  const similarPayload = await getCategoryProducts(input.subdomain, 'package', { limit: 8, offset: 0 });
  const similarCount = similarPayload.items.filter((item) => String(item.id) !== String(product.id)).length;
  const whatsappExists = true;

  const rendered = buildRenderedView({
    product,
    productSlug: input.productSlug,
    faqSource,
    similarCount,
    whatsappExists,
  });
  const expected = await buildExpectedView({
    product,
    productSlug: input.productSlug,
    subdomain: input.subdomain,
    faqSource,
    similarCount,
    whatsappExists,
  });

  const diff = computeDiff(expected, rendered);
  const score = computeScore(diff, rendered);

  return {
    expected,
    rendered,
    diff,
    score,
  };
}
