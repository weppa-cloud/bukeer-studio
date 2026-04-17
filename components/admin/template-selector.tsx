'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface TemplateItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  is_system: boolean;
  is_official: boolean;
  template_data: { pages?: unknown[] } | null;
}

interface TemplateSelectorProps {
  open: boolean;
  currentTemplateId?: string;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export const CATEGORY_LABELS: Record<string, string> = {
  adventure: 'Adventure',
  luxury: 'Luxury',
  tropical: 'Tropical',
  corporate: 'Corporate',
  boutique: 'Boutique',
  cultural: 'Cultural',
  eco: 'Eco',
  romantic: 'Romantic',
  custom: 'Custom',
  'travel-agency': 'Travel Agency',
  travel: 'Travel',
};

export function TemplateSelector({ open, currentTemplateId, onSelect, onClose }: TemplateSelectorProps) {
  const supabase = createSupabaseBrowserClient();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('website_templates')
      .select('id, name, slug, description, category, thumbnail_url, is_system, is_official, template_data')
      .eq('is_active', true)
      .not('template_data', 'is', null)
      .order('is_system', { ascending: false })
      .order('name');

    setTemplates((data as TemplateItem[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (open) loadTemplates();
  }, [open, loadTemplates]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] z-50 studio-card p-6 overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--studio-text)]">
                Select Template
              </h3>
              <button
                onClick={onClose}
                className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-28 bg-[var(--studio-border)] rounded-xl" />
                      <div className="h-3 bg-[var(--studio-border)] rounded mt-2 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-sm text-[var(--studio-text-muted)]">
                  No templates with full page definitions found.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map((tpl) => {
                    const isCurrent = tpl.id === currentTemplateId;
                    const pageCount = tpl.template_data?.pages?.length ?? 0;

                    return (
                      <button
                        key={tpl.id}
                        onClick={() => !isCurrent && onSelect(tpl.id)}
                        disabled={isCurrent}
                        className={`text-left rounded-xl border transition-all p-3 ${
                          isCurrent
                            ? 'border-[var(--studio-primary)] bg-[color-mix(in_srgb,var(--studio-primary)_6%,transparent)] opacity-60 cursor-default'
                            : 'border-[var(--studio-border)] hover:border-[var(--studio-primary)] hover:shadow-md cursor-pointer'
                        }`}
                      >
                        {tpl.thumbnail_url ? (
                          <Image
                            src={tpl.thumbnail_url}
                            alt={tpl.name}
                            width={240}
                            height={80}
                            unoptimized
                            className="w-full h-20 object-cover rounded-lg bg-[var(--studio-surface-elevated)]"
                          />
                        ) : (
                          <div className="w-full h-20 rounded-lg bg-[var(--studio-surface-elevated)] flex items-center justify-center text-2xl text-[var(--studio-text-muted)]">
                            {tpl.name.charAt(0)}
                          </div>
                        )}
                        <div className="mt-2">
                          <div className="text-sm font-medium text-[var(--studio-text)] truncate">
                            {tpl.name}
                            {isCurrent && <span className="text-[var(--studio-primary)] ml-1">(current)</span>}
                          </div>
                          <div className="text-xs text-[var(--studio-text-muted)] mt-0.5">
                            {pageCount > 0 ? `${pageCount} pages` : 'No pages'}
                            {tpl.category && ` · ${CATEGORY_LABELS[tpl.category] || tpl.category}`}
                          </div>
                        </div>
                        {tpl.is_system && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)] text-[var(--studio-primary)]">
                            System
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--studio-border)]">
              <p className="text-xs text-[var(--studio-text-muted)]">
                Applying a template will replace all pages and sections. Your current content will be lost.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
