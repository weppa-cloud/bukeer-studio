'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlogAiGeneratePayload {
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  faqs: Array<{ question: string; answer: string }>;
  /** Extra metadata, optional. */
  slug?: string;
  tags?: string[];
  tldr?: string;
}

export interface BlogAiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteId: string;
  defaultLocale?: string;
  /** Preselected tone. Optional. */
  defaultTone?: string;
  /** Optional cluster id prefill. */
  defaultClusterId?: string;
  /** Called with the generated post fields. */
  onApply: (data: BlogAiGeneratePayload) => void;
}

type BlogV2Response = {
  success?: boolean;
  data?: {
    post?: {
      title: string;
      slug?: string;
      excerpt?: string;
      content: string;
      tldr?: string;
      tags?: string[];
      faq_items?: Array<{ question: string; answer: string }>;
      seo: { metaTitle: string; metaDescription: string; keywords?: string[] };
    };
  };
  error?: { code?: string; message?: string };
};

const DEFAULT_LOCALES = ['es-CO', 'en-US', 'pt-BR'] as const;
const TONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'professional', label: 'Profesional' },
  { value: 'friendly', label: 'Cercano' },
  { value: 'inspirational', label: 'Inspirador' },
  { value: 'informative', label: 'Informativo' },
  { value: 'playful', label: 'Desenfadado' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlogAiGenerateDialog({
  open,
  onOpenChange,
  websiteId,
  defaultLocale,
  defaultTone = 'professional',
  defaultClusterId,
  onApply,
}: BlogAiGenerateDialogProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Form state --------------------------------------------------------------
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState(defaultTone);
  const [locale, setLocale] = useState<string>(defaultLocale ?? '');
  const [clusterId, setClusterId] = useState<string>(defaultClusterId ?? '');
  const [locales, setLocales] = useState<string[]>([]);
  const [localesLoading, setLocalesLoading] = useState(false);

  // Request state -----------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirm-on-close --------------------------------------------------------
  const [confirmClose, setConfirmClose] = useState(false);

  const isDirty = keyword.trim().length > 0 || submitting;

  // Fetch supported locales once when dialog opens --------------------------
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLocalesLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('websites')
          .select('supported_locales, default_locale')
          .eq('id', websiteId)
          .single();
        if (cancelled) return;
        let merged: string[];
        if (error || !data) {
          merged = [...DEFAULT_LOCALES];
        } else {
          const list = Array.isArray((data as { supported_locales?: string[] }).supported_locales)
            ? ((data as { supported_locales?: string[] }).supported_locales as string[])
            : [];
          merged = list.length > 0 ? list : [...DEFAULT_LOCALES];
        }
        setLocales(merged);
        if (!locale) {
          const dataDefault = (data as { default_locale?: string } | null)?.default_locale;
          setLocale(defaultLocale ?? dataDefault ?? merged[0] ?? 'es-CO');
        }
      } finally {
        if (!cancelled) setLocalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, websiteId]);

  // Reset errors when opening ------------------------------------------------
  useEffect(() => {
    if (!open) return;
    setErrorCode(null);
    setErrorMessage(null);
  }, [open]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleGenerate() {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMessage('Ingresa una keyword o tema semilla.');
      return;
    }

    setSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      // Endpoint accepts a short language code — strip region if present.
      const languageCode = (locale || 'es').split('-')[0] ?? 'es';
      const response = await fetch('/api/ai/editor/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: trimmed,
          locale: languageCode,
          tone,
          version: 2,
          clusterContext: clusterId ? `Cluster ID: ${clusterId}` : undefined,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as BlogV2Response;

      if (!response.ok || !body.success) {
        setErrorCode(body?.error?.code ?? `HTTP_${response.status}`);
        setErrorMessage(body?.error?.message ?? 'No se pudo generar el contenido con IA.');
        return;
      }

      const post = body.data?.post;
      if (!post) {
        setErrorCode('EMPTY_RESPONSE');
        setErrorMessage('La IA no devolvió contenido. Intenta de nuevo.');
        return;
      }

      onApply({
        title: post.title,
        body: post.content,
        seoTitle: post.seo?.metaTitle ?? post.title,
        seoDescription: post.seo?.metaDescription ?? post.excerpt ?? '',
        faqs: post.faq_items ?? [],
        slug: post.slug,
        tags: post.tags,
        tldr: post.tldr,
      });
      onOpenChange(false);
    } catch (err) {
      setErrorCode('NETWORK_ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Error de red al generar contenido.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRequestClose(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const selectableLocales = locales.length > 0 ? locales : [...DEFAULT_LOCALES];

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generar con IA
            </DialogTitle>
            <DialogDescription>
              Escribe una keyword o tema semilla y genera un borrador SEO optimizado listo para editar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="blog-ai-keyword" className="text-xs font-medium text-muted-foreground">
                Keyword / tema <span className="text-destructive">*</span>
              </label>
              <input
                id="blog-ai-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ej. mejores rutas de café en el Eje Cafetero"
                disabled={submitting}
                maxLength={200}
                autoFocus
                className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="blog-ai-tone" className="text-xs font-medium text-muted-foreground">
                  Tono
                </label>
                <select
                  id="blog-ai-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={submitting}
                  className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="blog-ai-locale" className="text-xs font-medium text-muted-foreground">
                  Idioma
                </label>
                <select
                  id="blog-ai-locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  disabled={submitting || localesLoading}
                  className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {selectableLocales.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="blog-ai-cluster" className="text-xs font-medium text-muted-foreground">
                Cluster ID (opcional)
              </label>
              <input
                id="blog-ai-cluster"
                type="text"
                value={clusterId}
                onChange={(e) => setClusterId(e.target.value)}
                placeholder="UUID del cluster para interlinking"
                disabled={submitting}
                className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                Si añades un cluster, la IA sugerirá links internos relacionados.
              </p>
            </div>

            {localesLoading ? <p className="text-xs text-muted-foreground">Cargando idiomas…</p> : null}

            {errorCode ? (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">[{errorCode}] Error</p>
                  <p className="text-xs opacity-90 mt-1">{errorMessage}</p>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleRequestClose(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={submitting || !keyword.trim()}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {submitting ? 'Generando…' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        title="¿Descartar?"
        description="Tienes datos en el formulario. ¿Cerrar sin generar?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        variant="danger"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

export default BlogAiGenerateDialog;
