'use client';

import { useMemo, useState } from 'react';
import type { TranscreatePayloadField } from '@bukeer/website-contract';
import { StudioButton } from '@/components/studio/ui/primitives';

interface TranslationBulkBarProps {
  count: number;
  busy?: boolean;
  error?: string | null;
  onRun: (action: 'review' | 'apply', fields?: TranscreatePayloadField[]) => Promise<void>;
  onClear: () => void;
}

const FIELD_OPTIONS: Array<{ value: TranscreatePayloadField; label: string }> = [
  { value: 'meta_title', label: 'Meta title' },
  { value: 'meta_desc', label: 'Meta description' },
  { value: 'slug', label: 'Slug' },
  { value: 'h1', label: 'H1' },
  { value: 'keywords', label: 'Keywords' },
  { value: 'body_content', label: 'Body content' },
  { value: 'description_long', label: 'Description long' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'faq', label: 'FAQ' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'cta_final_text', label: 'CTA final text' },
  { value: 'program_timeline', label: 'Program timeline' },
  { value: 'inclusions', label: 'Inclusions' },
  { value: 'exclusions', label: 'Exclusions' },
  { value: 'hero_subtitle', label: 'Hero subtitle' },
  { value: 'category_label', label: 'Category label' },
];

export function TranslationBulkBar({ count, busy = false, error = null, onRun, onClear }: TranslationBulkBarProps) {
  const [selectedFields, setSelectedFields] = useState<Set<TranscreatePayloadField>>(
    () => new Set(FIELD_OPTIONS.map((entry) => entry.value)),
  );
  const selectedFieldCount = selectedFields.size;

  const selectedFieldList = useMemo(
    () => FIELD_OPTIONS.filter((entry) => selectedFields.has(entry.value)).map((entry) => entry.value),
    [selectedFields],
  );

  const toggleField = (field: TranscreatePayloadField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleApply = async () => {
    await onRun('apply', selectedFieldList);
  };

  const handleReview = async () => {
    await onRun('review');
  };

  return (
    <div
      role="region"
      aria-label="Acciones en lote"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] px-4 py-3 shadow-lg"
    >
      <span className="text-sm font-medium text-[var(--studio-text)] whitespace-nowrap">
        {count} seleccionado{count === 1 ? '' : 's'}
      </span>
      <StudioButton
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void handleReview()}
        aria-label="Review seleccionados"
      >
        {busy ? 'Procesando…' : 'Review seleccionados'}
      </StudioButton>
      <StudioButton
        size="sm"
        variant="primary"
        disabled={busy || selectedFieldCount === 0}
        onClick={() => void handleApply()}
        aria-label="Apply seleccionados"
      >
        {busy ? 'Procesando…' : `Apply (${selectedFieldCount} campos)`}
      </StudioButton>
      <details className="relative">
        <summary className="cursor-pointer text-xs text-[var(--studio-text-muted)] select-none">
          Campos apply
        </summary>
        <div className="absolute bottom-8 right-0 w-[280px] max-h-[260px] overflow-auto rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-[11px] text-[var(--studio-text-muted)] hover:underline"
              onClick={() => setSelectedFields(new Set(FIELD_OPTIONS.map((entry) => entry.value)))}
            >
              Seleccionar todo
            </button>
            <button
              type="button"
              className="text-[11px] text-[var(--studio-text-muted)] hover:underline"
              onClick={() => setSelectedFields(new Set())}
            >
              Limpiar
            </button>
          </div>
          <div className="space-y-1">
            {FIELD_OPTIONS.map((entry) => (
              <label key={entry.value} className="flex items-center gap-2 text-xs text-[var(--studio-text)]">
                <input
                  type="checkbox"
                  checked={selectedFields.has(entry.value)}
                  onChange={() => toggleField(entry.value)}
                />
                <span>{entry.label}</span>
              </label>
            ))}
          </div>
        </div>
      </details>
      {error ? (
        <span className="max-w-[280px] truncate text-xs text-[var(--studio-danger)]" title={error}>
          {error}
        </span>
      ) : null}
      <StudioButton size="sm" variant="ghost" onClick={onClear} disabled={busy}>
        Limpiar selección
      </StudioButton>
    </div>
  );
}
