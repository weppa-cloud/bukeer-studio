import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { HOTEL_AMENITIES_MAX } from '@bukeer/website-contract';

export interface HotelCardProps {
  title?: string | null;
  starRating?: number | null;
  amenities?: string[] | null;
  hotelSlug?: string | null;
  description?: string | null;
  /**
   * Visual variant for the card.
   * - `'inline'` (default): compact list-row used in day-event timelines — existing behavior.
   * - `'card'`: standalone card with optional media, city/nights meta — used by editorial-v1.
   */
  variant?: 'inline' | 'card';
  /**
   * Optional image URL rendered in `card` variant (16:9 media top). Ignored in `inline` variant.
   */
  imageUrl?: string | null;
  /**
   * Optional city name rendered as part of the `card` variant eyebrow.
   */
  city?: string | null;
  /**
   * Optional nights count rendered as meta in the `card` variant.
   */
  nights?: number | null;
  /**
   * Optional category/grade label (e.g. "Boutique", "Resort") shown in the eyebrow line.
   */
  category?: string | null;
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${stars} estrellas`}>
      {Array.from({ length: stars }).map((_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function HotelCard({
  title,
  starRating,
  amenities,
  hotelSlug,
  description,
  variant = 'inline',
  imageUrl,
  city,
  nights,
  category,
}: HotelCardProps) {
  const stars = typeof starRating === 'number'
    ? Math.max(1, Math.min(5, Math.round(starRating)))
    : 0;
  const displayAmenities = Array.isArray(amenities) ? amenities.slice(0, HOTEL_AMENITIES_MAX) : [];

  if (variant === 'card') {
    const eyebrowParts = [city, category].filter((part): part is string => Boolean(part && part.trim().length));
    const nightsLabel = typeof nights === 'number' && nights > 0
      ? `${nights} noche${nights > 1 ? 's' : ''}`
      : null;

    return (
      <article
        data-testid="hotel-card"
        data-variant="card"
        className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
        style={{ borderColor: 'var(--border, var(--c-line, rgba(0,0,0,0.08)))' }}
      >
        {imageUrl ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <Image
              src={imageUrl}
              alt={title ?? 'Hotel'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              placeholder="empty"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-2 p-4">
          {eyebrowParts.length > 0 ? (
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              {eyebrowParts.join(' · ')}
            </p>
          ) : null}

          {title ? (
            <h3 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-heading)' }}>
              {title}
            </h3>
          ) : null}

          {stars > 0 ? <StarRow stars={stars} /> : null}

          {displayAmenities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {displayAmenities.map((amenity) => (
                <Badge key={amenity} variant="outline" className="text-xs font-normal">
                  {amenity}
                </Badge>
              ))}
            </div>
          ) : null}

          {description ? (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          ) : null}

          {(nightsLabel || hotelSlug) && (
            <div className="mt-auto flex items-center justify-between pt-2">
              {nightsLabel ? (
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {nightsLabel}
                </span>
              ) : <span />}
              {hotelSlug ? (
                <Link
                  href={`/hoteles/${hotelSlug}`}
                  className="text-xs font-mono hover:text-primary transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={`Ver detalles del hotel ${title ?? ''}`}
                >
                  Ver hotel →
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Default: inline variant (unchanged)
  return (
    <div className="space-y-2" data-testid="hotel-card" data-variant="inline">
      {title && (
        <p className="font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
          {title}
        </p>
      )}
      {stars > 0 && <StarRow stars={stars} />}
      {displayAmenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayAmenities.map((amenity) => (
            <Badge key={amenity} variant="outline" className="text-xs font-normal">
              {amenity}
            </Badge>
          ))}
        </div>
      )}
      {description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {hotelSlug && (
        <Link
          href={`/hoteles/${hotelSlug}`}
          className="text-xs font-mono hover:text-primary transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label={`Ver detalles del hotel ${title ?? ''}`}
        >
          Ver hotel →
        </Link>
      )}
    </div>
  );
}
