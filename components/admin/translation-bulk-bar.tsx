'use client';

import { StudioButton } from '@/components/studio/ui/primitives';

interface TranslationBulkBarProps {
  count: number;
  onClear: () => void;
}

/**
 * Sticky floating bar shown when ≥1 translation rows are selected.
 *
 * The primary action "Transcrear seleccionados" is stubbed — Agent E will wire
 * it to /api/seo/translations/bulk with the selected jobIds.
 */
export function TranslationBulkBar({ count, onClear }: TranslationBulkBarProps) {
  const stubHint = 'Wave 2 Agent E wires this';

  return (
    <div
      role="region"
      aria-label="Acciones en lote"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-[var(--studio-border)] bg-[var(--studio-surface)] px-4 py-2 shadow-lg"
    >
      <span className="text-sm font-medium text-[var(--studio-text)]">
        {count} seleccionado{count === 1 ? '' : 's'}
      </span>
      <StudioButton
        size="sm"
        variant="primary"
        disabled
        title={stubHint}
        aria-label="Transcrear seleccionados (stub)"
      >
        Transcrear seleccionados
      </StudioButton>
      <StudioButton size="sm" variant="ghost" onClick={onClear}>
        Limpiar
      </StudioButton>
    </div>
  );
}
