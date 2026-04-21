/**
 * editorial-v1 — Stats bar for activity detail pages.
 *
 * Rendered as `renderAfterHero` slot in ProductLandingPage so it appears
 * between the hero and the breadcrumb/gallery — matching the ActivityDetail
 * overview-bar in the design reference (details.jsx).
 *
 * Shows available stats only; omits items when data is missing.
 * Server component — no 'use client'.
 */

import type { ProductData, ActivityOption } from '@bukeer/website-contract';

export interface EditorialActivityStatsBarProps {
  product: ProductData;
  reviewRating?: number | null;
  reviewCount?: number | null;
}

function resolveActivityDuration(product: ProductData): string | null {
  if (product.duration && product.duration.trim().length > 0) return product.duration.trim();
  if (typeof product.duration_minutes === 'number' && product.duration_minutes > 0) {
    const h = Math.floor(product.duration_minutes / 60);
    const m = product.duration_minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  }
  return null;
}

function resolveFirstStartTime(options: ActivityOption[] | undefined): string | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  for (const opt of options) {
    if (Array.isArray(opt.start_times) && opt.start_times.length > 0) {
      return opt.start_times[0];
    }
  }
  return null;
}

function resolveFirstScheduleTime(product: ProductData): string | null {
  if (!Array.isArray(product.schedule) || product.schedule.length === 0) return null;
  for (const entry of product.schedule) {
    if (entry && typeof entry.time === 'string' && entry.time.trim().length > 0) {
      return entry.time.trim();
    }
  }
  return null;
}

function resolveGroupSize(options: ActivityOption[] | undefined): string | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  const maxUnits = options
    .map((o) => (typeof o.max_units === 'number' ? o.max_units : null))
    .filter((n): n is number => n !== null);
  if (maxUnits.length === 0) return null;
  const max = Math.max(...maxUnits);
  return `Hasta ${max}`;
}

function resolveActivityType(product: ProductData): string | null {
  const raw = product.experience_type || product.activity_type;
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) return null;
  const label = raw.trim();
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

export function EditorialActivityStatsBar({
  product,
  reviewRating = null,
  reviewCount = null,
}: EditorialActivityStatsBarProps) {
  const duration = resolveActivityDuration(product);
  const startTime = resolveFirstStartTime(product.options) ?? resolveFirstScheduleTime(product);
  const groupSize = resolveGroupSize(product.options);
  const activityType = resolveActivityType(product) ?? 'Actividad';
  const location = product.location || product.city || null;
  const rating = typeof product.rating === 'number' && product.rating > 0 ? product.rating : null;
  const ratingSource = rating ?? reviewRating;
  const ratingCount =
    typeof product.review_count === 'number' && product.review_count > 0
      ? product.review_count
      : typeof reviewCount === 'number' && reviewCount > 0
        ? reviewCount
        : null;

  const hasStats = duration || startTime || groupSize || activityType || location || ratingSource;
  if (!hasStats) return null;

  const ratingLabel = ratingSource
    ? `${ratingSource.toFixed(1)} ★${ratingCount ? ` · ${ratingCount}` : ''}`
    : null;

  return (
    <section
      data-testid="editorial-activity-stats"
      className="pt-4"
    >
      <div className="pkg-meta" style={{ marginTop: 0 }}>
        {duration ? (
          <div className="ov-item">
            <small>Duración</small>
            <strong>{duration}</strong>
          </div>
        ) : null}
        {startTime ? (
          <div className="ov-item">
            <small>Salida</small>
            <strong>{startTime}</strong>
          </div>
        ) : null}
        {activityType ? (
          <div className="ov-item">
            <small>Tipo</small>
            <strong>{activityType}</strong>
          </div>
        ) : null}
        {groupSize ? (
          <div className="ov-item">
            <small>Grupo</small>
            <strong>{groupSize}</strong>
          </div>
        ) : null}
        {location ? (
          <div className="ov-item">
            <small>Ubicación</small>
            <strong>{location}</strong>
          </div>
        ) : null}
        {ratingLabel ? (
          <div className="ov-item">
            <small>Calificación</small>
            <strong>{ratingLabel}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
