'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface SaveAsTemplateModalProps {
  open: boolean;
  websiteId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveAsTemplateModal({ open, websiteId, onClose, onSaved }: SaveAsTemplateModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; pages_captured: number } | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setResult(null);

    const { data, error: rpcError } = await supabase.rpc('save_website_as_template_v2', {
      p_website_id: websiteId,
      p_template_name: name.trim(),
      p_description: description.trim() || null,
      p_is_public: isPublic,
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const res = data as { success: boolean; error?: string; slug?: string; pages_captured?: number };
    if (!res.success) {
      setError(res.error || 'Failed to save template');
      return;
    }

    setResult({ slug: res.slug!, pages_captured: res.pages_captured! });
    setTimeout(() => {
      setName('');
      setDescription('');
      setIsPublic(false);
      setResult(null);
      onSaved();
    }, 1500);
  }

  function handleClose() {
    if (!saving) {
      setName('');
      setDescription('');
      setIsPublic(false);
      setError(null);
      setResult(null);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 studio-card p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h3 className="text-lg font-semibold text-[var(--studio-text)]">
              Save as Template
            </h3>
            <p className="text-sm text-[var(--studio-text-muted)] mt-1">
              Capture all pages and sections as a reusable template.
            </p>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-[var(--studio-text)] block mb-1">
                  Template name
                </label>
                <input
                  type="text"
                  className="studio-input w-full"
                  placeholder="e.g., Adventure v1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--studio-text)] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="studio-input w-full"
                  placeholder="Bold and energetic — for outdoor operators"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={saving}
                  className="rounded border-[var(--studio-border)] text-[var(--studio-primary)]"
                />
                <span className="text-sm text-[var(--studio-text)]">
                  Make public (available to all accounts)
                </span>
              </label>
            </div>

            {error && (
              <div className="text-sm text-[var(--studio-danger)] bg-[color-mix(in_srgb,var(--studio-danger)_8%,transparent)] rounded-lg p-3 mt-4">
                {error}
              </div>
            )}

            {result && (
              <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 mt-4">
                Template saved: <strong>{result.slug}</strong> ({result.pages_captured} pages captured)
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={saving}
                className="studio-btn studio-btn-outline studio-btn-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="studio-btn studio-btn-primary studio-btn-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
