'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import {
  StudioButton,
  StudioInput,
  StudioSelect,
  StudioTextarea,
} from '@/components/studio/ui/primitives';
import type { GlossaryItemRow } from '@/components/admin/glossary-table';

/**
 * Client-side validation schema. Broader than the canonical `GlossaryItemSchema`
 * in @bukeer/website-contract because this route needs optional booleans
 * (`isBrand`, `isDestinationName`, `caseSensitive`, `notes`) that Agent F
 * will store on the glossary table. Backend revalidates on POST/PATCH.
 */
const GlossaryFormSchema = z.object({
  term: z.string().min(1, 'El término es obligatorio.').max(200),
  locale: z.string().min(2, 'Selecciona un locale.').max(16),
  translation: z.string().max(500).optional(),
  isBrand: z.boolean(),
  isDestinationName: z.boolean(),
  caseSensitive: z.boolean(),
  notes: z.string().max(500).optional(),
});

type GlossaryFormValues = z.infer<typeof GlossaryFormSchema>;

interface GlossaryFormProps {
  websiteId: string;
  item: GlossaryItemRow | null;
  supportedLocales: ReadonlyArray<{ value: string; label: string }>;
  onClose: (saved: boolean) => void;
}

export function GlossaryForm({ websiteId, item, supportedLocales, onClose }: GlossaryFormProps) {
  const isEdit = item !== null;

  const [values, setValues] = useState<GlossaryFormValues>(() => ({
    term: item?.term ?? '',
    locale: item?.locale ?? supportedLocales[0]?.value ?? 'es-CO',
    translation: item?.translation ?? '',
    isBrand: item?.isBrand ?? false,
    isDestinationName: item?.isDestinationName ?? false,
    caseSensitive: item?.caseSensitive ?? false,
    notes: item?.notes ?? '',
  }));

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GlossaryFormValues, string>>>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on ESC
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) {
        onClose(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  const localeOptions = useMemo(
    () =>
      supportedLocales.length > 0
        ? supportedLocales.map((loc) => ({ value: loc.value, label: loc.label }))
        : [{ value: 'es-CO', label: 'es-CO — Español (Colombia)' }],
    [supportedLocales],
  );

  const updateField = useCallback(
    <K extends keyof GlossaryFormValues>(key: K, value: GlossaryFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitError(null);

      const parsed = GlossaryFormSchema.safeParse(values);
      if (!parsed.success) {
        const flat: Partial<Record<keyof GlossaryFormValues, string>> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0] as keyof GlossaryFormValues | undefined;
          if (path && !flat[path]) flat[path] = issue.message;
        }
        setFieldErrors(flat);
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          websiteId,
          term: parsed.data.term.trim(),
          locale: parsed.data.locale,
          // Empty translation means "no traducir" — send null to backend.
          translation: parsed.data.translation?.trim()
            ? parsed.data.translation.trim()
            : null,
          isBrand: parsed.data.isBrand,
          isDestinationName: parsed.data.isDestinationName,
          caseSensitive: parsed.data.caseSensitive,
          notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
        };

        const url = isEdit ? `/api/seo/glossary/${item!.id}` : '/api/seo/glossary';
        const method = isEdit ? 'PATCH' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.status === 404) {
          setSubmitError('Endpoint pendiente — el backend aún no acepta cambios.');
          return;
        }

        const json = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: { message?: string } }
          | null;

        if (!response.ok || !json?.success) {
          setSubmitError(json?.error?.message ?? 'No se pudo guardar el término.');
          return;
        }

        onClose(true);
      } catch {
        setSubmitError('Error de red al guardar.');
      } finally {
        setSubmitting(false);
      }
    },
    [isEdit, item, onClose, values, websiteId],
  );

  const dialogTitle = isEdit ? 'Editar término' : 'Añadir término';

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => (submitting ? null : onClose(false))}
      />
      <motion.div
        key="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-form-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 studio-card p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <h3 id="glossary-form-title" className="text-lg font-semibold text-[var(--studio-text)]">
          {dialogTitle}
        </h3>
        <p className="text-xs text-[var(--studio-text-muted)] mt-1">
          Deja <em>Traducción</em> vacío para marcar el término como <strong>no traducir</strong>.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <div>
            <label
              htmlFor="glossary-term"
              className="block text-xs font-medium text-[var(--studio-text)] mb-1"
            >
              Término <span className="text-[var(--studio-danger)]">*</span>
            </label>
            <StudioInput
              id="glossary-term"
              value={values.term}
              onChange={(event) => updateField('term', event.target.value)}
              placeholder="Cartagena"
              aria-invalid={Boolean(fieldErrors.term)}
              aria-describedby={fieldErrors.term ? 'glossary-term-error' : undefined}
              autoFocus
            />
            {fieldErrors.term ? (
              <p
                id="glossary-term-error"
                role="alert"
                className="mt-1 text-xs text-[var(--studio-danger)]"
              >
                {fieldErrors.term}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="glossary-locale"
              className="block text-xs font-medium text-[var(--studio-text)] mb-1"
            >
              Locale <span className="text-[var(--studio-danger)]">*</span>
            </label>
            <StudioSelect
              id="glossary-locale"
              value={values.locale}
              onChange={(event) => updateField('locale', event.target.value)}
              options={localeOptions}
              aria-invalid={Boolean(fieldErrors.locale)}
            />
            {fieldErrors.locale ? (
              <p role="alert" className="mt-1 text-xs text-[var(--studio-danger)]">
                {fieldErrors.locale}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="glossary-translation"
              className="block text-xs font-medium text-[var(--studio-text)] mb-1"
            >
              Traducción <span className="text-[var(--studio-text-muted)]">(opcional)</span>
            </label>
            <StudioInput
              id="glossary-translation"
              value={values.translation ?? ''}
              onChange={(event) => updateField('translation', event.target.value)}
              placeholder="Vacío = no traducir"
              aria-describedby="glossary-translation-hint"
            />
            <p
              id="glossary-translation-hint"
              className="mt-1 text-[11px] text-[var(--studio-text-muted)]"
            >
              Marcas y nombres propios suelen quedar vacíos.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--studio-text)]">
              Clasificación
            </legend>
            <label className="flex items-center gap-2 text-xs text-[var(--studio-text)]">
              <input
                type="checkbox"
                checked={values.isBrand}
                onChange={(event) => updateField('isBrand', event.target.checked)}
                className="accent-[var(--studio-accent)]"
              />
              Es una marca
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--studio-text)]">
              <input
                type="checkbox"
                checked={values.isDestinationName}
                onChange={(event) => updateField('isDestinationName', event.target.checked)}
                className="accent-[var(--studio-accent)]"
              />
              Es un nombre de destino
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--studio-text)]">
              <input
                type="checkbox"
                checked={values.caseSensitive}
                onChange={(event) => updateField('caseSensitive', event.target.checked)}
                className="accent-[var(--studio-accent)]"
              />
              Sensible a mayúsculas / minúsculas
            </label>
          </fieldset>

          <div>
            <label
              htmlFor="glossary-notes"
              className="block text-xs font-medium text-[var(--studio-text)] mb-1"
            >
              Notas <span className="text-[var(--studio-text-muted)]">(opcional)</span>
            </label>
            <StudioTextarea
              id="glossary-notes"
              value={values.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value)}
              rows={3}
              placeholder="Contexto para traductores / revisores."
            />
          </div>

          {submitError ? (
            <div
              role="alert"
              aria-live="polite"
              className="border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-2 text-xs rounded-md"
            >
              {submitError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <StudioButton
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              disabled={submitting}
            >
              Cancelar
            </StudioButton>
            <StudioButton type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear término'}
            </StudioButton>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
