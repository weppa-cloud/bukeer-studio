'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { ConfirmDialog } from './confirm-dialog';
import { TemplateSelector, CATEGORY_LABELS } from './template-selector';
import { SaveAsTemplateModal } from './save-as-template-modal';

interface TemplateInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  is_system: boolean;
  template_data: { pages?: unknown[] } | null;
}

export function TemplateSection({ websiteId }: { websiteId: string }) {
  const { website, refetch } = useWebsite();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [currentTemplate, setCurrentTemplate] = useState<TemplateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentTemplate();
  }, [website?.template_id]);

  async function loadCurrentTemplate() {
    setLoading(true);
    if (!website?.template_id) {
      setCurrentTemplate(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('website_templates')
      .select('id, name, slug, description, category, thumbnail_url, is_system, template_data')
      .eq('id', website.template_id)
      .single();

    setCurrentTemplate(data as TemplateInfo | null);
    setLoading(false);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setShowSelector(false);
    setShowConfirm(true);
  }

  async function handleApplyTemplate() {
    if (!selectedTemplateId) return;
    setShowConfirm(false);
    setApplying(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('apply_template_to_website', {
      p_website_id: websiteId,
      p_template_id: selectedTemplateId,
    });

    setApplying(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { success: boolean; error?: string; pages_created?: number };
    if (!result.success) {
      setError(result.error || 'Failed to apply template');
      return;
    }

    await refetch();
    router.push(`/dashboard/${websiteId}/pages`);
  }

  const pageCount = currentTemplate?.template_data?.pages?.length ?? 0;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-[var(--studio-border)] rounded w-1/3" />
        <div className="h-24 bg-[var(--studio-border)] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Template */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">Current Template</h3>
        <div className="studio-card p-4 flex items-center gap-4">
          {currentTemplate?.thumbnail_url ? (
            <img
              src={currentTemplate.thumbnail_url}
              alt={currentTemplate.name}
              className="w-16 h-16 rounded-lg object-cover bg-[var(--studio-surface-elevated)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[var(--studio-surface-elevated)] flex items-center justify-center text-[var(--studio-text-muted)] text-xs">
              {currentTemplate ? currentTemplate.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--studio-text)]">
              {currentTemplate?.name || 'No template'}
            </div>
            <div className="text-xs text-[var(--studio-text-muted)] mt-0.5">
              {currentTemplate
                ? `${currentTemplate.description || (currentTemplate.category && CATEGORY_LABELS[currentTemplate.category]) || 'Custom'} · ${pageCount} pages`
                : 'This website was created without a template'}
            </div>
            {currentTemplate?.is_system && (
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)] text-[var(--studio-primary)]">
                System
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowSelector(true)}
          disabled={applying}
          className="studio-btn studio-btn-primary studio-btn-md disabled:opacity-50"
        >
          {applying ? 'Applying...' : 'Change Template'}
        </button>
        <button
          onClick={() => setShowSaveAs(true)}
          className="studio-btn studio-btn-outline studio-btn-md"
        >
          Save Current as Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-[var(--studio-danger)] bg-[color-mix(in_srgb,var(--studio-danger)_8%,transparent)] rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Template Selector Modal */}
      <TemplateSelector
        open={showSelector}
        currentTemplateId={currentTemplate?.id}
        onSelect={handleSelectTemplate}
        onClose={() => setShowSelector(false)}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Apply Template"
        description="This will replace all pages and sections. Your current content will be lost. This action cannot be undone."
        confirmLabel="Apply Template"
        variant="danger"
        onConfirm={handleApplyTemplate}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Save As Template Modal */}
      <SaveAsTemplateModal
        open={showSaveAs}
        websiteId={websiteId}
        onClose={() => setShowSaveAs(false)}
        onSaved={() => {
          setShowSaveAs(false);
          loadCurrentTemplate();
        }}
      />
    </div>
  );
}
