'use client';

import { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface RecommendationsEditorProps {
  productId: string;
  value: string | null;
  readOnly?: boolean;
  onSave?: (next: string | null) => Promise<void>;
}

const MAX_LENGTH = 5000;

export function RecommendationsEditor({
  productId,
  value,
  readOnly = false,
  onSave,
}: RecommendationsEditorProps) {
  const [draft, setDraft] = useState<string>(value ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      await onSave(draft.trim() || null);
      setStatus('saved');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error');
    }
  }, [draft, onSave, readOnly]);

  const charCount = draft.length;

  if (readOnly) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Recomendaciones"
        data-product-id={productId}
        data-testid="marketing-editor-recommendations"
      >
        <h3 className="mb-3 text-lg font-semibold text-foreground">Recomendaciones</h3>
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — este campo se edita en Flutter.
        </p>
        {value && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{value}</p>}
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-3"
      aria-label="Recomendaciones"
      data-product-id={productId}
      data-testid="marketing-editor-recommendations"
    >
      <header>
        <h3 className="text-lg font-semibold text-foreground">Recomendaciones</h3>
        <p className="text-sm text-muted-foreground">
          Notas adicionales, consejos prácticos, qué llevar, etc.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="marketing-recommendations">Contenido</Label>
        <Textarea
          id="marketing-recommendations"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Lleva ropa cómoda, bloqueador, cámara…"
          rows={6}
          maxLength={MAX_LENGTH}
          disabled={status === 'saving'}
          aria-describedby="marketing-recommendations-hint"
        />
        <div
          id="marketing-recommendations-hint"
          className="flex items-center justify-between text-xs"
          aria-live="polite"
        >
          <span className="text-muted-foreground">
            {charCount} / {MAX_LENGTH} caracteres
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={status === 'saving' || draft === (value ?? '')}>
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button
          variant="outline"
          disabled={status === 'saving' || draft === (value ?? '')}
          onClick={() => setDraft(value ?? '')}
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
