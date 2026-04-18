'use client';

import { useState, useCallback, useMemo } from 'react';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { useRenderableSections, type ProductType } from './use-renderable-sections';
import { moveItem } from './renumber-positions';

export interface SectionsReorderEditorProps {
  productId: string;
  productType: ProductType;
  sectionsOrder: string[];
  readOnly?: boolean;
  onChange?: (next: string[]) => Promise<void>;
}

export function SectionsReorderEditor({
  productId,
  productType,
  sectionsOrder,
  readOnly = false,
  onChange,
}: SectionsReorderEditorProps) {
  const renderable = useRenderableSections(productType);
  const initial = useMemo(() => {
    const fallback = renderable.map((s) => s.key);
    return sectionsOrder.length ? sectionsOrder.filter((k) => fallback.includes(k)).concat(fallback.filter((k) => !sectionsOrder.includes(k))) : fallback;
  }, [sectionsOrder, renderable]);

  const [order, setOrder] = useState<string[]>(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of renderable) map.set(s.key, s.label);
    return map;
  }, [renderable]);

  const persist = useCallback(
    async (next: string[]) => {
      if (readOnly || !onChange) return;
      setStatus('saving');
      try {
        await onChange(next);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    },
    [onChange, readOnly],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (readOnly) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = order.indexOf(String(active.id));
      const to = order.indexOf(String(over.id));
      const next = arrayMove(order, from, to);
      setOrder(next);
      void persist(next);
    },
    [order, persist, readOnly],
  );

  const nudge = useCallback(
    (index: number, direction: -1 | 1) => {
      if (readOnly) return;
      const next = moveItem(order, index, index + direction);
      setOrder(next);
      void persist(next);
    },
    [order, persist, readOnly],
  );

  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-4"
      aria-label="Orden de secciones"
      data-product-id={productId}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Orden de secciones</h3>
          <p className="text-sm text-muted-foreground">
            Arrastra o usa las flechas para reordenar. Los cambios se guardan automáticamente.
          </p>
        </div>
        {status === 'saving' && <span className="text-sm text-muted-foreground">Guardando…</span>}
        {status === 'saved' && <span className="text-sm text-emerald-700" role="status">Guardado</span>}
        {status === 'error' && <span className="text-sm text-destructive" role="alert">Error</span>}
      </header>

      <div role="region" aria-live="polite">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1" role="list">
              {order.map((key, index) => (
                <SortableRow
                  key={key}
                  id={key}
                  label={labels.get(key) ?? key}
                  index={index}
                  total={order.length}
                  disabled={readOnly}
                  onNudge={(dir) => nudge(index, dir)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>

      {readOnly && (
        <p className="text-sm text-muted-foreground" role="alert">
          Solo lectura — no tienes permisos para reordenar.
        </p>
      )}
    </section>
  );
}

interface SortableRowProps {
  id: string;
  label: string;
  index: number;
  total: number;
  disabled: boolean;
  onNudge: (dir: -1 | 1) => void;
}

function SortableRow({ id, label, index, total, disabled, onNudge }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Arrastrar: ${label}`}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        ⋮⋮
      </button>
      <span className="flex-1 text-sm font-medium text-foreground">
        <span className="mr-2 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        {label}
      </span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Subir: ${label}`}
          disabled={disabled || index === 0}
          onClick={() => onNudge(-1)}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Bajar: ${label}`}
          disabled={disabled || index === total - 1}
          onClick={() => onNudge(1)}
        >
          ↓
        </Button>
      </div>
    </li>
  );
}
