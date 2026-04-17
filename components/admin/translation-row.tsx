'use client';

import { useCallback } from 'react';
import {
  StudioBadge,
  StudioButton,
  StudioBadgeStatus,
} from '@/components/studio/ui/primitives';
import type { TranslationRowVM } from '@/components/admin/translations-dashboard';

interface TranslationRowProps {
  row: TranslationRowVM;
  selected: boolean;
  onToggle: (id: string) => void;
  /**
   * Label for the primary CTA (e.g. "Crear borrador" on pending rows,
   * "Review" on active rows). Agent E will wire real handlers.
   */
  primaryLabel: string;
  secondaryLabel?: string;
}

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function TranslationRow({
  row,
  selected,
  onToggle,
  primaryLabel,
  secondaryLabel,
}: TranslationRowProps) {
  const { job, qaFindingCount, drift } = row;

  const handleToggle = useCallback(() => {
    onToggle(job.id);
  }, [onToggle, job.id]);

  // Stubs — Agent E will replace with TranscreateDialog + apply/review calls.
  const stubHint = 'Wave 2 Agent E wires this';
  const handleStub = useCallback(() => {
    // No-op placeholder; button is disabled.
  }, []);

  return (
    <tr className="border-b border-[var(--studio-border)]/50 hover:bg-[var(--studio-bg)]/40">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={handleToggle}
          aria-label={`Seleccionar job ${job.id}`}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col min-w-0 max-w-[260px]">
          <span className="font-medium text-[var(--studio-text)] truncate">
            {job.targetKeyword || job.sourceKeyword || job.pageId || job.id}
          </span>
          {job.sourceKeyword && job.targetKeyword ? (
            <span className="text-[11px] text-[var(--studio-text-muted)] truncate">
              {job.sourceKeyword} → {job.targetKeyword}
            </span>
          ) : null}
          {drift ? (
            <StudioBadge tone="warning" className="mt-1 w-fit text-[10px]">
              Drift
            </StudioBadge>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2 capitalize text-[var(--studio-text-muted)]">
        {job.pageType}
      </td>
      <td className="px-3 py-2 text-[var(--studio-text-muted)]">
        <span className="font-mono text-xs">
          {job.sourceLocale} → {job.targetLocale}
        </span>
      </td>
      <td className="px-3 py-2">
        <StudioBadgeStatus status={job.status} />
      </td>
      <td className="px-3 py-2">
        <StudioBadge tone={qaFindingCount > 0 ? 'danger' : 'neutral'}>
          {qaFindingCount}
        </StudioBadge>
      </td>
      <td className="px-3 py-2 text-xs text-[var(--studio-text-muted)]">
        {formatDate(job.updatedAt)}
      </td>
      <td className="px-3 py-2">
        <div className="inline-flex items-center gap-1 justify-end w-full">
          <StudioButton
            size="sm"
            variant="outline"
            onClick={handleStub}
            disabled
            title={stubHint}
            aria-label={`${primaryLabel} (stub)`}
          >
            {primaryLabel}
          </StudioButton>
          {secondaryLabel ? (
            <StudioButton
              size="sm"
              variant="ghost"
              onClick={handleStub}
              disabled
              title={stubHint}
              aria-label={`${secondaryLabel} (stub)`}
            >
              {secondaryLabel}
            </StudioButton>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
