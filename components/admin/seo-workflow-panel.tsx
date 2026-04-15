'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Circle, ExternalLink, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StudioBadge, StudioButton, StudioInput } from '@/components/studio/ui/primitives';

export interface ChecklistItem {
  id: string;
  label: string;
  criterion: string;
  status: 'pass' | 'warning' | 'fail' | 'unknown';
}

export interface SeoWorkflowPanelProps {
  itemType: 'hotel' | 'activity' | 'package' | 'destination' | 'blog';
  itemId: string;
  itemName: string;
  itemUrl: string;
  locale: string;
  websiteId: string;
  seoPath: string;
  onClose: () => void;
  checklist: ChecklistItem[];
  /** Optional slot rendered below the item name in the header (e.g. blog status badge) */
  headerExtra?: ReactNode;
}

type StepStatus = 'completed' | 'active' | 'pending';

interface Step {
  label: string;
  status: StepStatus;
}

interface WorkflowBaseline {
  websiteId: string;
  itemType: SeoWorkflowPanelProps['itemType'];
  itemId: string;
  url: string;
  locale: string;
  position: number;
  recordedAt: string;
}

const INITIAL_STEPS: Step[] = [
  { label: 'Research', status: 'completed' },
  { label: 'SERP', status: 'completed' },
  { label: 'On-Page', status: 'active' },
  { label: 'Medir', status: 'pending' },
];

function StatusIcon({ status }: { status: ChecklistItem['status'] }) {
  if (status === 'pass')
    return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />;
  if (status === 'warning')
    return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />;
  if (status === 'fail')
    return <XCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />;
  return <Circle className="h-4 w-4 flex-shrink-0 text-[var(--studio-text-muted)]" />;
}

function stepColor(status: StepStatus) {
  if (status === 'completed') return 'bg-emerald-500 text-white border-emerald-500';
  if (status === 'active') return 'bg-[var(--studio-primary)] text-white border-[var(--studio-primary)]';
  return 'bg-transparent text-[var(--studio-text-muted)] border-[var(--studio-border)]';
}

function stepLabelColor(status: StepStatus) {
  if (status === 'completed') return 'text-emerald-600';
  if (status === 'active') return 'text-[var(--studio-primary)] font-semibold';
  return 'text-[var(--studio-text-muted)]';
}

function connectorColor(leftStatus: StepStatus) {
  return leftStatus === 'completed' ? 'bg-emerald-400' : 'bg-[var(--studio-border)]';
}

export function SeoWorkflowPanel({
  itemType,
  itemId,
  itemName,
  itemUrl,
  locale,
  websiteId,
  seoPath,
  onClose,
  checklist,
  headerExtra,
}: SeoWorkflowPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>(checklist);
  const [baseline, setBaseline] = useState<WorkflowBaseline | null>(null);
  const [baselinePosition, setBaselinePosition] = useState('');
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineSaving, setBaselineSaving] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  const passedCount = items.filter((i) => i.status === 'pass').length;
  const total = items.length;
  const progressPct = total > 0 ? Math.round((passedCount / total) * 100) : 0;
  const allDone = passedCount === total;

  const steps: Step[] = INITIAL_STEPS.map((step, idx) => {
    if (idx === 3 && allDone) return { ...step, status: 'active' };
    return step;
  });

  const loadBaseline = useCallback(async () => {
    setBaselineLoading(true);
    setBaselineError(null);
    try {
      const params = new URLSearchParams({
        websiteId,
        itemType,
        itemId,
        locale,
      });
      const response = await fetch(`/api/seo/workflow/baseline?${params.toString()}`, {
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Failed to load baseline');
      }

      const nextBaseline = (body.baseline ?? null) as WorkflowBaseline | null;
      setBaseline(nextBaseline);
      setBaselinePosition(nextBaseline ? String(nextBaseline.position) : '');
    } catch (error) {
      setBaselineError(error instanceof Error ? error.message : 'Failed to load baseline');
    } finally {
      setBaselineLoading(false);
    }
  }, [websiteId, itemType, itemId, locale]);

  useEffect(() => {
    void loadBaseline();
  }, [loadBaseline]);

  function toggleStatus(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next: ChecklistItem['status'] =
          item.status === 'pass' ? 'unknown' : 'pass';
        return { ...item, status: next };
      })
    );
  }

  function openSerp() {
    const query = encodeURIComponent(`${itemName} ${itemType}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  }

  function goToSeo() {
    router.push(seoPath);
    onClose();
  }

  async function handleRegisterBaseline() {
    setBaselineError(null);
    setBaselineSaving(true);
    try {
      const response = await fetch('/api/seo/workflow/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          itemType,
          itemId,
          url: itemUrl,
          locale,
          position: baselinePosition,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Failed to save baseline');
      }

      const nextBaseline = body.baseline as WorkflowBaseline;
      setBaseline(nextBaseline);
      setBaselinePosition(String(nextBaseline.position));
    } catch (error) {
      setBaselineError(error instanceof Error ? error.message : 'Failed to save baseline');
    } finally {
      setBaselineSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`SEO Workflow — ${itemName}`}
        className="fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[95vw] flex-col border-l border-[var(--studio-border)] bg-[var(--studio-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--studio-border)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--studio-text-muted)]">
              Flujo SEO - {itemType}
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-[var(--studio-text)]">
              {itemName}
            </h2>
            {headerExtra ? <div className="mt-2">{headerExtra}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="rounded p-1 text-[var(--studio-text-muted)] hover:bg-[var(--studio-border)]/50 hover:text-[var(--studio-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="border-b border-[var(--studio-border)] px-4 py-4">
          <div className="flex items-start justify-between">
            {steps.map((step, idx) => (
              <div key={step.label} className="flex flex-1 items-start">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${stepColor(step.status)}`}
                  >
                    {step.status === 'completed' ? '✓' : idx + 1}
                  </div>
                  <span className={`mt-1 text-center text-[10px] leading-tight ${stepLabelColor(step.status)}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`mt-3 h-0.5 flex-1 transition-colors ${connectorColor(step.status)}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Measure */}
        <div className="border-b border-[var(--studio-border)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--studio-text)]">Medir</span>
            <StudioBadge tone={baseline ? 'success' : 'neutral'}>
              {baseline ? 'Baseline guardada' : 'Pendiente'}
            </StudioBadge>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--studio-border)] bg-[color-mix(in_srgb,var(--studio-surface)_92%,var(--studio-border)_8%)] p-3">
            <div className="grid gap-1.5">
              <label
                htmlFor={`${itemType}-${itemId}-baseline-position`}
                className="text-[10px] font-semibold uppercase tracking-widest text-[var(--studio-text-muted)]"
              >
                Posición base
              </label>
              <StudioInput
                id={`${itemType}-${itemId}-baseline-position`}
                type="number"
                min="0.1"
                step="0.1"
                placeholder="Ej. 12.4"
                value={baselinePosition}
                onChange={(event) => setBaselinePosition(event.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <StudioButton
                size="sm"
                onClick={handleRegisterBaseline}
                disabled={baselineSaving || baselineLoading || baselinePosition.trim().length === 0}
                className="flex-1"
              >
                {baselineSaving ? 'Guardando...' : 'Registrar línea base'}
              </StudioButton>
              <StudioButton
                size="sm"
                variant="outline"
                onClick={() => void loadBaseline()}
                disabled={baselineLoading || baselineSaving}
              >
                {baselineLoading ? 'Cargando...' : 'Refrescar'}
              </StudioButton>
            </div>

            {baselineError ? (
              <p className="text-xs text-rose-600">{baselineError}</p>
            ) : baseline ? (
              <div className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-2 text-xs text-[var(--studio-text)]">
                <p className="font-medium text-[var(--studio-text)]">Línea base guardada</p>
                <p className="mt-1 text-[var(--studio-text-muted)]">URL: {baseline.url}</p>
                <p className="text-[var(--studio-text-muted)]">Locale: {baseline.locale}</p>
                <p className="text-[var(--studio-text-muted)]">Posición: {baseline.position}</p>
                <p className="text-[var(--studio-text-muted)]">
                  Fecha: {new Date(baseline.recordedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--studio-text-muted)]">
                Sin baseline guardada. Registra la primera posición para fijar el punto de partida.
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="border-b border-[var(--studio-border)] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--studio-text)]">
              On-Page checklist
            </span>
            <span className="text-xs text-[var(--studio-text-muted)]">
              {passedCount}/{total} completados
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--studio-border)]/70">
            <div
              className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-[var(--studio-primary)]'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {allDone && (
            <p className="mt-1.5 text-xs font-medium text-emerald-600">
              Checklist completo - paso Medir activo
            </p>
          )}
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <label
                  className="group flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--studio-border)] p-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--studio-primary)_4%,transparent)]"
                  title={item.criterion}
                >
                  <input
                    type="checkbox"
                    checked={item.status === 'pass'}
                    onChange={() => toggleStatus(item.id)}
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-[var(--studio-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${
                        item.status === 'pass'
                          ? 'text-[var(--studio-text-muted)] line-through'
                          : 'text-[var(--studio-text)]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-[var(--studio-text-muted)]">
                      {item.criterion}
                    </p>
                  </div>
                  <StatusIcon status={item.status} />
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--studio-border)] px-4 py-3">
          <div className="flex gap-2">
            <StudioButton
              variant="outline"
              size="sm"
              onClick={openSerp}
              className="flex-1"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ver en SERP
            </StudioButton>
            <StudioButton
              size="sm"
              onClick={goToSeo}
              className="flex-1"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar SEO
            </StudioButton>
          </div>
        </div>
      </aside>
    </>
  );
}
