'use client';

import { useState, useCallback } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { useRenderableSections, type ProductType } from './use-renderable-sections';

export interface SectionVisibilityToggleProps {
  productId: string;
  productType: ProductType;
  hiddenSections: string[];
  readOnly?: boolean;
  onChange?: (next: string[]) => Promise<void>;
}

export function SectionVisibilityToggle({
  productId,
  productType,
  hiddenSections,
  readOnly = false,
  onChange,
}: SectionVisibilityToggleProps) {
  const sections = useRenderableSections(productType);
  const [local, setLocal] = useState<Set<string>>(new Set(hiddenSections));
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  const handleToggle = useCallback(
    async (key: string, nextHidden: boolean) => {
      if (readOnly || !onChange) return;
      const next = new Set(local);
      if (nextHidden) next.add(key);
      else next.delete(key);
      setLocal(next);
      setStatus('saving');
      try {
        await onChange(Array.from(next));
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [local, onChange, readOnly],
  );

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-label="Visibilidad de secciones"
      data-product-id={productId}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Visibilidad de secciones</h3>
          <p className="text-sm text-muted-foreground">
            Oculta secciones individuales del landing público sin afectar el producto.
          </p>
        </div>
        {status === 'error' && (
          <span className="text-sm text-destructive" role="alert">
            Error al guardar
          </span>
        )}
      </header>

      <ul className="divide-y divide-border" role="list">
        {sections.map((section) => {
          const isHidden = local.has(section.key);
          return (
            <li key={section.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{section.label}</p>
                <p className="text-xs text-muted-foreground truncate">{section.description}</p>
              </div>
              <Toggle
                aria-label={`Alternar visibilidad: ${section.label}`}
                pressed={!isHidden}
                onPressedChange={(pressed) => handleToggle(section.key, !pressed)}
                disabled={readOnly || status === 'saving'}
              >
                {isHidden ? 'Oculto' : 'Visible'}
              </Toggle>
            </li>
          );
        })}
      </ul>

      {readOnly && (
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — no tienes permisos para editar la visibilidad.
        </p>
      )}
    </section>
  );
}
