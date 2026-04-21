export interface TransferRowProps {
  fromLocation?: string | null;
  toLocation?: string | null;
  duration?: string | null;
  title?: string | null;
  description?: string | null;
}

export function TransferRow({ fromLocation, toLocation, duration, title, description }: TransferRowProps) {
  const route = [fromLocation, toLocation].filter(Boolean).join(' → ');
  const label = [route, duration].filter(Boolean).join(' · ') || title;

  return (
    <div className="space-y-1">
      {label && (
        <p className="font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
          {label}
        </p>
      )}
      {description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
