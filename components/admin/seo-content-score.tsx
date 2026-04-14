'use client';

import { useEffect, useState, useCallback } from 'react';
import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';
import type { Score5DResult } from '@/lib/seo/dto';
import type { SeoCheck } from '@/lib/seo/unified-scorer';

// ─── API response type ────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoContentScoreProps {
  item: {
    id: string;
    type: string;
    websiteId: string;
  };
}

type Locale = 'es-CO' | 'es-MX' | 'es-ES' | 'en-US';

const LOCALES: ReadonlyArray<{ id: Locale; label: string }> = [
  { id: 'es-CO', label: 'es-CO' },
  { id: 'es-MX', label: 'es-MX' },
  { id: 'es-ES', label: 'es-ES' },
  { id: 'en-US', label: 'en-US' },
];

interface ScoreApiResponse {
  d1: Score5DResult['d1'];
  d2: Score5DResult['d2'];
  d3: Score5DResult['d3'];
  d4: Score5DResult['d4'];
  d5: Score5DResult['d5'];
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  scorerChecks: SeoCheck[];
  recommendations: string[];
  locale: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function overallColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function overallBg(score: number): string {
  if (score >= 70) return 'border-emerald-200 bg-emerald-50';
  if (score >= 50) return 'border-amber-200 bg-amber-50';
  return 'border-red-200 bg-red-50';
}

function gradeTone(grade: string): 'success' | 'info' | 'warning' | 'danger' {
  switch (grade) {
    case 'A': return 'success';
    case 'B': return 'info';
    case 'C': return 'warning';
    default: return 'danger';
  }
}

// ─── Dimension bar ────────────────────────────────────────────────────────────

interface DimensionBarProps {
  label: string;
  score: number; // 0-20 points
  barColor: string;
  details: string[];
  comingSoon?: boolean;
}

function DimensionBar({ label, score, barColor, details, comingSoon = false }: DimensionBarProps) {
  const pct = Math.round((score / 20) * 100);
  const [expanded, setExpanded] = useState(false);
  const failedDetails = details.filter(Boolean);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--studio-text)]">{label}</span>
          {comingSoon && (
            <StudioBadge tone="info">Proximamente</StudioBadge>
          )}
        </div>
        <span className="text-sm font-semibold text-[var(--studio-text)]">
          {score}/20
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-[var(--studio-border)]">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {failedDetails.length > 0 && !comingSoon && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] underline-offset-2 hover:underline"
        >
          {expanded ? 'Ocultar' : `Ver ${failedDetails.length} problema${failedDetails.length > 1 ? 's' : ''}`}
        </button>
      )}

      {expanded && failedDetails.length > 0 && (
        <ul className="pl-3 space-y-0.5">
          {failedDetails.map((d, i) => (
            <li key={i} className="text-xs text-[var(--studio-text-muted)] flex items-start gap-1">
              <span className="mt-0.5 text-[var(--studio-danger)]">•</span>
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeoContentScore({ item }: SeoContentScoreProps) {
  const [locale, setLocale] = useState<Locale>('es-CO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreApiResponse | null>(null);

  const fetchScore = useCallback(async (loc: Locale) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        websiteId: item.websiteId,
        itemType: item.type,
        itemId: item.id,
        locale: loc,
      });

      const res = await fetch(`/api/seo/score?${params.toString()}`);
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error((body.error as string | undefined) ?? 'Error al calcular score');
      }

      setResult(body as unknown as ScoreApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [item.id, item.type, item.websiteId]);

  useEffect(() => {
    void fetchScore(locale);
  }, [fetchScore, locale]);

  function handleLocaleChange(loc: Locale) {
    setLocale(loc);
    // fetchScore called via effect
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="studio-card p-6 space-y-4 animate-pulse">
        <div className="h-6 w-32 rounded bg-[var(--studio-border)]" />
        <div className="h-16 w-24 rounded bg-[var(--studio-border)] mx-auto" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[var(--studio-border)]" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="studio-card p-6 space-y-3">
        <p className="text-sm text-[var(--studio-danger)]">{error}</p>
        <StudioButton size="sm" onClick={() => fetchScore(locale)}>
          Reintentar
        </StudioButton>
      </div>
    );
  }

  // ── No result yet ──
  if (!result) return null;

  const d1Score = Math.round((result.d1.score / 100) * 20);
  const d2Score = Math.round((result.d2.score / 100) * 20);
  const d3Score = Math.round((result.d3.score / 100) * 20);
  const d4Score = Math.round((result.d4.score / 100) * 20);

  // Failed checks grouped by dimension for the checklist
  const failedChecks = (result.scorerChecks ?? []).filter((c) => !c.pass);
  const failedByDim = {
    meta: failedChecks.filter((c) => c.dimension === 'meta'),
    content: failedChecks.filter((c) => c.dimension === 'content'),
    technical: failedChecks.filter((c) => c.dimension === 'technical'),
  };

  return (
    <div className="space-y-5">
      {/* ── Locale switcher ── */}
      <div className="studio-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--studio-text-muted)] font-medium">Locale:</span>
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLocaleChange(l.id)}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                locale === l.id
                  ? 'bg-[var(--studio-accent)] text-white'
                  : 'bg-[var(--studio-border)] text-[var(--studio-text-muted)] hover:bg-[var(--studio-border-hover,var(--studio-border))]',
              ].join(' ')}
            >
              {l.label}
            </button>
          ))}

          <div className="ml-auto">
            <StudioButton size="sm" variant="outline" onClick={() => fetchScore(locale)}>
              Recalcular
            </StudioButton>
          </div>
        </div>
      </div>

      {/* ── Overall score ── */}
      <div className={`studio-card p-6 border-2 ${overallBg(result.overall)}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--studio-text-muted)] uppercase tracking-wide">
              Content Score 5D
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-bold ${overallColor(result.overall)}`}>
                {result.overall}
              </span>
              <span className="text-xl text-[var(--studio-text-muted)]">/100</span>
            </div>
          </div>

          <div className="text-right space-y-2">
            <StudioBadge tone={gradeTone(result.grade)}>
              Grade {result.grade}
            </StudioBadge>
            <p className="text-xs text-[var(--studio-text-muted)]">
              {result.overall >= 70
                ? 'Buen SEO — sigue mejorando'
                : result.overall >= 50
                  ? 'SEO aceptable — hay margen de mejora'
                  : 'SEO insuficiente — requiere atencion'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5 Dimension bars ── */}
      <div className="studio-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Dimensiones 5D</h3>

        <DimensionBar
          label="D1 On-Page"
          score={d1Score}
          barColor="bg-blue-500"
          details={result.d1.details}
        />

        <DimensionBar
          label="D2 Semantico"
          score={d2Score}
          barColor="bg-emerald-500"
          details={result.d2.details}
        />

        <DimensionBar
          label="D3 Schema"
          score={d3Score}
          barColor="bg-orange-500"
          details={result.d3.details}
        />

        <DimensionBar
          label="D4 Conversion"
          score={d4Score}
          barColor="bg-purple-500"
          details={result.d4.details}
        />

        <DimensionBar
          label="D5 Competitivo"
          score={0}
          barColor="bg-slate-400"
          details={result.d5.details}
          comingSoon
        />
      </div>

      {/* ── Failed checks by dimension ── */}
      {failedChecks.length > 0 && (
        <div className="studio-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">
            Problemas detectados ({failedChecks.length})
          </h3>

          {failedByDim.meta.length > 0 && (
            <FailedCheckGroup title="On-Page / Meta" checks={failedByDim.meta} />
          )}
          {failedByDim.content.length > 0 && (
            <FailedCheckGroup title="Contenido Semantico" checks={failedByDim.content} />
          )}
          {failedByDim.technical.length > 0 && (
            <FailedCheckGroup title="Schema / Tecnico" checks={failedByDim.technical} />
          )}
        </div>
      )}

      {/* ── Recommendations ── */}
      {result.recommendations.length > 0 && (
        <div className="studio-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">Recomendaciones</h3>
          <ul className="space-y-1">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--studio-text)]">
                <span className="mt-0.5 text-amber-500 shrink-0">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Failed checks group ──────────────────────────────────────────────────────

interface FailedCheckGroupProps {
  title: string;
  checks: SeoCheck[];
}

function FailedCheckGroup({ title, checks }: FailedCheckGroupProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--studio-text-muted)] uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-1">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-2 p-2 rounded border border-[var(--studio-border)]"
          >
            <span className="mt-0.5 text-[var(--studio-danger)] shrink-0">✗</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--studio-text)]">{check.message}</p>
              <p className="text-xs text-[var(--studio-text-muted)]">
                {check.score}/{check.maxPoints} pts
              </p>
            </div>
            <StudioBadge tone="danger">Issue</StudioBadge>
          </div>
        ))}
      </div>
    </div>
  );
}
