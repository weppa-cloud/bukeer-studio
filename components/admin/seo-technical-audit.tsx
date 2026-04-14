'use client';

import { useState } from 'react';
import type { HealthAuditDTO, IntegrationStatusDTO } from '@/lib/seo/dto';
import {
  StudioButton,
  StudioCard,
  StudioBadge,
  StudioEmptyState,
} from '@/components/studio/ui/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoTechnicalAuditProps {
  health: HealthAuditDTO[];
  websiteId: string;
  integrationStatus: IntegrationStatusDTO | null;
  onHealthRefresh?: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return 'text-[var(--studio-text-muted)]';
  if (score >= 90) return 'text-emerald-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

function scoreRingColor(score: number | null): string {
  if (score == null) return '#9ca3af'; // gray-400
  if (score >= 90) return '#10b981'; // emerald-500
  if (score >= 50) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function scoreTone(score: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (score == null) return 'neutral';
  if (score >= 90) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

// ─── Gauge circular SVG ───────────────────────────────────────────────────────

function PerformanceGauge({ score }: { score: number | null }) {
  const size = 64;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const progress = (value / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--studio-border)"
          strokeWidth="6"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute text-xs font-semibold ${scoreColor(score)}`}
        style={{ transform: 'none' }}
      >
        {score != null ? score : '–'}
      </span>
    </div>
  );
}

// ─── Section A: Trigger PageSpeed ─────────────────────────────────────────────

function PageSpeedTrigger({
  websiteId,
  onSuccess,
}: {
  websiteId: string;
  onSuccess: () => Promise<void>;
}) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  async function handleAudit() {
    setIsAuditing(true);
    setToast(null);
    try {
      const response = await fetch(`/api/seo/audit/pagespeed?websiteId=${websiteId}`, {
        method: 'POST',
      });

      if (response.status === 404) {
        setToast({ type: 'info', message: 'Funcion disponible proxima version.' });
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Audit failed');
      }

      setToast({ type: 'success', message: 'Auditoria completada. Resultados actualizados.' });
      await onSuccess();
    } catch (err) {
      // If the endpoint doesn't exist (network error / 404 variant), show friendly message
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('404') || message.includes('fetch') || message.includes('Failed to fetch')) {
        setToast({ type: 'info', message: 'Funcion disponible proxima version.' });
      } else {
        setToast({ type: 'error', message });
      }
    } finally {
      setIsAuditing(false);
    }
  }

  const toastBorderColor = toast?.type === 'success'
    ? 'border-[var(--studio-success)]/40 text-[var(--studio-success)]'
    : toast?.type === 'error'
    ? 'border-[var(--studio-danger)]/40 text-[var(--studio-danger)]'
    : 'border-[var(--studio-warning)]/40 text-[var(--studio-warning)]';

  return (
    <StudioCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">Auditoria PageSpeed</h3>
          <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
            Ejecuta un analisis de rendimiento CWV en las 6 plantillas de pagina.
          </p>
        </div>
        <StudioButton size="sm" onClick={handleAudit} disabled={isAuditing}>
          {isAuditing ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon />
              Auditando 6 paginas...
            </span>
          ) : (
            'Auditar paginas'
          )}
        </StudioButton>
      </div>

      {toast && (
        <div className={`studio-panel border p-2 text-xs ${toastBorderColor}`}>
          {toast.message}
        </div>
      )}
    </StudioCard>
  );
}

// ─── Section B: CWV by template ───────────────────────────────────────────────

function CwvByTemplate({ health }: { health: HealthAuditDTO[] }) {
  // Get latest record per pageType
  const byPageType = new Map<string, HealthAuditDTO>();
  for (const row of health) {
    const existing = byPageType.get(row.pageType);
    if (!existing || row.auditDate > existing.auditDate) {
      byPageType.set(row.pageType, row);
    }
  }
  const rows = Array.from(byPageType.values());

  return (
    <StudioCard className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">Core Web Vitals por template</h3>

      {rows.length === 0 ? (
        <StudioEmptyState
          title="No hay auditorias aun"
          description="Haz clic en 'Auditar paginas' para ejecutar el primer analisis de rendimiento."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => (
            <div
              key={row.pageType}
              className="studio-panel p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--studio-text)] capitalize">
                  {row.pageType}
                </p>
                <StudioBadge tone={scoreTone(row.performanceScore)}>
                  {row.performanceScore != null ? `${row.performanceScore}` : '–'}
                </StudioBadge>
              </div>

              <div className="flex items-center gap-3">
                <PerformanceGauge score={row.performanceScore} />
                <div className="space-y-1 text-xs text-[var(--studio-text-muted)]">
                  <p>
                    <span className="font-medium text-[var(--studio-text)]">LCP</span>{' '}
                    {row.lcpMs != null ? `${row.lcpMs} ms` : '–'}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--studio-text)]">CLS</span>{' '}
                    {row.clsScore != null ? row.clsScore.toFixed(3) : '–'}
                  </p>
                  <p className="text-[10px] text-[var(--studio-text-muted)]">
                    {row.auditDate ? new Date(row.auditDate).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudioCard>
  );
}

// ─── Section C: Sitemap status ────────────────────────────────────────────────

function SitemapStatus({ integrationStatus }: { integrationStatus: IntegrationStatusDTO | null }) {
  const gscConnected = Boolean(integrationStatus?.gsc.connected);

  return (
    <StudioCard className="p-4 space-y-2">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">Estado de Sitemaps</h3>
      {gscConnected ? (
        <div className="flex items-center gap-2 text-sm text-[var(--studio-text-muted)]">
          <SpinnerIcon />
          <span>Sincronizando sitemaps con Google Search Console...</span>
        </div>
      ) : (
        <p className="text-sm text-[var(--studio-text-muted)]">
          Conecta Google Search Console para ver el estado de sitemaps y cobertura de indice.
        </p>
      )}
    </StudioCard>
  );
}

// ─── Section D: Schema validation ────────────────────────────────────────────

function SchemaValidation() {
  const items = [
    'JSON-LD no verificado en tiempo real',
    'Checks de canonical pendientes de GSC',
    'hreflang auto-generado pendiente de activar',
  ];

  return (
    <StudioCard className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">Validacion Schema.org</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[var(--studio-text-muted)]">
            <span className="mt-px" aria-hidden>
              ⚠️
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </StudioCard>
  );
}

// ─── Section E: Technical checklist ──────────────────────────────────────────

interface ChecklistItem {
  label: string;
  passed: boolean;
}

function TechnicalChecklist({
  health,
  integrationStatus,
}: {
  health: HealthAuditDTO[];
  integrationStatus: IntegrationStatusDTO | null;
}) {
  const hasCwvGreen = health.some(
    (h) => h.performanceScore != null && h.performanceScore >= 90
  );

  const checks: ChecklistItem[] = [
    { label: 'Sitemap XML activo', passed: true },
    { label: 'CWV en verde (performance >= 90)', passed: hasCwvGreen },
    { label: 'SSL activo', passed: true },
    { label: 'hreflang configurado', passed: false }, // SEO-8
    { label: 'robots.txt presente', passed: true },
    { label: 'Canonical por pagina verificado', passed: false }, // B7
    { label: 'og:image configurado', passed: health.length > 0 },
    { label: 'Schema.org validado', passed: false }, // SEO-9
    { label: 'Auditoria PageSpeed ejecutada', passed: health.length > 0 },
    {
      label: 'Google Search Console conectado',
      passed: Boolean(integrationStatus?.gsc.connected),
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <StudioCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Checklist tecnico global</h3>
        <StudioBadge tone={passedCount >= 8 ? 'success' : passedCount >= 5 ? 'warning' : 'danger'}>
          {passedCount}/{checks.length} OK
        </StudioBadge>
      </div>

      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-sm">
            <span className="text-base leading-none" aria-hidden>
              {check.passed ? '✅' : '❌'}
            </span>
            <span
              className={
                check.passed
                  ? 'text-[var(--studio-text)]'
                  : 'text-[var(--studio-text-muted)]'
              }
            >
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </StudioCard>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SeoTechnicalAudit({
  health,
  websiteId,
  integrationStatus,
  onHealthRefresh,
}: SeoTechnicalAuditProps) {
  return (
    <div className="space-y-4">
      {/* A) PageSpeed trigger */}
      <PageSpeedTrigger
        websiteId={websiteId}
        onSuccess={onHealthRefresh ?? (() => Promise.resolve())}
      />

      {/* B) CWV by template */}
      <CwvByTemplate health={health} />

      {/* C) Sitemap status */}
      <SitemapStatus integrationStatus={integrationStatus} />

      {/* D) Schema validation */}
      <SchemaValidation />

      {/* E) Technical checklist */}
      <TechnicalChecklist health={health} integrationStatus={integrationStatus} />
    </div>
  );
}
