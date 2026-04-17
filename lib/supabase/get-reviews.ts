// Contextual review filtering for use across destination, package, activity, and planner pages.
// Reviews come from account_google_reviews table (cached from SerpAPI).
// Sorts: reviews with author_photo first, then images, then by rating.

import { getCachedGoogleReviews, type GoogleReviewData } from '@/lib/supabase/get-pages';

export type ReviewContext =
  | { type: 'destination'; name: string }
  | { type: 'package'; destination: string }
  | { type: 'activity'; name: string }
  | { type: 'planner'; name: string }
  | { type: 'general' };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function reviewScore(r: GoogleReviewData): number {
  return (r.author_photo ? 2 : 0) + ((r.images?.length ?? 0) > 0 ? 1 : 0) + (r.rating ?? 0);
}

export async function getReviewsForContext(
  accountId: string,
  context: ReviewContext,
  limit = 6
): Promise<GoogleReviewData[]> {
  const cache = await getCachedGoogleReviews(accountId);
  if (!cache?.reviews?.length) return [];

  const visible = cache.reviews.filter((r) => r.is_visible !== false);

  let filtered: GoogleReviewData[];

  switch (context.type) {
    case 'destination': {
      const slug = slugify(context.name);
      filtered = visible.filter((r) =>
        r.tags?.some((t) => slugify(t).includes(slug) || slug.includes(slugify(t)))
      );
      // fallback to general if no matches
      if (filtered.length < 2) filtered = visible;
      break;
    }
    case 'package': {
      const slug = slugify(context.destination);
      filtered = visible.filter((r) =>
        r.tags?.some((t) => slugify(t).includes(slug) || slug.includes(slugify(t)))
      );
      break;
    }
    case 'activity': {
      const slug = slugify(context.name);
      filtered = visible.filter((r) =>
        r.tags?.some((t) => slugify(t).includes(slug) || slug.includes(slugify(t))) ||
        r.text?.toLowerCase().includes(context.name.toLowerCase().split(' ')[0])
      );
      break;
    }
    case 'planner': {
      const nameLower = context.name.toLowerCase();
      // Match first name at minimum
      const firstName = nameLower.split(' ')[0];
      filtered = visible.filter((r) =>
        r.text?.toLowerCase().includes(firstName)
      );
      // fallback to general if no reviews mention this planner's name
      if (filtered.length < 2) filtered = visible;
      break;
    }
    case 'general':
    default:
      filtered = visible;
      break;
  }

  return filtered
    .sort((a, b) => reviewScore(b) - reviewScore(a))
    .slice(0, limit);
}
