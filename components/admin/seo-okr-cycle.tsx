'use client';

import { useState } from 'react';
import type { AnalyticsOverviewDTO } from '@/lib/seo/dto';
import { StudioBadge } from '@/components/studio/ui/primitives';

interface SeoOkrCycleProps {
  websiteId: string;
  overview?: AnalyticsOverviewDTO | null;
}

// ─── Ciclo 7D ────────────────────────────────────────────────────────────────

interface QuickWinAction {
  id: string;
  label: string;
  target: string;
}

const QUICK_WIN_ACTIONS: QuickWinAction[] = [
  {
    id: 'title-tag',
    label: 'Optimizar title tag del hotel principal',
    target: '+0.5% CTR',
  },
  {
    id: 'faq-schema',
    label: 'Añadir FAQ schema a top 3 destinos',
    target: '+2 posiciones',
  },
  {
    id: 'images-compress',
    label: 'Comprimir imágenes hero (>200KB)',
    target: '-0.3s LCP',
  },
];

function Ciclo7D() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const doneCount = QUICK_WIN_ACTIONS.filter((a) => checked[a.id]).length;
  const total = QUICK_WIN_ACTIONS.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">⚡</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 7D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Esta semana · Quick Wins</p>
        </div>
        <div className="ml-auto">
          <StudioBadge tone={doneCount === total ? 'success' : 'neutral'}>
            {doneCount}/{total}
          </StudioBadge>
        </div>
      </div>

      {/* Action cards */}
      <div className="space-y-2">
        {QUICK_WIN_ACTIONS.map((action) => (
          <label
            key={action.id}
            className="flex items-start gap-3 p-3 rounded-md border border-[var(--studio-border)] cursor-pointer hover:border-[var(--studio-accent)] transition-colors"
          >
            <input
              type="checkbox"
              checked={checked[action.id] ?? false}
              onChange={() => toggle(action.id)}
              className="mt-0.5 accent-[var(--studio-accent)]"
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-medium transition-colors ${
                  checked[action.id]
                    ? 'line-through text-[var(--studio-text-muted)]'
                    : 'text-[var(--studio-text)]'
                }`}
              >
                {action.label}
              </p>
              <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
                Meta: {action.target}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--studio-text-muted)]">Progreso semanal</span>
          <span className="text-xs font-medium text-[var(--studio-text)]">{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--studio-border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--studio-accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Ciclo 30D ───────────────────────────────────────────────────────────────

interface OkrRow {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  lowerIsBetter?: boolean;
}

function buildOkrRows(overview: AnalyticsOverviewDTO | null | undefined): OkrRow[] {
  return [
    {
      id: 'clicks',
      label: 'Clicks orgánicos',
      current: overview?.sessions ?? 0,
      target: 500,
      unit: 'clicks/mes',
    },
    {
      id: 'position',
      label: 'Posición promedio',
      current: 0,
      target: 15,
      unit: 'pos avg',
      lowerIsBetter: true,
    },
    {
      id: 'score',
      label: 'Score técnico',
      current: 0,
      target: 75,
      unit: '/100',
    },
  ];
}

function OkrProgressBar({ current, target, lowerIsBetter }: { current: number; target: number; lowerIsBetter?: boolean }) {
  const pct = target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  const effectivePct = lowerIsBetter
    ? current === 0
      ? 0
      : Math.min(100, Math.round((target / current) * 100))
    : pct;
  const good = effectivePct >= 80;
  const mid = effectivePct >= 40;

  return (
    <div className="h-1.5 rounded-full bg-[var(--studio-border)] overflow-hidden mt-1">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          good ? 'bg-green-500' : mid ? 'bg-yellow-500' : 'bg-[var(--studio-accent)]'
        }`}
        style={{ width: `${effectivePct}%` }}
      />
    </div>
  );
}

function Ciclo30D({ overview }: { overview?: AnalyticsOverviewDTO | null }) {
  const rows = buildOkrRows(overview);

  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">📈</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 30D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Este mes · Goals</p>
        </div>
        <div className="ml-auto">
          <StudioBadge tone="info">OKRs</StudioBadge>
        </div>
      </div>

      {/* OKR rows */}
      <div className="space-y-3">
        {rows.map((row) => {
          const displayCurrent = row.current;
          const displayTarget = row.target;
          return (
            <div key={row.id} className="p-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-[var(--studio-text)]">{row.label}</p>
                <span className="text-xs text-[var(--studio-text-muted)]">
                  {displayCurrent} / {displayTarget}{' '}
                  <span className="text-[10px]">{row.unit}</span>
                </span>
              </div>
              <OkrProgressBar
                current={displayCurrent}
                target={displayTarget}
                lowerIsBetter={row.lowerIsBetter}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ciclo 90D ───────────────────────────────────────────────────────────────

interface ObjectiveCard {
  id: string;
  title: string;
  kpis: Array<{ label: string; from: number; to: number }>;
}

const OBJECTIVES_90D: ObjectiveCard[] = [
  {
    id: 'traffic',
    title: 'Triplicar tráfico orgánico',
    kpis: [
      { label: 'Sessions', from: 0, to: 1500 },
      { label: 'Top-10 keywords', from: 0, to: 20 },
    ],
  },
  {
    id: 'authority',
    title: 'Autoridad de dominio',
    kpis: [
      { label: 'DR', from: 0, to: 30 },
      { label: 'Backlinks', from: 0, to: 50 },
    ],
  },
];

interface ProgressRingProps {
  pct: number;
  size?: number;
}

function ProgressRing({ pct, size = 48 }: ProgressRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden="true">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--studio-border)"
        strokeWidth={4}
      />
      {/* Fill */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--studio-accent)"
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

function Ciclo90D() {
  return (
    <div className="studio-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🎯</span>
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Ciclo 90D</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Este trimestre · Objetivos</p>
        </div>
        <div className="ml-auto">
          <StudioBadge tone="neutral">Q1</StudioBadge>
        </div>
      </div>

      {/* Objective cards */}
      <div className="space-y-3">
        {OBJECTIVES_90D.map((obj) => {
          // Compute overall progress: average of kpi progress percentages
          const avgPct = Math.round(
            obj.kpis.reduce((sum, kpi) => {
              const p = kpi.to <= 0 ? 0 : Math.min(100, (kpi.from / kpi.to) * 100);
              return sum + p;
            }, 0) / obj.kpis.length
          );

          return (
            <div
              key={obj.id}
              className="p-3 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)]"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <ProgressRing pct={avgPct} />
                  <span className="text-[10px] text-[var(--studio-text-muted)]">{avgPct}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--studio-text)] mb-2">{obj.title}</p>
                  <div className="space-y-1">
                    {obj.kpis.map((kpi) => (
                      <div key={kpi.label} className="flex items-center justify-between">
                        <span className="text-xs text-[var(--studio-text-muted)]">{kpi.label}</span>
                        <span className="text-xs font-medium text-[var(--studio-text)]">
                          {kpi.from} → {kpi.to}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SeoOkrCycle({ websiteId, overview }: SeoOkrCycleProps) {
  void websiteId;
  return (
    <div className="space-y-3 mt-4">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[var(--studio-text)]">OKR &amp; Ciclo Continuo</h2>
        <StudioBadge tone="info">7 · 30 · 90 días</StudioBadge>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Ciclo7D />
        <Ciclo30D overview={overview} />
        <Ciclo90D />
      </div>
    </div>
  );
}
