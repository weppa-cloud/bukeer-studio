/**
 * Rating — star + numeric label.
 * Port of designer `Rating` from primitives.jsx.
 * Server component (no state).
 */

import { Icons } from './icons';

export interface RatingProps {
  value: number;
  count?: number | null;
  size?: number;
  className?: string;
}

export function Rating({ value, count, size = 14, className }: RatingProps) {
  return (
    <span className={`rating${className ? ` ${className}` : ''}`}>
      <span className="star">
        <Icons.star size={size} />
      </span>
      <b>{value.toFixed(1)}</b>
      {count != null ? (
        <small style={{ color: 'var(--c-muted)', fontWeight: 500 }}>
          ({count})
        </small>
      ) : null}
    </span>
  );
}
