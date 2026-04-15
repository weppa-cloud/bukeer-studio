'use client';

import { StudioBadge } from '@/components/studio/ui/primitives';

export interface SeoTrustStateProps {
  source?: string | null;
  fetchedAt?: string | null;
  confidence?: 'live' | 'partial' | 'exploratory' | null;
  className?: string;
}

function confidenceTone(confidence: SeoTrustStateProps['confidence']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (confidence === 'live') return 'success';
  if (confidence === 'partial') return 'warning';
  if (confidence === 'exploratory') return 'danger';
  return 'neutral';
}

export function SeoTrustState({ source, fetchedAt, confidence, className }: SeoTrustStateProps) {
  return (
    <div className={className}>
      <StudioBadge tone={confidenceTone(confidence)}>
        {confidence ?? 'unknown'}
      </StudioBadge>
      <span className="ml-2 text-xs text-[var(--studio-text-muted)]">
        Fuente: {source ?? 'unknown'}
        {fetchedAt ? ` · ${new Date(fetchedAt).toLocaleString()}` : ''}
      </span>
    </div>
  );
}
