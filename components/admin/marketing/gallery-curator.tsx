'use client';

import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface GalleryItem {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

export interface GalleryCuratorProps {
  productId: string;
  websiteId: string;
  value: GalleryItem[];
  readOnly?: boolean;
  locale?: string;
  onSave?: (next: GalleryItem[]) => Promise<void>;
}

const MAX_ITEMS = 20;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

interface SortableTileProps {
  item: GalleryItem;
  index: number;
  onAltChange: (alt: string) => void;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
  onKeyboardMove: (delta: number) => void;
  disabled: boolean;
}

function SortableTile({
  item,
  index,
  onAltChange,
  onCaptionChange,
  onRemove,
  onKeyboardMove,
  disabled,
}: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.url,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const aiGenerated = Boolean(item.alt && item.alt.length > 0);
  const sortableOnKeyDown = listeners?.onKeyDown as
    | ((event: React.KeyboardEvent<HTMLButtonElement>) => void)
    | undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-border bg-card p-3 space-y-2"
      data-testid="gallery-tile"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label={`Reordenar imagen ${index + 1}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
          onKeyDown={(event) => {
            sortableOnKeyDown?.(event);
            if (disabled || event.defaultPrevented) return;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              onKeyboardMove(1);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              onKeyboardMove(-1);
            }
          }}
        >
          ⋮⋮
        </button>
        <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
        {aiGenerated && (
          <Badge variant="secondary" className="text-xs" aria-label="Alt sugerido por IA">
            🤖 IA alt
          </Badge>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Eliminar imagen ${index + 1}`}
          className="ml-auto"
        >
          ✕
        </Button>
      </div>

      <div className="overflow-hidden rounded border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt={item.alt ?? ''} className="h-32 w-full object-cover" />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`gallery-alt-${index}`} className="text-xs">
          Alt
        </Label>
        <Input
          id={`gallery-alt-${index}`}
          value={item.alt ?? ''}
          onChange={(e) => onAltChange(e.target.value.slice(0, 200))}
          placeholder="Texto alternativo"
          disabled={disabled}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`gallery-caption-${index}`} className="text-xs">
          Caption
        </Label>
        <Input
          id={`gallery-caption-${index}`}
          value={item.caption ?? ''}
          onChange={(e) => onCaptionChange(e.target.value.slice(0, 200))}
          placeholder="Pie de foto"
          disabled={disabled}
          maxLength={200}
        />
      </div>
    </li>
  );
}

export function GalleryCurator({
  productId,
  websiteId,
  value,
  readOnly = false,
  locale = 'es',
  onSave,
}: GalleryCuratorProps) {
  const [draft, setDraft] = useState<GalleryItem[]>(value ?? []);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isDirty = JSON.stringify(draft) !== JSON.stringify(value ?? []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setDraft((items) => {
        const oldIndex = items.findIndex((i) => i.url === active.id);
        const newIndex = items.findIndex((i) => i.url === over.id);
        if (oldIndex < 0 || newIndex < 0) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    },
    [],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      const slotsLeft = MAX_ITEMS - draft.length;
      if (slotsLeft <= 0) {
        setErrorMsg(`Galería llena (${MAX_ITEMS}). Elimina items primero.`);
        setStatus('error');
        return;
      }

      setUploading(true);
      setStatus('idle');
      setErrorMsg(null);

      try {
        const toUpload = files.slice(0, slotsLeft);
        const uploaded: GalleryItem[] = [];
        for (const file of toUpload) {
          const form = new FormData();
          form.append('file', file);
          form.append('websiteId', websiteId);
          form.append('entityType', 'package');
          form.append('entityId', productId);
          form.append('usageContext', 'gallery');
          form.append('locale', locale);

          const res = await fetch('/api/media/upload', { method: 'POST', body: form });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error?.message ?? `Upload failed (${res.status})`);
          }
          const json = await res.json();
          const payload = json.data ?? json;
          uploaded.push({
            url: payload.publicUrl,
            alt: payload.alt ?? null,
            caption: payload.caption ?? null,
          });
        }

        setDraft((curr) => [...curr, ...uploaded]);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
        setStatus('error');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [draft.length, websiteId, productId, locale],
  );

  const updateAlt = (idx: number, alt: string) => {
    setDraft((curr) => curr.map((item, i) => (i === idx ? { ...item, alt } : item)));
  };

  const updateCaption = (idx: number, caption: string) => {
    setDraft((curr) => curr.map((item, i) => (i === idx ? { ...item, caption } : item)));
  };

  const removeItem = (idx: number) => {
    setDraft((curr) => curr.filter((_, i) => i !== idx));
  };

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      const cleaned = draft.map((item) => ({
        url: item.url,
        alt: item.alt?.trim() || null,
        caption: item.caption?.trim() || null,
      }));
      await onSave(cleaned);
      setDraft(cleaned);
      setStatus('saved');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error al guardar');
    }
  }, [draft, onSave, readOnly]);

  if (readOnly) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-6"
        aria-label="Galería de imágenes"
        data-product-id={productId}
        data-testid="marketing-editor-gallery"
      >
        <h3 className="mb-3 text-lg font-semibold text-foreground">Galería</h3>
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — este campo se edita en Flutter.
        </p>
        {value && value.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((item, i) => (
              <li key={item.url + i} className="overflow-hidden rounded border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt ?? ''} className="h-32 w-full object-cover" />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-3"
      aria-label="Galería de imágenes"
      data-product-id={productId}
      data-testid="marketing-editor-gallery"
    >
      <header>
        <h3 className="text-lg font-semibold text-foreground">Galería</h3>
        <p className="text-sm text-muted-foreground">
          Arrastra para reordenar. Máx {MAX_ITEMS}. Alt IA se sugiere automáticamente al subir.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || status === 'saving' || draft.length >= MAX_ITEMS}
          aria-label="Subir imagen"
        >
          {uploading ? 'Subiendo…' : '+ Subir imagen'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {draft.length} / {MAX_ITEMS}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Seleccionar imágenes"
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draft.map((i) => i.url)} strategy={rectSortingStrategy}>
          <ul
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-live="polite"
          >
            {draft.map((item, idx) => (
              <SortableTile
                key={item.url}
                item={item}
                index={idx}
                onAltChange={(alt) => updateAlt(idx, alt)}
                onCaptionChange={(caption) => updateCaption(idx, caption)}
                onRemove={() => removeItem(idx)}
                onKeyboardMove={(delta) =>
                  setDraft((curr) => {
                    const nextIdx = idx + delta;
                    if (nextIdx < 0 || nextIdx >= curr.length) return curr;
                    return arrayMove(curr, idx, nextIdx);
                  })
                }
                disabled={uploading || status === 'saving'}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

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
