import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiError, apiNotFound, apiInternalError } from '@/lib/api';
import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const log = createLogger('api.reviews');

// ─── Types ───────────────────────────────────────────────────────────

interface GoogleReview {
  review_id: string;
  position: number | null;
  link: string | null;
  author_name: string;
  author_photo: string | null;
  author_photo_original: string | null;
  author_link: string | null;
  author_contributor_id: string | null;
  author_local_guide: boolean | null;
  author_reviews_count: number | null;
  author_photos_count: number | null;
  rating: number;
  text: string;
  text_original: string | null;
  text_translated: string | null;
  date: string;
  iso_date: string | null;
  iso_date_of_last_edit: string | null;
  relative_time: string | null;
  likes: number;
  language: string | null;
  details: Record<string, unknown> | null;
  translated_details: Record<string, unknown> | null;
  images: Array<{
    url: string;
    thumbnail?: string;
    original_url?: string;
    storage_bucket?: string;
    storage_path?: string;
    cached_at?: string;
  }>;
  response: {
    text: string;
    text_original?: string | null;
    text_translated?: string | null;
    date: string;
    iso_date?: string;
    iso_date_of_last_edit?: string | null;
  } | null;
  source: 'google_reviews';
  is_visible: boolean;
  tags: string[];
}

interface SerpApiReviewFetchStats {
  pagesFetched: number;
  duplicateReviews: number;
  stoppedByPageLimit: boolean;
}

interface CachedImageStats {
  cached: number;
  failed: number;
  skipped: number;
}

// ─── Tag Extraction ──────────────────────────────────────────────────

// Colombian cities and destinations for keyword matching
const DESTINATION_KEYWORDS: Array<{ tag: string; patterns: string[] }> = [
  { tag: 'cartagena', patterns: ['cartagena'] },
  { tag: 'medellin', patterns: ['medellín', 'medellin', 'comuna 13', 'guatapé', 'guatape', 'peñol'] },
  { tag: 'bogota', patterns: ['bogotá', 'bogota', 'zipaquirá', 'zipaquira', 'monserrate'] },
  { tag: 'santa-marta', patterns: ['santa marta', 'tayrona', 'minca', 'palomino'] },
  { tag: 'san-andres', patterns: ['san andrés', 'san andres', 'providencia'] },
  { tag: 'eje-cafetero', patterns: ['eje cafetero', 'coffee', 'café', 'salento', 'cocora', 'pereira', 'armenia', 'manizales', 'filandia', 'quindío', 'quindio'] },
  { tag: 'cali', patterns: ['cali', 'salsa'] },
  { tag: 'amazonas', patterns: ['amazonas', 'leticia', 'amazon'] },
  { tag: 'la-guajira', patterns: ['guajira', 'cabo de la vela', 'punta gallinas'] },
  { tag: 'barranquilla', patterns: ['barranquilla', 'carnaval'] },
  { tag: 'bucaramanga', patterns: ['bucaramanga', 'santander', 'chicamocha', 'barichara'] },
  { tag: 'villa-de-leyva', patterns: ['villa de leyva'] },
  { tag: 'nuqui', patterns: ['nuquí', 'nuqui', 'chocó', 'choco', 'ballenas'] },
];

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];

  for (const { tag, patterns } of DESTINATION_KEYWORDS) {
    if (patterns.some((p) => lower.includes(p))) {
      tags.push(tag);
    }
  }

  return tags;
}

// ─── SerpAPI Fetch ───────────────────────────────────────────────────

function intFromEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeReviewId(value: string): string {
  return toSlug(value || 'review') || 'review';
}

function transformSerpApiReview(r: Record<string, unknown>): GoogleReview {
  const user = (r.user as Record<string, unknown>) || {};
  const responseObj = r.response as Record<string, unknown> | undefined;
  const extractedSnippet = r.extracted_snippet as Record<string, unknown> | undefined;
  const responseExtractedSnippet = responseObj?.extracted_snippet as Record<string, unknown> | undefined;
  // SerpAPI returns images as plain string URLs in most responses, but keep
  // support for object entries so future API shape changes do not drop data.
  const rawImages = r.images as Array<string | Record<string, unknown>> | undefined;
  const text =
    stringOrNull(r.snippet) ||
    stringOrNull(extractedSnippet?.translated) ||
    stringOrNull(extractedSnippet?.original) ||
    stringOrNull(r.text) ||
    '';

  return {
    review_id: stringOrNull(r.review_id) || `${stringOrNull(user.name) || 'anon'}-${r.rating}-${r.date}`,
    position: typeof r.position === 'number' ? r.position : null,
    link: stringOrNull(r.link),
    author_name: stringOrNull(user.name) || 'Anónimo',
    author_photo: stringOrNull(user.thumbnail),
    author_photo_original: stringOrNull(user.thumbnail),
    author_link: stringOrNull(user.link),
    author_contributor_id: stringOrNull(user.contributor_id),
    author_local_guide: typeof user.local_guide === 'boolean' ? user.local_guide : null,
    author_reviews_count: (user.reviews as number) ?? null,
    author_photos_count: (user.photos as number) ?? null,
    rating: (r.rating as number) || 5,
    text,
    text_original: stringOrNull(extractedSnippet?.original),
    text_translated: stringOrNull(extractedSnippet?.translated),
    date: stringOrNull(r.date) || '',
    iso_date: stringOrNull(r.iso_date),
    iso_date_of_last_edit: stringOrNull(r.iso_date_of_last_edit),
    relative_time: stringOrNull(r.relative_time_description) || stringOrNull(r.date),
    likes: (r.likes as number) || 0,
    language: stringOrNull(r.language),
    details: (r.details as Record<string, unknown>) || null,
    translated_details: (r.translated_details as Record<string, unknown>) || null,
    images: rawImages
      ? rawImages.map((img) => {
          if (typeof img === 'string') return { url: img, original_url: img };
          const url = stringOrNull(img.image) || stringOrNull(img.url) || '';
          return {
            url,
            original_url: url,
            thumbnail: stringOrNull(img.thumbnail) || undefined,
          };
        }).filter((img) => img.url)
      : [],
    response: responseObj
      ? {
          text:
            stringOrNull(responseObj.snippet) ||
            stringOrNull(responseExtractedSnippet?.translated) ||
            stringOrNull(responseExtractedSnippet?.original) ||
            stringOrNull(responseObj.text) ||
            '',
          text_original: stringOrNull(responseExtractedSnippet?.original),
          text_translated: stringOrNull(responseExtractedSnippet?.translated),
          date: stringOrNull(responseObj.date) || '',
          iso_date: stringOrNull(responseObj.iso_date) || undefined,
          iso_date_of_last_edit: stringOrNull(responseObj.iso_date_of_last_edit),
        }
      : null,
    source: 'google_reviews' as const,
    is_visible: true,
    tags: extractTags(text),
  };
}

async function fetchReviewsFromSerpAPI(placeId: string): Promise<{
  reviews: GoogleReview[];
  businessName: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  googleMapsUrl: string | null;
  topics: Array<{ keyword: string; mentions: number; id: string }>;
  stats: SerpApiReviewFetchStats;
} | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    log.error('SERPAPI_KEY not configured');
    return null;
  }

  try {
    // Step 1: Get place details + data_id from place_id
    const detailsUrl = new URL('https://serpapi.com/search.json');
    detailsUrl.searchParams.set('engine', 'google_maps');
    detailsUrl.searchParams.set('type', 'place');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('hl', 'es');
    detailsUrl.searchParams.set('api_key', SERPAPI_KEY);

    const detailsRes = await fetch(detailsUrl.toString());
    if (!detailsRes.ok) {
      log.error('SerpAPI details error', { status: detailsRes.status });
      return null;
    }

    const detailsData = await detailsRes.json();
    const place = detailsData.place_results || detailsData;
    const dataId = place.data_id;

    if (!dataId) {
      log.error('No data_id found for place_id', { placeId });
      return null;
    }

    const businessName = place.title || place.name || null;
    const averageRating = place.rating ?? null;
    const totalReviews = place.reviews ?? place.user_ratings_total ?? null;
    const googleMapsUrl = place.place_id_search
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : null;

    // Step 2: Fetch every review page using next_page_token.
    // First page is fixed by Google at 8 results; subsequent pages can use
    // `num` (SerpAPI supports 1..20) to reduce API calls.
    const maxPages = intFromEnv('SERPAPI_REVIEWS_MAX_PAGES', 40);
    const reviewsById = new Map<string, GoogleReview>();
    let nextPageToken: string | null = null;
    let pagesFetched = 0;
    let duplicateReviews = 0;
    let stoppedByPageLimit = false;
    let topics: Array<{ keyword: string; mentions: number; id: string }> = [];

    do {
      const reviewsUrl = new URL('https://serpapi.com/search.json');
      reviewsUrl.searchParams.set('engine', 'google_maps_reviews');
      reviewsUrl.searchParams.set('data_id', dataId);
      reviewsUrl.searchParams.set('hl', 'es');
      reviewsUrl.searchParams.set('sort_by', 'qualityScore');
      reviewsUrl.searchParams.set('api_key', SERPAPI_KEY);

      if (nextPageToken) {
        reviewsUrl.searchParams.set('next_page_token', nextPageToken);
        reviewsUrl.searchParams.set('num', '20');
      }

      const reviewsRes = await fetch(reviewsUrl.toString());
      if (!reviewsRes.ok) {
        log.error('SerpAPI reviews error', { status: reviewsRes.status, page: pagesFetched + 1 });
        return null;
      }

      const reviewsData = await reviewsRes.json();
      pagesFetched += 1;

      if (pagesFetched === 1 && Array.isArray(reviewsData.topics)) {
        topics = reviewsData.topics;
      }

      const rawReviews = (reviewsData.reviews || []) as Array<Record<string, unknown>>;
      for (const rawReview of rawReviews) {
        const review = transformSerpApiReview(rawReview);
        if (reviewsById.has(review.review_id)) {
          duplicateReviews += 1;
        }
        reviewsById.set(review.review_id, review);
      }

      nextPageToken =
        stringOrNull(reviewsData.serpapi_pagination?.next_page_token) ||
        null;

      if (nextPageToken && pagesFetched >= maxPages) {
        stoppedByPageLimit = true;
        break;
      }
    } while (nextPageToken);

    return {
      reviews: Array.from(reviewsById.values()),
      businessName,
      averageRating,
      totalReviews,
      googleMapsUrl,
      topics,
      stats: {
        pagesFetched,
        duplicateReviews,
        stoppedByPageLimit,
      },
    };
  } catch (error) {
    log.error('SerpAPI fetch error', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// ─── Photo Caching ───────────────────────────────────────────────────

const GOOGLE_PHOTO_RE = /googleusercontent\.com|lh[3-6]\.google/;

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function cacheReviewPhotos(
  websiteId: string,
  accountId: string,
  reviews: GoogleReview[]
): Promise<{ reviews: GoogleReview[]; stats: CachedImageStats }> {
  const srClient = createSupabaseServiceRoleClient();

  const updatedReviews = [...reviews];
  const stats: CachedImageStats = { cached: 0, failed: 0, skipped: 0 };
  const maxImagesPerReview = intFromEnv('SERPAPI_REVIEW_IMAGES_PER_REVIEW', 20);

  async function cacheUrl(
    url: string | null | undefined,
    bucket: 'review-avatars' | 'review-images',
    path: string,
    review: GoogleReview,
    usageContext: 'avatar' | 'gallery',
  ): Promise<{ publicUrl: string; storagePath: string } | null> {
    if (!url || !GOOGLE_PHOTO_RE.test(url)) {
      stats.skipped += 1;
      return null;
    }

    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Bukeer-Bot/1.0' },
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'image/jpeg';

      const { error: uploadErr } = await srClient.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { data: urlData } = srClient.storage
        .from(bucket)
        .getPublicUrl(path);

      await srClient
        .from('media_assets')
        .upsert(
          {
            account_id: accountId,
            website_id: websiteId,
            storage_bucket: bucket,
            storage_path: path,
            public_url: urlData.publicUrl,
            alt: {
              es: usageContext === 'avatar'
                ? `Foto de perfil de ${review.author_name}, reseña de ColombiaTours.Travel`
                : `Foto de experiencia publicada por ${review.author_name} en una reseña de ColombiaTours.Travel`,
            },
            title: { es: `${review.author_name} · Google Review` },
            caption: { es: review.text.slice(0, 180) },
            entity_type: 'review',
            entity_id: review.review_id,
            usage_context: usageContext,
            http_status: 200,
            file_size_bytes: buffer.byteLength,
            format: contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg',
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'storage_bucket,storage_path' },
        );

      stats.cached += 1;
      return { publicUrl: urlData.publicUrl, storagePath: path };
    } catch (err) {
      stats.failed += 1;
      log.error('Review image cache failed', {
        review_id: review.review_id,
        url,
        bucket,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  for (let idx = 0; idx < reviews.length; idx += 1) {
    const review = reviews[idx];
    const reviewSlug = normalizeReviewId(review.review_id);
    const authorSlug = toSlug(review.author_name || review.review_id);
    const cachedAuthor = await cacheUrl(
      review.author_photo_original || review.author_photo,
      'review-avatars',
      `${websiteId}/${reviewSlug}-${authorSlug}/avatar.jpg`,
      review,
      'avatar',
    );

    let nextReview = cachedAuthor
      ? { ...review, author_photo: cachedAuthor.publicUrl }
      : review;

    if (review.images.length > 0) {
      const cachedImages = [];
      for (let imgIdx = 0; imgIdx < review.images.length; imgIdx += 1) {
        const image = review.images[imgIdx];
        if (imgIdx >= maxImagesPerReview) {
          stats.skipped += 1;
          cachedImages.push(image);
          continue;
        }

        const cached = await cacheUrl(
          image.original_url || image.url,
          'review-images',
          `${websiteId}/${reviewSlug}-${authorSlug}/experience-${imgIdx + 1}.jpg`,
          review,
          'gallery',
        );
        cachedImages.push(
          cached
            ? {
                ...image,
                url: cached.publicUrl,
                original_url: image.original_url || image.url,
                storage_bucket: 'review-images',
                storage_path: cached.storagePath,
                cached_at: new Date().toISOString(),
              }
            : image,
        );
      }

      nextReview = { ...nextReview, images: cachedImages };
    }

    updatedReviews[idx] = nextReview;
  }

  return { reviews: updatedReviews, stats };
}

// ─── GET: Return cached reviews ──────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  const { websiteId } = await params;

  // Get account_id from website
  const { data: website, error: wErr } = await supabase
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();

  if (wErr || !website) {
    return apiNotFound('Website not found');
  }

  // Check if Google Reviews enabled
  const { data: account } = await supabase
    .from('accounts')
    .select('google_place_id, google_reviews_enabled')
    .eq('id', website.account_id)
    .single();

  if (!account?.google_reviews_enabled || !account?.google_place_id) {
    return apiSuccess({ reviews: [], enabled: false });
  }

  // Get cached reviews
  const { data: cached } = await supabase
    .from('account_google_reviews')
    .select('*')
    .eq('account_id', website.account_id)
    .single();

  if (!cached) {
    return apiSuccess({ reviews: [], cached: false });
  }

  return apiSuccess({
    reviews: cached.reviews,
    business_name: cached.business_name,
    average_rating: cached.average_rating,
    total_reviews: cached.total_reviews,
    google_maps_url: cached.google_maps_url,
    fetched_at: cached.fetched_at,
    cached: true,
  });
}

// ─── POST: Force refresh from SerpAPI ────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  const { websiteId } = await params;

  // Get account_id + google_place_id
  const { data: website } = await supabase
    .from('websites')
    .select('account_id')
    .eq('id', websiteId)
    .single();

  if (!website) {
    return apiNotFound('Website not found');
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('google_place_id, google_reviews_enabled')
    .eq('id', website.account_id)
    .single();

  if (!account?.google_place_id) {
    return apiError('VALIDATION_ERROR', 'No google_place_id configured');
  }

  // Fetch from SerpAPI
  const result = await fetchReviewsFromSerpAPI(account.google_place_id);

  if (!result) {
    return apiError('UPSTREAM_ERROR', 'Failed to fetch reviews from Google', 502);
  }

  // Cache Google profile photos + review experience photos into Supabase
  // Storage before persisting the JSONB payload. This keeps render-time
  // assets on our CDN instead of relying on volatile Google CDN URLs.
  const cached = await cacheReviewPhotos(websiteId, website.account_id, result.reviews);

  // Upsert cache
  const { error: upsertErr } = await supabase
    .from('account_google_reviews')
    .upsert(
      {
        account_id: website.account_id,
        google_place_id: account.google_place_id,
        business_name: result.businessName,
        average_rating: result.averageRating,
        total_reviews: result.totalReviews,
        google_maps_url: result.googleMapsUrl,
        reviews: cached.reviews,
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' }
    );

  if (upsertErr) {
    log.error('Upsert error', { error: upsertErr.message });
    return apiInternalError('Failed to cache reviews');
  }

  return apiSuccess({
    reviews: cached.reviews,
    business_name: result.businessName,
    average_rating: result.averageRating,
    total_reviews: result.totalReviews,
    google_maps_url: result.googleMapsUrl,
    fetched_at: new Date().toISOString(),
    count: cached.reviews.length,
    serpapi: {
      topics: result.topics,
      ...result.stats,
    },
    media_cache: cached.stats,
  });
}
