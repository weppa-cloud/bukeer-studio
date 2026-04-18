'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface SocialImagePickerProps {
  productId: string;
  value: string | null;
  readOnly?: boolean;
  onSave?: (next: string | null) => Promise<void>;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SocialImagePicker({
  productId,
  value,
  readOnly = false,
  onSave,
}: SocialImagePickerProps) {
  const [draft, setDraft] = useState<string>(value ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trimmed = draft.trim();
  const isDirty = trimmed !== (value ?? '');
  const isValid = trimmed === '' || isValidHttpUrl(trimmed);

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    if (!isValid) {
      setStatus('error');
      setErrorMsg('URL inválida');
      return;
    }
    setStatus('saving');
    setErrorMsg(null);
    try {
      await onSave(trimmed === '' ? null : trimmed);
      setStatus('saved');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error');
    }
  }, [trimmed, isValid, onSave, readOnly]);

  if (readOnly) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Imagen social"
        data-product-id={productId}
        data-testid="marketing-editor-social-image"
      >
        <h3 className="mb-3 text-lg font-semibold text-foreground">Imagen social (OG)</h3>
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — este campo se edita en Flutter.
        </p>
        {value && (
          <div className="mt-3 overflow-hidden rounded-md border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Imagen social" className="h-40 w-full object-cover" />
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-3"
      aria-label="Imagen social"
      data-product-id={productId}
      data-testid="marketing-editor-social-image"
    >
      <header>
        <h3 className="text-lg font-semibold text-foreground">Imagen social (OG)</h3>
        <p className="text-sm text-muted-foreground">
          Imagen que se muestra al compartir en redes sociales. Recomendado: 1200×630 px.
        </p>
      </header>

      <div className="space-y-2">
        <Label htmlFor="marketing-social-image">URL de la imagen</Label>
        <Input
          id="marketing-social-image"
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://…"
          disabled={status === 'saving'}
          aria-describedby="marketing-social-image-hint"
          aria-invalid={!isValid}
        />
        <p id="marketing-social-image-hint" className="text-xs text-muted-foreground">
          Deja vacío para eliminar la imagen actual.
        </p>
      </div>

      {trimmed && isValid && (
        <div className="overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmed}
            alt="Preview imagen social"
            className="h-40 w-full object-cover"
            data-testid="social-image-preview"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={status === 'saving' || !isDirty || !isValid}>
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button
          variant="outline"
          disabled={status === 'saving' || !isDirty}
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
