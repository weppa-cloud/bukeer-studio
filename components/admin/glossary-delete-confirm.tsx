'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { StudioButton } from '@/components/studio/ui/primitives';

interface GlossaryDeleteConfirmProps {
  term: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function GlossaryDeleteConfirm({
  term,
  error,
  onCancel,
  onConfirm,
}: GlossaryDeleteConfirmProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        key="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-delete-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 studio-card p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <h3 id="glossary-delete-title" className="text-lg font-semibold text-[var(--studio-text)]">
          Eliminar término
        </h3>
        <p className="text-sm text-[var(--studio-text-muted)] mt-2">
          Esta acción quitará <strong>{term}</strong> del glosario.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-[var(--studio-danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3 mt-6">
          <StudioButton type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </StudioButton>
          <StudioButton type="button" variant="destructive" onClick={onConfirm}>
            Eliminar
          </StudioButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
