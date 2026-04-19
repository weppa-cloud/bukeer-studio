'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCompletion } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import {
  StudioBadge,
  StudioBadgeStatus,
  StudioButton,
  StudioTextarea,
} from '@/components/studio/ui/primitives';
import type { TranslationRowVM } from '@/components/admin/translations-dashboard';
import {
  inferLocaleParts,
  parseLocaleAdaptationEnvelopeCompletion,
} from '@/lib/seo/transcreate-client';

interface TranslationRowProps {
  websiteId: string;
  row: TranslationRowVM;
  selected: boolean;
  onToggle: (id: string) => void;
  primaryLabel: string;
  secondaryLabel?: string;
}

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function labelToAction(label?: string): 'create_draft' | 'review' | 'apply' | null {
  if (!label) return null;
  const normalized = label.toLowerCase();
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('apply')) return 'apply';
  if (normalized.includes('crear')) return 'create_draft';
  return null;
}

const FIELD_DIFF_KEYS = [
  'meta_title',
  'meta_desc',
  'slug',
  'h1',
  'keywords',
  'description_long',
  'highlights',
  'faq',
  'recommendations',
  'cta_final_text',
  'program_timeline',
  'inclusions',
  'exclusions',
  'hero_subtitle',
  'category_label',
] as const;
const JSON_ARRAY_FIELDS = new Set([
  'highlights',
  'faq',
  'recommendations',
  'program_timeline',
  'inclusions',
  'exclusions',
  'keywords',
]);

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function parseEditedFieldValue(field: string, raw: string): unknown {
  if (!JSON_ARRAY_FIELDS.has(field)) {
    return raw.trim();
  }

  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (field === 'keywords' && !trimmed.startsWith('[')) {
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return JSON.parse(trimmed);
}

export function TranslationRow({
  websiteId,
  row,
  selected,
  onToggle,
  primaryLabel,
  secondaryLabel,
}: TranslationRowProps) {
  const router = useRouter();
  const { job, qaFindingCount, drift } = row;
  const [localError, setLocalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [persistingAi, setPersistingAi] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});

  const {
    completion,
    complete,
    setCompletion,
    isLoading: generatingAi,
  } = useCompletion({
    api: '/api/seo/content-intelligence/transcreate/stream',
    streamProtocol: 'text',
    onError: (error) => setLocalError(error.message || 'Error generando con IA.'),
  });

  const primaryAction = useMemo(() => labelToAction(primaryLabel), [primaryLabel]);
  const secondaryAction = useMemo(() => labelToAction(secondaryLabel), [secondaryLabel]);
  const previewEnvelope = useMemo(
    () =>
      parseLocaleAdaptationEnvelopeCompletion(
        completion,
        job.targetKeyword || job.sourceKeyword || undefined,
      ),
    [completion, job.sourceKeyword, job.targetKeyword],
  );
  const previewFieldDiffs = useMemo(() => {
    if (!previewEnvelope) return [];

    return FIELD_DIFF_KEYS.map((key) => {
      const currentRaw = (previewEnvelope.payload_v2 as Record<string, unknown>)[key];
      const previousRaw = (row.payloadV2 as Record<string, unknown> | null)?.[key];
      const current = formatFieldValue(currentRaw);
      const previous = formatFieldValue(previousRaw);
      const changed = current !== previous;
      return {
        key,
        changed,
        current,
        previous,
        currentLength: current.length,
      };
    }).filter((entry) => entry.current.length > 0 || entry.previous.length > 0);
  }, [previewEnvelope, row.payloadV2]);
  const isBusy = actionLoading || generatingAi || persistingAi;

  useEffect(() => {
    if (previewFieldDiffs.length === 0) return;
    setFieldDraft((prev) => {
      const next = { ...prev };
      for (const entry of previewFieldDiffs) {
        if (typeof next[entry.key] !== 'string') {
          next[entry.key] = entry.current;
        }
      }
      return next;
    });
  }, [previewFieldDiffs]);

  const handleToggle = useCallback(() => {
    onToggle(job.id);
  }, [onToggle, job.id]);

  const runTransition = useCallback(
    async (action: 'create_draft' | 'review' | 'apply') => {
      if (!job.pageId) {
        setLocalError('No se puede ejecutar la acción sin pageId.');
        return;
      }

      const { country, language } = inferLocaleParts(job.targetLocale);
      setActionLoading(true);
      setLocalError(null);
      try {
        const response = await fetch('/api/seo/content-intelligence/transcreate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            websiteId,
            sourceContentId: job.pageId,
            pageType: job.pageType,
            sourceLocale: job.sourceLocale,
            targetLocale: job.targetLocale,
            country,
            language,
            sourceKeyword: job.sourceKeyword || undefined,
            targetKeyword: job.targetKeyword || job.sourceKeyword || undefined,
            draft: {},
            jobId: action === 'create_draft' ? undefined : job.id,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (!response.ok || !body.success) {
          throw new Error(body.error?.message || `No se pudo ejecutar ${action}.`);
        }
        router.refresh();
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : `No se pudo ejecutar ${action}.`);
      } finally {
        setActionLoading(false);
      }
    },
    [job.id, job.pageId, job.pageType, job.sourceKeyword, job.sourceLocale, job.targetKeyword, job.targetLocale, router, websiteId],
  );

  const handleGenerateWithAI = useCallback(async () => {
    if (!job.pageId) {
      setLocalError('No se puede generar sin pageId.');
      return;
    }

    const { country, language } = inferLocaleParts(job.targetLocale);
    setLocalError(null);
    setShowPreview(true);
    setCompletion('');

    try {
      const completionText = await complete('Generate transcreate draft JSON', {
        body: {
          websiteId,
          sourceContentId: job.pageId,
          pageType: job.pageType,
          sourceLocale: job.sourceLocale,
          targetLocale: job.targetLocale,
          country,
          language,
          sourceKeyword: job.sourceKeyword || undefined,
          targetKeyword: job.targetKeyword || job.sourceKeyword || undefined,
          draft: {},
        },
      });

      if (!completionText) {
        setLocalError('La IA no devolvió contenido.');
        return;
      }

      const envelope = parseLocaleAdaptationEnvelopeCompletion(
        completionText,
        job.targetKeyword || job.sourceKeyword || undefined,
      );
      if (!envelope) {
        setLocalError('La respuesta de IA no cumple el contrato esperado.');
        return;
      }

      setCompletion(JSON.stringify(envelope, null, 2));
      setPersistingAi(true);

      const response = await fetch('/api/seo/content-intelligence/transcreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_draft',
            websiteId,
          sourceContentId: job.pageId,
          pageType: job.pageType,
          sourceLocale: job.sourceLocale,
          targetLocale: job.targetLocale,
          country,
          language,
          sourceKeyword: job.sourceKeyword || undefined,
            targetKeyword: job.targetKeyword || job.sourceKeyword || undefined,
            draftSource: 'ai',
            aiOutput: {
              schema_version: envelope.schema_version,
              payload_v2: envelope.payload_v2,
            },
            schemaVersion: envelope.schema_version,
            payloadV2: envelope.payload_v2,
            aiModel: 'openrouter',
            draft: {},
          }),
        });

      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message || 'No se pudo persistir el draft AI.');
      }
      router.refresh();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo generar con IA.');
    } finally {
      setPersistingAi(false);
    }
  }, [
    complete,
    job.pageId,
    job.pageType,
    job.sourceKeyword,
    job.sourceLocale,
    job.targetKeyword,
    job.targetLocale,
    router,
    setCompletion,
    websiteId,
  ]);

  const handleSaveFieldEditorDraft = useCallback(async () => {
    if (!previewEnvelope || !job.pageId) {
      setLocalError('No hay preview válido para guardar.');
      return;
    }

    const payload = { ...(previewEnvelope.payload_v2 as Record<string, unknown>) };
    try {
      for (const entry of previewFieldDiffs) {
        const editedValue = fieldDraft[entry.key] ?? entry.current;
        payload[entry.key] = parseEditedFieldValue(entry.key, editedValue);
      }
    } catch {
      setLocalError('Uno o más campos JSON no tienen formato válido.');
      return;
    }

    const { country, language } = inferLocaleParts(job.targetLocale);
    setPersistingAi(true);
    setLocalError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/transcreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_draft',
          websiteId,
          sourceContentId: job.pageId,
          pageType: job.pageType,
          sourceLocale: job.sourceLocale,
          targetLocale: job.targetLocale,
          country,
          language,
          sourceKeyword: job.sourceKeyword || undefined,
          targetKeyword: job.targetKeyword || job.sourceKeyword || undefined,
          draftSource: 'ai',
          aiOutput: {
            schema_version: previewEnvelope.schema_version,
            payload_v2: payload,
          },
          schemaVersion: previewEnvelope.schema_version,
          payloadV2: payload,
          aiModel: 'openrouter',
          draft: {},
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message || 'No se pudo guardar el draft editado.');
      }
      router.refresh();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo guardar el draft editado.');
    } finally {
      setPersistingAi(false);
    }
  }, [
    fieldDraft,
    job.pageId,
    job.pageType,
    job.sourceKeyword,
    job.sourceLocale,
    job.targetKeyword,
    job.targetLocale,
    previewEnvelope,
    previewFieldDiffs,
    router,
    websiteId,
  ]);

  return (
    <>
      <tr className="border-b border-[var(--studio-border)]/50 hover:bg-[var(--studio-bg)]/40">
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleToggle}
            aria-label={`Seleccionar job ${job.id}`}
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col min-w-0 max-w-[260px]">
            <span className="font-medium text-[var(--studio-text)] truncate">
              {job.targetKeyword || job.sourceKeyword || job.pageId || job.id}
            </span>
            {job.sourceKeyword && job.targetKeyword ? (
              <span className="text-[11px] text-[var(--studio-text-muted)] truncate">
                {job.sourceKeyword} → {job.targetKeyword}
              </span>
            ) : null}
            {drift ? (
              <StudioBadge tone="warning" className="mt-1 w-fit text-[10px]">
                Drift
              </StudioBadge>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-2 capitalize text-[var(--studio-text-muted)]">
          {job.pageType}
        </td>
        <td className="px-3 py-2 text-[var(--studio-text-muted)]">
          <span className="font-mono text-xs">
            {job.sourceLocale} → {job.targetLocale}
          </span>
        </td>
        <td className="px-3 py-2">
          <StudioBadgeStatus status={job.status} />
        </td>
        <td className="px-3 py-2">
          <StudioBadge tone={qaFindingCount > 0 ? 'danger' : 'neutral'}>
            {qaFindingCount}
          </StudioBadge>
        </td>
        <td className="px-3 py-2 text-xs text-[var(--studio-text-muted)]">
          {formatDate(job.updatedAt)}
        </td>
        <td className="px-3 py-2">
          <div className="inline-flex items-center gap-1 justify-end w-full">
            <StudioButton
              size="sm"
              variant="outline"
              onClick={() => void handleGenerateWithAI()}
              disabled={isBusy || !job.pageId}
              aria-label="Generate with AI"
            >
              {generatingAi ? 'Generating…' : persistingAi ? 'Saving…' : 'Generate with AI'}
            </StudioButton>
            {primaryAction ? (
              <StudioButton
                size="sm"
                variant="outline"
                onClick={() => void runTransition(primaryAction)}
                disabled={isBusy || !job.pageId}
                aria-label={primaryLabel}
              >
                {primaryLabel}
              </StudioButton>
            ) : null}
            {secondaryAction ? (
              <StudioButton
                size="sm"
                variant="ghost"
                onClick={() => void runTransition(secondaryAction)}
                disabled={isBusy || !job.pageId}
                aria-label={secondaryLabel}
              >
                {secondaryLabel}
              </StudioButton>
            ) : null}
          </div>
        </td>
      </tr>
      {showPreview || completion.trim().length > 0 || localError ? (
        <tr className="border-b border-[var(--studio-border)]/40 bg-[var(--studio-bg)]/20">
          <td colSpan={8} className="px-3 py-2 space-y-2">
            {completion.trim().length > 0 || generatingAi ? (
              <StudioTextarea
                value={completion}
                readOnly
                rows={8}
                className="w-full font-mono text-xs"
                aria-label="AI streaming preview"
              />
            ) : null}
            {localError ? (
              <p className="text-xs text-[var(--studio-danger)]">{localError}</p>
            ) : null}
            {previewFieldDiffs.length > 0 ? (
              <div className="space-y-2 rounded-md border border-[var(--studio-border)] p-2">
                <p className="text-xs font-medium text-[var(--studio-text)]">
                  Field preview and diff (vs previous payload)
                </p>
                <div className="space-y-1.5">
                  {previewFieldDiffs.map((entry) => (
                    <div
                      key={entry.key}
                      className="rounded border border-[var(--studio-border)] p-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px]">{entry.key}</span>
                        <div className="flex items-center gap-2">
                          <StudioBadge tone={entry.changed ? 'warning' : 'success'}>
                            {entry.changed ? 'changed' : 'same'}
                          </StudioBadge>
                          <span className="text-[var(--studio-text-muted)]">
                            {(fieldDraft[entry.key] ?? entry.current).length} chars
                          </span>
                        </div>
                      </div>
                      {entry.changed && entry.previous.length > 0 ? (
                        <p className="mt-1 whitespace-pre-wrap text-[var(--studio-text-muted)]">
                          prev: {entry.previous}
                        </p>
                      ) : null}
                      <StudioTextarea
                        value={fieldDraft[entry.key] ?? entry.current}
                        rows={Math.min(8, Math.max(2, (fieldDraft[entry.key] ?? entry.current).split('\n').length))}
                        onChange={(event) =>
                          setFieldDraft((prev) => ({ ...prev, [entry.key]: event.target.value }))
                        }
                        className="mt-1 font-mono text-xs"
                        aria-label={`Editor ${entry.key}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <StudioButton
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSaveFieldEditorDraft()}
                    disabled={isBusy || !previewEnvelope}
                  >
                    Guardar draft editado
                  </StudioButton>
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
