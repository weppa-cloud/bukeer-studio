'use client';

import { useState, useCallback } from 'react';
import type { AiField } from '@bukeer/website-contract';
import { Toggle } from '@/components/ui/toggle';

export interface AiFlagsPanelProps {
  productId: string;
  aiFields: AiField[];
  readOnly?: boolean;
  onToggle?: (field: string, locked: boolean) => Promise<void>;
}

export function AiFlagsPanel({ productId, aiFields, readOnly = false, onToggle }: AiFlagsPanelProps) {
  const [locks, setLocks] = useState<Map<string, boolean>>(
    new Map(aiFields.map((f) => [f.field, f.locked])),
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  const handleToggle = useCallback(
    async (field: string, nextLocked: boolean) => {
      if (readOnly || !onToggle) return;
      setLocks((m) => {
        const next = new Map(m);
        next.set(field, nextLocked);
        return next;
      });
      setStatus('saving');
      try {
        await onToggle(field, nextLocked);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [onToggle, readOnly],
  );

  if (aiFields.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      aria-label="Campos generados por IA"
      data-product-id={productId}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Campos generados por IA</h4>
          <p className="text-xs text-muted-foreground">
            Bloquea un campo para evitar que IA lo sobrescriba en regeneraciones futuras.
          </p>
        </div>
        {status === 'error' && <span className="text-xs text-destructive" role="alert">Error</span>}
      </header>

      <ul className="space-y-1.5" role="list">
        {aiFields.map((f) => {
          const locked = locks.get(f.field) ?? f.locked;
          return (
            <li key={f.field} className="flex items-center justify-between gap-3 rounded border border-border bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span aria-hidden className="mr-1">{locked ? '🔒' : '🔓'}</span>
                  {f.field}
                </p>
                {f.generated_at && (
                  <p className="text-xs text-muted-foreground">
                    Generado: {new Date(f.generated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Toggle
                aria-label={`${locked ? 'Desbloquear' : 'Bloquear'} campo ${f.field}`}
                pressed={locked}
                onPressedChange={(next) => handleToggle(f.field, next)}
                disabled={readOnly || status === 'saving'}
              >
                {locked ? 'Bloqueado' : 'Abierto'}
              </Toggle>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
