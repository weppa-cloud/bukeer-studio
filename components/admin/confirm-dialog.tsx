'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  confirmInput?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  confirmInput,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    if (open) setTypedValue('');
  }, [open]);

  const isConfirmDisabled = confirmInput ? typedValue !== confirmInput : false;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 studio-card p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h3 className="text-lg font-semibold text-[var(--studio-text)]">
              {title}
            </h3>
            {description && (
              <p className="text-[var(--studio-text-muted)] mt-2 text-sm">
                {description}
              </p>
            )}

            {confirmInput && (
              <div className="mt-4">
                <p className="text-sm text-[var(--studio-text-muted)] mb-2">
                  Type <strong>{confirmInput}</strong> to confirm
                </p>
                <input
                  type="text"
                  className="studio-input"
                  placeholder={confirmInput}
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCancel}
                className="studio-btn studio-btn-outline studio-btn-md"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirmDisabled}
                className={`studio-btn studio-btn-md disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'studio-btn-danger'
                    : 'studio-btn-primary'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
