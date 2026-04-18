'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MAX_ITEMS = 20;
const MAX_LENGTH = 200;

interface ListEditorProps {
  heading: string;
  description: string;
  idPrefix: string;
  testId: string;
  value: string[];
  status: 'idle' | 'saving' | 'saved' | 'error';
  errorMsg: string | null;
  isDirty: boolean;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, text: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onSave: () => void;
  onDiscard: () => void;
}

function ListEditor({
  heading,
  description,
  idPrefix,
  testId,
  value,
  status,
  errorMsg,
  isDirty,
  onAdd,
  onRemove,
  onUpdate,
  onMove,
  onSave,
  onDiscard,
}: ListEditorProps) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6 space-y-3"
      aria-label={heading}
      data-testid={testId}
    >
      <header>
        <h3 className="text-lg font-semibold text-foreground">{heading}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <ul className="space-y-2" aria-live="polite">
        {value.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <Label htmlFor={`${idPrefix}-${idx}`} className="sr-only">
              {`${heading} ${idx + 1}`}
            </Label>
            <Input
              id={`${idPrefix}-${idx}`}
              value={item}
              onChange={(e) => onUpdate(idx, e.target.value)}
              placeholder={`${heading} ${idx + 1}`}
              maxLength={MAX_LENGTH}
              disabled={status === 'saving'}
              aria-label={`${heading} ${idx + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMove(idx, -1)}
              disabled={idx === 0 || status === 'saving'}
              aria-label={`Mover arriba ${idx + 1}`}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onMove(idx, 1)}
              disabled={idx === value.length - 1 || status === 'saving'}
              aria-label={`Mover abajo ${idx + 1}`}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(idx)}
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
          onClick={onAdd}
          disabled={value.length >= MAX_ITEMS || status === 'saving'}
        >
          + Agregar
        </Button>
        <span className="text-xs text-muted-foreground">
          {value.length} / {MAX_ITEMS}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={onSave} disabled={status === 'saving' || !isDirty}>
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="outline" disabled={status === 'saving' || !isDirty} onClick={onDiscard}>
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

function ReadOnlyList({
  heading,
  values,
  testId,
}: {
  heading: string;
  values: string[];
  testId: string;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      aria-label={heading}
      data-testid={testId}
    >
      <h3 className="mb-3 text-lg font-semibold text-foreground">{heading}</h3>
      <p className="text-sm text-muted-foreground" role="alert">
        Solo lectura — este campo se edita en Flutter.
      </p>
      {values && values.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
          {values.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface InclusionsExclusionsEditorProps {
  productId: string;
  inclusions: string[];
  exclusions: string[];
  inclusionsReadOnly?: boolean;
  exclusionsReadOnly?: boolean;
  onSaveInclusions?: (next: string[]) => Promise<void>;
  onSaveExclusions?: (next: string[]) => Promise<void>;
}

function useListState(initial: string[]) {
  const [draft, setDraft] = useState<string[]>(initial ?? []);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const add = () => {
    if (draft.length >= MAX_ITEMS) return;
    setDraft([...draft, '']);
  };
  const remove = (idx: number) => setDraft(draft.filter((_, i) => i !== idx));
  const update = (idx: number, text: string) => {
    const next = [...draft];
    next[idx] = text.slice(0, MAX_LENGTH);
    setDraft(next);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft(next);
  };
  const discard = () => setDraft(initial ?? []);

  return { draft, setDraft, status, setStatus, errorMsg, setErrorMsg, add, remove, update, move, discard };
}

export function InclusionsExclusionsEditor({
  productId,
  inclusions,
  exclusions,
  inclusionsReadOnly = false,
  exclusionsReadOnly = false,
  onSaveInclusions,
  onSaveExclusions,
}: InclusionsExclusionsEditorProps) {
  const inc = useListState(inclusions);
  const exc = useListState(exclusions);

  const incIsDirty = JSON.stringify(inc.draft) !== JSON.stringify(inclusions ?? []);
  const excIsDirty = JSON.stringify(exc.draft) !== JSON.stringify(exclusions ?? []);

  const saveInc = useCallback(async () => {
    if (!onSaveInclusions || inclusionsReadOnly) return;
    inc.setStatus('saving');
    inc.setErrorMsg(null);
    try {
      const cleaned = inc.draft.map((s) => s.trim()).filter((s) => s.length > 0);
      await onSaveInclusions(cleaned);
      inc.setDraft(cleaned);
      inc.setStatus('saved');
    } catch (e) {
      inc.setStatus('error');
      inc.setErrorMsg(e instanceof Error ? e.message : 'Error');
    }
  }, [inc, onSaveInclusions, inclusionsReadOnly]);

  const saveExc = useCallback(async () => {
    if (!onSaveExclusions || exclusionsReadOnly) return;
    exc.setStatus('saving');
    exc.setErrorMsg(null);
    try {
      const cleaned = exc.draft.map((s) => s.trim()).filter((s) => s.length > 0);
      await onSaveExclusions(cleaned);
      exc.setDraft(cleaned);
      exc.setStatus('saved');
    } catch (e) {
      exc.setStatus('error');
      exc.setErrorMsg(e instanceof Error ? e.message : 'Error');
    }
  }, [exc, onSaveExclusions, exclusionsReadOnly]);

  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-product-id={productId}
      data-testid="marketing-editor-inclusions-exclusions"
    >
      {inclusionsReadOnly ? (
        <ReadOnlyList
          heading="Qué incluye"
          values={inclusions ?? []}
          testId="marketing-editor-inclusions"
        />
      ) : (
        <ListEditor
          heading="Qué incluye"
          description={`Lista de inclusiones (servicios, elementos). Máximo ${MAX_ITEMS}.`}
          idPrefix="inclusion"
          testId="marketing-editor-inclusions"
          value={inc.draft}
          status={inc.status}
          errorMsg={inc.errorMsg}
          isDirty={incIsDirty}
          onAdd={inc.add}
          onRemove={inc.remove}
          onUpdate={inc.update}
          onMove={inc.move}
          onSave={saveInc}
          onDiscard={inc.discard}
        />
      )}

      {exclusionsReadOnly ? (
        <ReadOnlyList
          heading="Qué NO incluye"
          values={exclusions ?? []}
          testId="marketing-editor-exclusions"
        />
      ) : (
        <ListEditor
          heading="Qué NO incluye"
          description={`Lista de exclusiones. Máximo ${MAX_ITEMS}.`}
          idPrefix="exclusion"
          testId="marketing-editor-exclusions"
          value={exc.draft}
          status={exc.status}
          errorMsg={exc.errorMsg}
          isDirty={excIsDirty}
          onAdd={exc.add}
          onRemove={exc.remove}
          onUpdate={exc.update}
          onMove={exc.move}
          onSave={saveExc}
          onDiscard={exc.discard}
        />
      )}
    </div>
  );
}
