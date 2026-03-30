/**
 * SerpAPI Destination Enrichment — Server-side only.
 * Fetches photos, reviews, and descriptions from Google Maps via SerpAPI.
 *
 * Cache: In-memory Map with 24h TTL.
 * Fallback: Returns null if SERPAPI_KEY not set or API fails.
 */

export interface SerpEnrichmentData {
  description: string | null;
  photos: string[];
  rating: number | null;
  reviewCount: number | null;
  reviews: Array<{ author: string; rating: number; text: string; date: string }>;
  source: 'serpapi';
}

// In-memory cache (persists across requests in Node.js, resets on deploy)
const cache = new Map<string, { data: SerpEnrichmentData; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function enrichDestinationFromSerpAPI(
  cityName: string
): Promise<SerpEnrichmentData | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) return null;

  const cacheKey = cityName.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Step 1: Search for the place
    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(cityName + ' Colombia turismo')}&type=search&hl=es&api_key=${SERPAPI_KEY}`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    const searchData = await searchRes.json();

    const place = searchData.place_results || searchData.local_results?.[0];
    const dataId = place?.data_id;

    if (!dataId) {
      const basic: SerpEnrichmentData = {
        description: place?.description || place?.snippet || null,
        photos: place?.thumbnail ? [place.thumbnail] : [],
        rating: place?.rating || null,
        reviewCount: place?.reviews || null,
        reviews: [],
        source: 'serpapi',
      };
      cache.set(cacheKey, { data: basic, ts: Date.now() });
      return basic;
    }

    // Step 2: Place details
    const detailUrl = `https://serpapi.com/search.json?engine=google_maps&type=place&data_id=${dataId}&hl=es&api_key=${SERPAPI_KEY}`;
    const detailRes = await fetch(detailUrl, { next: { revalidate: 86400 } });
    const detailData = await detailRes.json();
    const placeInfo = detailData.place_results || detailData;

    // Step 3: Reviews
    let reviews: SerpEnrichmentData['reviews'] = [];
    try {
      const reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&hl=es&sort_by=qualityScore&api_key=${SERPAPI_KEY}`;
      const reviewRes = await fetch(reviewUrl, { next: { revalidate: 86400 } });
      const reviewData = await reviewRes.json();
      reviews = (reviewData.reviews || []).slice(0, 5).map((r: Record<string, unknown>) => ({
        author: (r.user as Record<string, unknown>)?.name || 'Viajero',
        rating: (r.rating as number) || 5,
        text: ((r.snippet || r.text || '') as string).substring(0, 300),
        date: (r.date as string) || '',
      }));
    } catch { /* ignore review errors */ }

    // Step 4: Photos
    let photos: string[] = [];
    try {
      const photoUrl = `https://serpapi.com/search.json?engine=google_maps_photos&data_id=${dataId}&api_key=${SERPAPI_KEY}`;
      const photoRes = await fetch(photoUrl, { next: { revalidate: 86400 } });
      const photoData = await photoRes.json();
      photos = (photoData.photos || [])
        .slice(0, 8)
        .map((p: Record<string, unknown>) => p.image as string)
        .filter(Boolean);
    } catch { /* ignore photo errors */ }

    if (photos.length === 0 && placeInfo?.thumbnail) {
      photos = [placeInfo.thumbnail];
    }

    const enriched: SerpEnrichmentData = {
      description: placeInfo?.description || placeInfo?.editorial_summary?.text || null,
      photos,
      rating: placeInfo?.rating || null,
      reviewCount: placeInfo?.reviews || placeInfo?.user_ratings_total || null,
      reviews,
      source: 'serpapi',
    };

    cache.set(cacheKey, { data: enriched, ts: Date.now() });
    return enriched;
  } catch (error) {
    console.error('[SerpAPI Enrichment] Error:', error);
    return null;
  }
}
