import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiSuccess, apiValidationError, apiInternalError } from '@/lib/api';
import { z } from 'zod';

const log = createLogger('api.destinationEnrich');

const EnrichQuerySchema = z.object({
  city: z.string().min(1, 'Missing city parameter'),
});

/**
 * API Route: /api/destination-enrich?city=Cartagena+de+Indias
 *
 * Fetches enrichment data from SerpAPI Google Maps for a destination city.
 * Results are cached — subsequent calls return cached data.
 *
 * Flow:
 * 1. Check in-memory cache
 * 2. If miss → call SerpAPI Google Maps (text search for city + "Colombia tourism")
 * 3. Get place details (description, photos, rating, reviews)
 * 4. Cache and return
 *
 * Requires: SERPAPI_KEY env var
 */

// Simple in-memory cache (persists across requests in dev, resets on deploy)
const cache = new Map<string, { data: EnrichmentData; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface EnrichmentData {
  description: string | null;
  photos: string[];
  rating: number | null;
  reviewCount: number | null;
  reviews: Array<{ author: string; rating: number; text: string; date: string }>;
  address: string | null;
  website: string | null;
  phone: string | null;
  hours: string[] | null;
  priceLevel: string | null;
  types: string[];
  source: 'serpapi' | 'static';
}

export async function GET(request: NextRequest) {
  const parsed = EnrichQuerySchema.safeParse({
    city: request.nextUrl.searchParams.get('city'),
  });
  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }
  const { city } = parsed.data;

  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    return apiSuccess({
      data: null,
      source: 'static',
      message: 'SERPAPI_KEY not configured — using static content',
    });
  }

  // Check cache
  const cacheKey = city.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return apiSuccess({ data: cached.data, source: 'cache' });
  }

  try {
    // Step 1: Search for the place on Google Maps
    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google_maps');
    searchUrl.searchParams.set('q', `${city} Colombia turismo`);
    searchUrl.searchParams.set('type', 'search');
    searchUrl.searchParams.set('hl', 'es');
    searchUrl.searchParams.set('api_key', SERPAPI_KEY);

    const searchRes = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();

    if (!searchData.local_results?.length && !searchData.place_results) {
      return apiSuccess({ data: null, source: 'serpapi', message: 'No results found' });
    }

    // Get the first relevant result or place_results
    const place = searchData.place_results || searchData.local_results?.[0];
    const dataId = place?.data_id;

    if (!dataId) {
      // Use basic search result info
      const basicData: EnrichmentData = {
        description: place?.description || place?.snippet || null,
        photos: place?.thumbnail ? [place.thumbnail] : [],
        rating: place?.rating || null,
        reviewCount: place?.reviews || null,
        reviews: [],
        address: place?.address || null,
        website: place?.website || null,
        phone: place?.phone || null,
        hours: null,
        priceLevel: null,
        types: place?.type ? [place.type] : [],
        source: 'serpapi',
      };
      cache.set(cacheKey, { data: basicData, ts: Date.now() });
      return apiSuccess({ data: basicData, source: 'serpapi' });
    }

    // Step 2: Get detailed place info
    const detailUrl = new URL('https://serpapi.com/search.json');
    detailUrl.searchParams.set('engine', 'google_maps');
    detailUrl.searchParams.set('type', 'place');
    detailUrl.searchParams.set('data_id', dataId);
    detailUrl.searchParams.set('hl', 'es');
    detailUrl.searchParams.set('api_key', SERPAPI_KEY);

    const detailRes = await fetch(detailUrl.toString());
    const detailData = await detailRes.json();
    const placeInfo = detailData.place_results || detailData;

    // Step 3: Get reviews
    let reviews: EnrichmentData['reviews'] = [];
    if (dataId) {
      const reviewUrl = new URL('https://serpapi.com/search.json');
      reviewUrl.searchParams.set('engine', 'google_maps_reviews');
      reviewUrl.searchParams.set('data_id', dataId);
      reviewUrl.searchParams.set('hl', 'es');
      reviewUrl.searchParams.set('sort_by', 'qualityScore');
      reviewUrl.searchParams.set('api_key', SERPAPI_KEY);

      const reviewRes = await fetch(reviewUrl.toString());
      const reviewData = await reviewRes.json();

      reviews = (reviewData.reviews || []).slice(0, 5).map((r: Record<string, unknown>) => ({
        author: (r.user as Record<string, unknown>)?.name || r.author || 'Viajero',
        rating: r.rating || 5,
        text: ((r.snippet || r.text || '') as string).substring(0, 300),
        date: r.date || '',
      }));
    }

    // Step 4: Get photos
    let photos: string[] = [];
    if (dataId) {
      const photoUrl = new URL('https://serpapi.com/search.json');
      photoUrl.searchParams.set('engine', 'google_maps_photos');
      photoUrl.searchParams.set('data_id', dataId);
      photoUrl.searchParams.set('api_key', SERPAPI_KEY);

      const photoRes = await fetch(photoUrl.toString());
      const photoData = await photoRes.json();

      photos = (photoData.photos || [])
        .slice(0, 8)
        .map((p: Record<string, unknown>) => p.image as string)
        .filter(Boolean);
    }

    // If no photos from photos API, use thumbnail
    if (photos.length === 0 && placeInfo?.thumbnail) {
      photos = [placeInfo.thumbnail];
    }

    const enrichedData: EnrichmentData = {
      description: placeInfo?.description || placeInfo?.editorial_summary?.text || placeInfo?.snippet || null,
      photos,
      rating: placeInfo?.rating || null,
      reviewCount: placeInfo?.reviews || placeInfo?.user_ratings_total || null,
      reviews,
      address: placeInfo?.address || null,
      website: placeInfo?.website || null,
      phone: placeInfo?.phone || null,
      hours: placeInfo?.operating_hours?.map((h: Record<string, string>) => `${h.day}: ${h.hours}`) || null,
      priceLevel: placeInfo?.price_level || null,
      types: placeInfo?.types || placeInfo?.type ? [placeInfo.type] : [],
      source: 'serpapi',
    };

    // Cache result
    cache.set(cacheKey, { data: enrichedData, ts: Date.now() });

    return apiSuccess({ data: enrichedData, source: 'serpapi' });
  } catch (error) {
    log.error('SerpAPI error', { error: error instanceof Error ? error.message : String(error) });
    return apiInternalError('Failed to fetch from SerpAPI');
  }
}
