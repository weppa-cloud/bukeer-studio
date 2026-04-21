import Image from 'next/image';
import type { GoogleReviewData } from '@/lib/supabase/get-pages';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewsBlockProps {
  reviews: GoogleReviewData[];
  averageRating?: number;
  totalReviews?: number;
  googleMapsUrl?: string;
  title?: string;
  variant?: 'grid-3' | 'grid-2' | 'carousel';
  websiteAccentColor?: string;
  locale?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853',
  '#FF6D00', '#7B1FA2', '#0288D1', '#00897B',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

// ─── Google "G" logo SVG ──────────────────────────────────────────────────────

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Google">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// Star path for reuse
const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';
// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: GoogleReviewData }) {
  const avatarColor = getAvatarColor(review.author_name);
  const initials = getInitials(review.author_name);
  const hasPhoto = Boolean(review.author_photo);
  const firstImage = review.images?.[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
      {/* Header: avatar + name + relative_time | Google G badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          {hasPhoto ? (
            <Image
              src={review.author_photo!}
              alt={review.author_name}
              width={48}
              height={48}
              sizes="48px"
              className="rounded-full object-cover flex-shrink-0"
              style={{
                width: 48,
                height: 48,
                border: '2px solid var(--accent, #16a34a)',
              }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
              style={{ width: 48, height: 48, backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}

          {/* Name + relative time */}
          <div className="min-w-0">
            <p
              className="font-bold text-sm leading-tight truncate"
              style={{ color: 'var(--text-heading, #0f172a)' }}
            >
              {review.author_name}
            </p>
            {review.relative_time && (
              <p
                className="text-xs mt-0.5 uppercase tracking-wide"
                style={{ color: 'var(--text-secondary, #64748b)' }}
              >
                {review.relative_time}
              </p>
            )}
          </div>
        </div>

        {/* Google G badge — top-right */}
        <div className="flex-shrink-0 mt-0.5">
          <GoogleLogo />
        </div>
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 mt-3">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < (review.rating ?? 5) ? 'text-yellow-400' : 'text-slate-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d={STAR_PATH} />
          </svg>
        ))}
      </div>

      {/* Review image thumbnail (if available) — shown ABOVE the quote */}
      {firstImage && (
        <div className="mt-3 aspect-video relative overflow-hidden rounded-lg">
          <Image
            src={firstImage.thumbnail ?? firstImage.url}
            alt={`Foto de ${review.author_name}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Quote — full text, italic, no clamp */}
      {review.text && (
        <p
          className="mt-3 text-sm leading-relaxed italic"
          style={{ color: 'var(--text-secondary, #334155)' }}
        >
          &ldquo;{review.text}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─── Reviews Block ────────────────────────────────────────────────────────────

export function ReviewsBlock({
  reviews,
  averageRating,
  totalReviews,
  googleMapsUrl,
  title,
  variant = 'grid-3',
}: ReviewsBlockProps) {
  if (reviews.length === 0) return null;

  const gridCols =
    variant === 'grid-2'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
      : variant === 'carousel'
      ? 'flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  const cardWrapper =
    variant === 'carousel'
      ? 'flex-none w-[85vw] max-w-[340px] md:max-w-96 snap-center'
      : '';

  return (
    <div>
      {/* Section header */}
      {(title || averageRating) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          {/* Left: title */}
          {title && (
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-heading)' }}
            >
              {title}
            </h2>
          )}

          {/* Right: aggregate rating badge */}
          {averageRating && (
            <div className="flex items-center gap-2 flex-shrink-0 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-2.5">
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < Math.round(averageRating) ? 'text-yellow-400' : 'text-slate-200'
                    }
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>

              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--text-heading)' }}
              >
                {averageRating}
                {totalReviews ? ` · ${totalReviews} reseñas en` : ''}
              </span>

              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  aria-label={text('reviewsViewOnGoogle')}
                >
                  <GoogleLogo />
                </a>
              ) : (
                <GoogleLogo />
              )}
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className={gridCols}>
        {reviews.map((review) => (
          <div key={review.review_id} className={cardWrapper}>
            <ReviewCard review={review} />
          </div>
        ))}
      </div>
    </div>
  );
}
