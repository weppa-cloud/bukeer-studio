'use client';

import { useRouter } from 'next/navigation';
import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';

interface SeoRevenueAttributionProps {
  websiteId: string;
}

interface KpiCard {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
  tooltip?: string;
}

const KPI_CARDS: KpiCard[] = [
  {
    label: 'Ingresos SEO estimados',
    value: 'N/A',
    tone: 'neutral',
    description: 'Conecta GA4 + CRM para ver',
  },
  {
    label: 'Reservas desde búsqueda',
    value: 'N/A',
    tone: 'neutral',
  },
  {
    label: 'Ticket promedio orgánico',
    value: 'N/A',
    tone: 'neutral',
  },
  {
    label: 'ROI SEO',
    value: 'N/A',
    tone: 'neutral',
    tooltip: 'Ingresos SEO / Inversión SEO × 100',
  },
];

type FunnelStage = {
  label: string;
  barWidth: string;
  barColor: string;
  value: string;
  percent: string;
};

const FUNNEL_STAGES: FunnelStage[] = [
  {
    label: 'Impresiones GSC',
    barWidth: 'w-full',
    barColor: 'bg-blue-500/20',
    value: 'N/A',
    percent: '100%',
  },
  {
    label: 'Clicks → Sesiones',
    barWidth: 'w-[60%]',
    barColor: 'bg-blue-500/40',
    value: 'N/A',
    percent: '—',
  },
  {
    label: 'Conversiones estimadas',
    barWidth: 'w-[20%]',
    barColor: 'bg-green-500/60',
    value: 'N/A',
    percent: '—',
  },
];

type KeywordRow = {
  keyword: string;
  clicks: string;
  convEst: string;
  ingresosEst: string;
  tipo: 'TOFU' | 'MOFU' | 'BOFU';
};

const KEYWORD_ROWS: KeywordRow[] = [
  { keyword: 'tours colombia', clicks: '—', convEst: '—', ingresosEst: '—', tipo: 'TOFU' },
  { keyword: 'paquetes ecoturismo', clicks: '—', convEst: '—', ingresosEst: '—', tipo: 'MOFU' },
  { keyword: 'hotel cartagena precio', clicks: '—', convEst: '—', ingresosEst: '—', tipo: 'BOFU' },
  { keyword: 'viajes sierra nevada', clicks: '—', convEst: '—', ingresosEst: '—', tipo: 'MOFU' },
  { keyword: 'tour tayrona 1 dia', clicks: '—', convEst: '—', ingresosEst: '—', tipo: 'BOFU' },
];

function funnelTypeTone(tipo: 'TOFU' | 'MOFU' | 'BOFU'): 'neutral' | 'info' | 'success' {
  if (tipo === 'TOFU') return 'neutral';
  if (tipo === 'MOFU') return 'info';
  return 'success';
}

export function SeoRevenueAttribution({ websiteId }: SeoRevenueAttributionProps) {
  const router = useRouter();

  function handleConfigureGA4() {
    router.push(`/dashboard/${websiteId}/analytics?tab=config`);
  }

  return (
    <div className="space-y-5 mt-4">
      {/* Section title */}
      <h3 className="text-base font-semibold text-[var(--studio-text)]">Revenue SEO</h3>

      {/* A) 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_CARDS.map((card) => (
          <div key={card.label} className="studio-card p-4">
            <p className="text-xs text-[var(--studio-text-muted)] mb-1">
              {card.label}
              {card.tooltip && (
                <span
                  title={card.tooltip}
                  className="ml-1 cursor-help text-[var(--studio-text-muted)] opacity-60"
                >
                  ⓘ
                </span>
              )}
            </p>
            <p className="text-2xl font-semibold text-[var(--studio-text)] mb-2">{card.value}</p>
            <StudioBadge tone={card.tone}>Sin datos</StudioBadge>
            {card.description && (
              <p className="text-xs text-[var(--studio-text-muted)] mt-2">{card.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* B) Keyword → Revenue Attribution Table */}
      <div className="studio-card p-4 overflow-x-auto">
        <h4 className="text-sm font-semibold text-[var(--studio-text)] mb-3">
          Palabras clave por valor generado
        </h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 pr-4 text-xs text-[var(--studio-text-muted)] font-medium">
                Keyword
              </th>
              <th className="py-2 pr-4 text-xs text-[var(--studio-text-muted)] font-medium">
                Clicks
              </th>
              <th className="py-2 pr-4 text-xs text-[var(--studio-text-muted)] font-medium">
                Conv. Est.
              </th>
              <th className="py-2 pr-4 text-xs text-[var(--studio-text-muted)] font-medium">
                Ingresos Est.
              </th>
              <th className="py-2 text-xs text-[var(--studio-text-muted)] font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {KEYWORD_ROWS.map((row) => (
              <tr key={row.keyword} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.keyword}</td>
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.clicks}</td>
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.convEst}</td>
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.ingresosEst}</td>
                <td className="py-2">
                  <StudioBadge tone={funnelTypeTone(row.tipo)}>{row.tipo}</StudioBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-[var(--studio-text-muted)] mt-3">
          💡 Los datos reales requieren conectar GA4 con Goals de conversión configurados
        </p>
      </div>

      {/* C) Conversion Funnel */}
      <div className="studio-card p-4">
        <h4 className="text-sm font-semibold text-[var(--studio-text)] mb-4">
          Embudo SEO → Conversión
        </h4>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-xs text-[var(--studio-text-muted)] w-44 shrink-0">
                {stage.label}
              </span>
              <div className="flex-1 h-5 bg-[var(--studio-border)]/30 rounded overflow-hidden">
                <div className={`h-full ${stage.barWidth} ${stage.barColor} rounded`} />
              </div>
              <span className="text-xs text-[var(--studio-text-muted)] w-10 text-right shrink-0">
                {stage.value}
              </span>
              <span className="text-xs text-[var(--studio-text-muted)] w-8 text-right shrink-0">
                {stage.percent}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* D) Setup CTA */}
      <div className="studio-card p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label="analytics">
            📊
          </span>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-[var(--studio-text)]">
              Para ver revenue real necesitas:
            </p>
            <ol className="space-y-1 text-sm text-[var(--studio-text-muted)]">
              <li>1. ✅ Google Analytics 4 conectado</li>
              <li>2. ☐ Eventos de conversión configurados en GA4</li>
              <li>3. ☐ Vincular keywords con revenue (próximamente)</li>
            </ol>
            <div className="pt-1">
              <StudioButton size="sm" onClick={handleConfigureGA4}>
                Configurar GA4 →
              </StudioButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
