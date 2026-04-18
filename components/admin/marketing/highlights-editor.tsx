'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface HighlightsEditorProps {
  productId: string;
  value: string[];
  aiGenerated?: boolean;
  readOnly?: boolean;
  onSave?: (next: string[]) => Promise<void>;
}

const MAX_ITEMS = 12;
const MAX_LENGTH = 200;

export function HighlightsEditor({
  productId,
  value,
  aiGenerated = false,
  readOnly = false,
  onSave,
}: HighlightsEditorProps) {
  const [draft, setDraft] = useState<string[]>(value ?? []);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addItem = () => {
    if (draft.length >= MAX_ITEMS) return;
    setDraft([...draft, '']);
  };

  const removeItem = (idx: number) => {
    setDraft(draft.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, text: string) => {
    const next = [...draft];
    next[idx] = text.slice(0, MAX_LENGTH);
    setDraft(next);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft(next);
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(value ?? []);

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      const cleaned = draft.map((s) => s.trim()).filter((s) => s.length > 0);
      await onSave(cleaned);
      setStatus('saved');
      setDraft(cleaned);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error');
    }
  }, [draft, onSave, readOnly]);

  if (readOnly) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Highlights del producto"
        data-product-id={productId}
        data-testid="marketing-editor-highlights"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Highlights</h3>
          {aiGenerated && <Badge variant="secondary" aria-label="Generados por IA">🤖 Generados por IA</Badge>}
        </header>
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — este campo se edita en Flutter.
        </p>
        {value && value.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
            {value.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-3"
      aria-label="Highlights del producto"
      data-product-id={productId}
      data-testid="marketing-editor-highlights"
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Highlights</h3>
          <p className="text-sm text-muted-foreground">
            Lista breve de puntos clave. Máximo {MAX_ITEMS} · hasta {MAX_LENGTH} caracteres cada uno.
          </p>
        </div>
        {aiGenerated && <Badge variant="secondary" aria-label="Generados por IA">🤖 Generados por IA</Badge>}
      </header>

      <ul className="space-y-2" aria-live="polite">
        {draft.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <Label htmlFor={`highlight-${idx}`} className="sr-only">
              Highlight {idx + 1}
            </Label>
            <Input
              id={`highlight-${idx}`}
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder={`Highlight ${idx + 1}`}
              maxLength={MAX_LENGTH}
              disabled={status === 'saving'}
              aria-label={`Highlight ${idx + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveItem(idx, -1)}
              disabled={idx === 0 || status === 'saving'}
              aria-label={`Mover arriba ${idx + 1}`}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveItem(idx, 1)}
              disabled={idx === draft.length - 1 || status === 'saving'}
              aria-label={`Mover abajo ${idx + 1}`}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeItem(idx)}
              disabled={status === 'saving'}
              aria-label={`Eliminar ${idx + 1}`}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          disabled={draft.length >= MAX_ITEMS || status === 'saving'}
        >
          + Agregar highlight
        </Button>
        <span className="text-xs text-muted-foreground">
          {draft.length} / {MAX_ITEMS}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={status === 'saving' || !isDirty}>
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button
          variant="outline"
          disabled={status === 'saving' || !isDirty}
          onClick={() => setDraft(value ?? [])}
        >
          Descartar cambios
        </Button>
        {status === 'saved' && <span className="text-sm text-emerald-700" role="status">Guardado</span>}
        {status === 'error' && (
          <span className="text-sm text-destructive" role="alert">
            {errorMsg ?? 'Error al guardar'}
          </span>
        )}
      </div>
    </section>
  );
}
