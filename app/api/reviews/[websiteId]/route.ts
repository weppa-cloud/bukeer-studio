import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ───────────────────────────────────────────────────────────

interface GoogleReview {
  review_id: string;
  author_name: string;
  author_photo: string | null;
  author_link: string | null;
  author_reviews_count: number | null;
  author_photos_count: number | null;
  rating: number;
  text: string;
  date: string;
  iso_date: string | null;
  relative_time: string | null;
  likes: number;
  language: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string; iso_date?: string } | null;
  source: 'google_reviews';
  is_visible: boolean;
  tags: string[];
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

interface ReviewsCacheRow {
  account_id: string;
  google_place_id: string;
  business_name: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  google_maps_url: string | null;
  reviews: GoogleReview[];
  fetched_at: string;
}

// ─── SerpAPI Fetch ───────────────────────────────────────────────────

async function fetchReviewsFromSerpAPI(placeId: string): Promise<{
  reviews: GoogleReview[];
  businessName: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  googleMapsUrl: string | null;
} | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    console.error('[reviews] SERPAPI_KEY not configured');
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
      console.error('[reviews] SerpAPI details error:', detailsRes.status);
      return null;
    }

    const detailsData = await detailsRes.json();
    const place = detailsData.place_results || detailsData;
    const dataId = place.data_id;

    if (!dataId) {
      console.error('[reviews] No data_id found for place_id:', placeId);
      return null;
    }

    const businessName = place.title || place.name || null;
    const averageRating = place.rating ?? null;
    const totalReviews = place.reviews ?? place.user_ratings_total ?? null;
    const googleMapsUrl = place.place_id_search
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : null;

    // Step 2: Fetch reviews using data_id
    const reviewsUrl = new URL('https://serpapi.com/search.json');
    reviewsUrl.searchParams.set('engine', 'google_maps_reviews');
    reviewsUrl.searchParams.set('data_id', dataId);
    reviewsUrl.searchParams.set('hl', 'es');
    reviewsUrl.searchParams.set('sort_by', 'qualityScore');
    reviewsUrl.searchParams.set('api_key', SERPAPI_KEY);

    const reviewsRes = await fetch(reviewsUrl.toString());
    if (!reviewsRes.ok) {
      console.error('[reviews] SerpAPI reviews error:', reviewsRes.status);
      return null;
    }

    const reviewsData = await reviewsRes.json();
    const rawReviews = reviewsData.reviews || [];

    // Transform SerpAPI response to our schema — capture EVERYTHING
    const reviews: GoogleReview[] = rawReviews.map((r: Record<string, unknown>) => {
      const user = (r.user as Record<string, unknown>) || {};
      const responseObj = r.response as Record<string, unknown> | undefined;
      // SerpAPI returns images as plain string URLs (not objects)
      const rawImages = r.images as Array<string | Record<string, unknown>> | undefined;

      return {
        review_id: (r.review_id as string) || `${user.name}-${r.rating}-${r.date}`,
        author_name: (user.name as string) || 'Anónimo',
        author_photo: (user.thumbnail as string) || null,
        author_link: (user.link as string) || null,
        author_reviews_count: (user.reviews as number) ?? null,
        author_photos_count: (user.photos as number) ?? null,
        rating: (r.rating as number) || 5,
        text: (r.snippet as string) || (r.text as string) || '',
        date: (r.date as string) || '',
        iso_date: (r.iso_date as string) || (r.iso_date_of_last_edit as string) || null,
        relative_time: (r.relative_time_description as string) || (r.date as string) || null,
        likes: (r.likes as number) || 0,
        language: (r.language as string) || null,
        images: rawImages
          ? rawImages.map((img) => {
              if (typeof img === 'string') return { url: img };
              return {
                url: (img.image as string) || (img.url as string) || '',
                thumbnail: (img.thumbnail as string) || undefined,
              };
            }).filter((img) => img.url)
          : [],
        response: responseObj
          ? {
              text: (responseObj.snippet as string) || (responseObj.text as string) || '',
              date: (responseObj.date as string) || '',
              iso_date: (responseObj.iso_date as string) || undefined,
            }
          : null,
        source: 'google_reviews' as const,
        is_visible: true,
        tags: extractTags((r.snippet as string) || (r.text as string) || ''),
      };
    });

    return {
      reviews,
      businessName,
      averageRating,
      totalReviews,
      googleMapsUrl,
    };
  } catch (error) {
    console.error('[reviews] SerpAPI fetch error:', error);
    return null;
  }
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
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  // Check if Google Reviews enabled
  const { data: account } = await supabase
    .from('accounts')
    .select('google_place_id, google_reviews_enabled')
    .eq('id', website.account_id)
    .single();

  if (!account?.google_reviews_enabled || !account?.google_place_id) {
    return NextResponse.json({ reviews: [], enabled: false });
  }

  // Get cached reviews
  const { data: cached } = await supabase
    .from('account_google_reviews')
    .select('*')
    .eq('account_id', website.account_id)
    .single();

  if (!cached) {
    return NextResponse.json({ reviews: [], cached: false });
  }

  return NextResponse.json({
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
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('google_place_id, google_reviews_enabled')
    .eq('id', website.account_id)
    .single();

  if (!account?.google_place_id) {
    return NextResponse.json({ error: 'No google_place_id configured' }, { status: 400 });
  }

  // Fetch from SerpAPI
  const result = await fetchReviewsFromSerpAPI(account.google_place_id);

  if (!result) {
    return NextResponse.json({ error: 'Failed to fetch reviews from Google' }, { status: 502 });
  }

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
        reviews: result.reviews,
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' }
    );

  if (upsertErr) {
    console.error('[reviews] Upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to cache reviews' }, { status: 500 });
  }

  return NextResponse.json({
    reviews: result.reviews,
    business_name: result.businessName,
    average_rating: result.averageRating,
    total_reviews: result.totalReviews,
    google_maps_url: result.googleMapsUrl,
    fetched_at: new Date().toISOString(),
    count: result.reviews.length,
  });
}
