import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

// Slug-safe name: lowercase, strip accents, replace spaces with hyphens
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ─── POST /api/cache-google-review-images ────────────────────────────────────
// Body: { accountId: string, maxImagesPerReview?: number (default 3) }
//
// Downloads Google CDN review photos (review.images[]) from account_google_reviews
// and caches them in Supabase Storage bucket "review-images".
// Updates account_google_reviews.reviews with Supabase CDN URLs in-place.
//
// Cached path: review-images/{accountId}/{reviewer-slug}-{index}.jpg
//
// Returns: { cached: number, failed: number, skipped: number }

export async function POST(request: NextRequest): Promise<NextResponse> {
  let accountId: string;
  let maxImagesPerReview = 3;

  try {
    const body = await request.json();
    accountId = body.accountId;
    if (typeof body.maxImagesPerReview === 'number') {
      maxImagesPerReview = Math.min(Math.max(1, body.maxImagesPerReview), 10);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  // ── 1. Fetch cached reviews ───────────────────────────────────────────────
  const { data: reviewsRow, error: fetchErr } = await supabase
    .from('account_google_reviews')
    .select('id, reviews')
    .eq('account_id', accountId)
    .single();

  if (fetchErr || !reviewsRow) {
    return NextResponse.json({ error: 'No cached reviews found for this account' }, { status: 404 });
  }

  type ReviewImage = { url: string; thumbnail?: string };
  type Review = {
    author_name: string;
    images?: ReviewImage[];
    [key: string]: unknown;
  };

  const reviews: Review[] = reviewsRow.reviews as Review[];
  if (!reviews?.length) {
    return NextResponse.json({ cached: 0, failed: 0, skipped: 0, message: 'No reviews' });
  }

  let cached = 0;
  let failed = 0;
  let skipped = 0;

  const updatedReviews = await Promise.all(
    reviews.map(async (review) => {
      if (!review.images?.length) return review;

      const slug = toSlug(review.author_name);
      const imagesToProcess = review.images.slice(0, maxImagesPerReview);
      const remainingImages = review.images.slice(maxImagesPerReview);

      const processedImages = await Promise.all(
        imagesToProcess.map(async (imgEntry, index) => {
          const originalUrl = imgEntry.url;

          // Already cached to Supabase Storage — skip
          if (originalUrl?.includes('supabase.co/storage')) {
            skipped++;
            return imgEntry;
          }

          // Only process Google CDN review photos
          const isGoogleReviewPhoto =
            originalUrl?.includes('googleusercontent.com/geougc-cs') ||
            originalUrl?.includes('googleusercontent.com/p/');

          if (!originalUrl || !isGoogleReviewPhoto) {
            skipped++;
            return imgEntry;
          }

          const storagePath = `${accountId}/${slug}-${index}.jpg`;

          try {
            // ── 2. Download photo ──────────────────────────────────────────
            const photoRes = await fetch(originalUrl, {
              redirect: 'follow',
              headers: { 'User-Agent': 'Bukeer-Bot/1.0' },
            });
            if (!photoRes.ok) {
              throw new Error(`HTTP ${photoRes.status}`);
            }

            const buffer = await photoRes.arrayBuffer();

            // ── 3. Upload to Supabase Storage ────────────────────────────
            const { error: uploadErr } = await supabase.storage
              .from('review-images')
              .upload(storagePath, buffer, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (uploadErr) {
              throw new Error(`Upload: ${uploadErr.message}`);
            }

            // ── 4. Get public CDN URL ────────────────────────────────────
            const { data: urlData } = supabase.storage
              .from('review-images')
              .getPublicUrl(storagePath);

            cached++;
            return { url: urlData.publicUrl, thumbnail: imgEntry.thumbnail };
          } catch (err) {
            console.error(`[cache-google-review-images] "${review.author_name}" img ${index}:`, err);
            failed++;
            return imgEntry; // keep original URL on failure
          }
        })
      );

      return {
        ...review,
        images: [...processedImages, ...remainingImages],
      };
    })
  );

  // ── 5. Persist updated reviews back to DB ────────────────────────────────
  const { error: updateErr } = await supabase
    .from('account_google_reviews')
    .update({ reviews: updatedReviews, updated_at: new Date().toISOString() })
    .eq('id', reviewsRow.id);

  if (updateErr) {
    console.error('[cache-google-review-images] DB update error:', updateErr.message);
    return NextResponse.json(
      { error: 'Failed to update reviews', cached, failed, skipped },
      { status: 500 }
    );
  }

  return NextResponse.json({ cached, failed, skipped });
}
