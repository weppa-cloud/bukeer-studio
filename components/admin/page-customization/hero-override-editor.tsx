'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

export interface HeroOverrideValue {
  title: string | null;
  subtitle: string | null;
  backgroundImage: string | null;
}

export interface HeroOverrideEditorProps {
  productId: string;
  value: HeroOverrideValue;
  readOnly?: boolean;
  onSave?: (next: HeroOverrideValue | null) => Promise<void>;
}

const EMPTY: HeroOverrideValue = { title: null, subtitle: null, backgroundImage: null };

function isActive(v: HeroOverrideValue | null | undefined): boolean {
  if (!v) return false;
  return Boolean(v.title || v.subtitle || v.backgroundImage);
}

export function HeroOverrideEditor({ productId, value, readOnly = false, onSave }: HeroOverrideEditorProps) {
  const [enabled, setEnabled] = useState(isActive(value));
  const [draft, setDraft] = useState<HeroOverrideValue>(value ?? EMPTY);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleRestore = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    try {
      await onSave(null);
      setDraft(EMPTY);
      setEnabled(false);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [onSave, readOnly]);

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    try {
      await onSave(draft);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [draft, onSave, readOnly]);

  if (readOnly) {
    return (
      <section className="rounded-lg border border-border bg-card p-6" aria-label="Personalización del hero">
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — no tienes permisos para editar la personalización del hero.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 space-y-4" aria-label="Personalización del hero" data-product-id={productId}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Personalización del hero</h3>
          <p className="text-sm text-muted-foreground">
            Sobrescribe título, subtítulo o imagen de hero solo para esta landing.
          </p>
        </div>
        <Toggle
          aria-label="Personalizar hero para esta página"
          pressed={enabled}
          onPressedChange={(next) => setEnabled(next)}
          disabled={status === 'saving'}
        >
          {enabled ? 'Activo' : 'Desactivado'}
        </Toggle>
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid gap-2">
            <Label htmlFor="hero-title">Título</Label>
            <Input
              id="hero-title"
placeholder="Título personalizado (vacío = usar nombre del producto)"
              value={draft.title ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value || null }))}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero-subtitle">Subtítulo</Label>
            <Input
              id="hero-subtitle"
              placeholder="Subtítulo (vacío = usar ubicación)"
              value={draft.subtitle ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value || null }))}
              maxLength={200}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero-bg">URL de imagen de hero</Label>
            <Input
              id="hero-bg"
              type="url"
              placeholder="https://…"
              value={draft.backgroundImage ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, backgroundImage: e.target.value || null }))}
            />
            {draft.backgroundImage && (
              <div className="relative mt-2 aspect-[3/1] w-full overflow-hidden rounded-md border border-border">
                <Image src={draft.backgroundImage} alt="Vista previa" fill sizes="600px" className="object-cover" unoptimized />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving' ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={handleRestore} disabled={status === 'saving'}>
              Restaurar default
            </Button>
            {status === 'saved' && <span className="text-sm text-emerald-700" role="status">Guardado</span>}
            {status === 'error' && <span className="text-sm text-destructive" role="alert">Error al guardar</span>}
          </div>
        </div>
      )}
    </section>
  );
}
