export interface FlightRowProps {
  carrier?: string | null;
  flightNumber?: string | null;
  departure?: string | null;
  arrival?: string | null;
  title?: string | null;
  description?: string | null;
}

export function FlightRow({ carrier, flightNumber, departure, arrival, title, description }: FlightRowProps) {
  const flightLabel = [carrier, flightNumber].filter(Boolean).join(' ');
  const timeLabel = [departure, arrival].filter(Boolean).join(' → ');
  const headline = flightLabel
    ? [flightLabel, timeLabel].filter(Boolean).join(' · ')
    : title;

  return (
    <div className="space-y-1">
      {headline && (
        <p className="font-medium tabular-nums leading-snug" style={{ color: 'var(--text-heading)' }}>
          {headline}
        </p>
      )}
      {departure && arrival && (
        <div className="flex items-center gap-2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          <time dateTime={departure}>{departure}</time>
          <span aria-hidden="true">→</span>
          <time dateTime={arrival}>{arrival}</time>
        </div>
      )}
      {description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
