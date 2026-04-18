'use client';

import { useState, useCallback } from 'react';
import type { CustomSection } from '@bukeer/website-contract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { renumberPositions } from './renumber-positions';

export interface CustomSectionsEditorProps {
  productId: string;
  sections: CustomSection[];
  readOnly?: boolean;
  onChange?: (next: CustomSection[]) => Promise<void>;
}

type NewSectionType = CustomSection['type'];

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sec-${Math.random().toString(36).slice(2, 10)}`;
}

function createSection(type: NewSectionType, position: number): CustomSection {
  const id = randomId();
  switch (type) {
    case 'text':
      return { id, type, position, content: { html: '' } };
    case 'image_text':
      return { id, type, position, content: { image: '', text: '', alignment: 'left' } };
    case 'cta':
      return { id, type, position, content: { label: '', href: '', variant: 'primary' } };
    case 'spacer':
      return { id, type, position, content: { height: 'md' } };
  }
}

export function CustomSectionsEditor({ productId, sections, readOnly = false, onChange }: CustomSectionsEditorProps) {
  const [local, setLocal] = useState<CustomSection[]>(sections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingType, setPendingType] = useState<NewSectionType>('text');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  const persist = useCallback(
    async (next: CustomSection[]) => {
      if (readOnly || !onChange) return;
      setStatus('saving');
      try {
        await onChange(next);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [onChange, readOnly],
  );

  const handleAdd = useCallback(() => {
    const next = renumberPositions([...local, createSection(pendingType, local.length)]);
    setLocal(next);
    setDialogOpen(false);
    void persist(next);
  }, [local, pendingType, persist]);

  const handleRemove = useCallback(
    (id: string) => {
      const next = renumberPositions(local.filter((s) => s.id !== id));
      setLocal(next);
      void persist(next);
    },
    [local, persist],
  );

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-label="Secciones personalizadas"
      data-product-id={productId}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Secciones personalizadas</h3>
          <p className="text-sm text-muted-foreground">
            Inyecta bloques adicionales (texto, imagen+texto, CTA, espaciador) — máximo 20.
          </p>
        </div>
        {status === 'error' && <span className="text-sm text-destructive" role="alert">Error al guardar</span>}
      </header>

      {local.length === 0 ? (
        <p className="rounded-md bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          Aún no hay secciones personalizadas.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {local.map((section) => (
            <li
              key={section.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                    {section.type}
                  </span>
                  Posición {section.position + 1}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {describeSection(section)}
                </p>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Eliminar sección ${section.type} posición ${section.position + 1}`}
                  onClick={() => handleRemove(section.id)}
                  disabled={status === 'saving'}
                >
                  Eliminar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={local.length >= 20 || status === 'saving'}
        >
          + Agregar sección
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva sección</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="section-type">Tipo</Label>
              <select
                id="section-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={pendingType}
                onChange={(e) => setPendingType(e.target.value as NewSectionType)}
              >
                <option value="text">Texto</option>
                <option value="image_text">Imagen + texto</option>
                <option value="cta">CTA</option>
                <option value="spacer">Espaciador</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {DESCRIPTIONS[pendingType]}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAdd}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </>
      )}

      {readOnly && (
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — no tienes permisos para editar secciones personalizadas.
        </p>
      )}

      {/* Hidden text/textarea used for future per-section inline edit (stub) */}
      <span className="sr-only">
        <Input value="" readOnly aria-hidden />
        <Textarea value="" readOnly aria-hidden />
      </span>
    </section>
  );
}

const DESCRIPTIONS: Record<NewSectionType, string> = {
  text: 'Bloque de texto HTML (máx 5000 caracteres).',
  image_text: 'Imagen alineada izquierda o derecha + texto.',
  cta: 'Botón con label y enlace (primary o secondary).',
  spacer: 'Espacio vertical (sm, md, lg).',
};

function describeSection(section: CustomSection): string {
  switch (section.type) {
    case 'text':
      return section.content.html.slice(0, 80) || 'Texto vacío';
    case 'image_text':
      return section.content.text.slice(0, 60) || 'Imagen + texto';
    case 'cta':
      return `${section.content.label || 'Sin label'} → ${section.content.href || 'sin URL'}`;
    case 'spacer':
      return `Altura: ${section.content.height}`;
  }
}
