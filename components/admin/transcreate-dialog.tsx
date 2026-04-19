'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  inferLocaleParts,
  parseLocaleAdaptationEnvelopeCompletion,
} from '@/lib/seo/transcreate-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TranscreatePageType =
  | 'blog'
  | 'destination'
  | 'package'
  | 'activity'
  | 'page'
  | 'hotel'
  | 'transfer';

export interface TranscreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteId: string;
  /** Source entity id (blog post / page / product id). Required. */
  sourceId: string;
  /** Source locale (e.g. 'es-CO'). Required. */
  sourceLocale: string;
  /** Page type the source maps to (must be one of SeoPageTypeSchema values). */
  pageType: TranscreatePageType;
  /** Optional supported locales list — if empty/undefined the dialog will fetch from `websites`. */
  supportedLocales?: string[];
  /** Optional default target locale preselected in the picker. */
  defaultTargetLocale?: string;
  /** Optional source keyword (target keyword on the source entity). */
  sourceKeyword?: string;
  /** Optional short display name of the source entity. Shown in header. */
  sourceName?: string;
  /** Invoked after a successful create_draft with the new job id. */
  onSuccess?: (jobId: string) => void;
}

type KeywordReresearchRequired = {
  source_locale?: string;
  target_locale?: string;
  country?: string;
  language?: string;
  target_keyword?: string | null;
  source_keyword?: string | null;
};

const DEFAULT_LOCALES = ['es-CO', 'en-US', 'pt-BR'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TranscreateDialog({
  open,
  onOpenChange,
  websiteId,
  sourceId,
  sourceLocale,
  pageType,
  supportedLocales,
  defaultTargetLocale,
  sourceKeyword,
  sourceName,
  onSuccess,
}: TranscreateDialogProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Form state ---------------------------------------------------------------
  const [locales, setLocales] = useState<string[]>(supportedLocales ?? []);
  const [localesLoading, setLocalesLoading] = useState(false);
  const [targetLocale, setTargetLocale] = useState<string>(
    defaultTargetLocale ?? (supportedLocales?.find((l) => l !== sourceLocale) ?? ''),
  );
  const [selectedSourceLocale, setSelectedSourceLocale] = useState<string>(sourceLocale);
  const [selectedPageType, setSelectedPageType] = useState<TranscreatePageType>(pageType);

  // Request state ------------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [persistingAi, setPersistingAi] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reresearchDetails, setReresearchDetails] = useState<KeywordReresearchRequired | null>(null);
  const [syncQueuedId, setSyncQueuedId] = useState<string | null>(null);

  // Confirm-on-close when dirty ---------------------------------------------
  const [confirmClose, setConfirmClose] = useState(false);

  const {
    completion,
    complete,
    setCompletion,
    isLoading: generatingAi,
  } = useCompletion({
    api: '/api/seo/content-intelligence/transcreate/stream',
    streamProtocol: 'text',
    onError: (error) => {
      setErrorCode('AI_STREAM_ERROR');
      setErrorMessage(error.message || 'No se pudo generar el borrador con IA.');
    },
  });

  const isDirty =
    submitting ||
    persistingAi ||
    syncing ||
    generatingAi ||
    !!errorCode ||
    completion.trim().length > 0;

  // Fetch supported locales if not provided ---------------------------------
  useEffect(() => {
    if (!open) return;
    if (supportedLocales && supportedLocales.length > 0) {
      setLocales(supportedLocales);
      return;
    }
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
        if (error || !data) {
          setLocales([...DEFAULT_LOCALES]);
          return;
        }
        const list = Array.isArray((data as { supported_locales?: string[] }).supported_locales)
          ? ((data as { supported_locales?: string[] }).supported_locales as string[])
          : [];
        const merged = list.length > 0 ? list : [...DEFAULT_LOCALES];
        setLocales(merged);
        const preferred =
          defaultTargetLocale ?? merged.find((l) => l !== sourceLocale) ?? merged[0] ?? '';
        if (!targetLocale) setTargetLocale(preferred);
      } finally {
        if (!cancelled) setLocalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, websiteId, supportedLocales]);

  // Reset when dialog opens --------------------------------------------------
  useEffect(() => {
    if (!open) return;
    setErrorCode(null);
    setErrorMessage(null);
    setReresearchDetails(null);
    setSyncQueuedId(null);
    setCompletion('');
    setSelectedSourceLocale(sourceLocale);
    setSelectedPageType(pageType);
  }, [open, sourceLocale, pageType, setCompletion]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function createDraft(input: {
    draft?: Record<string, unknown>;
    draftSource?: 'manual' | 'ai' | 'tm_exact';
    aiOutput?: Record<string, unknown>;
    schemaVersion?: '2.0' | '2.1';
    payloadV2?: Record<string, unknown>;
    aiModel?: string;
  }): Promise<string | null> {
    const { country, language } = inferLocaleParts(targetLocale);
    const response = await fetch('/api/seo/content-intelligence/transcreate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_draft',
        websiteId,
        sourceContentId: sourceId,
        pageType: selectedPageType,
        sourceLocale: selectedSourceLocale,
        targetLocale,
        country,
        language,
        sourceKeyword: sourceKeyword || undefined,
        targetKeyword: sourceKeyword || undefined,
        draft: input.draft ?? {},
        draftSource: input.draftSource ?? 'manual',
        aiOutput: input.aiOutput,
        schemaVersion: input.schemaVersion,
        payloadV2: input.payloadV2,
        aiModel: input.aiModel,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { job?: { id: string } };
      error?: {
        code?: string;
        message?: string;
        details?: {
          required?: KeywordReresearchRequired;
          sync?: { code?: string; requestId?: string } | null;
        } | null;
      };
    };

    if (response.status === 409 && body?.error?.code === 'TARGET_RERESEARCH_REQUIRED') {
      setErrorCode('TARGET_RERESEARCH_REQUIRED');
      setErrorMessage(
        body.error.message ??
          'Necesitas sincronizar keywords para el locale destino antes de crear el borrador.',
      );
      setReresearchDetails(body.error.details?.required ?? null);
      setSyncQueuedId(body.error.details?.sync?.requestId ?? null);
      return null;
    }

    if (!response.ok || !body.success) {
      setErrorCode(body?.error?.code ?? `HTTP_${response.status}`);
      setErrorMessage(body?.error?.message ?? 'No se pudo crear el borrador de traducción.');
      return null;
    }

    return body.data?.job?.id ?? null;
  }

  async function handleSubmit() {
    if (!targetLocale) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMessage('Selecciona un idioma destino.');
      return;
    }
    if (targetLocale === selectedSourceLocale) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMessage('El idioma destino debe ser distinto al idioma origen.');
      return;
    }

    setSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);
    setReresearchDetails(null);

    try {
      const jobId = await createDraft({ draftSource: 'manual', draft: {} });
      if (jobId && onSuccess) onSuccess(jobId);
      if (jobId) onOpenChange(false);
    } catch (err) {
      setErrorCode('NETWORK_ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Error de red al contactar el servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateWithAI() {
    if (!targetLocale) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMessage('Selecciona un idioma destino.');
      return;
    }
    if (targetLocale === selectedSourceLocale) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMessage('El idioma destino debe ser distinto al idioma origen.');
      return;
    }

    const { country, language } = inferLocaleParts(targetLocale);
    setErrorCode(null);
    setErrorMessage(null);
    setReresearchDetails(null);
    setCompletion('');

    try {
      const completionText = await complete('Generate transcreate draft JSON', {
        body: {
          websiteId,
          sourceContentId: sourceId,
          pageType: selectedPageType,
          sourceLocale: selectedSourceLocale,
          targetLocale,
          country,
          language,
          sourceKeyword: sourceKeyword || undefined,
          targetKeyword: sourceKeyword || undefined,
          draft: {},
        },
      });

      if (!completionText) {
        setErrorCode('AI_STREAM_EMPTY');
        setErrorMessage('La IA no devolvió contenido.');
        return;
      }

      const envelope = parseLocaleAdaptationEnvelopeCompletion(
        completionText,
        sourceKeyword || undefined,
      );
      if (!envelope) {
        setErrorCode('AI_OUTPUT_INVALID');
        setErrorMessage('La respuesta de IA no cumple el contrato esperado.');
        return;
      }

      setCompletion(JSON.stringify(envelope, null, 2));
      setPersistingAi(true);
      const jobId = await createDraft({
        draftSource: 'ai',
        aiOutput: {
          schema_version: envelope.schema_version,
          payload_v2: envelope.payload_v2,
        },
        schemaVersion: envelope.schema_version,
        payloadV2: envelope.payload_v2,
        aiModel: 'openrouter',
      });
      if (jobId && onSuccess) onSuccess(jobId);
      if (jobId) onOpenChange(false);
    } catch (err) {
      setErrorCode('AI_STREAM_ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo generar con IA.');
    } finally {
      setPersistingAi(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/seo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, includeDataForSeo: true }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        requestId?: string;
        error?: string;
        code?: string;
      };
      if (!response.ok) {
        setErrorCode(body?.code ?? `HTTP_${response.status}`);
        setErrorMessage(body?.error ?? 'No se pudo iniciar la sincronización.');
        return;
      }
      setSyncQueuedId(body.requestId ?? null);
      setErrorCode('SYNC_QUEUED');
      setErrorMessage(
        'Sincronización iniciada. Vuelve a intentar crear el borrador en unos minutos cuando los keywords estén disponibles.',
      );
    } catch (err) {
      setErrorCode('NETWORK_ERROR');
      setErrorMessage(err instanceof Error ? err.message : 'Error de red al iniciar sync.');
    } finally {
      setSyncing(false);
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
  const targetOptions = selectableLocales.filter((l) => l !== selectedSourceLocale);

  return (
    <>
      <Dialog open={open} onOpenChange={handleRequestClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Traducir contenido</DialogTitle>
            <DialogDescription>
              Crea un borrador de traducción para {sourceName ? <strong>{sourceName}</strong> : 'este contenido'} con
              soporte SEO por locale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="transcreate-source-locale" className="text-xs font-medium text-muted-foreground">
                  Idioma origen
                </label>
                <select
                  id="transcreate-source-locale"
                  value={selectedSourceLocale}
                  onChange={(e) => setSelectedSourceLocale(e.target.value)}
                  disabled={submitting}
                  className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {selectableLocales.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="transcreate-target-locale" className="text-xs font-medium text-muted-foreground">
                  Idioma destino <span className="text-destructive">*</span>
                </label>
                <select
                  id="transcreate-target-locale"
                  value={targetLocale}
                  onChange={(e) => setTargetLocale(e.target.value)}
                  disabled={submitting || localesLoading}
                  className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecciona...</option>
                  {targetOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="transcreate-page-type" className="text-xs font-medium text-muted-foreground">
                Tipo de contenido
              </label>
              <select
                id="transcreate-page-type"
                value={selectedPageType}
                onChange={(e) => setSelectedPageType(e.target.value as TranscreatePageType)}
                disabled={submitting}
                className="w-full h-9 px-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="blog">Blog</option>
                <option value="page">Página</option>
                <option value="destination">Destino</option>
                <option value="package">Paquete</option>
                <option value="activity">Actividad</option>
                <option value="hotel">Hotel</option>
                <option value="transfer">Traslado</option>
              </select>
            </div>

            {localesLoading ? (
              <p className="text-xs text-muted-foreground">Cargando idiomas soportados…</p>
            ) : null}

            {completion.trim().length > 0 || generatingAi ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  AI preview (JSON)
                </label>
                <textarea
                  value={completion}
                  readOnly
                  rows={8}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-mono text-foreground"
                />
              </div>
            ) : null}

            {errorCode && errorCode === 'TARGET_RERESEARCH_REQUIRED' ? (
              <div
                role="alert"
                aria-live="polite"
                className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">
                      Necesitas sincronizar keywords para {reresearchDetails?.target_locale ?? targetLocale}
                    </p>
                    <p className="text-xs opacity-90 mt-1">
                      [{errorCode}] {errorMessage}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="gap-1.5"
                  >
                    {syncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                  </Button>
                  {syncQueuedId ? (
                    <span className="text-[10px] opacity-70 tabular-nums">ID: {syncQueuedId.slice(0, 8)}</span>
                  ) : null}
                </div>
              </div>
            ) : errorCode === 'SYNC_QUEUED' ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-900 dark:text-sky-200"
              >
                <p className="font-semibold">[SYNC_QUEUED] Sincronización en curso</p>
                <p className="text-xs opacity-90 mt-1">{errorMessage}</p>
              </div>
            ) : errorCode ? (
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
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRequestClose(false)}
              disabled={submitting || persistingAi || generatingAi}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleGenerateWithAI()}
              disabled={
                submitting ||
                persistingAi ||
                generatingAi ||
                !targetLocale ||
                targetLocale === selectedSourceLocale
              }
              className="gap-1.5"
            >
              {generatingAi || persistingAi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              {generatingAi
                ? 'Generando con IA…'
                : persistingAi
                  ? 'Guardando draft AI…'
                  : 'Generate with AI'}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                persistingAi ||
                generatingAi ||
                !targetLocale ||
                targetLocale === selectedSourceLocale
              }
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              {submitting ? 'Creando borrador…' : 'Crear borrador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar en el formulario de traducción. ¿Seguro que quieres cerrar?"
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

export default TranscreateDialog;
