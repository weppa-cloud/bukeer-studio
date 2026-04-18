'use client';

import { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface DescriptionEditorProps {
  productId: string;
  value: string | null;
  aiGenerated?: boolean;
  readOnly?: boolean;
  onSave?: (next: string | null) => Promise<void>;
}

const MIN_LENGTH_RECOMMENDED = 80;
const MAX_LENGTH = 10000;

export function DescriptionEditor({
  productId,
  value,
  aiGenerated = false,
  readOnly = false,
  onSave,
}: DescriptionEditorProps) {
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
  const belowRecommended = charCount > 0 && charCount < MIN_LENGTH_RECOMMENDED;

  if (readOnly) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Descripción del producto"
        data-product-id={productId}
        data-testid="marketing-editor-description"
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Descripción</h3>
          {aiGenerated && <Badge variant="secondary" aria-label="Generada por IA">🤖 Generada por IA</Badge>}
        </header>
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
      aria-label="Descripción del producto"
      data-product-id={productId}
      data-testid="marketing-editor-description"
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Descripción</h3>
          <p className="text-sm text-muted-foreground">
            Texto largo que aparece en la landing. Mínimo recomendado: {MIN_LENGTH_RECOMMENDED} caracteres.
          </p>
        </div>
        {aiGenerated && <Badge variant="secondary" aria-label="Generada por IA">🤖 Generada por IA</Badge>}
      </header>

      <div className="space-y-2">
        <Label htmlFor="marketing-description">Contenido</Label>
        <Textarea
          id="marketing-description"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Describe la experiencia, destino, incluye mención de lugares icónicos…"
          rows={8}
          maxLength={MAX_LENGTH}
          disabled={status === 'saving'}
          aria-describedby="marketing-description-hint"
        />
        <div
          id="marketing-description-hint"
          className="flex items-center justify-between text-xs"
          aria-live="polite"
        >
          <span
            className={
              belowRecommended
                ? 'text-amber-700'
                : charCount >= MIN_LENGTH_RECOMMENDED
                  ? 'text-emerald-700'
                  : 'text-muted-foreground'
            }
          >
            {charCount} / {MAX_LENGTH} caracteres
            {belowRecommended && ' — bajo el recomendado'}
          </span>
          <span className="text-muted-foreground">
            Guardar revalida `/paquetes/[slug]` y resetea flag IA
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={status === 'saving'}>
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
