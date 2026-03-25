'use client';

import { useState } from 'react';

interface ScoreCheck {
  id: string;
  category: 'seo' | 'readability' | 'structure' | 'geo';
  pass: boolean;
  score: number;
  weight: number;
  message: string;
}

interface ScoringResult {
  overall: number;
  seo: number;
  readability: number;
  structure: number;
  geo: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: ScoreCheck[];
}

interface ScoreDisplayProps {
  score: ScoringResult | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  B: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  D: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300' },
  F: { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-400' },
};

const categoryLabels: Record<string, string> = {
  seo: 'SEO',
  structure: 'Estructura',
  readability: 'Legibilidad',
  geo: 'GEO / AI',
};

/** Compact grade badge for the toolbar */
export function GradeBadge({ grade, score, isLoading }: { grade?: string; score?: number; isLoading: boolean }) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground animate-pulse">
        ...
      </span>
    );
  }
  if (!grade) return null;

  const colors = gradeColors[grade] || gradeColors.F;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
      title={`SEO Score: ${score}/100`}
    >
      {grade}
      {score !== undefined && <span className="font-normal opacity-70">{score}</span>}
    </span>
  );
}

/** Full score detail panel */
export function ScoreDetailPanel({ score, isLoading, onRefresh }: ScoreDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="px-6 py-3 bg-muted/20 border-b text-xs text-muted-foreground animate-pulse">
        Analizando contenido...
      </div>
    );
  }

  if (!score) return null;

  const dimensions = [
    { key: 'seo', label: 'SEO', value: score.seo },
    { key: 'structure', label: 'Estructura', value: score.structure },
    { key: 'readability', label: 'Legibilidad', value: score.readability },
    { key: 'geo', label: 'GEO / AI', value: score.geo },
  ];

  const barColor = (value: number) =>
    value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="px-6 py-3 bg-muted/10 border-b">
      {/* Summary row */}
      <div className="flex items-center gap-4">
        <GradeBadge grade={score.grade} score={score.overall} isLoading={false} />
        <div className="flex-1 flex gap-3">
          {dimensions.map(d => (
            <div key={d.key} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{d.label}:</span>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(d.value)}`} style={{ width: `${d.value}%` }} />
              </div>
              <span className="font-medium w-6 text-right">{d.value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="text-xs text-primary hover:underline">
              Re-score
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? 'Ocultar' : 'Detalles'} ({score.checks.filter(c => c.pass).length}/{score.checks.length})
          </button>
        </div>
      </div>

      {/* Expanded checks */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {(['seo', 'structure', 'readability', 'geo'] as const).map(cat => {
            const catChecks = score.checks.filter(c => c.category === cat);
            if (catChecks.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {categoryLabels[cat]}
                </div>
                <div className="space-y-0.5">
                  {catChecks.map(check => (
                    <div key={check.id} className="flex items-center gap-2 text-xs py-0.5">
                      <span className={check.pass ? 'text-green-600' : 'text-red-500'}>
                        {check.pass ? '✓' : '✗'}
                      </span>
                      <span className={check.pass ? 'text-muted-foreground' : 'text-foreground'}>
                        {check.message}
                      </span>
                      <span className="text-muted-foreground/50 ml-auto">{check.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Warning banner for low scores */
export function ScoreWarningBanner({ grade }: { grade?: string }) {
  if (!grade || !['D', 'F'].includes(grade)) return null;

  return (
    <div className="mx-6 mt-2 px-4 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
      <strong>Puntuación baja ({grade}).</strong> Este contenido puede no performar bien en búsqueda.
      Revisa los detalles del scoring para mejorar.
    </div>
  );
}
