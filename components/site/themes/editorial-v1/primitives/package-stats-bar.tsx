/**
 * PackageStatsBar — editorial-v1 primitive.
 *
 * Renders a horizontal strip of stat pills (nights, days, destinations, rating)
 * for the package detail hero area. Styled via `.ev-stats-bar` / `.ev-stat-pill`
 * CSS classes defined in editorial-v1.css.
 */

import { Moon, CalendarDays, MapPin, Star } from 'lucide-react';

export interface PackageStatsBarProps {
  nights?: number | null;
  days?: number | null;
  destinationsCount?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  locale?: string;
}

export function PackageStatsBar({
  nights,
  days,
  destinationsCount,
  rating,
  reviewCount,
}: PackageStatsBarProps) {
  const pills: React.ReactNode[] = [];

  if (nights != null && nights > 0) {
    pills.push(
      <span key="nights" className="ev-stat-pill">
        <Moon aria-hidden="true" />
        <strong>{nights}</strong>
        <span className="ev-stat-label">noches</span>
      </span>
    );
  }

  if (days != null && days > 0) {
    pills.push(
      <span key="days" className="ev-stat-pill">
        <CalendarDays aria-hidden="true" />
        <strong>{days}</strong>
        <span className="ev-stat-label">días</span>
      </span>
    );
  }

  if (destinationsCount != null && destinationsCount > 0) {
    pills.push(
      <span key="destinations" className="ev-stat-pill">
        <MapPin aria-hidden="true" />
        <strong>{destinationsCount}</strong>
        <span className="ev-stat-label">
          {destinationsCount === 1 ? 'destino' : 'destinos'}
        </span>
      </span>
    );
  }

  if (rating != null && rating > 0) {
    pills.push(
      <span key="rating" className="ev-stat-pill">
        <Star aria-hidden="true" />
        <strong>{rating.toFixed(1)}</strong>
        {reviewCount != null && reviewCount > 0 ? (
          <span className="ev-stat-label">({reviewCount})</span>
        ) : null}
      </span>
    );
  }

  if (pills.length === 0) return null;

  return (
    <div className="ev-stats-bar" role="list" aria-label="Estadísticas del paquete">
      {pills}
    </div>
  );
}
