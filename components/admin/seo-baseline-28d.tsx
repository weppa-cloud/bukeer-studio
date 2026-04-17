'use client';

import { useState } from 'react';
import type { AnalyticsOverviewDTO } from '@/lib/seo/dto';
import { StudioBadge } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';

interface SeoBaseline28DProps {
  overview: AnalyticsOverviewDTO | null;
  websiteId: string;
}

type BrandFilter = 'all' | 'non-brand';

interface KpiCardProps {
  label: string;
  value: string;
  delta: number | null;
  loading: boolean;
}

function KpiCard({ label, value, delta, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="studio-card p-4 animate-pulse">
        <div className="h-3 bg-[var(--studio-border)] rounded w-24 mb-3" />
        <div className="h-7 bg-[var(--studio-border)] rounded w-16 mb-2" />
        <div className="h-4 bg-[var(--studio-border)] rounded w-12" />
      </div>
    );
  }

  const deltaPositive = delta !== null && delta > 0;
  const deltaNegative = delta !== null && delta < 0;
  const deltaZero = delta !== null && delta === 0;

  return (
    <div className="studio-card p-4">
      <p className="text-xs text-[var(--studio-text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[var(--studio-text)] mb-2">{value}</p>
      {delta !== null ? (
        <StudioBadge
          tone={deltaPositive ? 'success' : deltaNegative ? 'danger' : 'neutral'}
        >
          {deltaPositive ? `↑ +${delta.toFixed(1)}%` : deltaZero ? '→ 0%' : `↓ ${delta.toFixed(1)}%`}
        </StudioBadge>
      ) : (
        <StudioBadge tone="neutral">Sin datos</StudioBadge>
      )}
    </div>
  );
}

function TrendBadge({ trendValue }: { trendValue: number | null | undefined }) {
  if (trendValue == null) {
    return <StudioBadge tone="neutral">Sin datos</StudioBadge>;
  }
  const pct = trendValue * 100;
  if (pct > 5) {
    return <StudioBadge tone="success">↑ Creciendo</StudioBadge>;
  }
  if (pct < -5) {
    return <StudioBadge tone="danger">↓ Cayendo</StudioBadge>;
  }
  return <StudioBadge tone="neutral">→ Estable</StudioBadge>;
}

export function SeoBaseline28D({ overview, websiteId }: SeoBaseline28DProps) {
  void websiteId;
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const isLoading = overview === null;

  const clicksLabel =
    brandFilter === 'non-brand' ? 'Clicks orgánicos (non-brand)' : 'Clicks orgánicos (todos)';

  const clicksValue = overview ? String(overview.sessions) : '0';
  const clicksDelta = overview?.trend.sessions != null ? overview.trend.sessions * 100 : null;

  const ctrProxy =
    overview?.avgBounceRate != null
      ? `${((1 - overview.avgBounceRate) * 100).toFixed(1)}%`
      : 'N/A';

  const ctrDelta: number | null = null;

  const kpiCards: KpiCardProps[] = [
    {
      label: clicksLabel,
      value: clicksValue,
      delta: clicksDelta,
      loading: isLoading,
    },
    {
      label: 'Impresiones',
      value: 'N/A',
      delta: null,
      loading: isLoading,
    },
    {
      label: 'CTR promedio',
      value: ctrProxy,
      delta: ctrDelta,
      loading: isLoading,
    },
    {
      label: 'Posición promedio',
      value: 'N/A',
      delta: null,
      loading: isLoading,
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      {/* Header row: toggle brand filter + trend badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBrandFilter('all')}
            className={cn(
              'px-3 py-1 text-xs rounded-md border transition-colors',
              brandFilter === 'all'
                ? 'bg-[var(--studio-accent)] text-white border-[var(--studio-accent)]'
                : 'bg-transparent text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:border-[var(--studio-accent)]'
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setBrandFilter('non-brand')}
            className={cn(
              'px-3 py-1 text-xs rounded-md border transition-colors',
              brandFilter === 'non-brand'
                ? 'bg-[var(--studio-accent)] text-white border-[var(--studio-accent)]'
                : 'bg-transparent text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:border-[var(--studio-accent)]'
            )}
          >
            Non-brand
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--studio-text-muted)]">Tendencia 28D:</span>
          <TrendBadge trendValue={overview?.trend.sessions} />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Device split */}
      <div className="studio-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">Split por dispositivo</h3>
          <div className="flex items-center gap-2">
            <StudioBadge tone="info">Mobile</StudioBadge>
            <StudioBadge tone="neutral">Desktop</StudioBadge>
          </div>
        </div>
        <p className="text-xs text-[var(--studio-text-muted)]">
          Datos de dispositivo disponibles vía GSC
        </p>
      </div>

      {/* Top 5 countries */}
      <div className="studio-card p-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">Top 5 países</h3>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-[var(--studio-border)] rounded w-full" />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-2 text-xs text-[var(--studio-text-muted)] font-medium">País</th>
                  <th className="py-2 text-xs text-[var(--studio-text-muted)] font-medium">Clicks</th>
                  <th className="py-2 text-xs text-[var(--studio-text-muted)] font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-3 text-xs text-[var(--studio-text-muted)]">
                    Conecta GSC para ver datos por país
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
