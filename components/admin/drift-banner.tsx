'use client';

import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';

interface DriftBannerProps {
  count: number;
  active: boolean;
  onToggle: () => void;
}

/**
 * Widget that surfaces how many translated variants look stale. Clicking the
 * pill toggles the `drift=true` URL filter.
 */
export function DriftBanner({ count, active, onToggle }: DriftBannerProps) {
  const tone = count > 0 ? 'warning' : 'neutral';
  const copy =
    count > 0
      ? `${count} post${count === 1 ? '' : 's'} con posible drift`
      : 'Sin drift detectado';

  return (
    <div className="studio-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--studio-text)]">Drift</p>
        <StudioBadge tone={tone}>{count}</StudioBadge>
      </div>
      <p className="text-xs text-[var(--studio-text-muted)]">{copy}</p>
      <div>
        <StudioButton
          size="sm"
          variant={active ? 'primary' : 'outline'}
          onClick={onToggle}
          aria-pressed={active}
          disabled={count === 0 && !active}
        >
          {active ? 'Quitar filtro drift' : 'Filtrar drift'}
        </StudioButton>
      </div>
    </div>
  );
}
