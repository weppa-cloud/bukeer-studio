import type { MeetingPoint } from '@bukeer/website-contract';
import { RouteMap } from '@/components/ui/route-map';

export interface MeetingPointMapProps {
  meetingPoint?: MeetingPoint | null;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
  height?: number;
}

function normalizeCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildLocationLabel(meetingPoint: MeetingPoint): string | null {
  const parts = [meetingPoint.address, meetingPoint.city, meetingPoint.state, meetingPoint.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());

  return parts.length > 0 ? parts.join(', ') : null;
}

export function MeetingPointMap({
  meetingPoint,
  title,
  subtitle,
  className = '',
  height = 400,
}: MeetingPointMapProps) {
  if (!meetingPoint) {
    return null;
  }

  const lat = normalizeCoordinate(meetingPoint.latitude);
  const lng = normalizeCoordinate(meetingPoint.longitude);

  if (lat === null || lng === null) {
    return null;
  }

  const label = buildLocationLabel(meetingPoint);

  return (
    <section className={className}>
      {(title || subtitle || label) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
          {label && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))', color: 'var(--text-secondary)' }}>
              <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              {label}
            </p>
          )}
        </div>
      )}

      <RouteMap
        points={[
          {
            city: label ?? 'Meeting point',
            lat,
            lng,
          },
        ]}
        className="rounded-2xl overflow-hidden"
        height={height}
      />

      {meetingPoint.google_place_id && (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Google place id: {meetingPoint.google_place_id}
        </p>
      )}
    </section>
  );
}
